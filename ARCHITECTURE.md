# 思源笔记 → Wiki Push 插件架构设计文档（基于 PRD v1.2）

## 1. 文档目标
本文档基于 `PRD.md`（v1.2）输出可落地的技术架构方案，覆盖：
1. 技术栈选型与理由；
2. 模块化架构设计；
3. 核心数据结构与状态机实现；
4. 推送、删除、暂停/恢复、批量任务等关键流程；
5. 非功能能力（安全、可靠性、可观测性）；
6. 工程落地建议（目录结构、编码规范、测试策略）。

---

## 2. 技术栈选型

## 2.1 运行环境与语言
- **TypeScript**（主语言）
  - 理由：
    - 思源插件生态以 JS/TS 为主，集成成本低；
    - 静态类型适合任务状态机、错误码分层与 API DTO 约束；
    - 对多人协作与后续维护友好。

- **Node.js Runtime（由思源插件环境提供）**
  - 理由：
    - 与思源插件 API 兼容；
    - 原生支持 `fetch`/Promise 异步任务模型，适合队列调度。

## 2.2 UI 层
- **Svelte + TypeScript**（推荐）
  - 理由：
    - 轻量、学习成本低、构建产物小；
    - 适合插件设置页、任务面板、管理页这类中型交互界面；
    - 响应式数据模型实现“状态列表 + 批量操作”简单。

> 备选：若当前项目已统一 React/Vue，可保持团队一致性优先，不强制迁移。

## 2.3 状态管理
- **轻量 Store（Svelte store / Zustand 风格）**
  - 理由：
    - 仅需管理配置、任务、映射列表、日志，不必引入重量级状态库；
    - 支持分页、筛选、批量选择等 UI 状态。

## 2.4 数据持久化
- **插件本地存储 + SQLite（推荐）**
  - `plugin_config`：KV 存储即可；
  - `doc_mapping`、`push_logs`：建议 SQLite（或思源等价表存储）。
  - 理由：
    - 映射与日志具备结构化查询需求（按状态/时间筛选）；
    - 批量操作与审计要求下，SQL 查询效率与可维护性更好。

## 2.5 网络层
- **原生 fetch + 自研 API Client 封装**
  - 理由：
    - 依赖少、可控性高；
    - 可统一注入鉴权、超时、错误映射、重试策略。

## 2.6 任务调度
- **P-Queue（或等价并发队列）**
  - 理由：
    - 原生支持并发限制、任务优先级、节流策略；
    - 易实现“失败重试、暂停页面跳过、失败项重试”。

## 2.7 校验与工具库
- **Zod**：运行时 DTO 校验（配置项、接口响应）。
- **dayjs**：时间格式化。
- **nanoid**：traceId 生成。

## 2.8 测试框架
- **Vitest**：单元测试。
- **Playwright（可选）**：关键流程 E2E（设置连接、单页推送、暂停/恢复）。

---

## 3. 总体架构

采用分层 + 模块化架构：

1. **Presentation 层（UI）**
   - 设置页
   - 推送任务面板
   - 已推送页面管理页

2. **Application 层（Use Cases）**
   - PushDocumentUseCase
   - BatchPushUseCase
   - DeleteRemotePageUseCase
   - PauseResumeUseCase
   - UnlinkMappingUseCase

3. **Domain 层（核心规则）**
   - SyncStatus 状态机
   - RetryPolicy
   - ErrorClassifier
   - IdempotencyGuard

4. **Infrastructure 层（外部依赖）**
   - WikiApiClient
   - MappingRepository
   - LogRepository
   - ConfigRepository
   - TaskQueueAdapter

---

## 4. 目录结构建议

```text
src/
  app/
    usecases/
      push-document.ts
      batch-push.ts
      delete-remote-page.ts
      pause-resume.ts
      unlink-mapping.ts
  domain/
    entities/
      mapping.ts
      push-log.ts
    services/
      retry-policy.ts
      error-classifier.ts
      state-machine.ts
  infra/
    api/
      wiki-api-client.ts
      dto.ts
    storage/
      config-repo.ts
      mapping-repo.ts
      log-repo.ts
      migrations/
    queue/
      task-queue.ts
  ui/
    pages/
      settings/
      task-panel/
      pushed-management/
    components/
  shared/
    logger.ts
    constants.ts
    types.ts
```

---

## 5. 核心模块设计

## 5.1 WikiApiClient
职责：
- 统一请求入口；
- 自动附加 `Authorization`；
- 处理超时、重试、错误码映射；
- 输出标准化 Result。

关键接口：
- `checkConnection()`
- `createPage(payload)`
- `updatePage(slug, payload)`
- `deletePage(slug)`
- `getPage(slug)`

返回约定：
```ts
type ApiResult<T> =
  | { ok: true; data: T; httpCode: number }
  | { ok: false; httpCode: number; errorCode: string; message: string; retriable: boolean };
```

## 5.2 TaskQueue
职责：
- 承载单页/批量任务；
- 控制并发；
- 处理失败重试与失败项重放；
- 支持暂停状态页面自动跳过。

任务模型：
```ts
interface PushTask {
  traceId: string;
  siyuanDocId: string;
  action: 'create_or_update' | 'delete_remote' | 'repush';
  retryCount: number;
  maxRetry: number;
}
```

## 5.3 MappingRepository
职责：
- 管理 `siyuanDocId ↔ wikiSlug` 映射；
- 按状态筛选 `active/paused/deleted/unlinked`；
- 提供批量更新状态接口。

核心方法：
- `findByDocId(docId)`
- `upsertMapping(mapping)`
- `setStatus(docId, status)`
- `batchSetStatus(docIds, status)`

## 5.4 LogRepository
职责：
- 记录每次动作日志（create/update/delete/pause/resume/unlink）；
- 支持 traceId 维度聚合查询；
- 支持导出 JSON/CSV。

---

## 6. 数据模型（落地）

## 6.1 plugin_config
```ts
interface PluginConfig {
  baseUrl: string;
  apiKeyEncrypted: string;
  defaultVisibility: 'public' | 'private';
  defaultSpaceId?: number;
  concurrency: number;      // default 1
  retryTimes: number;       // default 3
  deleteConfirmEnabled: boolean;
  dryRunEnabled: boolean;
}
```

## 6.2 doc_mapping
```ts
type SyncStatus = 'active' | 'paused' | 'deleted' | 'unlinked';

interface DocMapping {
  siyuanDocId: string;
  wikiSlug?: string;
  syncStatus: SyncStatus;
  lastPushAt?: string;
  lastStatus?: 'success' | 'failed' | 'skipped';
  lastError?: string;
  versionHint?: string;
}
```

## 6.3 push_logs
```ts
interface PushLog {
  id: string;
  traceId: string;
  siyuanDocId: string;
  wikiSlug?: string;
  actionType: 'create' | 'update' | 'delete' | 'pause' | 'resume' | 'unlink' | 'repush';
  httpCode?: number;
  success: boolean;
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
}
```

---

## 7. 状态机与规则

## 7.1 状态定义
- `active`：允许推送
- `paused`：跳过推送
- `deleted`：远端已删除
- `unlinked`：仅解除绑定

## 7.2 状态迁移规则
- `active -> paused`
- `paused -> active`
- `active/paused -> deleted`
- `active/paused -> unlinked`
- `deleted/unlinked -> active`（重推后建立新映射）

## 7.3 保护规则
- 当 `syncStatus=paused` 时，批量推送直接标记 `skipped`。
- 当 `syncStatus=deleted` 且 `wikiSlug` 为空时，更新操作应走“新建页面”分支。
- 删除远端前必须经过确认 gate（UI + UseCase 双保险）。

---

## 8. 关键流程时序

## 8.1 单页推送
1. 读取配置、校验连接（可选短路缓存）。
2. 拉取思源文档并转换 Markdown。
3. 查询 mapping：
   - 无 mapping：create；
   - active：update；
   - paused：skip。
4. 记录日志与结果。

## 8.2 批量推送
1. 收集文档并构造任务。
2. 按并发窗口执行。
3. 遇 429/5xx 退避重试。
4. 输出成功/失败/跳过统计。

## 8.3 删除远端页面
1. UI 二次确认。
2. 执行 `DELETE /pages/:slug`。
3. 成功后 mapping 标记 `deleted`。
4. 失败则落错误日志并可重试。

## 8.4 暂停/恢复
- 暂停：仅改本地状态，不调用远端。
- 恢复：仅改本地状态，恢复后下一次推送触发 update/create。

---

## 9. 异常处理与重试策略

## 9.1 错误分类
- 网络错误（timeout/DNS）
- 鉴权错误（401/403）
- 资源错误（404/409）
- 服务错误（429/5xx）

## 9.2 重试矩阵
- 网络错误：重试（是）
- 429：重试（是，指数退避）
- 5xx：重试（是）
- 4xx（除 429）：默认不重试

## 9.3 指数退避
- 第 1 次：1s
- 第 2 次：2s
- 第 3 次：4s
- 超限：标记失败并进入失败列表

---

## 10. 安全设计
1. API Key 仅存加密态，展示时始终脱敏。
2. 日志中禁止写入明文 Token、完整请求头。
3. 危险操作（删除）需二次确认。
4. 支持 dry-run：验证可推送性与权限，不执行写操作。

---

## 11. 可观测性设计

## 11.1 指标
- 推送成功率
- 平均时延 / P95
- 错误码分布
- 被暂停页面数
- 删除操作次数

## 11.2 日志规范
- 必须字段：`traceId`, `actionType`, `siyuanDocId`, `httpCode`, `success`, `timestamp`
- 支持按 `traceId` 回放一次任务生命周期。

## 11.3 告警建议（可选）
- 连续 5 次 401/403：提醒检查 API Key。
- 15 分钟内 429 超阈值：建议下调并发。

---

## 12. 测试策略

## 12.1 单元测试（Vitest）
- state-machine 转移合法性
- error-classifier 正确性
- retry-policy 行为
- mapping repository CRUD

## 12.2 集成测试
- mock Wiki API：create/update/delete 主流程
- 429/5xx 重试验证
- paused 页面跳过验证

## 12.3 E2E（可选）
- 配置连接成功 -> 单页推送 -> 管理页暂停 -> 批量跳过 -> 恢复 -> 重推

---

## 13. 实施建议（与里程碑对齐）
1. **阶段 A（M1）**：先打通连接、单页 create/update、最小日志。
2. **阶段 B（M2）**：引入任务队列、批量推送、重试机制。
3. **阶段 C（M3）**：实现管理页与状态机（暂停/恢复/删除/解除映射）。
4. **阶段 D（M4）**：补全指标、导出、回归测试、发布文档。

---

## 14. 技术选型结论
在当前 PRD 范围下，推荐技术栈如下：
- **TypeScript + Svelte + fetch + P-Queue + SQLite + Zod + Vitest**。

该组合在“插件体积、开发效率、状态复杂度、可运维性”之间平衡最好，能够覆盖 v1.2 全部需求并为 v2 自动同步、附件上传、审批流留下扩展空间。
