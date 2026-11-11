# Ship

基于 turbo + pnpm 的 monorepo 基础架子。

## 技术栈

turborepo（任务图与缓存）· pnpm workspace（依赖管理）· tsc（打包）· rspress（文档）· changesets（版本）· biome（lint + format）

## 常用命令

| 命令                           | 作用                                  |
| ------------------------------ | ------------------------------------- |
| `pnpm install`                 | 安装，顺带 `husky` 接管 git hooks     |
| `pnpm build:packages`          | 按依赖顺序构建全部包                  |
| `pnpm dev:packages`            | `tsc --watch`                         |
| `pnpm typecheck`               | 逐包类型检查                          |
| `pnpm lint`                    | biome 检查并改写                      |
| `pnpm lint:ci`                 | biome 只读检查，pre-commit 用的就是它 |
| `pnpm docs:dev` / `docs:build` | 文档站                                |
| `pnpm changeset`               | 记录一次版本意图                      |
| `pnpm release`                 | 构建后发布                            |

## 目录

```
packages/
  tsconfig/    @joewrights/tsconfig  共享类型配置（base / library / node）
  biome/       @joewrights/biome     共享 lint 与格式化配置
  core/        @joewrights/core      示例库（tsc 产出 CJS + 声明文件）
docs/          文档站内容（superpowers/ 为内部设计与计划，不进站点）
```

## 约定

- 包作用域 `@joewrights/*`，公共 npm registry。
- 库产物 CJS 优先，由包内 `"type": "commonjs"` 决定。只有一个文件的包转 ESM 确实只翻这一个字段；多文件包还要给所有相对 import 补 `.js` 后缀，否则在 `module: NodeNext` 下报 `ERR_MODULE_NOT_FOUND`。
- `exports` 的 `import` condition 当前也指向 CJS 产物。`core` 只有 `export function` 形式的直导，能被 `cjs-module-lexer` 静态识别，ESM 具名导入可用；包一旦改成 barrel re-export（`export * from ...`），这条路会断，届时需产出双格式。
- 不要开启 `verbatimModuleSyntax`，它与 CJS 产出冲突（base 里已钉 `false`）。
- `useDefineForClassFields` 在 base 里钉 `false`。它是 `true` 时，`experimentalDecorators` 装饰器装上的 accessor 会被实例自有字段遮蔽 —— 不报错，装饰器直接失效。只要基础库还想支持装饰器（TypeORM / NestJS 这类），就不能改回 `true`。
- 类型配置选择：对外发布的库用 `@joewrights/tsconfig/library.json`（产出 `.d.ts`）；不对外的服务端包用 `node.json`（`declaration: false`）。目前无包消费 `node.json`，它是预设而非死配置。
- 缩进 4 空格，来自 `.editorconfig`，biome 通过 `useEditorconfig` 读取。
- 本工作区已置 `prettier.enable: false`。原因：用户级开了 `editor.formatOnSave`，而 biome 支持的语言里没有 `mdx`，被 `files.includes` 排除的 `docs/superpowers/**` 也不会被 biome 处理 —— 这两类文件会落到 Prettier 手里。Prettier 3 默认读 `.editorconfig`，它对本仓库 markdown 的改写包含两处实质损坏：把 `` `examples/**` `` 转义成 `` `examples/\*\*` ``（行内代码里反斜杠是字面量），以及给 markdown 里的 JSON 示例补行尾逗号（示例随即变成非法 JSON）。代价：`.mdx` 在本工作区不再有保存格式化（biome 干不了，比损坏好）。
- 新加业务包需备齐 `build` / `dev` / `clean` / `typecheck` 四个脚本，否则会被 `turbo run <task>` 静默跳过。

## 版本约束

`@changesets/cli` 锁 2.x —— 3.x 要求 `node ^22.11 || ^24 || >=26`，在 node 20 上会崩。升级前先确认 runtime。

`.changeset/` 下保留了一个空 changeset。包相对 `main` 有变更却没有版本意图时，`changeset status` 会以退出码 1 报错；空 changeset 让这条检查在架子阶段保持可通过，正式发版后可以直接删掉。

## 设计文档

决策依据的理由见 `docs/superpowers/specs/`，实施步骤见 `docs/superpowers/plans/`。
