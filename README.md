# MixarLabOS v4 Web (Vite + Hono + SQLite)

## Status
- 已完成从 Tauri 桌面架构到 Web 架构迁移
- 前端：React + Vite
- 后端：Hono + better-sqlite3
- 数据库：SQLite（默认 `./data/data.db`）

## Architecture
- Frontend: `src/`
- Backend: `server/`
- API base: `/api/db/*`
- Schema migration: `server/migrations/001_initial.sql`

## Development
1. 安装依赖
```bash
pnpm install
```

2. 启动后端（终端 1）
```bash
pnpm dev:server
```

3. 启动前端（终端 2）
```bash
pnpm dev
```

前端开发环境通过 Vite 代理将 `/api` 转发到 `http://localhost:3100`。

## Build
```bash
pnpm build
```

## Run API Server (without watcher)
```bash
pnpm start
```

## Data Import / Export
- 设置页支持：
  - 导出 JSON（`POST /api/db/export`）
  - 导入 JSON（`POST /api/db/import`，全量替换，事务回滚）

## Notes
- 本版本不再使用 Tauri 打包流程，不再产出 DMG/桌面安装包。
