# Publish current A and B versions to GitHub Pages

- ID: github-pages-ab
- GitHub Issue: https://github.com/cloviszhu/Where-Do-We-Stand/issues/1
- 风险: low
- 状态: implementing

## 目标与范围

将 2026-11-06 当前 A（Retro-Futurism 章节停靠版）与 B（Endfield 七幕故事版）源码推送到 `cloviszhu/Where-Do-We-Stand`，使用 GitHub Pages 发布两个独立入口。保留已有视觉、数据和交互，不使用过期 ZIP。原型体验需求继续以本地原有 A/B Spec 为准；此 Spec 只负责仓库接入与部署。

## 验收标准

1. 仓库 main 包含两版源码、各自 lockfile、处理后的公开数据、许可与数据重建脚本；排除原始 CSV、node_modules、临时目录、历史 PDF/ZIP 和 C 版。
2. 当前 A 12 项、B 17 项测试通过，TypeScript 检查与生产构建通过。
3. 构建输出包含版本首页、`a/` 和 `b/`；脚本、字体、数据在 GitHub Pages 子路径下可加载。
4. GitHub Actions 从 main 安装依赖、测试、构建并部署同一提交。
5. 线上首页、A/B、关键数据返回成功；真实浏览器确认首页与数据探索正常。

## 设计与决策

GitHub 每仓库一个 Pages 站点，因此同一发布产物提供 `/a/`、`/b/` 两个完整独立应用。新增根构建脚本，使用 Vite `--base=./`；B 原有 hash 路由与 A 原有章节锚点无需服务器 rewrite。沿用各自依赖锁，不引入新框架。远端原为空的私有仓库；Pages API 返回 422，当前套餐不支持私有仓库 Pages。用户随后明确选择将仓库公开并使用免费 GitHub Pages。此为可回滚部署配置，未触发 EGM 设计审查。

## 验证证据

- 本轮本地：A 12/12、B 17/17 测试通过；两版 TypeScript 与相对 base 的生产构建通过。
- 真实模型评测：不适用，无模型调用。
- 本轮浏览器：待执行。
- 远端 CI / 部署：待执行，不以本地通过代替远端状态。

## 状态与恢复

- 当前负责人: Codex 主代理。
- 已完成: 最新源码核对，部署脚本、版本首页、Actions 工作流、本地测试与两版构建。
- 下一步: 关联 Issue，推送 main，启用 Pages，跟踪真实 Actions 并验证线上入口。
- 阻断与失败尝试: GitHub 插件读取目标返回 404；本机 Git Credential Manager 的既有账号验证为管理员，使用 Git / GitHub REST API 接续。
- 回滚/恢复方式: 通过普通 revert 提交触发原工作流；不强推。首次上线前若失败，保留源代码和日志修复后重跑。
- 现有授权与待批准事项: 用户明确要求推送目标仓库并托管 A/B，且明确同意将仓库公开，覆盖旧交接中的本地限定。无付费调用、课程提交或其他对外消息授权。

## 交付

目标入口：`https://cloviszhu.github.io/Where-Do-We-Stand/a/` 和 `https://cloviszhu.github.io/Where-Do-We-Stand/b/`。当前仅为目标地址，完成部署后再确认。历史 PDF/ZIP 未更新，不作为最新源码的交付副本。
