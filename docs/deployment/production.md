# 生产环境部署

## PM2 部署

### 安装 PM2

```bash
npm install -g pm2
```

### 启动

```bash
pm2 start dist/cli/index.js --name openclaw-monitor -- start
pm2 save
pm2 startup
```

### 配置文件

**ecosystem.config.js:**

```javascript
module.exports = {
  apps: [{
    name: 'openclaw-monitor',
    script: './dist/cli/index.js',
    args: 'start',
    instances: 1,
    autorestart: true,
    watch: false,
    max_memory_restart: '500M',
    env: {
      NODE_ENV: 'production'
    }
  }]
};
```

使用配置文件启动：

```bash
pm2 start ecosystem.config.js
```

## 日志轮转

使用 **logrotate**:

```
/var/log/openclaw/*.log {
    daily
    rotate 14
    compress
    delaycompress
    notifempty
    create 0640 openclaw openclaw
}
```

## 反向代理

### Nginx

```nginx
location /openclaw/ {
    proxy_pass http://localhost:37890/;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_cache_bypass $http_upgrade;
}
```

### Caddy

```
openclaw.example.com {
    reverse_proxy localhost:37890
}
```

## 监控告警配置

1. 配置告警通道（参考 configuration.md）
2. 设置合理的阈值
3. 测试告警：`openclaw-monitor diagnose`

## 系统服务 (Linux)

创建 systemd 服务：

```ini
[Unit]
Description=OpenClaw Monitor
After=network.target

[Service]
Type=simple
User=openclaw
WorkingDirectory=/opt/openclaw-monitor
ExecStart=/usr/bin/node dist/cli/index.js start
Restart=on-failure

[Install]
WantedBy=multi-user.target
```

启动服务：

```bash
sudo systemctl enable openclaw-monitor
sudo systemctl start openclaw-monitor
```
