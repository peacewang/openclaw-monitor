# Docker 部署

## Dockerfile

```dockerfile
FROM node:18-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci --only=production

COPY . .
RUN npm run build

EXPOSE 37890

CMD ["node", "dist/cli/index.js", "start"]
```

## 构建

```bash
docker build -t openclaw-monitor:latest .
```

## 运行

```bash
docker run -d \
  --name openclaw-monitor \
  -p 37890:37890 \
  -v /path/to/logs:/var/log/openclaw \
  -v /path/to/config:/config \
  openclaw-monitor:latest
```

## docker-compose

```yaml
version: '3.8'

services:
  monitor:
    image: openclaw-monitor:latest
    container_name: openclaw-monitor
    restart: unless-stopped
    ports:
      - "37890:37890"
    volumes:
      - ./logs:/var/log/openclaw
      - ./config:/config
    environment:
      - NODE_ENV=production
      - OPENCLAW_CONFIG_PATH=/config/openclaw.json
```

## 健康检查

```bash
curl http://localhost:37890/api/status
```

## 日志查看

```bash
docker logs -f openclaw-monitor
```

## 停止和删除

```bash
docker stop openclaw-monitor
docker rm openclaw-monitor
```
