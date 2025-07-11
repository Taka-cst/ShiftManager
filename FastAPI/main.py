# main.py
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Date, Text, ForeignKey, func, delete
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from pydantic import BaseModel, validator, Field
from datetime import datetime, date, timedelta
from typing import Optional, List
from passlib.context import CryptContext
from jose import JWTError, jwt
import os
try:
    from zoneinfo import ZoneInfo
except ImportError:
    # Python < 3.9の場合はpytzを使用
    import pytz
    ZoneInfo = None
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
    allow_origins=[
        "https://expt.taka-sec.com",
        "http://expt.taka-sec.com", 
        "https://expt.taka-sec.com:9876",
        "http://expt.taka-sec.com:9876",
        "https://localhost:4567",
        "http://localhost:4567",
        "https://localhost:80",
        "http://localhost:80",
        "https://localhost:9876",
        "http://localhost:9876",
        "https://localhost:3001",
        "http://localhost:3001"
    ],
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
    user_display_name: Optional[str] # 追加
    
    class Config:
        from_attributes = True

# 確定シフト関連
class ConfirmedShiftBase(BaseModel):
    date: date
    start_time: str  # JSTのHH:mm文字列
    end_time: str    # JSTのHH:mm文字列

class ConfirmedShiftCreate(ConfirmedShiftBase):
    user_id: int

class ConfirmedShift(ConfirmedShiftBase):
    id: int
    user_id: int
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

# 時刻変換ヘルパー関数
def to_jst_time_string(dt: datetime) -> str:
    """UTC datetimeを日本時間のHH:mm文字列に変換"""
    if ZoneInfo:
        # Python 3.9以降
        jst = ZoneInfo('Asia/Tokyo')
        jst_dt = dt.replace(tzinfo=ZoneInfo('UTC')).astimezone(jst)
    else:
        # Python < 3.9
        jst = pytz.timezone('Asia/Tokyo')
        jst_dt = dt.replace(tzinfo=pytz.UTC).astimezone(jst)
    return jst_dt.strftime('%H:%M')

def from_time_string_to_utc_datetime(time_str: str, target_date: date) -> datetime:
    """複数形式の時刻文字列（JST）を指定日と組み合わせてUTC datetimeに変換"""
    print(f"🔧 時刻変換開始: time_str='{time_str}', target_date={target_date}")
    
    try:
        # 1. ISO形式のdatetime文字列の場合（例: "2025-07-09T18:00:00.000Z"）
        if 'T' in time_str and ('Z' in time_str or '+' in time_str or time_str.count(':') >= 2):
            print(f"📅 ISO形式として処理: {time_str}")
            # ISO形式をパースしてJSTとして扱う
            dt = datetime.fromisoformat(time_str.replace('Z', '+00:00'))
            # UTCからJSTに変換して時刻のみ取得
            if ZoneInfo:
                jst = ZoneInfo('Asia/Tokyo')
                jst_dt = dt.replace(tzinfo=ZoneInfo('UTC')).astimezone(jst)
            else:
                jst = pytz.timezone('Asia/Tokyo')
                jst_dt = dt.replace(tzinfo=pytz.UTC).astimezone(jst)
            
            # 指定日と組み合わせてJSTのdatetimeを作成
            combined_dt = datetime.combine(target_date, jst_dt.time())
            print(f"🕐 ISO→JST変換結果: {combined_dt}")
            
            # JSTからUTCに変換
            if ZoneInfo:
                jst_final = combined_dt.replace(tzinfo=ZoneInfo('Asia/Tokyo'))
                utc_dt = jst_final.astimezone(ZoneInfo('UTC'))
            else:
                jst_final = pytz.timezone('Asia/Tokyo').localize(combined_dt)
                utc_dt = jst_final.astimezone(pytz.UTC)
            
            result = utc_dt.replace(tzinfo=None)
            print(f"✅ 最終結果（UTC）: {result}")
            return result
        
        # 2. HH:mm形式の文字列の場合（例: "18:00"）
        elif ':' in time_str and len(time_str.split(':')) == 2:
            print(f"🕐 HH:mm形式として処理: {time_str}")
            time_obj = datetime.strptime(time_str, '%H:%M').time()
            
            # 指定日と組み合わせてJSTのdatetimeを作成
            if ZoneInfo:
                jst = ZoneInfo('Asia/Tokyo')
                jst_dt = datetime.combine(target_date, time_obj).replace(tzinfo=jst)
                utc_dt = jst_dt.astimezone(ZoneInfo('UTC'))
                result = utc_dt.replace(tzinfo=None)
            else:
                jst = pytz.timezone('Asia/Tokyo')
                naive_dt = datetime.combine(target_date, time_obj)
                jst_dt = jst.localize(naive_dt)
                utc_dt = jst_dt.astimezone(pytz.UTC)
                result = utc_dt.replace(tzinfo=None)
            
            print(f"✅ HH:mm変換結果（UTC）: {result}")
            return result
        
        # 3. その他の形式は対応不可
        else:
            raise ValueError(f"サポートされていない時刻形式: {time_str}")
            
    except Exception as e:
        print(f"❌ 時刻変換エラー: {e}")
        raise ValueError(f"時刻の形式が正しくありません: {time_str}. HH:mm形式またはISO形式で入力してください。")

def from_utc_to_jst_datetime(dt: datetime, target_date: date) -> datetime:
    """UTCのdatetimeから日本時間の時刻を取得し、指定日と組み合わせてUTCに戻す"""
    if ZoneInfo:
        # Python 3.9以降
        jst = ZoneInfo('Asia/Tokyo')
        utc = ZoneInfo('UTC')
        # UTCからJSTに変換
        jst_dt = dt.replace(tzinfo=utc).astimezone(jst)
        # 指定日と組み合わせて新しいdatetimeを作成
        combined_dt = datetime.combine(target_date, jst_dt.time())
        # JSTからUTCに変換して返す
        return combined_dt.replace(tzinfo=jst).astimezone(utc).replace(tzinfo=None)
    else:
        # Python < 3.9
        jst = pytz.timezone('Asia/Tokyo')
        # UTCからJSTに変換
        jst_dt = dt.replace(tzinfo=pytz.UTC).astimezone(jst)
        # 指定日と組み合わせて新しいdatetimeを作成
        combined_dt = datetime.combine(target_date, jst_dt.time())
        # JSTからUTCに変換して返す
        return combined_dt.replace(tzinfo=jst).astimezone(pytz.UTC).replace(tzinfo=None)

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
    results = query.all()
    for r in results:
        r.user_display_name = r.user.DisplayName
    return results

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

    # レスポンス用の辞書を作成
    response_data = {
        "id": db_request.id,
        "date": db_request.date,
        "canwork": db_request.canwork,
        "description": db_request.description,
        "start_time": db_request.start_time,
        "end_time": db_request.end_time,
        "user_id": db_request.user_id,
        "user_display_name": current_user.DisplayName
    }
    
    return ShiftRequest(**response_data)

@app.get("/api/v1/shift-requests/{request_id}", response_model=ShiftRequest)
def get_shift_request(request_id: int, current_user: UserModel = Depends(get_current_user), db: Session = Depends(get_db)):
    """個別のシフト希望を取得"""
    db_request = db.query(ShiftRequestModel).filter(ShiftRequestModel.id == request_id).first()
    
    if not db_request:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定されたシフト希望が見つかりません。"
        )
    
    # 権限チェック（自分のデータのみ取得可能）
    if db_request.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="このシフト希望にアクセスする権限がありません。"
        )
    
    # レスポンス用の辞書を作成
    response_data = {
        "id": db_request.id,
        "date": db_request.date,
        "canwork": db_request.canwork,
        "description": db_request.description,
        "start_time": db_request.start_time,
        "end_time": db_request.end_time,
        "user_id": db_request.user_id,
        "user_display_name": current_user.DisplayName
    }
    
    return ShiftRequest(**response_data)

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
    
    # レスポンス用の辞書を作成
    response_data = {
        "id": db_request.id,
        "date": db_request.date,
        "canwork": db_request.canwork,
        "description": db_request.description,
        "start_time": db_request.start_time,
        "end_time": db_request.end_time,
        "user_id": db_request.user_id,
        "user_display_name": current_user.DisplayName
    }
    
    return ShiftRequest(**response_data)

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
    """確定シフト一覧取得（自分のもののみ）"""
    # クエリ開始（自分のシフトのみ、ユーザー情報も含める）
    query = db.query(ConfirmedShiftModel).join(UserModel).filter(ConfirmedShiftModel.user_id == current_user.id)
    
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
            ConfirmedShiftModel.date >= start_date,
            ConfirmedShiftModel.date < end_date
        )
    
    # 結果を返す（日本時間に変換）
    results = query.all()
    
    # Pydanticレスポンス用にリスト構築
    response_shifts = []
    for shift in results:
        response_data = {
            "id": shift.id,
            "date": shift.date,
            "start_time": to_jst_time_string(shift.start_time),
            "end_time": to_jst_time_string(shift.end_time),
            "user_id": shift.user_id,
            "user": {
                "id": shift.user.id,
                "username": shift.user.username,
                "DisplayName": shift.user.DisplayName,
                "admin": shift.user.admin
            }
        }
        response_shifts.append(ConfirmedShift(**response_data))
    
    return response_shifts

# 確定シフトAPI（一般ユーザー向け全員表示用を追加）
@app.get("/api/v1/confirmed-shifts/all", response_model=List[ConfirmedShift])
def get_all_confirmed_shifts_for_users(
    year: Optional[int] = None, 
    month: Optional[int] = None,
    current_user: UserModel = Depends(get_current_user), 
    db: Session = Depends(get_db)
):
    """一般ユーザー向け：全員の確定シフト一覧取得（読み取り専用）"""
    # クエリ開始（ユーザー情報も含める）
    query = db.query(ConfirmedShiftModel).join(UserModel)
    
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
            ConfirmedShiftModel.date >= start_date,
            ConfirmedShiftModel.date < end_date
        )
    
    # 結果を返す
    results = query.all()
    print(f"一般ユーザー用確定シフト取得: 年={year}, 月={month}, 件数={len(results)}")
    
    # Pydanticレスポンス用にリスト構築
    response_shifts = []
    for shift in results:
        jst_start_time = to_jst_time_string(shift.start_time)
        jst_end_time = to_jst_time_string(shift.end_time)
        
        response_data = {
            "id": shift.id,
            "date": shift.date,
            "start_time": jst_start_time,
            "end_time": jst_end_time,
            "user_id": shift.user_id,
            "user": {
                "id": shift.user.id,
                "username": shift.user.username,
                "DisplayName": shift.user.DisplayName,
                "admin": shift.user.admin
            }
        }
        response_shifts.append(ConfirmedShift(**response_data))
    
    return response_shifts

# 管理者向けAPI
@app.get("/api/v1/admin/shift-requests", response_model=List[ShiftRequest])
def get_all_shift_requests(admin_user: UserModel = Depends(get_admin_user), db: Session = Depends(get_db)):
    """全ユーザーのシフト希望一覧取得"""
    requests = db.query(ShiftRequestModel).all()
    for r in requests:
        r.user_display_name = r.user.DisplayName
    return requests

@app.get("/api/v1/admin/confirmed-shifts", response_model=List[ConfirmedShift])
def get_all_confirmed_shifts(
    year: Optional[int] = None, 
    month: Optional[int] = None,
    admin_user: UserModel = Depends(get_admin_user), 
    db: Session = Depends(get_db)
):
    """管理者用：全員の確定シフト一覧取得"""
    # クエリ開始（ユーザー情報も含める）
    query = db.query(ConfirmedShiftModel).join(UserModel)
    
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
            ConfirmedShiftModel.date >= start_date,
            ConfirmedShiftModel.date < end_date
        )
    
    # 結果を返す（デバッグログ追加）
    results = query.all()
    print(f"管理者用確定シフト取得: 年={year}, 月={month}, 件数={len(results)}")
    
    # Pydanticレスポンス用にリスト構築
    response_shifts = []
    for shift in results:
        # デバッグログ
        print(f"  変換前: ID={shift.id}, ユーザーID={shift.user_id}, ユーザー名={shift.user.username}, 表示名={shift.user.DisplayName}, 日付={shift.date}, 開始={shift.start_time}, 終了={shift.end_time}")
        
        jst_start_time = to_jst_time_string(shift.start_time)
        jst_end_time = to_jst_time_string(shift.end_time)
        
        print(f"  変換後: 開始={jst_start_time}, 終了={jst_end_time}")
        
        response_data = {
            "id": shift.id,
            "date": shift.date,
            "start_time": jst_start_time,
            "end_time": jst_end_time,
            "user_id": shift.user_id,
            "user": {
                "id": shift.user.id,
                "username": shift.user.username,
                "DisplayName": shift.user.DisplayName,
                "admin": shift.user.admin
            }
        }
        response_shifts.append(ConfirmedShift(**response_data))
    
    print(f"📤 レスポンス確認: 最初のシフトのuser_id={response_shifts[0].user_id if response_shifts else 'なし'}")
    
    return response_shifts

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
    
    # 重複チェック
    existing_shift = db.query(ConfirmedShiftModel).filter(
        ConfirmedShiftModel.user_id == shift.user_id,
        ConfirmedShiftModel.date == shift.date
    ).first()
    
    # デバッグログ追加
    print(f"確定シフト作成試行: user_id={shift.user_id}, date={shift.date}")
    print(f"受信した時刻データ: start_time={shift.start_time}, end_time={shift.end_time}")
    print(f"既存シフト検索結果: {existing_shift}")
    if existing_shift:
        print(f"既存シフト詳細: id={existing_shift.id}, date={existing_shift.date}, user_id={existing_shift.user_id}")
    
    if existing_shift:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="この日付の確定シフトは既に存在します。"
        )
    
    # 時刻を日本時間として扱うため、日付部分を指定日に設定
    start_time_final = from_time_string_to_utc_datetime(shift.start_time, shift.date)
    end_time_final = from_time_string_to_utc_datetime(shift.end_time, shift.date)
    
    print(f"保存する時刻: start_time={start_time_final}, end_time={end_time_final}")
    
    # 確定シフト作成
    db_shift = ConfirmedShiftModel(
        date=shift.date,
        start_time=start_time_final,
        end_time=end_time_final,
        user_id=shift.user_id
    )
    
    db.add(db_shift)
    db.commit()
    db.refresh(db_shift)
    
    # ユーザー情報を確実にロードするため、再クエリ
    created_shift = db.query(ConfirmedShiftModel).join(UserModel).filter(ConfirmedShiftModel.id == db_shift.id).first()
    
    # Pydanticレスポンス用に辞書形式で構築
    response_data = {
        "id": created_shift.id,
        "date": created_shift.date,
        "start_time": to_jst_time_string(created_shift.start_time),
        "end_time": to_jst_time_string(created_shift.end_time),
        "user_id": created_shift.user_id,
        "user": {
            "id": created_shift.user.id,
            "username": created_shift.user.username,
            "DisplayName": created_shift.user.DisplayName,
            "admin": created_shift.user.admin
        }
    }
    
    return ConfirmedShift(**response_data)

@app.put("/api/v1/admin/confirmed-shifts/{shift_id}", response_model=ConfirmedShift)
def update_confirmed_shift(shift_id: int, shift: ConfirmedShiftCreate, admin_user: UserModel = Depends(get_admin_user), db: Session = Depends(get_db)):
    """確定シフトの更新"""
    db_shift = db.query(ConfirmedShiftModel).filter(ConfirmedShiftModel.id == shift_id).first()
    
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
    
    # 時刻を日本時間として扱うため、適切に変換
    start_time_final = from_time_string_to_utc_datetime(shift.start_time, shift.date)
    end_time_final = from_time_string_to_utc_datetime(shift.end_time, shift.date)
    
    print(f"確定シフト更新: shift_id={shift_id}")
    print(f"受信した時刻データ: start_time={shift.start_time}, end_time={shift.end_time}")
    print(f"保存する時刻: start_time={start_time_final}, end_time={end_time_final}")
    
    # 更新
    db_shift.date = shift.date
    db_shift.start_time = start_time_final
    db_shift.end_time = end_time_final
    db_shift.user_id = shift.user_id
    
    db.commit()
    db.refresh(db_shift)
    
    # ユーザー情報を含めて再クエリ
    updated_shift = db.query(ConfirmedShiftModel).join(UserModel).filter(ConfirmedShiftModel.id == shift_id).first()
    
    # Pydanticレスポンス用に辞書形式で構築
    response_data = {
        "id": updated_shift.id,
        "date": updated_shift.date,
        "start_time": to_jst_time_string(updated_shift.start_time),
        "end_time": to_jst_time_string(updated_shift.end_time),
        "user_id": updated_shift.user_id,
        "user": {
            "id": updated_shift.user.id,
            "username": updated_shift.user.username,
            "DisplayName": updated_shift.user.DisplayName,
            "admin": updated_shift.user.admin
        }
    }
    
    return ConfirmedShift(**response_data)

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
    db.execute(delete(ConfirmedShiftModel).where(ConfirmedShiftModel.user_id == user_id))
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