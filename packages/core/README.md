# @joewrights/core

ship monorepo 的示例库，用于验证 turbo 任务图、tsc 构建产出、changesets 版本管理与 biome 检查四条链路是否连通。

## 用法

```bash
pnpm build:packages   # 仓库根构建
pnpm typecheck        # 类型检查
```

## 导出

`isNonEmptyString(value: unknown): value is string`

刻意选类型守卫而不是导出常量：`value is string` 谓词必须在 `dist/index.d.ts` 里原样保留，调用方才拿得到类型收窄。这让「declaration 产出是否正确」变成可验证事实，而不是「看起来生成了 .d.ts」。

## 模块格式

CommonJS。由本包 `package.json` 的 `"type": "commonjs"` 配合 `@joewrights/tsconfig/library.json` 的 `module: NodeNext` 决定。日后要把本包转成 ESM，只需翻 `"type"` 这一个字段。
