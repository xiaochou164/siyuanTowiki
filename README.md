# Siyuan to Wiki Plugin (Skeleton)

本仓库已初始化为思源笔记 → Wiki 推送插件的项目骨架，并已进入持续迭代。

## 当前包含
- 分层目录结构（app/domain/infra/ui/shared）
- 核心类型、状态机、错误分类、重试策略
- API Client / Repository / Queue 的接口与基础实现
- 首批 usecases（推送、批量、删除、暂停恢复、解除映射、配置）
- 已推送页面管理能力（列表筛选、批量暂停/恢复/解除映射/删除远端）
- 批量推送失败项重试能力（仅重试 failedDocIds）
- 连接测试能力（基于本地配置解密 API Key 后调用 `/auth/me`）
- 推送日志导出能力（JSON / CSV）
- 推送指标统计能力（成功率、成功/失败数、按 actionType 聚合）
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
```
