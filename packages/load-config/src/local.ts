import fs from "fs"
import path from "path"

import { parseContent } from "./parse-content"
import { Logger } from "./utils"

/** 本地配置加载选项 */
export interface LocalConfigOption {
    /** 本地配置文件的根目录，默认为 process.cwd() */
    root?: string
}

/**
 * 本地配置文件读取器
 *
 * 从指定根目录按命名空间路径读取配置文件，支持 JSON、YAML 等格式自动解析。
 */
export class LocalConfig {
    private root: string

    constructor(
        /** 日志记录器实例 */
        private logger: Logger,
        /** 本地配置选项 */
        option?: LocalConfigOption
    ) {
        this.root = option?.root || process.cwd()
    }

    /**
     * 从本地文件系统读取指定命名空间的配置
     * @param namespace - 配置命名空间（相对于 root 的文件路径）
     * @returns 解析后的配置对象，文件不存在时返回 null
     * @throws 当文件存在但解析失败时抛出错误
     */
    getConfig<T>(namespace: string): T | null {
        const configPath = path.join(this.root, namespace)
        const exist = fs.existsSync(configPath)
        if (exist) {
            try {
                const data = fs.readFileSync(configPath, "utf-8")
                return parseContent(namespace, data)
            } catch (err) {
                this.logger.error(
                    `本地配置文件解析失败("${namespace}")，请检查文件内容`
                )
                throw new Error(
                    `[load-config] 本地配置文件解析失败("${namespace}")`
                )
            }
        }
        return null
    }
}
