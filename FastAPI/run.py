import uvicorn
from main import app, Base, engine

if __name__ == "__main__":
    # データベーステーブル作成
    Base.metadata.create_all(bind=engine)
    print("データベーステーブルが作成されました。")
    
    # FastAPIアプリケーション起動
    uvicorn.run(
        "main:app",
        host="0.0.0.0",
        port=4567,
        reload=True,
        log_level="info"
    )
