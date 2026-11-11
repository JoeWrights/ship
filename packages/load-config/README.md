# 配置加载器

## Usage

### 安装

```bash
pnpm i @joewrights/load-config
```

### 基础使用

#### 只注入环境变量

```typescript
import { loadConfig } from "@joewrights/load-config"

loadConfig()
    // 或 loadConfig(null, {})
    .then((res) => {
        console.log(res)
    })
    .catch((err) => {
        console.error(err)
    })
```

#### 加载单个配置文件

```typescript
import { loadConfig } from "@joewrights/load-config"

loadConfig("config.json")
    .then((res) => {
        console.log(res)
    })
    .catch((err) => {
        console.error(err)
    })
```

#### 加载多个文件配置

```typescript
loadConfig(["config.web.json", "config.server.json"])
    .then(([configWeb, configServer]) => {
        console.log(configWeb)
        console.log(configServer)
    })
    .catch((err) => {
        console.error(err)
    })
```

> 本包同时提供默认导出，`import loadConfig from "@joewrights/load-config"` 与上面的具名导入等价。

## 功能

1. 提供注入**公共环境变量**
2. 提供加载远程Apollo配置
3. 提供加载本地json配置文件

### 公共环境变量

引入`@joewrights/load-config`包加载配置时，会向`apollo`服务器请求`biz-platform-web_env`APP下的相应配置信息，并注入到`process.env`环境变量中

环境变量分为三个Namespace:

-   `application`: 默认使用的环境变量
    _默认注入_
-   `build`: 在**编译阶段**使用的环境变量
-   `runtime`: 在**运行时**使用的环境变量

#### `injectEnv` 参数

`injectEnv`设置为`false`时，则不启用环境变量注入

|     参数      |          类型          |          默认值          |                                 说明                                  |
| :-----------: | :--------------------: | :----------------------: | :-------------------------------------------------------------------: |
|    `host`     |       `string?`        | `process.env.APOLLO_URL` |                            Apollo 服务地址                            |
|    `appId`    |       `string?`        | `"biz-platform-web_env"` |                          Apollo 环境变量App                           |
|    `token`    |       `string?`        |                          |                       Apollo App 调用认证Token                        |
| `clusterName` |       `string?`        |  `process.env.APP_ENV`   |                             当前环境集群                              |
|     `ns`      | `string? \| string[]?` |  `["build", "runtime"]`  | 需要注入的命名空间 <br /> _"application"空间下的环境变量会被默认注入_ |

#### 使用方式

1. 默认情况

   ```typescript
   loadConfig("config")
   ```

2. 只使用特定命名空间下的环境变量

   ```typescript
   loadConfig("config", {
       injectEnv: {
           ns: "build",
       },
   })
   ```

3. 使用其他的`apollo`配置，_通常情况下并不需要这么做_

   ```typescript
   loadConfig("config", {
       injectEnv: {
           host: "xxx",
           appId: "xxx",
           token: "xxx",
           clusterName: "xxx",
       },
   })
   ```

### `local` 使用本地配置文件

`@joewrights/load-config`可以配置加载本地的`json`文件

`local`设置为`false`时，则不启用本地配置

> **本地文件的加载优先级比apollo远程配置更高，加载本地配置文件成功后，会跳过远程apollo配置加载**

|  参数  |   类型    |     默认值      |     说明     |
| :----: | :-------: | :-------------: | :----------: |
| `root` | `string?` | `process.cwd()` | 配置文件目录 |

1. 从指定目录加载

   ```typescript
   loadConfig(["config.json"], {
       local: {
           root: path.join(process.cwd(), "config"),
       },
   }).then((config) => {
       console.log(config)
   })
   ```

### `apollo` Apollo配置

`apollo`设置为`false`时，则不启用apollo远程配置

|     参数      |   类型    |           默认值            |           说明           |
| :-----------: | :-------: | :-------------------------: | :----------------------: |
|    `host`     | `string?` |  `process.env.APOLLO_URL`   |     Apollo 服务地址      |
|    `appId`    | `string?` | `process.env.APOLLO_APPID`  |    Apollo 服务 AppId     |
|    `token`    | `string?` | `process.env.APOLLO_SECRET` | Apollo App 调用认证Token |
| `clusterName` | `string?` |    `process.env.APP_ENV`    |       当前环境集群       |

认证不通过（HTTP 401）时，`loadConfig` 会 reject 并抛出带请求路径的错误，可在 `catch` 中处理。
