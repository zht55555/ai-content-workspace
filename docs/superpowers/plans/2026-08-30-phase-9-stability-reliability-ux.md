# Phase 9 实施计划

1. 为并发启动增加失败集成测试，加入数据库部分唯一索引和事务内状态预占。
2. 将 PostgreSQL 唯一冲突转换为稳定业务错误，验证失败 Task 可以通过现有 Run API 创建新 Run。
3. 为 SSE 增加有限退避重连和 Snapshot 恢复，终态停止连接。
4. 统一 API 客户端错误解析与 UI 用户提示，覆盖网络、非 JSON、冲突和不存在任务。
5. 修复任务切换时侧栏终态快照误触发刷新，保持 Workspace 三栏结构。
6. 增加路由、错误映射、重连策略和并发边界测试；调查开发态 Fast Refresh，不改变已验证的生产架构。
7. 执行 lint、typecheck、完整 Vitest、Drizzle migration/build、Demo 与真实 DeepSeek 短文本验证及浏览器 Smoke Test。
