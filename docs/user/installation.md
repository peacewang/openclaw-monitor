# 安装指南

## 前置要求

- **Node.js** 18.0 或更高版本
- **npm** 或 **yarn**

## npm 安装

### 全局安装

```bash
npm install -g openclaw-monitor
```

安装后，可以直接在终端使用：

```bash
openclaw-monitor start
```

### 本地安装

```bash
git clone https://github.com/your-repo/openclaw-monitor.git
cd openclaw-monitor
npm install
npm run build
npm link
```

## 验证安装

```bash
openclaw-monitor --version
openclaw-monitor help
```

## 从源码构建

```bash
git clone https://github.com/your-repo/openclaw-monitor.git
cd openclaw-monitor
npm install
npm run build
```

构建产物将输出到 `dist/` 目录。

## 系统要求

| 平台 | 支持状态 |
|------|----------|
| Linux | ✅ 完全支持 |
| macOS | ✅ 完全支持 |
| Windows | ✅ 完全支持 (需管理员权限) |

## 可选依赖

某些功能需要额外的系统工具：

- **进程检测**:
  - Linux/macOS: `pgrep` 或 `ps`
  - Windows: 内置 `tasklist` 命令
- **端口检测**:
  - Linux/macOS: `lsof`
  - Windows: 内置 `netstat` 命令
