# MixarLabOS v2 Desktop (Tauri + React + TypeScript)

## Status
- 桌面端主模块已可运行（仪表盘 / 项目中心 / 报价中心 / 时间节点 / 财务总账 / 订阅 / 数字资产 / 客户 / 合约 / 供应商 / 设置）
- 订阅管理模块已对齐 `开发文档/MixarLabOS_订阅管理模块升级执行文档.md` 的核心验收项
- 已通过 `pnpm build` 与 `pnpm tauri build` 验证（macOS bundle 可生成）

## Current Scope
- Product architecture aligned with `开发文档/MixarLabOS_v2_Hybrid_Architecture.md`
- Subscription module architecture aligned with `开发文档/MixarLabOS_订阅管理模块升级执行文档.md`
- Notion DataProvider 已支持：
  - `databases`/`data_sources` 双端点 fallback
  - 自动分页拉取（超过 100 条继续拉取）
- 订阅模块已支持：
  - 列表 / 日历 / 趋势 三视图
  - 本地缓存 `subscription_cache_v2`（TTL 5 分钟）
  - 新增订阅（资产库 + 财务总账双库写回）
  - 状态回写（status/select 双兼容）
  - 本地续费提醒（Notification API）
  - SubList 风格卡片 + 详情分栏 + selfh.st logo 自动同步脚本
- 项目中心已支持 relation 字段名 fallback 查询
- 报价中心已支持数据库 schema 自适配回写

## Next Step
1. 在真实 Notion 数据下继续校准字段映射（尤其商务合约库中的可选字段）。
2. 根据业务节奏决定是否启动 `mixarlab-viewer`（Flutter iOS 只读端）仓库。
3. 为订阅 logo 扩展私有映射（403 图标可用本地 SVG 手动补齐）。
