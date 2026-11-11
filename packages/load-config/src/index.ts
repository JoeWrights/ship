import chalk from "chalk"

import { ApolloConfigClient, ApolloConfigClientOption } from "./client"
import { LocalConfig, LocalConfigOption } from "./local"
import { Logger } from "./utils"

/** 环境变量注入使用的默认 Apollo AppId */
const DEFAULT_ENV_APP_ID = "biz-platform-web_env"

/** 环境变量注入的扩展选项，合并了 Apollo 连接配置 */
interface InjectEnvOption extends ApolloConfigClientOption {
    /**
     * @desc 需要注入的变量空间；"build": 编译期变量；"runtime": 运行时变量
     * @desc 默认全部注入；
     * @type {(string | string[])}
     * @memberof InjectEnvOption
     */
    ns?: string | string[]
}

/** loadConfig 全局配置选项 */
export interface Option {
    /**
     * @desc 是否输出 verbose 级别日志；
     * @desc 默认`process.env.NODE_ENV`不为"production"时开启；
     *
     * @type {boolean}
     * @memberof Option
     */
    verbose?: boolean
    /**
     * @desc 是否需要注入通用环境变量；
     * @desc 设置为`false`不注入；
     *
     * @type {(ApolloConfigClientOption | false)}
     * @memberof Option
     */
    injectEnv?: InjectEnvOption | false
    /**
     * @desc 是否检查本地配置；
     * @desc 设置为`false`不注入
     *
     * @type {(LocalConfigOption | false)}
     * @memberof Option
     */
    local?: LocalConfigOption | false
    apollo?: ApolloConfigClientOption | false
}

/**
 * 统一配置加载客户端
 *
 * 封装本地配置文件、Apollo 远程配置及环境变量注入三大能力，
 * 按照优先级本地 > Apollo 加载命名空间配置。
 */
export class Client {
    private apolloClient: ApolloConfigClient | null
    private localClient: LocalConfig | null
    private logger: Logger

    constructor(
        /** 全局配置选项，控制是否启用本地/Apollo 配置及日志级别 */
        private option?: Option
    ) {
        this.apolloClient = null
        this.localClient = null
        const { local, apollo } = option || {}
        this.logger = new Logger({
            verbose: option?.verbose || process.env.NODE_ENV !== "production",
        })
        if (local !== false) {
            this.logger.verbose("启用本地配置")
            this.localClient = new LocalConfig(this.logger, local)
        } else this.logger.verbose("不启用本地配置(option.local=false)")
        if (apollo !== false) {
            const mergedApolloConfig: ApolloConfigClientOption = {
                host: apollo?.host || process.env.APOLLO_URL,
                token: apollo?.token || process.env.APOLLO_SECRET,
                appId: apollo?.appId || process.env.APOLLO_APPID,
                clusterName: apollo?.clusterName || process.env.APOLLO_CLUSTER,
            }
            if (!mergedApolloConfig.appId || !mergedApolloConfig.host) {
                this.logger.warn("缺少Apollo远程配置，不启用Apollo配置")
            } else {
                this.logger.verbose("启用Apollo远程配置")
                this.apolloClient = new ApolloConfigClient(
                    this.logger,
                    mergedApolloConfig
                )
            }
        } else this.logger.verbose("不启用Apollo远程配置(option.apollo=false)")
    }

    /**
     * 从 Apollo 公共命名空间（build、runtime 等）读取环境变量并注入 process.env
     *
     * 可通过 option.injectEnv.ns 指定需要注入的命名空间，默认全部注入。
     * 当必要配置缺失（appId 或 host）时打印警告并跳过。
     */
    async injectEnv() {
        const { injectEnv } = this.option || {}
        if (injectEnv !== false) {
            const mergedApolloConfig: ApolloConfigClientOption = {
                host: injectEnv?.host || process.env.APOLLO_URL,
                token: injectEnv?.token || process.env.APOLLO_SECRET,
                appId: injectEnv?.appId || DEFAULT_ENV_APP_ID,
                clusterName: injectEnv?.clusterName || process.env.APP_ENV,
            }
            if (!mergedApolloConfig.appId || !mergedApolloConfig.host) {
                this.logger.warn(
                    "缺少InjectEnv Apollo远程配置，不启用公共环境变量注入"
                )
                return
            }
            this.logger.verbose("开始注入环境变量")
            const client = new ApolloConfigClient(
                this.logger,
                mergedApolloConfig
            )
            const allNs = ["application"]
            const ns = injectEnv?.ns
            if (typeof ns === "undefined") {
                allNs.push("build", "runtime")
            } else if (typeof ns === "string") {
                allNs.push(ns)
            } else if (typeof ns === "object") {
                allNs.push(...ns)
            }
            const injectKeys: string[] = []
            for (const n of allNs) {
                const keys: string[] = []
                const envs = await client.getAppConfig<Record<string, any>>(n)
                Object.entries(envs).forEach(([key, value]) => {
                    if (typeof value === "string") {
                        process.env[key] = value
                        keys.push(key)
                    }
                })
                this.logger.verbose(`获取到环境变量[${n}]`)
                injectKeys.push(...keys)
            }
            this.logger.success(
                `已注入环境变量: ${injectKeys.map((i) => chalk.bold.blue(i)).join(",")}`
            )
        } else {
            console.warn("未注入通用环境配置（未启用Apollo）")
        }
    }

    /**
     * 按优先级加载指定命名空间的配置：本地文件 → Apollo 远程
     *
     * 当本地配置存在时直接返回，否则尝试从 Apollo 获取。
     *
     * @param namespace - 配置命名空间（如文件路径或 Apollo namespace）
     * @returns 解析后的配置对象
     * @throws 当本地和 Apollo 都无法获取配置时抛出错误
     */
    async getConfig<T>(namespace: string): Promise<T> {
        let config: T | null | undefined
        if (this.localClient) {
            this.logger.verbose(`("${namespace}") 加载本地配置文件`)
            config = this.localClient.getConfig<T>(namespace)
            if (config)
                this.logger.success(`("${namespace}") 加载本地配置文件成功`)
            else this.logger.verbose(`("${namespace}") 加载本地配置文件失败`)
        }
        if (this.apolloClient) {
            if (!config) {
                this.logger.verbose(`("${namespace}") 加载Apollo配置`)
                config = await this.apolloClient.getAppConfig<T>(namespace)
                if (config)
                    this.logger.success(`("${namespace}") 加载Apollo配置成功`)
                else this.logger.verbose(`("${namespace}") 加载Apollo配置失败`)
            } else {
                this.logger.verbose(
                    `("${namespace}") 已加载本地配置，跳过Apollo配置加载`
                )
            }
        }
        if (!config) throw new Error("[load-config] 获取不到配置信息")
        return config
    }
}

/**
 * 统一配置加载入口函数
 *
 * 支持三种调用方式：
 * 1. 不传 namespace：仅执行环境变量注入，不返回配置
 * 2. 传入单个 string：返回对应命名空间的配置
 * 3. 传入 string[]：并行加载多个命名空间配置，返回数组
 *
 * @param namespace - 配置命名空间，可选
 * @param option - 全局配置选项
 * @returns 配置对象或配置数组
 */
async function loadConfig(namespace?: null, option?: Option): Promise<void>
async function loadConfig<T>(namespace: string, option?: Option): Promise<T>
async function loadConfig<T extends Array<unknown>>(
    namespace: string[],
    option?: Option
): Promise<T>
async function loadConfig<T>(
    namespace?: string | string[] | null,
    option?: Option
): Promise<any> {
    const client = new Client(option)
    await client.injectEnv()
    if (typeof namespace === "undefined" || namespace === null) return
    if (typeof namespace === "string") {
        return await client.getConfig<T>(namespace)
    }
    return Promise.all(namespace.map(async (ns) => await client.getConfig(ns)))
}

export { loadConfig }
export default loadConfig
