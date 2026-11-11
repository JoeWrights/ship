import chalk from "chalk"

/**
 * 带颜色输出的日志记录器
 *
 * 支持 success / info / warn / error / verbose 五种日志级别，
 * 每条日志前缀显示可自定义的标签（默认 "load-config"）。
 */
export class Logger {
    private label: string

    constructor(
        /** 日志配置项 */
        private opt?: {
            /** 日志前缀标签，默认 "load-config" */
            label?: string
            /** 是否输出 verbose 级别日志 */
            verbose?: boolean
        }
    ) {
        this.label = opt?.label || "load-config"
    }

    /**
     * 输出成功状态日志（绿色）
     * @param msg - 日志消息
     */
    success(msg: string) {
        return console.log(chalk.bgGreen(`[${this.label}]`), chalk.green(msg))
    }

    /**
     * 输出普通信息日志（白色）
     * @param msg - 日志消息
     */
    info(msg: string) {
        return console.log(chalk.bgWhite(`[${this.label}]`), chalk.white(msg))
    }

    /**
     * 输出警告日志（黄色）
     * @param msg - 日志消息
     */
    warn(msg: string) {
        return console.log(chalk.bgYellow(`[${this.label}]`), chalk.yellow(msg))
    }

    /**
     * 输出错误日志（红色）
     * @param msg - 日志消息
     */
    error(msg: string) {
        return console.log(chalk.bgRed(`[${this.label}]`), chalk.red(msg))
    }

    /**
     * 输出详细调试日志（灰色），仅在 verbose 启用时打印
     * @param msg - 日志消息
     */
    verbose(msg: string) {
        if (!this.opt?.verbose) return
        return console.log(chalk.bgGray(`[${this.label}]`), chalk.gray(msg))
    }
}
