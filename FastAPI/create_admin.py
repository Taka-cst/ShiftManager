from sqlalchemy.orm import Session
from main import SessionLocal, User, get_password_hash
import sys

def create_admin_user():
    db = SessionLocal()
    try:
        # 既存の管理者ユーザーをチェック
        existing_admin = db.query(User).filter(User.admin == True).first()
        if existing_admin:
            print(f"管理者ユーザー '{existing_admin.username}' が既に存在します。")
            return
        
        # 管理者ユーザー作成
        username = input("管理者ユーザー名を入力してください: ")
        display_name = input("管理者表示名を入力してください: ")
        password = input("管理者パスワードを入力してください: ")
        
        if not username or not display_name or not password:
            print("すべての項目を入力してください。")
            return
        
        # ユーザー名の重複チェック
        if db.query(User).filter(User.username == username).first():
            print("そのユーザー名は既に使用されています。")
            return
        
        admin_user = User(
            username=username,
            DisplayName=display_name,
            hashed_password=get_password_hash(password),
            admin=True
        )
        
        db.add(admin_user)
        db.commit()
        print(f"管理者ユーザー '{username}' を作成しました。")
        
    except Exception as e:
        print(f"エラーが発生しました: {e}")
        db.rollback()
    finally:
        db.close()

if __name__ == "__main__":
    create_admin_user()