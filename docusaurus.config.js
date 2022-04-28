// @ts-check
// Note: type annotations allow type checking and IDEs autocompletion

const lightCodeTheme = require('prism-react-renderer/themes/github');
const darkCodeTheme = require('prism-react-renderer/themes/dracula');

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: '云安全知识库',
  tagline: '由火线安全构建，致力于云安全知识分享',
  url: 'https://wiki.huoxian.cn',
  baseUrl: '/',
  onBrokenLinks: 'throw',
  onBrokenMarkdownLinks: 'warn',
  favicon: 'img/favicon.ico',
  organizationName: 'HXSecurity', // Usually your GitHub org/user name.
  projectName: 'cloudsec-wiki', // Usually your repo name.

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
            return `https://github.com/HXSecurity/cloudsec-wiki/edit/main/docs/${docPath}`;
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
            position: 'right',
            label: '攻防矩阵',
          },
          {
            type: 'doc',
            docId: 'goat',
            position: 'right',
            label: '靶场',
          },
          {
            type: 'doc',
            docId: 'about',
            position: 'right',
            label: '关于',
          },
          {
            href: 'https://github.com/HXSecurity',
            label: 'GitHub',
            position: 'right',
          },
        ],
      },
      footer: {
        style: 'dark',
        copyright: `Copyright © ${new Date().getFullYear()} 火线安全`,
      },
      prism: {
        theme: lightCodeTheme,
        darkTheme: darkCodeTheme,
      },
    }),
};

module.exports = config;
