FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
# the API is served from the same host under /api, which overrides the value in .env.production
ARG VITE_API_ROOT=/api/
ENV VITE_API_ROOT=$VITE_API_ROOT
RUN npm run build

FROM nginx:1.30-alpine
COPY nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/build /usr/share/nginx/html
EXPOSE 80
