# Ship Monorepo 基础架子 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 `/Users/joewright/fullstack/ship` 搭出 turbo + pnpm workspace + tsc + rspress + changesets + biome 六件套齐备、且每条链路都有命令输出佐证的 monorepo 基础架子。

**Architecture:** 根目录持有全部工具链与文档站配置，`packages/` 下三个 workspace 包（两个纯配置包 `tsconfig`/`biome` 作为唯一约定来源，一个示例库 `core` 用 tsc 产出 CJS + 声明文件以证明任务图真实可用）。库产物走 CJS，日后可单包翻 `type` 字段迁 ESM。

**Tech Stack:** turborepo 2.11、pnpm 10.14 workspace、TypeScript 5.9 `tsc`、@rspress/core 2.1、@changesets/cli 2.31、@biomejs/biome 2.6、husky 9。

**规格来源：** [2026-11-11-ship-monorepo-scaffold-design.md](../specs/2026-11-11-ship-monorepo-scaffold-design.md)

**前置状态：** `git init -b main` 与规格文档提交已完成（`301048a`）。不要重复 init。

**关于本计划的测试形态：** 本次交付物是配置文件，没有单元可测的业务逻辑，因此不套 vitest。等价做法是每个任务尾部跑**确定性校验命令**（JSON 解析、文件存在性、真实构建、缓存命中），先看到失败再看到通过，与 TDD 的红绿循环同构。规格 §6.3 已明确本阶段不预置 `test` 脚本，勿在此计划里顺手加回。

---

## 文件结构总览

| 文件 | 职责 | 任务 |
| --- | --- | --- |
| `.gitignore` | 忽略 node_modules / dist / .turbo / doc_build / tsbuildinfo | T1 |
| `.editorconfig` | utf-8 / lf / 4 空格 / 末尾换行；biome 通过 `useEditorconfig` 读取 | T1 |
| `.nvmrc` | 钉 node 20 | T1 |
| `.vscode/settings.json` | 编辑器默认格式化器指向 biome | T1 |
| `packages/tsconfig/package.json` | `@joewrights/tsconfig` 包声明 | T2 |
| `packages/tsconfig/tsconfig.json` | base：严格性 + interop + 声明产出 | T2 |
| `packages/tsconfig/library.json` | 可发布库：NodeNext + CJS 产出 | T2 |
| `packages/tsconfig/node.json` | 服务端：同库但不产声明 | T2 |
| `packages/biome/package.json` | `@joewrights/biome` 包声明 | T3 |
| `packages/biome/index.json` | 唯一 lint/format 约定来源 | T3 |
| `biome.json` | 根配置，`extends` 上面那个包 | T3 |
| `packages/core/package.json` | `@joewrights/core`：CJS 库 + exports 映射 | T4 |
| `packages/core/tsconfig.json` | extends library.json，定 rootDir/outDir | T4 |
| `packages/core/src/index.ts` | 类型守卫实现（验证 declaration 产出） | T4 |
| `packages/core/README.md` | 包级说明：存在意义与构建命令 | T4 |
| `package.json` | 根：脚本入口 + 全部 devDependencies | T5 |
| `pnpm-workspace.yaml` | workspace glob | T5 |
| `turbo.json` | 任务图与缓存边界 | T5 |
| `tsconfig.json` | 根级，只服务编辑器，不参与库构建 | T5 |
| `.husky/pre-commit` | 提交前只读检查 | T6 |
| `.changeset/config.json` | 版本管理配置 | T8 |
| `rspress.config.ts` | 文档站配置 | T9 |
| `docs/index.mdx` `docs/guide/*` `docs/public/logo.svg` | 文档内容 | T9 |
| `README.md` | 仓库门面：结构 + 命令 | T10 |

任务顺序不可打乱：T2/T3/T4 必须先于 T5（根 package.json 以 `workspace:*` 引用它们，缺任一个 `pnpm install` 就失败）；T5 先于 T6；T6 先于 T7（校验命令需要二进制就位）。

---

## Task 1: 基线配置文件

**Files:**
- Create: `.gitignore`
- Create: `.editorconfig`
- Create: `.nvmrc`
- Create: `.vscode/settings.json`

- [ ] **Step 1: 创建 `.gitignore`**

```gitignore
# Dependencies
node_modules/

# Build output
dist
lib
esm

# Turbo
.turbo
*.tsbuildinfo

# Logs
*.log
npm-debug.log*
pnpm-debug.log*

# Environment
.env
.env.local
.env.*.local

# OS
.DS_Store

# rspress build output
doc_build/

# Test coverage
coverage/
```

不写 `.vscode/` 忽略规则：本仓库要把 `settings.json` 作为团队共享配置提交。不写 `.npmrc`：公共 registry 是默认值，留空文件只会诱导后来者填私有源。

- [ ] **Step 2: 创建 `.editorconfig`**

```ini
# https://editorconfig.org
root = true

[*]
charset = utf-8
end_of_line = lf
indent_style = space
indent_size = 4
trim_trailing_whitespace = true
insert_final_newline = true
```

这个文件是实质配置而非装饰：`@joewrights/biome` 里 `formatter.useEditorconfig: true` 会让 biome 从这里读缩进，改这里等于改格式化行为。

- [ ] **Step 3: 创建 `.nvmrc`**

```
20
```

- [ ] **Step 4: 创建 `.vscode/settings.json`**

```json
{
    "editor.defaultFormatter": "biomejs.biome",
    "[typescript]": {
        "editor.defaultFormatter": "biomejs.biome"
    },
    "[javascript]": {
        "editor.defaultFormatter": "biomejs.biome"
    },
    "[json]": {
        "editor.defaultFormatter": "biomejs.biome"
    },
    "[jsonc]": {
        "editor.defaultFormatter": "biomejs.biome"
    }
}
```

- [ ] **Step 5: 校验**

Run: `cd /Users/joewright/fullstack/ship && node -e "JSON.parse(require('fs').readFileSync('.vscode/settings.json','utf8')); console.log('settings.json OK')" && grep -q '^doc_build/$' .gitignore && grep -q '^indent_size = 4$' .editorconfig && echo 'baselines OK'`

Expected: 依次输出 `settings.json OK`、`baselines OK`，退出码 0。

- [ ] **Step 6: Commit**

```bash
cd /Users/joewright/fullstack/ship
git add .gitignore .editorconfig .nvmrc .vscode/settings.json
git commit -m "chore: add baseline git, editor and node version config"
```

---

## Task 2: @joewrights/tsconfig 共享类型配置包

**Files:**
- Create: `packages/tsconfig/package.json`
- Create: `packages/tsconfig/tsconfig.json`
- Create: `packages/tsconfig/library.json`
- Create: `packages/tsconfig/node.json`

- [ ] **Step 1: 创建 `packages/tsconfig/package.json`**

```json
{
    "name": "@joewrights/tsconfig",
    "version": "0.0.0",
    "description": "Shared TypeScript configs for the ship monorepo",
    "license": "MIT",
    "files": [
        "*.json"
    ],
    "publishConfig": {
        "access": "public"
    }
}
```

不写 `main`：本包只导出 JSON，没有可 require 的模块。born 给它写了 `main: "index.js"` 而该文件不存在，属于无效字段，不照搬。

- [ ] **Step 2: 创建 `packages/tsconfig/tsconfig.json`（base）**

```json
{
    "$schema": "https://json.schemastore.org/tsconfig",
    "display": "Base",
    "compilerOptions": {
        "target": "ES2022",
        "lib": [
            "ES2023"
        ],
        "strict": true,
        "noImplicitAny": true,
        "strictNullChecks": true,
        "isolatedModules": true,
        "verbatimModuleSyntax": false,
        "useDefineForClassFields": true,
        "experimentalDecorators": true,
        "emitDecoratorMetadata": true,
        "esModuleInterop": true,
        "allowSyntheticDefaultImports": true,
        "resolveJsonModule": true,
        "forceConsistentCasingInFileNames": true,
        "skipLibCheck": true,
        "declaration": true,
        "declarationMap": true,
        "sourceMap": true,
        "noEmitOnError": true,
        "removeComments": false
    }
}
```

`module` / `moduleResolution` 刻意不放在 base：库和服务端在这里分岔，放 base 就没法分。

`verbatimModuleSyntax: false` 是**结构化的警告**，取代规格 §6.1 里"写进注释"的做法：JSON 注释不可靠（严格 JSON 解析器会失败），而这个选项一旦有人开启，`tsc` 会立刻用报错挡住 —— 写死 `false` 既记录意图又是强制约束，比注释强。

- [ ] **Step 3: 创建 `packages/tsconfig/library.json`**

```json
{
    "$schema": "https://json.schemastore.org/tsconfig",
    "display": "Library",
    "extends": "./tsconfig.json",
    "compilerOptions": {
        "module": "NodeNext",
        "moduleResolution": "NodeNext"
    }
}
```

产出 CJS 还是 ESM 由**消费包自己的 `package.json` 的 `type` 字段**决定，不由这里决定。`NodeNext` 的含义是"跟随包的 type"，所以包必须显式写 `"type": "commonjs"`（Task 4）。日后要把某个包转 ESM，只翻那一个字段。

- [ ] **Step 4: 创建 `packages/tsconfig/node.json`**

```json
{
    "$schema": "https://json.schemastore.org/tsconfig",
    "display": "Node",
    "extends": "./tsconfig.json",
    "compilerOptions": {
        "module": "NodeNext",
        "moduleResolution": "NodeNext",
        "declaration": false,
        "declarationMap": false
    }
}
```

与 library 的唯一差别是不产声明 —— 服务端不被别人 import。

- [ ] **Step 5: 校验四个文件均为合法 JSON 且 extends 目标存在**

Run:

```bash
cd /Users/joewright/fullstack/ship/packages/tsconfig
node -e "const fs=require('fs');['package.json','tsconfig.json','library.json','node.json'].forEach(f=>JSON.parse(fs.readFileSync(f,'utf8')));console.log('JSON OK')"
node -e "const fs=require('fs');const l=JSON.parse(fs.readFileSync('library.json','utf8'));const n=JSON.parse(fs.readFileSync('node.json','utf8'));if(l.extends!=='./tsconfig.json'||n.extends!=='./tsconfig.json')throw new Error('extends target wrong');if(l.compilerOptions.declaration===false)throw new Error('library must emit declarations');if(n.compilerOptions.declaration!==false)throw new Error('node config must disable declarations');console.log('extends + declaration split OK')"
```

Expected: `JSON OK`、`extends + declaration split OK`，退出码 0。

- [ ] **Step 6: Commit**

```bash
cd /Users/joewright/fullstack/ship
git add packages/tsconfig
git commit -m "feat(tsconfig): add shared typescript configs"
```

---

## Task 3: @joewrights/biome 共享 lint 配置包

**Files:**
- Create: `packages/biome/package.json`
- Create: `packages/biome/index.json`
- Create: `biome.json`

- [ ] **Step 1: 创建 `packages/biome/package.json`**

```json
{
    "name": "@joewrights/biome",
    "version": "0.0.0",
    "description": "Shared Biome config for the ship monorepo",
    "license": "MIT",
    "main": "index.json",
    "files": [
        "index.json"
    ],
    "publishConfig": {
        "access": "public"
    }
}
```

- [ ] **Step 2: 创建 `packages/biome/index.json`**

```json
{
    "$schema": "https://biomejs.dev/schemas/2.6.6/schema.json",
    "vcs": {
        "enabled": true,
        "clientKind": "git",
        "useIgnoreFile": true
    },
    "files": {
        "ignoreUnknown": false,
        "includes": [
            "**",
            "!**/node_modules",
            "!**/dist",
            "!**/build",
            "!**/output",
            "!**/doc_build",
            "!**/.husky"
        ]
    },
    "linter": {
        "enabled": true,
        "rules": {
            "recommended": true,
            "correctness": {
                "noUnusedVariables": {
                    "level": "warn",
                    "fix": "none"
                },
                "noUnusedImports": {
                    "level": "warn"
                },
                "noUnusedFunctionParameters": {
                    "level": "warn"
                },
                "noUnusedPrivateClassMembers": {
                    "level": "warn"
                },
                "noUnusedLabels": "warn"
            },
            "style": {
                "useConst": "warn",
                "useNamingConvention": {
                    "level": "warn",
                    "fix": "none",
                    "options": {
                        "strictCase": false,
                        "conventions": [
                            {
                                "selector": {
                                    "kind": "enumMember"
                                },
                                "formats": [
                                    "CONSTANT_CASE",
                                    "camelCase",
                                    "PascalCase"
                                ]
                            }
                        ]
                    }
                },
                "useImportType": "off",
                "noNamespace": "warn"
            },
            "suspicious": {
                "noExplicitAny": "warn",
                "noFallthroughSwitchClause": "error"
            },
            "complexity": {
                "noForEach": "off",
                "noStaticOnlyClass": "off",
                "noUselessConstructor": "warn"
            }
        }
    },
    "assist": {
        "enabled": true,
        "actions": {
            "source": {
                "organizeImports": {
                    "level": "on"
                }
            }
        }
    },
    "formatter": {
        "enabled": true,
        "useEditorconfig": true,
        "indentStyle": "space",
        "indentWidth": 4
    },
    "javascript": {
        "formatter": {
            "quoteStyle": "double",
            "jsxQuoteStyle": "double",
            "quoteProperties": "asNeeded",
            "trailingCommas": "es5",
            "semicolons": "asNeeded",
            "arrowParentheses": "always",
            "bracketSpacing": true,
            "bracketSameLine": false
        },
        "parser": {
            "unsafeParameterDecoratorsEnabled": true
        }
    }
}
```

与 born 的差异：`$schema` 升到 2.6.6；`files.includes` 去掉 `!**/pb`（born 的 protobuf 生成目录，ship 无关）并加 `!**/doc_build`（rspress 产物）。噪声规则一律 warn，保证 `biome ci` 不因存量告警卡住提交。`unsafeParameterDecoratorsEnabled` 现在用不到但保留，理由见规格 §6.2；若 biome 报未知配置项，删掉这个 parser 块即可，见 Task 7 Step 6 的兜底。

- [ ] **Step 3: 创建根 `biome.json`**

```json
{
    "$schema": "https://biomejs.dev/schemas/2.6.6/schema.json",
    "extends": [
        "@joewrights/biome"
    ]
}
```

- [ ] **Step 4: 校验 JSON 合法**

Run: `cd /Users/joewright/fullstack/ship && node -e "['biome.json','packages/biome/package.json','packages/biome/index.json'].forEach(f=>JSON.parse(require('fs').readFileSync(f,'utf8')));console.log('biome JSON OK')"`

Expected: `biome JSON OK`。

配置能否被 biome 接受要等 Task 6 装完才能验，放在 Task 7。

- [ ] **Step 5: Commit**

```bash
cd /Users/joewright/fullstack/ship
git add biome.json packages/biome
git commit -m "feat(biome): add shared biome config package"
```

---

## Task 4: @joewrights/core 示例库

**Files:**
- Create: `packages/core/package.json`
- Create: `packages/core/tsconfig.json`
- Create: `packages/core/src/index.ts`
- Create: `packages/core/README.md`

- [ ] **Step 1: 创建 `packages/core/package.json`**

```json
{
    "name": "@joewrights/core",
    "version": "0.0.0",
    "description": "Sample library proving the ship build pipeline",
    "license": "MIT",
    "type": "commonjs",
    "main": "dist/index.js",
    "types": "dist/index.d.ts",
    "exports": {
        ".": {
            "types": "./dist/index.d.ts",
            "require": "./dist/index.js",
            "import": "./dist/index.js"
        }
    },
    "files": [
        "dist"
    ],
    "scripts": {
        "dev": "tsc --watch",
        "build": "tsc -p tsconfig.json",
        "clean": "rm -rf dist tsconfig.tsbuildinfo",
        "typecheck": "tsc -p tsconfig.json --noEmit"
    },
    "publishConfig": {
        "access": "public"
    },
    "devDependencies": {
        "@joewrights/tsconfig": "workspace:*",
        "typescript": "^5.9.3"
    }
}
```

`"type": "commonjs"` 是 CJS 产出的实际开关，缺了它 `module: NodeNext` 会按 ESM 解析。四个脚本齐备：`build`/`dev`/`clean`/`typecheck` 都要存在，否则 `turbo run <task> --filter='@joewrights/*'` 会静默跳过本包，缓存验证就失去意义。

- [ ] **Step 2: 创建 `packages/core/tsconfig.json`**

```json
{
    "extends": "@joewrights/tsconfig/library.json",
    "compilerOptions": {
        "rootDir": "./src",
        "outDir": "./dist"
    },
    "include": [
        "./src/**/*"
    ]
}
```

- [ ] **Step 3: 创建 `packages/core/src/index.ts`**

```ts
export function isNonEmptyString(value: unknown): value is string {
    return typeof value === "string" && value.length > 0
}
```

选类型守卫而非导出常量：`value is string` 谓词必须在 `dist/index.d.ts` 里原样保留，否则调用方拿不到类型收窄。这让"declaration 产出是否正确"变成可验证事实，而不是"看起来生成了 .d.ts"。

- [ ] **Step 4: 创建 `packages/core/README.md`**

```markdown
# @joewrights/core

ship monorepo 的示例库，用于验证 turbo 任务图、tsc 构建产出、changesets 版本管理与 biome 检查四条链路是否连通。

## 用法

```bash
pnpm build:packages   # 仓库根构建
pnpm typecheck        # 类型检查
```

导出 `isNonEmptyString(value: unknown): value is string`。
```

- [ ] **Step 5: 校验**

Run: `cd /Users/joewright/fullstack/ship && node -e "['packages/core/package.json','packages/core/tsconfig.json'].forEach(f=>JSON.parse(require('fs').readFileSync(f,'utf8')));console.log('core JSON OK')" && test -f packages/core/src/index.ts && echo 'source OK'`

Expected: `core JSON OK`、`source OK`。

产出物校验需要 `tsc`，放到 Task 7。

- [ ] **Step 6: Commit**

```bash
cd /Users/joewright/fullstack/ship
git add packages/core
git commit -m "feat(core): add sample library exercising tsc build"
```

---

## Task 5: 根 package.json、workspace、turbo 与根 tsconfig

**Files:**
- Create: `package.json`
- Create: `pnpm-workspace.yaml`
- Create: `turbo.json`
- Create: `tsconfig.json`

- [ ] **Step 1: 创建根 `package.json`**

```json
{
    "name": "ship",
    "version": "0.0.0",
    "private": true,
    "description": "A turbo + pnpm monorepo scaffold",
    "type": "commonjs",
    "packageManager": "pnpm@10.14.0",
    "engines": {
        "node": ">=20",
        "pnpm": ">=10"
    },
    "scripts": {
        "prepare": "husky",
        "lint": "biome check --write .",
        "lint:ci": "biome ci .",
        "typecheck": "turbo run typecheck --filter='@joewrights/*'",
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
    },
    "devDependencies": {
        "@biomejs/biome": "^2.6.6",
        "@changesets/cli": "^2.31.1",
        "@joewrights/biome": "workspace:*",
        "@joewrights/tsconfig": "workspace:*",
        "@rspress/core": "^2.1.1",
        "@types/node": "^20.19.43",
        "husky": "^9.1.7",
        "turbo": "^2.11.10",
        "typescript": "^5.9.3"
    },
    "keywords": [
        "monorepo",
        "turbo",
        "pnpm",
        "rspress",
        "changesets",
        "biome"
    ],
    "license": "MIT"
}
```

`private: true` 保证根不会被误发布，包只有 `@joewrights/core` 等三个可发布。文档站留在根（不进 workspace），因此 rspress 依赖挂在根 devDependencies，与 born 一致。

- [ ] **Step 2: 创建 `pnpm-workspace.yaml`**

```yaml
packages:
    - "packages/**"
```

不预留 `examples/**`：glob 指向不存在目录会让 turbo 产生噪声。

- [ ] **Step 3: 创建 `turbo.json`**

```json
{
    "$schema": "https://turbo.build/schema.json",
    "tasks": {
        "build": {
            "dependsOn": ["^build"],
            "outputs": ["dist/**"]
        },
        "dev": {
            "cache": false,
            "persistent": true,
            "dependsOn": ["^build"]
        },
        "clean": {
            "cache": false
        },
        "typecheck": {
            "dependsOn": ["^build"]
        },
        "test": {
            "dependsOn": ["^build"]
        }
    }
}
```

`clean` 必须显式 `cache: false`。born 写的是 `clean: {}`，turbo 会把清理动作本身缓存起来，第二次 `pnpm clean:packages` 直接命中缓存、什么都不删 —— 一个静默失效的清洗脚本比没有更糟。

- [ ] **Step 4: 创建根 `tsconfig.json`**

```json
{
    "compilerOptions": {
        "jsx": "react-jsx",
        "module": "esnext",
        "moduleResolution": "bundler",
        "esModuleInterop": true,
        "experimentalDecorators": true,
        "skipLibCheck": true
    }
}
```

只服务编辑器解析 `rspress.config.ts` 与 `docs/**`，**不参与 `core` 构建**（那是 `@joewrights/tsconfig/library.json` 的管辖）。这里的 `module` 与库的 `NodeNext` 不同不是矛盾，是两条互不污染的链路。

- [ ] **Step 5: 校验**

Run: `cd /Users/joewright/fullstack/ship && node -e "const p=JSON.parse(require('fs').readFileSync('package.json','utf8'));const t=JSON.parse(require('fs').readFileSync('turbo.json','utf8'));if(p.packageManager!=='pnpm@10.14.0')throw new Error('packageManager mismatch');if(t.tasks.clean.cache!==false)throw new Error('clean must not be cached');console.log('root config OK')"`

Expected: `root config OK`。

- [ ] **Step 6: Commit**

```bash
cd /Users/joewright/fullstack/ship
git add package.json pnpm-workspace.yaml turbo.json tsconfig.json
git commit -m "chore: add root workspace, turbo and toolchain config"
```

---

## Task 6: 安装依赖并接入 husky

**Files:**
- Create: `pnpm-lock.yaml`（由 pnpm 生成）
- Create: `.husky/pre-commit`
- Create: `node_modules/`（不提交）

- [ ] **Step 1: 安装**

```bash
cd /Users/joewright/fullstack/ship
pnpm install
```

Expected: 退出码 0。开头出现 `Scope: all 4 workspace projects`（根 + tsconfig + biome + core），结尾出现 `Done in ...`，且日志中**不出现** `ops-nexus` 或任何私有源地址。根 `prepare: husky` 会在此刻自动执行。

- [ ] **Step 2: 处理 pnpm 10 的构建脚本拦截**

若输出含 `Ignored build scripts: <包名列表>`，把那些包名写进 `pnpm-workspace.yaml` 后重装：

```yaml
packages:
    - "packages/**"

onlyBuiltDependencies:
    - esbuild
```

列表以实际提示为准，不要照抄这里的 `esbuild`。`@biomejs/biome` v2 走 optionalDependencies 分发平台二进制，通常**不**需要进这个名单。若无该提示，跳过本步。

- [ ] **Step 3: 确认四个二进制就位**

```bash
cd /Users/joewright/fullstack/ship
ls node_modules/.bin | grep -E '^(biome|turbo|changeset|rspress|tsc)$'
node -e "['biome','turbo','changeset','rspress','tsc'].forEach(b=>require('fs').accessSync('node_modules/.bin/'+b));console.log('bins OK')"
```

Expected: 列出 5 个名字，随后 `bins OK`。`rspress` 由 `@rspress/core` 提供（其 `bin.rspress` 已核实），如果 `rspress` 不在列表里，说明误装了 `rspress` 1.x 包，检查根 package.json。

- [ ] **Step 4: 确认 husky 已接管 hooksPath**

```bash
cd /Users/joewright/fullstack/ship
git config core.hooksPath
test -d .husky/_ && echo 'husky dir OK'
```

Expected: 输出 `.husky/_`，随后 `husky dir OK`。若为空，说明 `prepare` 没跑成，手动执行 `pnpm exec husky` 后重验。

- [ ] **Step 5: 创建 `.husky/pre-commit`**

```sh
pnpm lint:ci
```

husky v9 的钩子文件不需要 shebang（由 `.husky/_` 里的 harness 统一加载）。

这里是**故意**选只读检查而非 born 的 `biome check --write`：`--write` 会静默改写工作区文件但不重新 `git add`，结果是钩子"通过"了、提交上去的却是未格式化的旧内容。只读检查把问题挡在提交之前。

- [ ] **Step 6: 授予可执行位并试跑钩子内容**

```bash
cd /Users/joewright/fullstack/ship
chmod +x .husky/pre-commit
pnpm lint:ci
```

Expected: 退出码 0。此步同时是 biome 配置能否被接受的首次检验，三种典型失败与对应修法：

- 报 `unrecognized emitter/option` 或未知配置项指向 `unsafeParameterDecoratorsEnabled` → 从 `packages/biome/index.json` 删掉整个 `javascript.parser` 块（ship 当前无装饰器代码，删了不影响任何现有功能）。
- 报 `extends: "@joewrights/biome"` 无法解析 → 把根 `biome.json` 的该值改成相对路径 `"./packages/biome/index.json"`（包内 node_modules 符号链接未建立时会出现）。
- 对 `docs/**/*.md` 报文件类型不支持 → 把 `packages/biome/index.json` 的 `files.ignoreUnknown` 改为 `true`。

任一修改都要同步回对应文件并重新跑本步，直到退出码 0。**禁止用 `git commit --no-verify` 绕过**，那等于把钩子变成摆设。

- [ ] **Step 7: Commit**

```bash
cd /Users/joewright/fullstack/ship
git add pnpm-lock.yaml .husky/pre-commit pnpm-workspace.yaml
git commit -m "chore: install workspace dependencies and wire pre-commit hook"
```

本次提交会真实触发刚装的 pre-commit 钩子 —— 这也是对钩子的第一次实跑检验。Expected: 提交成功，`git log --oneline -1` 显示该条。

---

## Task 7: 构建链路验证

**Files:**
- 无新增文件；本任务只产出证据，并允许就地修正 Task 2/4/5 的配置错误

- [ ] **Step 1: 首次构建**

```bash
cd /Users/joewright/fullstack/ship
pnpm build:packages
```

Expected: 退出码 0，汇总区形如 `Tasks:   1 total, 1 successful, 0 cached, 1 time spent`。只有 `core` 有 `build` 脚本，所以总数是 1 而非 3 —— 这是正确的，不是漏跑。

- [ ] **Step 2: 校验产物四件套**

```bash
cd /Users/joewright/fullstack/ship
ls -1 packages/core/dist
```

Expected: `index.d.ts`、`index.d.ts.map`、`index.js`、`index.js.map` 四个文件齐备。缺 `.map` 说明 base 的 `declarationMap`/`sourceMap` 没生效。

- [ ] **Step 3: 校验类型谓词真的进了 .d.ts**

```bash
cd /Users/joewright/fullstack/ship
grep -q 'value is string' packages/core/dist/index.d.ts && echo 'predicate preserved'
```

Expected: `predicate preserved`。这是选类型守卫当占位实现的全部意义 —— 若 tsc 把谓词降级成 `boolean`，调用方就失去类型收窄，而这只有查 `.d.ts` 才能发现。

- [ ] **Step 4: 重跑验证缓存**

```bash
cd /Users/joewright/fullstack/ship
pnpm build:packages
```

Expected: `Tasks: 1 total, 1 successful, 1 cached, 0 time spent`（或 `FULL TURBO` 字样、`cached` 计数为 1）。若仍然 `0 cached`，说明 `outputs` 声明与真实产物路径不符，回到 `turbo.json` 核对 `dist/**`。

- [ ] **Step 5: 以 CJS 方式真实消费产物**

```bash
cd /Users/joewright/fullstack/ship
node -e "const m=require('/Users/joewright/fullstack/ship/packages/core/dist/index.js');if(typeof m.isNonEmptyString!=='function')throw new Error('export missing');console.log(m.isNonEmptyString('a'), m.isNonEmptyString(''), m.isNonEmptyString(null))"
```

Expected: `true false false`。这一步证明产出的是可被 `require` 的 CommonJS，而不是只能被 import 的 ESM —— 即 `type: commonjs` + `module: NodeNext` 的组合确实按预期生效。

- [ ] **Step 6: 类型检查与只读 lint**

```bash
cd /Users/joewright/fullstack/ship
pnpm typecheck
pnpm lint:ci
```

Expected: 两条命令均退出码 0。

- [ ] **Step 7: 验证 clean 没有被缓存**

```bash
cd /Users/joewright/fullstack/ship
pnpm clean:packages
test ! -d packages/core/dist && echo 'clean really removed dist'
```

Expected: `clean really removed dist`。若 `dist` 还在，就是 born 那个 `clean: {}` 缓存 bug 复现了 —— 本计划已在 `turbo.json` 写 `cache: false` 规避，这步是确认规避生效。

- [ ] **Step 8: 重建产物并检查提交状态**

```bash
cd /Users/joewright/fullstack/ship
pnpm build:packages
git status --porcelain
```

Expected: 构建成功；`git status --porcelain` 输出为空（`dist/`、`.turbo/`、`node_modules/` 均已被 `.gitignore` 覆盖）。输出为空则本任务无需提交，不要制造空提交。

---

## Task 8: changesets 版本管理

**Files:**
- Create: `.changeset/config.json`
- Create: `.changeset/README.md`（由 `changeset init` 生成）

- [ ] **Step 1: 用 init 生成配置，不手写**

```bash
cd /Users/joewright/fullstack/ship
pnpm exec changeset init
```

Expected: 退出码 0，生成 `.changeset/config.json`。

必须走 `init` 而不是照抄 born 的 `.changeset/config.json`：让工具自己产出当前版本认得的 schema，比人工对齐字段名可靠（born 那份是手写的，字段容易与新版 schema 对不上）。

> **执行期阻塞与修正（已实际遇到）：** 本任务原计划装 registry latest 的 `@changesets/cli@3.0.3`，在 node v20.20.2 上跑 `changeset init` 直接抛 `TypeError: enableCompileCache is not a function` —— 3.x 的 `engines.node` 是 `^22.11 || ^24 || >=26`。其 bin 用 `process.getBuiltinModule` 做版本保护，但该 API 已被回移到 node 20.11+，保护形同虚设。重跑时直接装 `^2.31.1`，并逐项核对其余依赖的 `engines` 与本机 runtime（已核：biome `>=14.21.3`、`@rspress/core` `^20.19.0||>=22.12.0`、typescript `>=14.17`、husky `>=18` 均满足）。

- [ ] **Step 2: 只改两个字段，保留 init 产出的其余结构**

```bash
cd /Users/joewright/fullstack/ship
node -e "const fs=require('fs');const f='.changeset/config.json';const raw=fs.readFileSync(f,'utf8');const c=JSON.parse(raw.replace(/^\/\/.*$/gm,'').replace(/,\s*([}\]])/g,'\$1'));c.access='public';c.baseBranch='main';fs.writeFileSync(f,JSON.stringify(c,null,4)+'\n')"
cat .changeset/config.json
```

Expected: 打印的配置里 `"access": "public"`、`"baseBranch": "main"`。

`access` 必须从 init 默认的 `restricted` 改成 `public`：restricted 是配合私有 registry 用的，公共 npm 上 scoped 包若为 restricted 则默认私有，发布后别人装不到。born 留 `restricted` 是因为它走公司源，不适用。

若 init 产出的文件带注释（`$schema` 行注释等）导致 `JSON.parse` 抛错，Step 2 的脚本已做注释与尾逗号剥离；如仍失败，改为手工编辑该两个字段后继续，并把实际文件内容记录到本任务下。

- [ ] **Step 3: 确认 workspace 四个成员都被识别**

```bash
cd /Users/joewright/fullstack/ship
pnpm ls -r --depth -1
```

Expected: 列出 `ship@0.0.0`（root）、`@joewrights/biome@0.0.0`、`@joewrights/core@0.0.0`、`@joewrights/tsconfig@0.0.0`。changesets 只对有 `version` 字段的包生效，三个包都有。

- [ ] **Step 4: 验证 changeset CLI 与配置真能联动（非交互）**

```bash
cd /Users/joewright/fullstack/ship
pnpm exec changeset add --empty
ls .changeset/*.md
pnpm exec changeset status
```

Expected: `changeset add --empty` 生成一个 `.changeset/*.md`；`changeset status` 的输出中**不含** config 解析错误（形如 `Failed to read changeset config` 或 `Error parsing` 的字样即判为失败）。由于当前没有包相对 `main` 发生变更，`status` 报告"无待发布内容"、甚至非零退出都是正常的，这里判定的是配置可用性而非发布清单。

`pnpm changeset`（交互式挑选包和 bump 类型）留给真实改动时人工使用，不在计划里跑 —— 它在无人值守环境下会挂住。

- [ ] **Step 5: 清掉探测用的空 changeset**

```bash
cd /Users/joewright/fullstack/ship
rm -f .changeset/empty-*.md
ls .changeset
```

Expected: 只剩 `config.json` 与 `README.md`。留着空 changeset 会让下一次 `changeset version` 产生无意义的版本号递增。

- [ ] **Step 6: 不跑 `changeset version`**

明确不做。它会改写三个包的 `version` 并生成 `CHANGELOG.md`，把干净架子变成"已发过一轮预版"的状态。发布流程的首次实跑留给接入 CI 时做。

- [ ] **Step 7: Commit**

```bash
cd /Users/joewright/fullstack/ship
git add .changeset
git commit -m "chore(changesets): configure versioning with public access"
```

---

## Task 9: rspress 文档站

**Files:**
- Create: `rspress.config.ts`
- Create: `docs/public/logo.svg`
- Create: `docs/index.mdx`
- Create: `docs/guide/_meta.json`
- Create: `docs/guide/introduction.mdx`
- Create: `docs/guide/quick-start.mdx`

- [ ] **Step 1: 创建 `rspress.config.ts`**

```ts
import { defineConfig } from "@rspress/core"

export default defineConfig({
    root: "docs",
    title: "Ship",
    description: "基于 turbo + pnpm 的 monorepo 基础架子",
    lang: "zh",
    icon: "/logo.svg",
    logo: "/logo.svg",
    route: {
        exclude: ["**/superpowers/**"]
    },
    themeConfig: {
        nav: [{ text: "指南", link: "/guide/introduction" }],
        sidebar: {
            "/guide/": [
                {
                    text: "指南",
                    items: [
                        { text: "简介", link: "/guide/introduction" },
                        { text: "快速开始", link: "/guide/quick-start" }
                    ]
                }
            ]
        }
    },
    llms: true
})
```

两个易错点：其一，排除键在 rspress 2.x 叫 `route.exclude`，**没有** `excludeSources`（那是 1.x 旧名，写错不报错、只静默失效），已对 `@rspress/shared@2.1.1` 的 `RouteOptions` 核实；其二，`icon`/`logo` 只引用 `logo.svg` 一个文件，不像 born 那样再引一个不存在的 `logo-with-title.svg`。

- [ ] **Step 2: 创建 `docs/public/logo.svg`**

```svg
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 64 64">
    <rect width="64" height="64" rx="14" fill="#1f6feb" />
    <path d="M32 12v26" stroke="#ffffff" stroke-width="4" stroke-linecap="round" />
    <path d="M20 38c8 6 16 6 24 0" stroke="#ffffff" stroke-width="4" fill="none" stroke-linecap="round" />
    <path d="M16 48h32" stroke="#ffffff" stroke-width="4" stroke-linecap="round" />
</svg>
```

- [ ] **Step 3: 创建 `docs/index.mdx`**

```mdx
---
pageType: home
hero:
  name: Ship
  text: Ship it.
  tagline: 基于 turbo + pnpm 的 monorepo 基础架子
  actions:
    - theme: brand
      text: 快速开始
      link: /guide/quick-start
    - theme: alt
      text: 简介
      link: /guide/introduction
features:
  - title: 任务图与缓存
    details: turborepo 按依赖顺序调度 build / dev / typecheck，命中缓存的任务直接跳过
  - title: tsc 直接产出
    details: 不引入额外打包器，TypeScript 编译器负责 JS 与声明文件产出
  - title: 约定集中
    details: tsconfig 与 biome 规则各自独立成包，全仓单一事实来源
  - title: 版本可追溯
    details: changesets 管理多包版本与 changelog，发布前构建由 prerelease 保证
  - title: 文档即代码
    details: rspress 站点与代码同仓，改完实现顺手改文档
  - title: 提交即检查
    details: pre-commit 跑只读检查，不把未格式化内容送进历史
---
```

- [ ] **Step 4: 创建 `docs/guide/_meta.json`**

```json
[
    "introduction",
    "quick-start"
]
```

- [ ] **Step 5: 创建 `docs/guide/introduction.mdx`**

```mdx
# 简介

ship 是一个 monorepo 基础架子，目标是把六件工具的接线方式固定下来，让后续加业务包只需要复制目录结构。

## 目录结构

| 路径 | 职责 |
| --- | --- |
| `packages/tsconfig` | `@joewrights/tsconfig`，共享类型配置：base / library / node 三档 |
| `packages/biome` | `@joewrights/biome`，唯一 lint 与格式化约定来源 |
| `packages/core` | `@joewrights/core`，示例库，用于证明构建链路可用 |
| `docs` | rspress 文档站内容，站点配置在仓库根的 `rspress.config.ts` |

## 约定

- **包作用域**：一律 `@joewrights/*`，公共 npm registry，不使用私有源。
- **模块格式**：CJS 优先。库包 `package.json` 显式写 `"type": "commonjs"`，配合 `module: NodeNext` 产出 CommonJS。日后要把某个包转 ESM，只需翻该包自己的 `type` 字段。
- **禁止开启 `verbatimModuleSyntax`**：它与 CJS 产出冲突。`@joewrights/tsconfig` 的 base 里已显式写 `false` 兜住。
- **缩进**：4 空格，来自 `.editorconfig`，biome 通过 `useEditorconfig` 读取。
- **新加业务包**：在 `packages/` 下建目录，`tsconfig.json` 继承 `@joewrights/tsconfig/library.json`，`package.json` 备齐 `build` / `dev` / `clean` / `typecheck` 四个脚本，即可被 `--filter='@joewrights/*'` 覆盖。

## 当前边界

架子阶段**没有**测试框架、CI 流水线、`examples/` 可运行示例，也没有真实业务模块。`turbo.json` 里保留了 `test` 任务定义但各包不预置 `test` 脚本，避免一开箱就红灯。
```

- [ ] **Step 6: 创建 `docs/guide/quick-start.mdx`**

```mdx
# 快速开始

## 环境要求

node 20（见 `.nvmrc`）、pnpm 10.14（见根 `package.json` 的 `packageManager`）。

## 安装

```bash
pnpm install
```

安装时根脚本 `prepare: husky` 会自动接管 git hooks，因此**必须先 `git init` 再安装**，否则安装中断。

## 构建

```bash
pnpm build:packages
```

产物在 `packages/<name>/dist`。重复执行时第二次应全部命中 turbo 缓存。

## 类型检查与 lint

```bash
pnpm typecheck    # 逐包 tsc --noEmit
pnpm lint         # biome check --write，会改写文件
pnpm lint:ci      # biome ci，只读，提交前跑的就是这个
```

## 本地开发

```bash
pnpm dev:packages   # tsc --watch
pnpm docs:dev       # 文档站开发服务器
```

## 发版流程

```bash
pnpm changeset          # 交互式选择变更的包与 bump 级别，生成 .changeset/*.md
pnpm changeset:version  # 消费 changeset，改写版本号与 CHANGELOG
pnpm release            # prerelease 先全量构建，再 changeset publish
```

`access` 已设为 `public`，scoped 包发布到公共 npm 后可被正常安装。
```

- [ ] **Step 7: 构建文档站**

```bash
cd /Users/joewright/fullstack/ship
pnpm docs:build
```

Expected: 退出码 0，生成 `doc_build/`。若报 `Cannot find module '@rspress/core'` 或 `defineConfig is not a function`，说明 rspress 2.x 的入口导出有变，改用 `npm view @rspress/core exports` 核对实际子路径后再改 import，不要退回装 `rspress` 1.x。

- [ ] **Step 8: 验证内部文档没被打进站点**

```bash
cd /Users/joewright/fullstack/ship
find doc_build -path '*superpowers*' -print | head
test -f doc_build/index.html && echo 'home page built'
```

Expected: 第一条命令**无任何输出**（`route.exclude` 生效），随后 `home page built`。若列出了 superpowers 路径，说明排除没生效：先确认 glob 写作 `**/superpowers/**`，仍不行则改在 `route.exclude` 里追加 `"**/docs/superpowers/**"`，并重新构建复验 —— 不要接受"配置写了但没验"的状态。

- [ ] **Step 9: Commit**

```bash
cd /Users/joewright/fullstack/ship
git add rspress.config.ts docs
git commit -m "feat(docs): add rspress site with guide content"
```

---

## Task 10: 仓库 README 与全量验收

**Files:**
- Create: `README.md`

- [ ] **Step 1: 创建根 `README.md`**

```markdown
# Ship

基于 turbo + pnpm 的 monorepo 基础架子。

## 技术栈

turborepo（任务图与缓存）· pnpm workspace（依赖管理）· tsc（打包）· rspress（文档）· changesets（版本）· biome（lint + format）

## 常用命令

| 命令 | 作用 |
| --- | --- |
| `pnpm install` | 安装，顺带 `husky` 接管 git hooks |
| `pnpm build:packages` | 按依赖顺序构建全部包 |
| `pnpm dev:packages` | `tsc --watch` |
| `pnpm typecheck` | 逐包类型检查 |
| `pnpm lint` | biome 检查并改写 |
| `pnpm lint:ci` | biome 只读检查，pre-commit 用的就是它 |
| `pnpm docs:dev` / `docs:build` | 文档站 |
| `pnpm changeset` | 记录一次版本意图 |
| `pnpm release` | 构建后发布 |

## 目录

```
packages/
  tsconfig/    @joewrights/tsconfig  共享类型配置
  biome/       @joewrights/biome     共享 lint 配置
  core/        @joewrights/core      示例库（tsc 产出 CJS + 声明）
docs/          文档站内容
```

## 约定

包作用域 `@joewrights/*`；库产物 CJS 优先，由包内 `"type": "commonjs"` 决定；不要开启 `verbatimModuleSyntax`；缩进 4 空格（`.editorconfig`）。

## 设计文档

决策依据与偏离 born 的理由见 `docs/superpowers/specs/2026-11-11-ship-monorepo-scaffold-design.md`。
```

- [ ] **Step 2: 跑全量验收脚本**

逐条对应规格 §10 的八项判据，任何一条 FAIL 都不要宣称完成：

```bash
cd /Users/joewright/fullstack/ship
node -e '
const { execSync } = require("child_process")
const fs = require("fs")
const run = (cmd) => {
  try { return { ok: true, out: execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }) } }
  catch (e) { return { ok: false, out: String(e.message) } }
}
const checks = [
  ["1 install 无私有源痕迹", () => fs.existsSync("node_modules") && !fs.readFileSync("pnpm-lock.yaml", "utf8").includes("ops-nexus")],
  ["2 build 产出 js+dts", () => fs.existsSync("packages/core/dist/index.js") && fs.existsSync("packages/core/dist/index.d.ts")],
  ["3 类型谓词保留", () => fs.readFileSync("packages/core/dist/index.d.ts", "utf8").includes("value is string")],
  ["4 CJS 可被 require", () => typeof require("./packages/core/dist/index.js").isNonEmptyString === "function"],
  ["5 lint:ci 通过", () => run("pnpm lint:ci").ok],
  ["6 typecheck 通过", () => run("pnpm typecheck").ok],
  ["7 docs 构建且排除内部文档", () => { run("pnpm docs:build"); return fs.existsSync("doc_build/index.html") && run("find doc_build -path *superpowers* -print").out.trim() === "" }],
  ["8 changeset 配置可用", () => { const s = run("pnpm exec changeset status"); return !/Failed to read changeset config|Error parsing/i.test(s.out) && JSON.parse(fs.readFileSync(".changeset/config.json", "utf8").replace(/^\/\/.*$/gm, "")).access === "public" }]
]
let failed = 0
for (const [name, fn] of checks) {
  let pass = false
  try { pass = !!fn() } catch { pass = false }
  if (!pass) failed++
  console.log((pass ? "PASS" : "FAIL") + "  " + name)
}
console.log(failed === 0 ? "\nALL 8 CHECKS PASSED" : "\n" + failed + " CHECK(S) FAILED")
process.exit(failed === 0 ? 0 : 1)
'
```

Expected: 8 行 `PASS`，末行 `ALL 8 CHECKS PASSED`，退出码 0。

判读提示：第 4 条若在 Linux/macOS 下因 ESM/CJS 上下文取不到 `require`，改用 Step 5 里那条独立 `node -e "require('<绝对路径>')"` 复核，不要靠改断言让它变绿。

- [ ] **Step 3: 缓存行为复验**

```bash
cd /Users/joewright/fullstack/ship
pnpm build:packages 2>&1 | grep -E 'cached|FULL TURBO|successful'
```

Expected: `cached` 计数为 1（上一步已构建过，此处应命中缓存）。若为 0，回到 Task 7 Step 4 排查 `outputs`。

- [ ] **Step 4: 最终提交**

```bash
cd /Users/joewright/fullstack/ship
git add README.md
git commit -m "docs: add repository readme with command reference"
git log --oneline
git status
```

Expected: 提交成功；`git log --oneline` 显示 10 条左右历史（含规格提交）；`git status` 报告 `nothing to commit, working tree clean`。

---

## 完成标准

全部满足才算交付：

1. Task 10 Step 2 输出 `ALL 8 CHECKS PASSED`。
2. `git status` 干净，历史里每个任务一个提交。
3. 三条 born 遗留 bug 的规避均已被命令证明：pre-commit 只读（Task 6 Step 5）、`clean` 不缓存（Task 7 Step 7）、无永久红灯 `test` 脚本（Task 4 Step 1 的 scripts 里没有 test）。
4. 未做的事不谎称做了：无测试框架、无 CI、未发布、无 examples 应用、`node_modules` 未提交。
