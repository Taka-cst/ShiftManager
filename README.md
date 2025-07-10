# 🚀 シフト管理アプリ

![バージョン](https://img.shields.io/badge/バージョン-2.0.0-blue)
![React](https://img.shields.io/badge/フロントエンド-React-61dafb)
![FastAPI](https://img.shields.io/badge/バックエンド-FastAPI-009688)
![MySQL](https://img.shields.io/badge/データベース-MySQL-4479a1)
![Docker](https://img.shields.io/badge/環境-Docker-2496ed)

授業シフトを効率的に管理するためのモダンなWebアプリケーション。シフト希望の提出から確定まで、シンプルで使いやすいインターフェースで一元管理できます。

## ✨ 主な機能

- **直感的なユーザーインターフェース**：Material-UIを使用した美しく使いやすいデザイン
- **シフト希望管理**：希望シフトの登録・編集・削除
- **確定シフト表示**：カレンダー形式での確定シフト一覧表示
- **管理者機能**：ユーザー管理、シフト確定、曜日設定など
- **レスポンシブデザイン**：あらゆるデバイスに対応したレイアウト

## 🔧 技術スタック

### バックエンド
- **FastAPI**: 高速なAPIフレームワーク
- **MySQL**: データベース
- **SQLAlchemy**: ORMツール
- **JWT**: 認証システム
- **Docker**: コンテナ化

### フロントエンド
- **React**: UIライブラリ
- **TypeScript**: 型安全なコーディング
- **Material-UI**: UIコンポーネント
- **React Router**: ルーティング
- **Axios**: API通信
- **date-fns**: 日付操作

## 📋 システム構成図

```
+-------------------+      +-------------------+      +-------------------+
|                   |      |                   |      |                   |
|  React フロント   | <--> |  FastAPI バック   | <--> |  MySQL データベース |
|                   |      |                   |      |                   |
+-------------------+      +-------------------+      +-------------------+
      (Port: 9876)               (Port: 4567)              (Port: 3309)
```

## 🚀 セットアップ手順

### 環境準備

```bash
# リポジトリをクローン
git clone <リポジトリURL>
cd ShiftManager

# 環境変数ファイルを作成
cp .env.example .env
# .envファイルを適宜編集
```

### Dockerを使用する場合（推奨）

```bash
# コンテナ起動
docker-compose up -d

# 管理者アカウント作成
docker-compose exec api python create_admin.py
```

### 手動セットアップ

#### バックエンド（FastAPI）
```bash
cd FastAPI
pip install -r requirements.txt
python run.py
```

#### フロントエンド（React）
```bash
cd React
npm install
npm start
```

## 💻 アクセス方法

- **フロントエンド**: http://localhost:9876
- **バックエンドAPI**: http://localhost:4567
- **API仕様書**: http://localhost:4567/docs

## 👥 ユーザー権限

### 一般ユーザー
- シフト希望の提出・編集
- 自分の確定シフト閲覧

### 管理者ユーザー
- 全ユーザーのシフト希望確認
- シフト確定操作
- ユーザー管理
- 曜日設定

## 📅 使用例

1. **ユーザー登録**：「新規登録」から必要情報を入力
2. **ログイン**：ユーザー名とパスワードでログイン
3. **シフト希望提出**：カレンダーから日付を選び、勤務可否と希望時間を登録
4. **確定シフト確認**：「確定シフト」メニューから自分の確定シフトを確認

## 🔒 セキュリティ対策

- JWTを使用した安全な認証
- パスワードのハッシュ化
- CORSの適切な設定
- 権限に基づいたアクセス制御
