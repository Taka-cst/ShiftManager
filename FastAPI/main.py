# main.py
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Date, Text, ForeignKey, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from pydantic import BaseModel, validator, Field
from datetime import datetime, date, timedelta
from typing import Optional, List
from passlib.context import CryptContext
from jose import JWTError, jwt
import os
from dotenv import load_dotenv

# 環境変数の読み込み
load_dotenv()

# 設定
SECRET_KEY = os.getenv("SECRET_KEY", "your-secret-key-here")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "30"))
ADMIN_CODE = os.getenv("ADMIN_CODE", "admin123")

# データベース設定
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://user:password@localhost/shift_management")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# パスワードハッシュ化
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

app = FastAPI(title="シフト管理API", version="2.0.0")

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# データベースモデル
class UserModel(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(20), unique=True, index=True, nullable=False)
    DisplayName = Column(String(20), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    
    # リレーション
    shift_requests = relationship("ShiftRequestModel", back_populates="user")
    confirmed_shifts = relationship("ConfirmedShiftModel", back_populates="user")

class ShiftRequestModel(Base):
    __tablename__ = "shift_requests"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    canwork = Column(Boolean, nullable=False)
    description = Column(Text, nullable=True)
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    user = relationship("UserModel", back_populates="shift_requests")

class ConfirmedShiftModel(Base):
    __tablename__ = "confirmed_shifts"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    user = relationship("UserModel", back_populates="confirmed_shifts")

class Settings(Base):
    __tablename__ = "settings"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(50), unique=True, nullable=False)
    value = Column(String(255), nullable=False)

# Pydanticモデル
class MessageResponse(BaseModel):
    message: str

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"

class UserCreate(BaseModel):
    username: str
    DisplayName: str
    password: str
    admin_code: Optional[str] = None
    
    @validator('username')
    def validate_username(cls, v):
        if len(v) < 2 or len(v) > 20:
            raise ValueError('ユーザー名は2〜20文字で入力してください。')
        return v
    
    @validator('DisplayName')
    def validate_display_name(cls, v):
        if len(v) < 1 or len(v) > 20:
            raise ValueError('表示名は1〜20文字で入力してください。')
        return v

class User(BaseModel):
    id: int
    username: str
    DisplayName: str
    admin: bool
    
    class Config:
        from_attributes = True

# シフト希望関連
class ShiftRequestBase(BaseModel):
    date: date
    canwork: bool
    description: Optional[str] = Field(None, max_length=200)
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None

    @validator("start_time", "end_time", pre=True)
    def empty_str_to_none(cls, v):
        if v == "":
            return None
        return v

class ShiftRequestCreate(ShiftRequestBase):
    pass

class ShiftRequest(ShiftRequestBase):
    id: int
    user_id: int
    
    class Config:
        from_attributes = True

# 確定シフト関連
class ConfirmedShiftBase(BaseModel):
    date: date
    start_time: datetime
    end_time: datetime

class ConfirmedShiftCreate(ConfirmedShiftBase):
    user_id: int

class ConfirmedShift(ConfirmedShiftBase):
    id: int
    user: User
    
    class Config:
        from_attributes = True

class DayOfWeekSettings(BaseModel):
    monday: bool = False
    tuesday: bool = False
    wednesday: bool = False
    thursday: bool = False
    friday: bool = False
    saturday: bool = False
    sunday: bool = False

# データベース接続
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

# 認証関連の関数
def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None):
    to_encode = data.copy()
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=15)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt

def get_current_user(token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(UserModel).filter(UserModel.username == username).first()
    if user is None:
        raise credentials_exception
    return user

def get_admin_user(current_user: UserModel = Depends(get_current_user)):
    if not current_user.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="管理者権限が必要です。"
        )
    return current_user

# 設定関連の関数
def get_dow_settings(db: Session) -> DayOfWeekSettings:
    settings = db.query(Settings).filter(Settings.key.like("dow_%")).all()
    settings_dict = {s.key: s.value.lower() == "true" for s in settings}
    
    return DayOfWeekSettings(
        monday=settings_dict.get("dow_monday", False),
        tuesday=settings_dict.get("dow_tuesday", False),
        wednesday=settings_dict.get("dow_wednesday", False),
        thursday=settings_dict.get("dow_thursday", False),
        friday=settings_dict.get("dow_friday", False),
        saturday=settings_dict.get("dow_saturday", False),
        sunday=settings_dict.get("dow_sunday", False),
    )

def set_dow_settings(db: Session, settings: DayOfWeekSettings):
    dow_mapping = {
        "dow_monday": settings.monday,
        "dow_tuesday": settings.tuesday,
        "dow_wednesday": settings.wednesday,
        "dow_thursday": settings.thursday,
        "dow_friday": settings.friday,
        "dow_saturday": settings.saturday,
        "dow_sunday": settings.sunday,
    }
    
    for key, value in dow_mapping.items():
        db_setting = db.query(Settings).filter(Settings.key == key).first()
        if db_setting:
            db_setting.value = str(value).lower()
        else:
            db_setting = Settings(key=key, value=str(value).lower())
            db.add(db_setting)
    
    db.commit()

def is_valid_class_day(date_obj: date, db: Session) -> bool:
    """指定された日付が授業曜日かどうかをチェック"""
    dow_settings = get_dow_settings(db)
    weekday = date_obj.weekday()  # 0=月曜, 6=日曜
    
    weekday_mapping = {
        0: dow_settings.monday,
        1: dow_settings.tuesday,
        2: dow_settings.wednesday,
        3: dow_settings.thursday,
        4: dow_settings.friday,
        5: dow_settings.saturday,
        6: dow_settings.sunday,
    }
    
    return weekday_mapping.get(weekday, False)

# ===========================================
# API エンドポイント
# ===========================================

# 認証API
@app.post("/api/v1/auth/register", response_model=User, status_code=status.HTTP_201_CREATED)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    # ユーザー名の重複チェック
    if db.query(UserModel).filter(UserModel.username == user.username).first():
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="そのユーザー名は既に使われています。"
        )
    
    # 管理者コードの確認
    is_admin = False
    if user.admin_code:
        if user.admin_code != ADMIN_CODE:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="管理者権限を付与するためのコードが違います。"
            )
        is_admin = True
    
    # ユーザー作成
    hashed_password = get_password_hash(user.password)
    db_user = UserModel(
        username=user.username,
        DisplayName=user.DisplayName,
        hashed_password=hashed_password,
        admin=is_admin
    )
    
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    
    return db_user

@app.post("/api/v1/auth/login", response_model=Token)
def login_user(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(UserModel).filter(UserModel.username == form_data.username).first()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ユーザー名またはパスワードが無効です。"
        )
    
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = create_access_token(
        data={"sub": user.username}, expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/v1/auth/me", response_model=User)
def get_current_user_info(current_user: UserModel = Depends(get_current_user)):
    return current_user

# シフト希望API
@app.get("/api/v1/shift-requests/", response_model=List[ShiftRequest])
def get_my_shift_requests(
    year: Optional[int] = None, 
    month: Optional[int] = None,
    current_user: UserModel = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """自分のシフト希望一覧取得"""
    # クエリ開始
    query = db.query(ShiftRequestModel).filter(ShiftRequestModel.user_id == current_user.id)
    
    # 年月フィルタリング
    if year is not None and month is not None:
        # バリデーション
        if month < 1 or month > 12:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="yearとmonthは1〜12の範囲で指定してください。"
            )
        
        # 月初と月末を計算
        start_date = date(year, month, 1)
        if month == 12:
            end_date = date(year + 1, 1, 1)
        else:
            end_date = date(year, month + 1, 1)
        
        # 日付でフィルタリング
        query = query.filter(
            ShiftRequestModel.date >= start_date,
            ShiftRequestModel.date < end_date
        )
    
    # 結果を返す
    return query.all()

@app.post("/api/v1/shift-requests/", response_model=ShiftRequest, status_code=status.HTTP_201_CREATED)
def create_shift_request(request: ShiftRequestCreate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    """シフト希望の提出"""
    # 授業曜日チェック
    if not is_valid_class_day(request.date, db):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="授業曜日以外の日付にはシフトを登録できません。"
        )
    
    # 重複チェック
    existing_request = db.query(ShiftRequestModel).filter(
        ShiftRequestModel.user_id == current_user.id,
        ShiftRequestModel.date == request.date
    ).first()
    
    if existing_request:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="その日付のシフトは既に登録されています。"
        )
    
    # シフト希望作成
    db_request = ShiftRequestModel(
        date=request.date,
        canwork=request.canwork,
        description=request.description,
        start_time=request.start_time,
        end_time=request.end_time,
        user_id=current_user.id
    )
    
    db.add(db_request)
    db.commit()
    db.refresh(db_request)
    
    return db_request

@app.put("/api/v1/shift-requests/{request_id}", response_model=ShiftRequest)
def update_shift_request(request_id: int, request: ShiftRequestCreate, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    """シフト希望の更新"""
    db_request = db.query(ShiftRequestModel).filter(ShiftRequestModel.id == request_id).first()
    
    if not db_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定されたシフト希望が見つかりません。"
        )
    
    # 権限チェック
    if db_request.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="この操作を行う権限がありません。"
        )
    
    # 更新
    db_request.date = request.date
    db_request.canwork = request.canwork
    db_request.description = request.description
    db_request.start_time = request.start_time
    db_request.end_time = request.end_time
    
    db.commit()
    db.refresh(db_request)
    
    return db_request

@app.delete("/api/v1/shift-requests/{request_id}", response_model=MessageResponse)
def delete_shift_request(request_id: int, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    """シフト希望の削除"""
    db_request = db.query(ShiftRequestModel).filter(ShiftRequestModel.id == request_id).first()
    
    if not db_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定されたシフト希望が見つかりません。"
        )
    
    # 権限チェック
    if db_request.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="この操作を行う権限がありません。"
        )
    
    db.delete(db_request)
    db.commit()
    
    return MessageResponse(message="シフト希望を削除しました。")

# 確定シフトAPI
@app.get("/api/v1/confirmed-shifts/", response_model=List[ConfirmedShift])
def get_confirmed_shifts(
    year: Optional[int] = None, 
    month: Optional[int] = None,
    current_user: UserModel = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """確定シフト一覧取得"""
    # クエリ開始
    query = db.query(ConfirmedShiftModel)
    
    # 年月フィルタリング
    if year is not None and month is not None:
        # バリデーション
        if month < 1 or month > 12:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST, 
                detail="yearとmonthは1〜12の範囲で指定してください。"
            )
        
        # 月初と月末を計算
        start_date = date(year, month, 1)
        if month == 12:
            end_date = date(year + 1, 1, 1)
        else:
            end_date = date(year, month + 1, 1)
        
        # 日付でフィルタリング
        query = query.filter(
            ConfirmedShift.date >= start_date,
            ConfirmedShift.date < end_date
        )
    
    # 結果を返す
    return query.all()

# 管理者向けAPI
@app.get("/api/v1/admin/shift-requests", response_model=List[ShiftRequest])
def get_all_shift_requests(admin_user: UserModel = Depends(get_admin_user), db: Session = Depends(get_db)):
    """全ユーザーのシフト希望一覧取得"""
    requests = db.query(ShiftRequestModel).all()
    return requests

@app.post("/api/v1/admin/confirmed-shifts", response_model=ConfirmedShift, status_code=status.HTTP_201_CREATED)
def create_confirmed_shift(shift: ConfirmedShiftCreate, admin_user: UserModel = Depends(get_admin_user), db: Session = Depends(get_db)):
    """確定シフトの作成"""
    # ユーザー存在チェック
    user = db.query(UserModel).filter(UserModel.id == shift.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定されたユーザーが見つかりません。"
        )
    
    # 確定シフト作成
    db_shift = ConfirmedShiftModel(
        date=shift.date,
        start_time=shift.start_time,
        end_time=shift.end_time,
        user_id=shift.user_id
    )
    
    db.add(db_shift)
    db.commit()
    db.refresh(db_shift)
    
    return db_shift

@app.put("/api/v1/admin/confirmed-shifts/{shift_id}", response_model=ConfirmedShift)
def update_confirmed_shift(shift_id: int, shift: ConfirmedShiftCreate, admin_user: UserModel = Depends(get_admin_user), db: Session = Depends(get_db)):
    """確定シフトの更新"""
    db_shift = db.query(ConfirmedShift).filter(ConfirmedShiftModel.id == shift_id).first()
    
    if not db_shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定された確定シフトが見つかりません。"
        )
    
    # ユーザー存在チェック
    user = db.query(UserModel).filter(UserModel.id == shift.user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定されたユーザーが見つかりません。"
        )
    
    # 更新
    db_shift.date = shift.date
    db_shift.start_time = shift.start_time
    db_shift.end_time = shift.end_time
    db_shift.user_id = shift.user_id
    
    db.commit()
    db.refresh(db_shift)
    
    return db_shift

@app.delete("/api/v1/admin/confirmed-shifts/{shift_id}", response_model=MessageResponse)
def delete_confirmed_shift(shift_id: int, admin_user: UserModel = Depends(get_admin_user), db: Session = Depends(get_db)):
    """確定シフトの削除"""
    db_shift = db.query(ConfirmedShiftModel).filter(ConfirmedShiftModel.id == shift_id).first()
    
    if not db_shift:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定された確定シフトが見つかりません。"
        )
    
    db.delete(db_shift)
    db.commit()
    
    return MessageResponse(message="確定シフトを削除しました。")

@app.get("/api/v1/admin/users", response_model=List[User])
def get_all_users(admin_user: UserModel = Depends(get_admin_user), db: Session = Depends(get_db)):
    """ユーザー一覧取得"""
    users = db.query(UserModel).all()
    return users

@app.delete("/api/v1/admin/users/{user_id}", response_model=MessageResponse)
def delete_user(user_id: int, admin_user: UserModel = Depends(get_admin_user), db: Session = Depends(get_db)):
    """ユーザー削除"""
    user = db.query(UserModel).filter(UserModel.id == user_id).first()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定されたユーザーが見つかりません。"
        )
    
    # 管理者アカウントの削除を防ぐ
    if user.admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="管理者アカウントは削除できません。"
        )
    
    display_name = user.DisplayName
    
    # 関連するデータも削除
    db.query(ShiftRequestModel).filter(ShiftRequestModel.user_id == user_id).delete()
    db.query(ConfirmedShift).filter(ConfirmedShift.user_id == user_id).delete()
    db.delete(user)
    db.commit()
    
    return MessageResponse(message=f"ユーザー '{display_name}' を削除しました。")

@app.get("/api/v1/admin/settings/dow", response_model=DayOfWeekSettings)
def get_dow_settings_endpoint(admin_user: UserModel = Depends(get_admin_user), db: Session = Depends(get_db)):
    """授業曜日設定の取得"""
    return get_dow_settings(db)

@app.put("/api/v1/admin/settings/dow", response_model=DayOfWeekSettings)
def update_dow_settings(settings: DayOfWeekSettings, admin_user: UserModel = Depends(get_admin_user), db: Session = Depends(get_db)):
    """授業曜日設定の更新"""
    set_dow_settings(db, settings)
    return settings

# データベーステーブル作成
if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    print("データベーステーブルが作成されました。")