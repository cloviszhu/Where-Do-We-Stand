# Publish current A and B versions to GitHub Pages

- ID: github-pages-ab
- GitHub Issue: https://github.com/cloviszhu/Where-Do-We-Stand/issues/1
- 风险: low
- 状态: complete（2026-11-06）

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

`.gitattributes` 禁止 Git 转换公开 JSON 数据的换行符，保持已有数据校验值。HTML 和许可文本可正常使用 Git 的平台换行规则；线上内容核对仅允许这些文本的 CRLF/LF 差异，对 JSON 仍要求逐字节相同。

## 验证证据

- 本轮本地：A 12/12、B 17/17 测试通过；两版 TypeScript 与相对 base 的生产构建通过。
- 真实模型评测：不适用，无模型调用。
- 本轮真实线上浏览器：版本首页、A 首页/人群/实际 respondent 详情、B 首页/故事/Peers 图表/档案/实际 respondent 详情通过；两版均展示 65,437 条完整样本，未捕获 console error。截图保存在本地 `output/pages-review/a-live.png` 与 `b-live.png`。本轮是部署冒烟验证，没有重新声称完整移动端、读屏或帧率验收。
- 远端 Linux CI：A 12/12、B 17/17 测试、两版 TypeScript 与生产构建通过。
- 最终部署提交：`181baad096de152dc230f33ec1719342d6d1705e`；[Actions 运行 42182335517](https://github.com/cloviszhu/Where-Do-We-Stand/actions/runs/42182335517) build / deploy 均成功。首个源码导入提交为 `84d79b4916485ab07379ea2b2b4ddfef475a298a`。
- 2026-11-06 07:46 UTC 线上核对：43 个发布文件及首页、`a/`、`b/` 共 46/46 成功；全部 JSON 与本地数据逐字节相同。仅 A HTML 与一份许可文本存在允许的 CRLF/LF 差异。详细 HTTP 状态及比较结果保存在本地 `output/pages-review/http-verification.json`。

## 状态与恢复

- 当前负责人: Codex 主代理。
- 已完成: 最新源码、公开仓库、Issue、版本首页、自动测试/构建/发布、线上浏览器与文件核对。
- 下一步: 用户访问正式链接。后续修改相应原型，推送 main 后由同一工作流自动更新两版；纯记录提交可用 `[skip ci]`，不需要重复部署未变更的应用。
- 阻断与失败尝试: GitHub 插件最初返回 404，使用本机既有管理员账号的 Git / REST API 完成。私有 Pages 的套餐限制经用户公开仓库授权解决。首次 Git push 的 HTTP 403 经 HTTP/1.1 与非分块请求重试成功。第二次 Pages 发布耗时约六分钟，最终成功，没有残留阻断。
- 回滚/恢复方式: 通过普通 revert 提交触发原工作流；不强推。首次上线前若失败，保留源代码和日志修复后重跑。
- 现有授权与待批准事项: 用户明确要求推送目标仓库并托管 A/B，且明确同意将仓库公开，覆盖旧交接中的本地限定。无付费调用、课程提交或其他对外消息授权。

## 交付

正式入口：[A / Retro-Futurism](https://cloviszhu.github.io/Where-Do-We-Stand/a/)、[B / Endfield](https://cloviszhu.github.io/Where-Do-We-Stand/b/)、[版本首页](https://cloviszhu.github.io/Where-Do-We-Stand/)。全部已经实际访问并验证。源码位于 [公开仓库](https://github.com/cloviszhu/Where-Do-We-Stand)。历史 PDF/ZIP 未更新，不作为最新源码的交付副本；C 版和本地历史材料未加入仓库。
