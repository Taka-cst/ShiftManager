# シフト管理アプリ バックエンド

FastAPI + MySQL を使用したシフト管理アプリのバックエンドAPIです。

## セットアップ手順

### Docker を使用する場合（推奨）

#### 1. リポジトリをクローン
```bash
git clone <repository-url>
cd shift-management-backend
```

#### 2. 環境変数の設定
`.env`ファイルを作成し、必要な設定を記述してください。

#### 3. アプリケーションを起動
```bash
# 開発環境
make up
# または
docker-compose up -d

# 本番環境
make prod-up
# または
docker-compose -f docker-compose.prod.yml up -d
```

#### 4. 初期管理者アカウントの作成
```bash
make create-admin
# または
docker-compose exec api python create_admin.py
```

### ローカル環境での開発

#### 1. 依存関係のインストール

```bash
pip install -r requirements.txt
```

#### 2. MySQLデータベースのセットアップ

```bash
# Docker Composeでデータベースのみ起動
docker-compose up -d mysql
```

#### 3. 環境変数の設定

`.env`ファイルを作成し、必要な設定を記述してください。

#### 4. データベーステーブルの作成

```bash
python -c "from main import Base, engine; Base.metadata.create_all(bind=engine)"
```

#### 5. 初期管理者アカウントの作成

```bash
python create_admin.py
```

#### 6. アプリケーションの起動

```bash
python run.py
```

## 便利なコマンド

```bash
make help          # 利用可能なコマンドを表示
make build         # Dockerイメージをビルド
make up            # アプリケーションを起動
make down          # アプリケーションを停止
make logs          # ログを表示
make shell         # APIコンテナにアクセス
make mysql-shell   # MySQLコンテナにアクセス
make clean         # 不要なリソースを削除
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
