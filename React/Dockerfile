FROM nginx:alpine

# カスタムNginx設定をコピー
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 既存のbuildディレクトリをそのままコピー
COPY ./build/ /usr/share/nginx/html/

# ファイル権限を適切に設定
RUN chmod -R 755 /usr/share/nginx/html/

# Nginxのポート80を公開
EXPOSE 80

# Nginxを起動
CMD ["nginx", "-g", "daemon off;"]