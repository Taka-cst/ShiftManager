FastAPI + MySQL を使用したシフト管理アプリのバックエンドAPIです。

## セットアップ手順

### 1. 依存関係のインストール

```bash
pip install -r requirements.txt
```

### 2. MySQLデータベースのセットアップ

#### Docker Composeを使用する場合：

```bash
docker-compose up -d
```

#### 手動でMySQLをセットアップする場合：

1. MySQLサーバーを起動
2. データベースを作成:
   ```sql
   CREATE DATABASE shift_management CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
   ```

### 3. 環境変数の設定

`.env`ファイルを作成し、必要な設定を記述してください。

### 4. データベーステーブルの作成

```bash
python -c "from main import Base, engine; Base.metadata.create_all(bind=engine)"
```

### 5. 初期管理者アカウントの作成

```bash
python create_admin.py
```

### 6. アプリケーションの起動

```bash
python run.py
```

または

```bash
uvicorn main:app --reload
```

## API仕様

- **ベースURL**: `http://localhost:8000/api/v1`
- **API仕様書**: `http://localhost:8000/docs` (Swagger UI)
- **認証**: JWT Bearer Token

## 主な機能

- ユーザー登録・ログイン・認証
- シフト（イベント）の登録・更新・削除
- 管理者向け機能：
  - ユーザー管理
  - 授業曜日設定
  - 全ユーザーのシフト閲覧

## 技術スタック

- **フレームワーク**: FastAPI
- **データベース**: MySQL
- **ORM**: SQLAlchemy
- **認証**: JWT (JSON Web Token)
- **パスワードハッシュ化**: bcrypt

## ディレクトリ構成

```
.
├── main.py                 # メインアプリケーション
├── run.py                  # アプリケーション起動スクリプト
├── create_admin.py         # 管理者アカウント作成スクリプト
├── requirements.txt        # Python依存関係
├── .env                    # 環境変数設定
├── docker-compose.yml      # Docker Compose設定
├── init.sql               # データベース初期化SQL
└── README.md              # このファイル
```