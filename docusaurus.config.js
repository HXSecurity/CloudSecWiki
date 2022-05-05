// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: '云安全知识库',
  tagline: '由火线安全构建，致力于云安全知识分享',
  url: 'https://cloudsec.huoxian.cn',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
  organizationName: 'HuoCorp', // Usually your GitHub org/user name.
  projectName: 'CloudSecWiki', // Usually your repo name.

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          remarkPlugins: [require('mdx-mermaid')],
          sidebarPath: require.resolve('./sidebars.js'),
          // Please change this to your repo.
          editUrl: function ({ locale, docPath }) {
            return `https://github.com/HuoCorp/cloudsec-wiki/edit/main/docs/${docPath}`;
          },
          showLastUpdateAuthor: false,
          showLastUpdateTime: false,
          includeCurrentVersion: true,
        },
        theme: {
          customCss: require.resolve('./src/css/custom.css'),
        },
      }),
    ],
  ],
  themes: [
    [
      "@easyops-cn/docusaurus-search-local",
      {
        hashed: true,
        language: ["en", "zh"],
        highlightSearchTermsOnTargetPage: true
      }
    ]
  ],

  i18n: 
  {
    defaultLocale: 'zh',
    locales: ['zh'],
  },


  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      metadata: [{
        name: 'keywords', content: 'cloud, security, cloudsecurity, cloudnative, huoxian, 云安全, 云原生, 火线, 攻防矩阵, 云安全攻防矩阵, 云安全靶场'
      }],
      navbar: {
        title: '云安全知识库',
        logo: {
          alt: 'HuoXian Security Logo',
          src: 'img/logo.png',
        },
        items: [
          {
            type: 'doc',
            docId: 'matrix',
            position: 'left',
            label: '攻防矩阵',
          },
          {
            type: 'doc',
            docId: 'goat',
            position: 'left',
            label: '靶场',
          },
          {
            type: 'doc',
            docId: 'about',
            position: 'left',
            label: '关于',
          },
          {
            href: 'https://github.com/HuoCorp',
            label: 'GitHub',
            position: 'left',
          },
        ],
      },
      footer: {
        style: 'dark',
        copyright: `Copyright © ${new Date().getFullYear()} Huoxian All rights reserved. | <a href="https://beian.miit.gov.cn/" target="_blank" data-v-124239aa>京ICP备20013659号-2</a> | 北京安全共识科技有限公司`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;
