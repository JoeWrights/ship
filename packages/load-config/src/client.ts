import { createHmac } from "crypto"
import { extname } from "path"

import { parseContent } from "./parse-content"
import { Logger } from "./utils"

/** Apollo 配置客户端的连接选项 */
export interface ApolloConfigClientOption {
    /** Apollo 服务地址（如 http://apollo-config-server:8080） */
    host?: string
    /** Apollo 访问密钥，用于请求签名 */
    token?: string
    /** Apollo 应用 ID */
    appId?: string
    /** Apollo 集群名称 */
    clusterName?: string
}

/** Apollo 默认命名空间名称 */
export const DEFAULT_NAMESPACE = "application"

/**
 * Apollo 配置中心 HTTP 客户端
 *
 * 通过 Apollo Open API 远程拉取应用配置，支持 HMAC-SHA1 签名认证。
 */
export class ApolloConfigClient {
    private host: string
    private token: string
    private appId: string
    private clusterName: string

    constructor(
        /** 日志记录器实例 */
        private logger: Logger,
        /** Apollo 连接配置选项 */
        option: ApolloConfigClientOption
    ) {
        this.host = option.host || ""
        this.token = option.token || ""
        this.appId = option.appId || ""
        this.clusterName = option.clusterName || ""
    }

    /**
     * 根据命名空间后缀提取响应中的配置内容
     * @param namespace - 命名空间（如 "application"、"config.json"）
     * @param data - 原始响应数据
     * @returns 提取后的配置内容
     */
    private getContent(namespace: string, data: any) {
        const ext = extname(namespace)
        switch (ext) {
            case ".json":
                return data.content
            default:
                return data
        }
    }

    /**
     * 生成 Apollo Open API 所需的签名请求头
     *
     * 使用 HMAC-SHA1 算法对时间戳 + URI 进行签名。
     *
     * @param uri - 请求路径
     * @returns 包含 Timestamp 和 Authorization 的请求头对象
     */
    private signHeaders(uri: string) {
        const ms = Date.now()
        const stringToSign = `${ms}\n${uri}`
        const hmac = createHmac("sha1", this.token)
        hmac.update(stringToSign)
        return {
            Timestamp: `${ms}`,
            Authorization: `Apollo ${this.appId}:${hmac.digest("base64")}`,
        }
    }

    /**
     * 构建 Apollo 配置文件的请求路径
     * @param appId - 应用 ID
     * @param namespace - 命名空间
     * @returns 完整的配置 API 路径
     */
    private getConfigPath(appId: string, namespace: string) {
        return `/configfiles/json/${appId}/${this.clusterName}/${namespace}`
    }

    /**
     * 获取当前应用的配置（使用构造时传入的 appId）
     * @param namespace - 命名空间，默认 "application"
     * @returns 解析后的配置对象
     */
    async getAppConfig<T>(namespace = "application"): Promise<T> {
        return this.getConfig(this.appId, namespace)
    }

    /**
     * 从 Apollo 配置中心获取指定应用和命名空间的配置
     * @param appId - 应用 ID
     * @param namespace - 命名空间，默认 "application"
     * @returns 解析并格式化后的配置对象
     * @throws 当认证失败（401）或服务不可用时抛出错误
     */
    async getConfig(appId: string, namespace = "application") {
        const configPath = this.getConfigPath(appId, namespace)
        const res = await fetch(this.host + configPath, {
            method: "GET",
            headers: {
                "Content-Type": "application/json;charset=UTF-8",
                ...this.signHeaders(configPath),
            },
        })
        if (res.status === 200) {
            const data = this.getContent(namespace, await res.json())
            return parseContent(namespace, data)
        }
        if (res.status === 401) {
            this.logger.error("Apollo认证不通过，请检查配置是否正确")
            throw new Error(
                `[load-config] Apollo认证不通过(401): ${configPath}`
            )
        }
        throw new Error(`Can't get Apollo Service, Status(${res.status})`)
    }
}
