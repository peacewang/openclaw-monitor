# 故障排查

## 常见问题

### 监控未检测到进程

**症状**: status 显示 "已停止"

**排查**:
1. 检查配置中的进程名称/PID 是否正确
2. 运行 `openclaw-monitor diagnose` 查看详细日志
3. 检查日志路径是否正确

### 告警未发送

**症状**: 触发阈值但未收到告警

**排查**:
1. 检查 `alerts.enabled = true`
2. 检查通道配置（Token、URL）
3. 使用 Web UI 的测试告警功能
4. 查看日志中的错误信息

### Web UI 无法访问

**症状**: 打开页面无响应

**排查**:
1. 检查端口是否被占用:
   ```bash
   # Linux/macOS
   lsof -i :37890

   # Windows
   netstat -ano | findstr :37890
   ```
2. 检查防火墙设置
3. 查看服务日志

### CPU/内存显示为 0

**原因**: pidusage 无法获取信息

**解决**:
- Windows: 以管理员身份运行
- Linux: 确保有权限读取 /proc
- macOS: 可能需要授权

## 调试模式

```bash
OPENCLAW_LOG_LEVEL=debug openclaw-monitor start
```

## 日志位置

- **系统日志**: `/var/log/openclaw/` (Linux)
- **控制台输出**: 重定向到文件
- **PM2 日志**: `~/.pm2/logs/`

## 日志级别

| 级别 | 说明 |
|------|------|
| debug | 详细调试信息 |
| info | 一般信息 |
| warn | 警告信息 |
| error | 错误信息 |

## 获取帮助

1. 查看文档：[README.md](../../README.md)
2. 提交 Issue：[GitHub Issues](https://github.com/your-repo/issues)
3. 查看诊断输出：`openclaw-monitor diagnose`
