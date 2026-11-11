import { extname } from "path"

/**
 * 根据文件扩展名解析内容
 *
 * 当前支持 .json 后缀自动 JSON.parse，其他格式直接返回原始内容。
 *
 * @param filename - 文件名或路径（用于提取扩展名判断格式）
 * @param content - 待解析的原始内容
 * @returns 解析后的配置对象
 * @throws 当 .json 文件内容不合法时抛出错误
 */
export function parseContent(filename: string, content: unknown): any {
    const ext = extname(filename)
    switch (ext) {
        case ".json":
            if (typeof content !== "string")
                throw new Error("Not valid JSON file")
            try {
                return JSON.parse(content)
            } catch (err) {
                throw new Error("Not valid JSON file")
            }
        default:
            return content
    }
}
