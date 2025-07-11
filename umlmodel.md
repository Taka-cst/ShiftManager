# ユースケース図 (Mermaid)

```mermaid
graph LR
  管理者["管理者"] 
  一般ユーザー["一般ユーザー"]

  subgraph "シフト管理システム"
    direction LR
    UC1["ユーザー登録"]
    UC2["ログイン"]
    UC3["自分のユーザー情報取得"]
    UC4["シフト希望を提出"]
    UC5["シフト希望を更新"]
    UC6["シフト希望を削除"]
    UC7["自分のシフト希望一覧を取得"]
    UC8["確定シフトを閲覧"]
    UC9["全ユーザーのシフト希望一覧を取得"]
    UC10["シフトを確定"]
    UC11["確定シフトを更新"]
    UC12["確定シフトを削除"]
    UC13["全ユーザー一覧を取得"]
    UC14["ユーザーを削除"]
    UC15["授業曜日を設定"]
  end

  %% 継承関係
  管理者 -.->|"継承"| 一般ユーザー

  %% 一般ユーザーの操作
  一般ユーザー --> UC1
  一般ユーザー --> UC2
  一般ユーザー --> UC3
  一般ユーザー --> UC4
  一般ユーザー --> UC5
  一般ユーザー --> UC6
  一般ユーザー --> UC7
  一般ユーザー --> UC8

  %% 管理者の操作
  管理者 --> UC9
  管理者 --> UC10
  管理者 --> UC11
  管理者 --> UC12
  管理者 --> UC13
  管理者 --> UC14
  管理者 --> UC15
```

# クラス図 (Mermaid)

```mermaid
classDiagram
  class ユーザー {
    +int id
    +string username
    +string DisplayName
    +string hashed_password
    +bool admin
    +datetime created_at
  }

  class シフト希望 {
    +int id
    +date date
    +bool canwork
    +string description
    +datetime start_time
    +datetime end_time
    +int user_id
    +datetime created_at
    +datetime updated_at
  }

  class 確定シフト {
    +int id
    +date date
    +datetime start_time
    +datetime end_time
    +int user_id
    +datetime created_at
    +datetime updated_at
  }

  class 設定 {
    +int id
    +string key
    +string value
  }

  ユーザー "1" -- "0..*" シフト希望 : 持つ
  ユーザー "1" -- "0..*" 確定シフト : 持つ

  class 認証API {
    <<API>>
    +ユーザー登録()
    +ログイン()
    +ログインユーザー情報取得()
  }

  class シフト希望API {
    <<API>>
    +自分のシフト希望一覧取得()
    +シフト希望作成()
    +シフト希望更新()
    +シフト希望削除()
  }

  class 確定シフトAPI {
    <<API>>
    +確定シフト一覧取得()
  }

  class 管理者API {
    <<API>>
    +全シフト希望取得()
    +確定シフト作成()
    +確定シフト更新()
    +確定シフト削除()
    +全ユーザー取得()
    +ユーザー削除()
    +曜日設定取得()
    +曜日設定更新()
  }

  class 認証コンテキスト {
    <<React>>
    +User ユーザー
    +ログイン()
    +ログアウト()
  }
  class シフト希望ページ {
    <<React>>
    +シフトカレンダー
    +シフト希望フォーム
  }
  class 確定シフトページ {
    <<React>>
    +確定シフトカレンダー
  }
  class 管理者ダッシュボード {
    <<React>>
    +ユーザー管理
    +シフト希望管理
    +曜日設定
  }

  認証API ..> ユーザー
  シフト希望API ..> シフト希望
  確定シフトAPI ..> 確定シフト
  管理者API ..> ユーザー
  管理者API ..> シフト希望
  管理者API ..> 確定シフト
  管理者API ..> 設定

  認証コンテキスト ..> 認証API : uses
  シフト希望ページ ..> シフト希望API : uses
  確定シフトページ ..> 確定シフトAPI : uses
  管理者ダッシュボード ..> 管理者API : uses
```

# 協調図 (Mermaid)

## シフト希望登録の協調図

```mermaid
sequenceDiagram
    participant User as 一般ユーザー
    participant Frontend as フロントエンド
    participant AuthCtx as 認証コンテキスト
    participant API as バックエンドAPI
    participant DB as データベース

    Note over User, DB: シフト希望登録フロー

    User->>Frontend: シフト希望フォーム入力
    Frontend->>AuthCtx: 認証状態確認
    AuthCtx-->>Frontend: JWT トークン
    Frontend->>API: POST /api/v1/shift-requests/
    Note right of API: Authorization: Bearer <token>
    API->>API: JWT 検証
    API->>DB: 曜日設定確認
    DB-->>API: 授業曜日情報
    API->>API: 曜日バリデーション
    API->>DB: 重複チェック
    DB-->>API: 重複結果
    API->>DB: シフト希望保存
    DB-->>API: 保存結果
    API-->>Frontend: 201 Created + シフト希望データ
    Frontend-->>User: 登録完了メッセージ
```

## 管理者によるシフト確定の協調図

```mermaid
sequenceDiagram
    participant Admin as 管理者
    participant Frontend as フロントエンド
    participant AuthCtx as 認証コンテキスト
    participant API as バックエンドAPI
    participant DB as データベース

    Note over Admin, DB: シフト確定フロー

    Admin->>Frontend: 月次シフト画面アクセス
    Frontend->>AuthCtx: 管理者権限確認
    AuthCtx-->>Frontend: 管理者JWT
    Frontend->>API: GET /api/v1/admin/shift-requests
    API->>API: 管理者権限検証
    API->>DB: 全シフト希望取得
    DB-->>API: シフト希望一覧
    API-->>Frontend: シフト希望データ
    Frontend-->>Admin: シフト希望表示

    Admin->>Frontend: 確定シフト作成
    Frontend->>API: POST /api/v1/admin/confirmed-shifts
    API->>DB: ユーザー存在確認
    DB-->>API: ユーザー情報
    API->>DB: 重複チェック
    DB-->>API: 重複結果
    API->>DB: 確定シフト保存
    DB-->>API: 保存結果
    API-->>Frontend: 201 Created + 確定シフトデータ
    Frontend-->>Admin: 確定完了メッセージ
```

## 一般ユーザーによる全員確定シフト閲覧の協調図

```mermaid
sequenceDiagram
    participant User as 一般ユーザー
    participant Frontend as フロントエンド
    participant AuthCtx as 認証コンテキスト
    participant API as バックエンドAPI
    participant DB as データベース

    Note over User, DB: 全員確定シフト閲覧フロー

    User->>Frontend: みんなの確定シフト画面アクセス
    Frontend->>AuthCtx: 認証状態確認
    AuthCtx-->>Frontend: JWT トークン
    Frontend->>Frontend: 年月選択
    Frontend->>API: GET /api/v1/confirmed-shifts/all?year=2025&month=7
    Note right of API: Authorization: Bearer <token>
    API->>API: JWT 検証（一般ユーザー可）
    API->>DB: 全ユーザーの確定シフト取得
    Note right of DB: JOIN users テーブル
    DB-->>API: 確定シフト + ユーザー情報
    API->>API: 日本時間変換
    API-->>Frontend: 確定シフトデータ（読み取り専用）
    Frontend->>Frontend: テーブル形式で整理
    Frontend-->>User: 全員の確定シフト表示
```

# 状態遷移図 (Mermaid)

## ユーザー認証状態の遷移図

```mermaid
stateDiagram-v2
    [*] --> 未認証
    
    未認証 --> ログイン中 : ログイン試行
    ログイン中 --> 認証済み : 認証成功
    ログイン中 --> 未認証 : 認証失敗
    
    認証済み --> 一般ユーザー : 一般ユーザー
    認証済み --> 管理者 : 管理者権限あり
    
    一般ユーザー --> ログアウト中 : ログアウト
    管理者 --> ログアウト中 : ログアウト
    
    ログアウト中 --> 未認証 : ログアウト完了
    
    一般ユーザー --> 未認証 : トークン期限切れ
    管理者 --> 未認証 : トークン期限切れ
    
    note right of 一般ユーザー
        - シフト希望の作成・編集・削除
        - 自分の確定シフト閲覧
        - 全員の確定シフト閲覧（読み取り専用）
    end note
    
    note right of 管理者
        一般ユーザー機能 +
        - ユーザー管理
        - シフト確定・編集・削除
        - 曜日設定
    end note
```

## シフト希望の状態遷移図

```mermaid
stateDiagram-v2
    [*] --> 未登録
    
    未登録 --> 作成中 : 新規作成開始
    作成中 --> 登録済み : 保存成功
    作成中 --> 未登録 : キャンセル/エラー
    
    登録済み --> 編集中 : 編集開始
    編集中 --> 登録済み : 更新成功
    編集中 --> 登録済み : キャンセル
    
    登録済み --> 削除中 : 削除実行
    削除中 --> 削除済み : 削除成功
    削除中 --> 登録済み : 削除失敗
    
    削除済み --> [*]
    
    登録済み --> 確定済み : 管理者が確定シフト作成
    
    note right of 登録済み
        - 勤務可/不可
        - 希望時間
        - コメント
        状態: canwork, start_time, end_time, description
    end note
    
    note right of 確定済み
        シフト希望から確定シフトへ
        （別エンティティとして管理）
    end note
```

## アプリケーション画面遷移の状態図

```mermaid
stateDiagram-v2
    [*] --> ランディング
    
    ランディング --> 登録画面 : 新規登録
    ランディング --> ログイン画面 : ログイン
    
    登録画面 --> ログイン画面 : 登録成功
    登録画面 --> ランディング : キャンセル
    
    ログイン画面 --> ダッシュボード : ログイン成功
    ログイン画面 --> ランディング : キャンセル
    
    ダッシュボード --> シフト希望一覧 : シフト希望管理
    ダッシュボード --> みんなの確定シフト : 確定シフト閲覧
    ダッシュボード --> 管理者ダッシュボード : 管理者メニュー（管理者のみ）
    
    シフト希望一覧 --> シフト希望フォーム : 新規作成/編集
    シフト希望フォーム --> シフト希望一覧 : 保存/キャンセル
    
    管理者ダッシュボード --> ユーザー管理 : ユーザー管理
    管理者ダッシュボード --> 月次シフト管理 : シフト管理
    管理者ダッシュボード --> 曜日設定 : 設定管理
    
    ユーザー管理 --> 管理者ダッシュボード : 戻る
    月次シフト管理 --> 管理者ダッシュボード : 戻る
    曜日設定 --> 管理者ダッシュボード : 戻る
    
    シフト希望一覧 --> ダッシュボード : ホーム
    みんなの確定シフト --> ダッシュボード : ホーム
    管理者ダッシュボード --> ダッシュボード : ホーム
    
    ダッシュボード --> ランディング : ログアウト
    シフト希望一覧 --> ランディング : ログアウト
    みんなの確定シフト --> ランディング : ログアウト
    管理者ダッシュボード --> ランディング : ログアウト
    
    note right of みんなの確定シフト
        新機能：一般ユーザーも
        全員の確定シフトを閲覧可能
        （管理者風テーブル表示）
    end note
```
