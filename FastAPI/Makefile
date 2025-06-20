.PHONY: help build up down logs shell test clean

help: ## このヘルプを表示
	@grep -E '^[a-zA-Z_-]+:.*?## .*$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "\033[36m%-30s\033[0m %s\n", $1, $2}'

build: ## Dockerイメージをビルド
	docker-compose build

up: ## アプリケーションを起動（開発環境）
	docker-compose up -d

down: ## アプリケーションを停止
	docker-compose down

logs: ## ログを表示
	docker-compose logs -f

shell: ## APIコンテナにシェルでアクセス
	docker-compose exec api /bin/bash

mysql-shell: ## MySQLコンテナにアクセス
	docker-compose exec mysql mysql -u shift_user -p shift_management

test: ## テストを実行
	docker-compose exec api python -m pytest

clean: ## 不要なDockerリソースを削除
	docker-compose down -v
	docker system prune -f

prod-up: ## 本番環境でアプリケーションを起動
	docker-compose -f docker-compose.prod.yml up -d

prod-down: ## 本番環境のアプリケーションを停止
	docker-compose -f docker-compose.prod.yml down

create-admin: ## 管理者アカウントを作成
	docker-compose exec api python create_admin.py