FROM node:20-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# Меняем base на / для веб-сервера (вместо ./ для Android)
RUN sed -i "s|base: './'|base: '/'|" vite.config.js
# Supabase включается, только если заданы оба значения; Vite вшивает их в бандл при сборке.
# Их передаёт CI из переменных репозитория. ARG без значения по умолчанию: не переданный
# аргумент не попадает в окружение и не перекрывает .env при сборке без CI.
ARG VITE_SUPABASE_URL
ARG VITE_SUPABASE_ANON_KEY
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
