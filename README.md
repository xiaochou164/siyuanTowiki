# Siyuan to Wiki Plugin

![Siyuan to Wiki banner](assets/banner.svg)

思源笔记到 Wiki 的同步发布插件，支持在思源左侧面板内完成配置、连接检查、当前文档发布、已发布列表查看与链接管理。

## Logo Assets
- 集市/仓库图标: `icon.png`
- 集市预览图: `preview.png`
- 主 Logo: `assets/logo.svg`
- 图标版: `assets/logo-mark.svg`
- Banner: `assets/banner.svg`
- Preview 源文件: `assets/preview.svg`

> 说明：思源插件集市展示更依赖仓库根目录下的 `icon.png`，而不是在 `plugin.json` 中单独声明图标路径。

## 当前包含
- 分层目录结构（app/domain/infra/ui/shared）
- 核心类型、状态机、错误分类、重试策略
- API Client / Repository / Queue 的接口与基础实现
- 首批 usecases（推送、批量、删除、暂停恢复、解除映射、配置）
- 已推送页面管理能力（列表筛选、批量暂停/恢复/解除映射/删除远端）
- 已推送页面管理能力（列表支持状态/关键词/时间范围筛选，批量暂停/恢复/解除映射/删除远端）
- 单条立即重推与批量重推入口（复用现有推送流程）
- 批量推送失败项重试能力（仅重试 failedDocIds）
- 连接测试能力（基于本地配置解密 API Key 后调用 `/auth/me`）
- 连接测试回退能力：`/auth/me` 不可用时自动回退 `/spaces`，并区分 401/403/网络错误提示
- 删除远端保护：启用删除确认开关时，单条和批量删除都必须显式确认
- 更新策略开关：可配置“仅正文更新（保留远端标题）”
- 只读演练预检能力：单篇/批量返回可推送性、预计动作与跳过原因
- 推送日志导出能力（JSON / CSV）
- 单次任务日志查询能力（按 `traceId` 获取全链路日志）
- 推送指标统计能力（成功率、成功/失败数、按 actionType 聚合）
- 推送指标统计能力（成功率、成功/失败数、按 actionType / errorCode / httpCode 聚合）
- 附件上传能力（对接 `/attachments/upload`，支持批量上传结果返回）
- 404 自动修复能力（更新失败时可自动重建远端页面并刷新映射）
- 配置用例（`ConfigurePluginUseCase`）与密钥封装（`SecretStore`）
- 插件门面服务（`PluginService`）用于聚合业务操作
- 批量推送汇总统计与失败日志落库
- 可配置并发队列（`ConcurrentTaskQueue`）
- Node 内建测试（状态机、重试策略、列表筛选、批量管理、日志导出、失败重试）

## 开发命令
```bash
npm run typecheck
npm run build
npm run test
npm run package
```

## 发布到思源集市
- 思源集市读取的是发布包中的 `icon.png`，不是只看仓库默认分支。
- 集市建议同时提供 `preview.png`，用于插件详情页预览图展示。
- 发布前先执行 `npm run package`，会生成 `release/package.zip`。
- 创建 GitHub Release 时，把 `release/package.zip` 作为附件上传，集市抓取到新的发布包后才会更新图标与包内容。
