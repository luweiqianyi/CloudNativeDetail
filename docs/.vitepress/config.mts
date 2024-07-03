import { defineConfig } from 'vitepress'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  base: '/CloudNativeDetail/',
  title: "云原生",
  description: "介绍云原生相关技术栈。",
  lastUpdated: true, // 显示文章的最近一次更新时间
  themeConfig: {
    logo: '/logo.svg', // 站点标题图标设置
    
    // 导航栏设置
    // https://vitepress.dev/reference/default-theme-config
    nav: [
      { text: 'Docker', link: '/Docker/practice/Docker安装教程' },
      { text: 'Kubernetes', link: '/Kubernetes/practice/001-Kubernetes安装教程' },
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
          {
            text: '实践',
            collapsed: false,
            items: [
              { text: 'Docker安装教程', link: '/Docker/practice/Docker安装教程' },
              { text: 'harbor-本地镜像仓库搭建', link: '/Docker/practice/harbor-本地镜像仓库搭建' },
            ]
          },
        ]
      },
      {
        text: 'Kubernetes',
        items: [
          {
            text: '实践',
            collapsed: false,// 设置本条项支持折叠
            items: [
              { text: 'Kubernetes安装教程', link: '/Kubernetes/practice/001-Kubernetes安装教程' },
              { text: 'kubernetes部署minio', link: '/Kubernetes/practice/kubernetes部署minio' },
            ]
          },
          {
            text: 'kubelet',
            collapsed: false,
            items: [
              { text: 'kubelet信息查看', link: '/Kubernetes/kubelet/002-kubelet信息查看' },
              { text: 'kubelet子模块-云资源同步', link: '/Kubernetes/kubelet/003-kubelet子模块-云资源同步'},
              { text: 'kubelet子模块-metrics', link: '/Kubernetes/kubelet/004-kubelet子模块-metrics' },
              { text: 'kubelet子模块-ImageGCManager', link: '/Kubernetes/kubelet/005-kubelet子模块-ImageGCManager'},
              { text: 'kubelet子模块-serverCertificateManager', link: '/Kubernetes/kubelet/006-kubelet子模块-serverCertificateManager'},
              { text: 'kubelet子模块-oomWatcher', link: '/Kubernetes/kubelet/007-kubelet子模块-oomWatcher'},
              { text: 'kubelet子模块-resourceAnalyzer', link: '/Kubernetes/kubelet/008-kubelet子模块-resourceAnalyzer'},
              { text: 'kubelet子模块-volumeManager', link: '/Kubernetes/kubelet/009-kubelet子模块-volumeManager'},
            ]
          },
        ]
      },
      {
        text: 'Linux',
        items: [
          { text: 'Linux命令大全', link: '/Linux/Linux命令大全' },
          { text: 'cat命令格式化显示Json数据', link: '/Linux/cat命令格式化显示Json数据' },
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