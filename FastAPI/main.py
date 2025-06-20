# main.py
from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import create_engine, Column, Integer, String, Boolean, DateTime, Date, Text, ForeignKey, func
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker, Session, relationship
from pydantic import BaseModel, validator
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
ACCESS_TOKEN_EXPIRE_MINUTES = 30
ADMIN_CODE = os.getenv("ADMIN_CODE", "admin123")

# データベース設定
DATABASE_URL = os.getenv("DATABASE_URL", "mysql+pymysql://user:password@localhost/shift_management")

engine = create_engine(DATABASE_URL)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# パスワードハッシュ化
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/v1/auth/login")

app = FastAPI(title="シフト管理API", version="1.0.0")

# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# データベースモデル
class User(Base):
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(20), unique=True, index=True, nullable=False)
    DisplayName = Column(String(20), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    admin = Column(Boolean, default=False)
    created_at = Column(DateTime, default=func.now())
    
    events = relationship("Event", back_populates="user")

class Event(Base):
    __tablename__ = "events"
    
    id = Column(Integer, primary_key=True, index=True)
    date = Column(Date, nullable=False)
    canwork = Column(Boolean, nullable=False)
    description = Column(Text, nullable=True)
    start_time = Column(DateTime, nullable=True)
    end_time = Column(DateTime, nullable=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=func.now())
    updated_at = Column(DateTime, default=func.now(), onupdate=func.now())
    
    user = relationship("User", back_populates="events")

class Settings(Base):
    __tablename__ = "settings"
    
    id = Column(Integer, primary_key=True, index=True)
    key = Column(String(50), unique=True, nullable=False)
    value = Column(String(255), nullable=False)

# Pydanticモデル
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

class UserResponse(BaseModel):
    id: int
    username: str
    DisplayName: str
    admin: bool
    
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class EventCreate(BaseModel):
    date: date
    canwork: bool
    description: Optional[str] = None
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    
    @validator('description')
    def validate_description(cls, v):
        if v and len(v) > 200:
            raise ValueError('ひとことメッセージは200文字以内で入力してください。')
        return v

class EventResponse(BaseModel):
    id: int
    date: date
    canwork: bool
    description: Optional[str]
    start_time: Optional[datetime]
    end_time: Optional[datetime]
    user_id: int
    user_display_name: Optional[str] = None
    
    class Config:
        from_attributes = True

class EventsCalendarResponse(BaseModel):
    events: List[EventResponse]
    settings: dict

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
    
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise credentials_exception
    return user

def get_admin_user(current_user: User = Depends(get_current_user)):
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

# API エンドポイント

# 認証API
@app.post("/api/v1/auth/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(user: UserCreate, db: Session = Depends(get_db)):
    # ユーザー名の重複チェック
    if db.query(User).filter(User.username == user.username).first():
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
    db_user = User(
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
    user = db.query(User).filter(User.username == form_data.username).first()
    
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

@app.get("/api/v1/auth/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    return current_user

# イベント（シフト）管理API
@app.get("/api/v1/events/", response_model=EventsCalendarResponse)
def get_events_calendar(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # 管理者は全ユーザーのシフト、一般ユーザーは自身のシフトのみ
    if current_user.admin:
        events = db.query(Event).all()
        # user_display_nameを設定
        for event in events:
            event.user_display_name = event.user.DisplayName
    else:
        events = db.query(Event).filter(Event.user_id == current_user.id).all()
    
    # 設定を取得
    settings = get_dow_settings(db)
    
    return EventsCalendarResponse(
        events=events,
        settings=settings.dict()
    )

@app.post("/api/v1/events/", response_model=EventResponse, status_code=status.HTTP_201_CREATED)
def create_event(event: EventCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    # 授業曜日チェック
    if not is_valid_class_day(event.date, db):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="授業曜日以外の日付にはシフトを登録できません。"
        )
    
    # 重複チェック
    existing_event = db.query(Event).filter(
        Event.user_id == current_user.id,
        Event.date == event.date
    ).first()
    
    if existing_event:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="その日付のシフトは既に登録されています。"
        )
    
    # イベント作成
    db_event = Event(
        date=event.date,
        canwork=event.canwork,
        description=event.description,
        start_time=event.start_time,
        end_time=event.end_time,
        user_id=current_user.id
    )
    
    db.add(db_event)
    db.commit()
    db.refresh(db_event)
    
    return db_event

@app.put("/api/v1/events/{event_id}", response_model=EventResponse)
def update_event(event_id: int, event: EventCreate, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_event = db.query(Event).filter(Event.id == event_id).first()
    
    if not db_event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定されたシフトが見つかりません。"
        )
    
    # 権限チェック（管理者でない場合、自身のシフトのみ更新可能）
    if not current_user.admin and db_event.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="この操作を行う権限がありません。"
        )
    
    # 更新
    db_event.date = event.date
    db_event.canwork = event.canwork
    db_event.description = event.description
    db_event.start_time = event.start_time
    db_event.end_time = event.end_time
    
    db.commit()
    db.refresh(db_event)
    
    return db_event

@app.delete("/api/v1/events/{event_id}")
def delete_event(event_id: int, current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    db_event = db.query(Event).filter(Event.id == event_id).first()
    
    if not db_event:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="指定されたシフトが見つかりません。"
        )
    
    # 権限チェック（管理者でない場合、自身のシフトのみ削除可能）
    if not current_user.admin and db_event.user_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="この操作を行う権限がありません。"
        )
    
    db.delete(db_event)
    db.commit()
    
    return {"message": "シフトを削除しました。"}

# 管理者向けAPI
@app.get("/api/v1/admin/users", response_model=List[UserResponse])
def get_all_users(admin_user: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    users = db.query(User).all()
    return users

@app.delete("/api/v1/admin/users/{user_id}")
def delete_user(user_id: int, admin_user: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    
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
    
    # 関連するイベントも削除
    db.query(Event).filter(Event.user_id == user_id).delete()
    db.delete(user)
    db.commit()
    
    return {"message": f"ユーザー '{display_name}' を削除しました。"}

@app.get("/api/v1/admin/settings/dow", response_model=DayOfWeekSettings)
def get_dow_settings_endpoint(admin_user: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    return get_dow_settings(db)

@app.put("/api/v1/admin/settings/dow", response_model=DayOfWeekSettings)
def update_dow_settings(settings: DayOfWeekSettings, admin_user: User = Depends(get_admin_user), db: Session = Depends(get_db)):
    set_dow_settings(db, settings)
    return settings

# データベーステーブル作成
if __name__ == "__main__":
    Base.metadata.create_all(bind=engine)
    print("データベーステーブルが作成されました。")