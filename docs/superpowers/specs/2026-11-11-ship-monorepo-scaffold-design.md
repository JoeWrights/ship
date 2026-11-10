# Ship Monorepo 基础架子设计

日期：2026-11-11
状态：已与用户逐节确认，待评审
参考项目：`/Users/joewright/Desktop/未命名文件夹/压缩文件/born`（结构与技栈约定来源）

## 1. 目标

在空目录 `/Users/joewright/fullstack/ship` 搭出一个可运行、可验证、可发布的 monorepo 基础架子：

- 基于 **turborepo** 的任务图与缓存
- **pnpm** workspace 管理依赖
- **tsc** 作为唯一打包工具（不引入 rollup/tsup/unbuild）
- **rspress** 作为文档站
- **changesets** 作为版本与发布管理
- **biome** 作为 lint + format

非目标（本次明确不做）：CI/CD 流水线、测试框架接入、`examples/` 可运行示例应用、真实业务模块、npm 首发。这些留待架子验证通过后按需追加。

## 2. 已确认决策

| 决策点 | 选择 | 理由 |
| --- | --- | --- |
| 包作用域 | `@joewrights/*` + npm 公共 registry | born 的 `@hg/*` 指向 `ops-nexus.hypergryph.net` 私有源，ship 无访问权限，照搬会让 `pnpm install` 直接失败 |
| 初始包集合 | `tsconfig` + `biome` 两个配置包 + 一个示例库 `core` | 只有配置包无法验证 build 链路；`core` 产出真实 `dist/` 才能证明 turbo + tsc + changesets 三条线打通 |
| 模块格式 | CJS 优先（`type: commonjs` + `module: NodeNext`） | 贴 born 实际形态；CJS→ESM 是单向扩展，反过来难 |
| Git hooks | 装 husky，pre-commit 跑**只读**检查 | 避开 born 的 `--write` 坑（见 §11） |
| 文档站布局 | 方案 A：`rspress.config.ts` 在仓库根，`docs/` 仅作内容目录 | 与 born 一致，心智负担最小 |

## 3. 目录结构

```
ship/
├── .changeset/
│   └── config.json                 # 由 `changeset init` 生成后改 access / baseBranch
├── .editorconfig                   # utf-8 / lf / 4 空格 / 末尾换行
├── .gitignore
├── .husky/
│   └── pre-commit                  # pnpm lint:ci
├── .nvmrc                          # 20
├── .vscode/
│   └── settings.json               # 默认格式化器指向 biome
├── biome.json                      # { extends: ["@joewrights/biome"] }
├── package.json                    # private root
├── pnpm-workspace.yaml             # packages/**
├── rspress.config.ts               # root: "docs"
├── tsconfig.json                   # 根级，服务编辑器与 rspress.config.ts
├── turbo.json
├── docs/
│   ├── index.mdx                   # pageType: home
│   ├── guide/
│   │   ├── _meta.json
│   │   ├── introduction.mdx
│   │   └── quick-start.mdx
│   ├── public/logo.svg             # 最小占位图
│   └── superpowers/specs/          # 本设计文档所在位置（从构建中排除）
└── packages/
    ├── tsconfig/                   # @joewrights/tsconfig
    │   ├── package.json
    │   ├── tsconfig.json           # base
    │   ├── library.json            # 库：CJS + declaration
    │   └── node.json               # 服务
    ├── biome/                      # @joewrights/biome
    │   ├── package.json
    │   └── index.json
    └── core/                       # @joewrights/core
        ├── package.json
        ├── tsconfig.json           # extends @joewrights/tsconfig/library.json
        ├── README.md
        └── src/index.ts
```

**不创建 `.npmrc`**：born 那份的实质内容是 `@hg:registry=<私有源>` 与 prisma hoist 规则，ship 用公共 registry 时全部属于默认值，留空文件只会误导后来者去填公司源。若将来需要 org token 或 scoped 源，再新增。

**`pnpm-workspace.yaml` 只写 `packages/**`**：不预留 `examples/**`，避免 glob 指向不存在目录导致 turbo 告警。

## 4. 工具链版本基线

以下版本在 2026-11-11 通过 `npm view` 对公共 registry 实测确认，不是照抄 born 锁文件：

| 依赖 | born 锁定 | 公共 registry 实测 | ship 采用 | 说明 |
| --- | --- | --- | --- | --- |
| turbo | ^2.6.3 | 2.11.10 | `^2.11.10` | 同大版本 |
| @biomejs/biome | ^2.3.10 | 2.6.6 | `^2.6.6` | 同大版本 |
| @changesets/cli | ^2.27.1 | 3.0.3 | `^3.0.3` | **跨大版本**，故配置改用 `init` 生成（见 §8） |
| @rspress/core | ^2.0.8 | 2.1.1（`latest`） | `^2.1.1` | v2 文档站包名是 `@rspress/core`，`rspress` 本体停在 `latest-v1` = 1.47.2，**不可误装** |
| typescript | ^5.9.3 | `latest`=7.0.2；5.x 最高 5.9.3；6.0.3 存在 | `^5.9.3` | `tsc` 是打包器，需产出行为可预期；7.x 的 `latest` 实为 `7.1.0-dev.*` 预览线 |
| @types/node | ^20.11.30 | `latest`=26.6.6；20.x 最高 20.19.43 | `^20.19.43` | 本机 runtime 为 node v20.20.2，类型要跟 runtime 主版本 |
| husky | ^9.1.7 | 9.1.7 | `^9.1.7` | 一致 |

环境：node v20.20.2、pnpm 10.14.0（与 born `packageManager` 完全一致）、git 2.50.1。

## 5. 根配置

### 5.1 package.json

`private: true`、`name: "ship"`、`version: "0.0.0"`、`type: "commonjs"`、`packageManager: "pnpm@10.14.0"`、`engines: { node: ">=20", pnpm: ">=10" }`。

scripts 沿用 born 命名习惯，两处修正 + 两项新增：

```jsonc
{
  "prepare": "husky",
  "lint": "biome check --write .",       // born 漏了路径参数
  "lint:ci": "biome ci .",               // 新增：只读，供 pre-commit 与 CI
  "typecheck": "turbo run typecheck --filter='@joewrights/*'",   // 新增
  "dev:packages": "turbo run dev --filter='@joewrights/*'",
  "build:packages": "turbo run build --filter='@joewrights/*'",
  "clean:packages": "turbo run clean --filter='@joewrights/*'",
  "changeset": "changeset",
  "changeset:version": "changeset version",
  "prerelease": "pnpm build:packages",
  "release": "changeset publish",
  "docs:dev": "rspress dev",
  "docs:build": "rspress build",
  "docs:preview": "rspress preview"
}
```

devDependencies 为 §4 全部工具 + `@joewrights/biome` / `@joewrights/tsconfig`（均 `workspace:*`）。

### 5.2 turbo.json

```jsonc
{
  "$schema": "https://turbo.build/schema.json",
  "tasks": {
    "build":    { "dependsOn": ["^build"], "outputs": ["dist/**"] },
    "dev":      { "cache": false, "persistent": true, "dependsOn": ["^build"] },
    "clean":    { "cache": false },              // born 写的是 {}，会缓存清理工序
    "typecheck":{ "dependsOn": ["^build"] },
    "test":     { "dependsOn": ["^build"] }
  }
}
```

### 5.3 根 tsconfig.json

保持 born 形态（`jsx: react-jsx`、`module: esnext`、`moduleResolution: bundler`、`esModuleInterop`、`experimentalDecorators`）。它只服务编辑器对 `rspress.config.ts` 与 `docs/**/*.mdx` 的解析，**不参与 `core` 的构建** —— 构建走包自己的 tsconfig，两条路径不互相污染。

## 6. packages 三包设计

### 6.1 @joewrights/tsconfig

纯配置包，`files: ["*.json"]`，无构建产物。`tsconfig.json`(base) 承接 born 的 strict 全家桶：`strict` / `noImplicitAny` / `strictNullChecks` / `isolatedModules` / `declaration` / `declarationMap` / `sourceMap` / `skipLibCheck` / `forceConsistentCasingInFileNames` / `resolveJsonModule` / `esModuleInterop` / `allowSyntheticDefaultImports` / `noEmitOnError`。

`library.json`：`target: ES2022`、`lib: ["ES2023"]`、`module: NodeNext`、`moduleResolution: NodeNext`、`declaration: true`、`emitDeclarationOnly: false`。

`node.json`：面向未来服务端，同上但不开 declaration。

**硬约束：禁止开启 `verbatimModuleSyntax`。** 该选项与 CJS emit 冲突（要求 `import x = require()` 语法），一旦打开 `pnpm build:packages` 会直接失败。此约束写进 base 的注释，防止后来者"顺手开启现代选项"。

不提供 `nest.json` / `next.json`：born 有是因为它真实依赖 NestJS 与 Next，ship 当前两者都不是，用到再加。

### 6.2 @joewrights/biome

`main: index.json`、`files: ["index.json"]`。规则集承接 born 的团队约定而非另起炉灶：formatter 4 空格 / 双引号 / `semicolons: asNeeded` / `trailingCommas: es5`；assist `organizeImports: on`；`vcs.useIgnoreFile: true`；`files.includes` 排除 `node_modules`/`dist`/`build`/`output`/`.husky`。

噪声类规则统一 **warn 而非 error**（`noUnusedVariables`、`noUnusedImports`、`noExplicitAny`、`useNamingConvention` 等），保证 `biome ci` 不会因存量告警卡住提交；`noFallthroughSwitchClause` 保持 error。

保留 `javascript.parser.unsafeParameterDecoratorsEnabled: true`：当前无装饰器代码，但它是框架类项目后期引入装饰器的唯一拦路石，保留成本为零。

### 6.3 @joewrights/core

```jsonc
{
  "name": "@joewrights/core",
  "version": "0.0.0",
  "type": "commonjs",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "exports": {
    ".": { "types": "./dist/index.d.ts", "require": "./dist/index.js", "import": "./dist/index.js" }
  },
  "files": ["dist"],
  "scripts": {
    "dev": "tsc --watch",
    "build": "tsc -p tsconfig.json",
    "clean": "rm -rf dist tsconfig.tsbuildinfo",
    "typecheck": "tsc -p tsconfig.json --noEmit"
  },
  "devDependencies": { "@joewrights/tsconfig": "workspace:*", "typescript": "^5.9.3" }
}
```

`src/index.ts` 只导出一个类型守卫，内容确定、无需再议：

```ts
export function isNonEmptyString(value: unknown): value is string {
    return typeof value === "string" && value.length > 0
}
```

选它的理由：带 `value is string` 的类型谓词，`dist/index.d.ts` 必须正确保留谓词才算构建成功，比导出一个常量更能验证 tsc 的 declaration 产出。

**不预置 `test` 脚本。** born 的 `load-config` 写的是 `echo "Error: no test specified" && exit 1`，照抄进 ship 会让 `turbo run test` 永久红灯。架子开箱即失败不如没有该任务；turbo 侧保留 `test` 任务定义，待真正接入测试框架时补脚本。

三个包 version 统一从 `0.0.0` 起步，交给 changesets 递增。

## 7. 文档站

`rspress.config.ts` 贴 born 形状：`root: "docs"`、`title: "Ship"`、`lang: "zh"`、`llms: true`、`themeConfig` 提供 nav + `/guide/` sidebar。

born 引用了 `logo.svg` 与 `logo-with-title.svg` 两个图片资源，ship 只提供**一个**手写最小占位 `docs/public/logo.svg` 并且只引用它，避免文档站起步即带 404 资源请求。

`route.excludeSources: ["**/superpowers/**"]`：`docs/` 同时是 rspress 的 `root`，若不排除，内部设计文档会被编译进公开站点。实施时须验证该选项在当前 `@rspress/core` 2.1.1 下确实生效（以 `doc_build/` 内不出现 superpowers 页面为准）。

内容：`index.mdx` 用 `pageType: home` 的 hero + features；`guide/introduction.mdx` 说明定位与结构；`guide/quick-start.mdx` 写这套架子**真实可用**的命令（install / build:packages / changeset / docs:dev），使文档站第一天就有可查内容。

## 8. changesets 配置

`.changeset/config.json` 通过 `pnpm changeset init` 生成后再改，**不抄 born 的**：ship 装的是 changesets v3，手写 v2 schema 存在字段不匹配风险。

生成后修改两项：

- `access`: `"restricted"` → **`"public"`**。restricted 是配合私有源使用的；公共 npm 上 scoped 包默认 restricted，不改会导致发布产物无法被公开安装。
- `baseBranch`: `"main"`。

其余保持默认：`commit: false`、`fixed: []`、`linked: []`、`ignore: []`。

## 9. 执行顺序与硬依赖

顺序不可调整，`git init` 必须先于 `pnpm install`：

1. 建目录与全部配置文件
2. `git init -b main` + 首次提交
3. `pnpm install`
4. `pnpm changeset init` 并按 §8 调整
5. 逐项跑 §10 验证

依赖原因：根 scripts 的 `prepare: husky` 在 `pnpm install` 时自动执行，无 `.git` 会报错并中断安装；biome 的 `vcs.useIgnoreFile` 需读取 `.gitignore` 所在的 git 仓库；changesets 计算版本需读 git 历史。

## 10. 完成判据

架子完成 = 下列每条都产出真实命令输出，不接受"应该可以"：

| # | 命令 | 通过标准 |
| --- | --- | --- |
| 1 | `pnpm install` | 退出码 0，日志无 `ops-nexus` 私有源痕迹 |
| 2 | `pnpm build:packages` | 产出 `packages/core/dist/index.js` 与 `index.d.ts` |
| 3 | 重跑 `pnpm build:packages` | turbo 报告全部 cache hit（证明任务图与 outputs 声明正确） |
| 4 | `node -e "require('/Users/joewright/fullstack/ship/packages/core/dist/index.js')"` | 能取到 `isNonEmptyString` 导出（证明 CJS 产物可被真实消费） |
| 5 | `pnpm lint:ci` | 退出码 0 |
| 6 | `pnpm typecheck` | 退出码 0 |
| 7 | `pnpm docs:build` | 产出 `doc_build/`，且其中不含 superpowers 内部文档 |
| 8 | `pnpm changeset` | 能列出 3 个包且无 schema 报错 |

## 11. 相对 born 的偏离汇总

| 偏离 | born 做法 | ship 做法 | 性质 |
| --- | --- | --- | --- |
| registry | `.npmrc` 指向公司私有源 | 不建 `.npmrc`，用公共默认 | 必要（无访问权限） |
| scope | `@hg/*` | `@joewrights/*` | 必要 |
| pre-commit | `npm run lint` = `biome check --write` | `biome ci .` 只读 | **修 bug**：`--write` 会静默改写工作区但不重新 `git add`，导致"本地已被改、提交的是旧内容"的不一致 |
| turbo `clean` | `{}`（被缓存） | `{ cache: false }` | **修 bug**：turbo 缓存清理工序，第二次 `clean` 命中缓存不执行 |
| 包 `test` 脚本 | `echo "Error..." && exit 1` | 不预置 | **修 bug**：避免 `turbo run test` 永久红灯 |
| `access` | `restricted` | `public` | 必要（公共 npm scoped 包） |
| workspace glob | `packages/**` + `examples/**` | 仅 `packages/**` | 精简（不指向空目录） |
| changeset 配置来源 | 手写 | `init` 生成后改 | 稳健（跨 v2→v3 大版本） |

## 12. 后续路线（本次不做）

接入测试框架（vitest）并补 `test` 脚本；`examples/` 最小应用验证内部依赖消费；CI 工作流跑 `lint:ci` + `build` + `docs:build`；首个真实业务库；npm 首发与 `changeset version` 实跑。
