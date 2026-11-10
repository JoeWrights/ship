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
- 库产物 CJS 优先，由包内 `"type": "commonjs"` 决定；转 ESM 只翻这一个字段。
- 不要开启 `verbatimModuleSyntax`，它与 CJS 产出冲突（base 里已钉 `false`）。
- 缩进 4 空格，来自 `.editorconfig`，biome 通过 `useEditorconfig` 读取。
- 新加业务包需备齐 `build` / `dev` / `clean` / `typecheck` 四个脚本，否则会被 `turbo run <task>` 静默跳过。

## 版本约束

`@changesets/cli` 锁 2.x —— 3.x 要求 `node ^22.11 || ^24 || >=26`，在 node 20 上会崩。升级前先确认 runtime。

`.changeset/` 下保留了一个空 changeset。包相对 `main` 有变更却没有版本意图时，`changeset status` 会以退出码 1 报错；空 changeset 让这条检查在架子阶段保持可通过，正式发版后可以直接删掉。

## 设计文档

决策依据与偏离 born 的理由见 `docs/superpowers/specs/`，实施步骤见 `docs/superpowers/plans/`。
