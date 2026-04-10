# Siyuan to Wiki Plugin (Skeleton)

本仓库已初始化为思源笔记 → Wiki 推送插件的项目骨架，并已进入持续迭代。

## 当前包含
- 分层目录结构（app/domain/infra/ui/shared）
- 核心类型、状态机、错误分类、重试策略
- API Client / Repository / Queue 的接口与基础实现
- 首批 usecases（推送、批量、删除、暂停恢复、解除映射）
- 配置用例（`ConfigurePluginUseCase`）与密钥封装（`SecretStore`）
- 插件门面服务（`PluginService`）用于聚合业务操作
- 批量推送汇总统计与失败日志落库
- 可配置并发队列（`ConcurrentTaskQueue`）

## 开发命令
```bash
npm run typecheck
npm run build
npm run test
```
