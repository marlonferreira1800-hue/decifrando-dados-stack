# Etapa 1: build do React
FROM node:22-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN if [ -f package-lock.json ]; then npm ci --silent; else npm install --silent; fi
COPY . .
# URL pública do backend, embutida no bundle em tempo de build
ARG VITE_API_URL=""
ENV VITE_API_URL=$VITE_API_URL
RUN npm run build

# Etapa 2: servir arquivos estáticos com nginx
FROM nginx:alpine
# O template usa ${PORT} (Railway injeta PORT; padrão 80)
ENV PORT=80
COPY nginx.conf /etc/nginx/templates/default.conf.template
COPY --from=build /app/dist /usr/share/nginx/html
EXPOSE 80
