import { defineConfig } from "@rspress/core"

export default defineConfig({
    root: "docs",
    title: "Ship",
    description: "基于 turbo + pnpm 的 monorepo 基础架子",
    lang: "zh",
    icon: "/logo.svg",
    logo: "/logo.svg",
    route: {
        exclude: ["**/superpowers/**"],
    },
    themeConfig: {
        nav: [{ text: "指南", link: "/guide/introduction" }],
        sidebar: {
            "/guide/": [
                {
                    text: "指南",
                    items: [
                        { text: "简介", link: "/guide/introduction" },
                        { text: "快速开始", link: "/guide/quick-start" },
                    ],
                },
            ],
        },
    },
    llms: true,
})
