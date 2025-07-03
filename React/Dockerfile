# FROM node:18-alpine

# WORKDIR /app

# COPY package.json package-lock.json ./
# RUN npm install

# COPY . .

# EXPOSE 3000

# CMD ["npm", "start"]

FROM nginx:alpine

# カスタムNginx設定をコピー
COPY nginx.conf /etc/nginx/conf.d/default.conf

# 既存のbuildディレクトリをそのままコピー
COPY build /usr/share/nginx/html

# Nginxのポート80を公開
EXPOSE 80

# Nginxを起動
CMD ["nginx", "-g", "daemon off;"]