import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  title: "云原生",
  description: "介绍云原生相关技术栈。",
  lastUpdated: true, // 显示文章的最近一次更新时间
  themeConfig: {
    logo: '/logo.svg', // 站点标题图标设置
    
    // 导航栏设置
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Docker', link: '/Docker/001-Docker安装教程' },
      { text: 'Kubernetes', link: '/Kubernetes/001-Kubernetes安装教程' },
      { text: '关于我', link: '/about/me' },
    ],

    // 搜索框
    search: {
      provider: 'local'
    },

    // 左侧边栏
    sidebar: [
      {
        text: 'Docker',
        items: [
          { text: 'Docker安装教程', link: '/Docker/001-Docker安装教程' },
        ]
      },
      {
        text: 'Kubernetes',
        items: [
          { text: 'Kubernetes安装教程', link: '/Kubernetes/001-Kubernetes安装教程' },
        ]
      }
    ],

    // 文章右侧边栏
    outline: {
      label: '目录',
      level: 'deep',
    },

    // 个人社交账号设置
    socialLinks: [
      { icon: 'github', link: 'https://github.com/luweiqianyi/CloudNative' }
    ],

    // "Edit this page"设置
    editLink: {
      pattern: 'https://github.com/luweiqianyi/CloudNative/tree/main/docs/:path'
    },

    // 站点广告接入
    // carbonAds: {
    //   code: 'CEBDT27Y',
    //   placement: 'vuejsorg'
    //   // code: 'your-carbon-code',
    //   // placement: 'your-carbon-placement'
    // }

    // 主页底部Copyright设置
    footer: {
      message: 'Released under the MIT License.',
      copyright: 'Copyright © 2024-present <a href="https://github.com/luweiqianyi">luweiqianyi</a>'
    }
  }
})