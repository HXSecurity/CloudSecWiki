# CloudSecWiki
## 介绍
CloudSecWiki 是由火线安全维护的一个面向云安全方向的知识文库，在 CloudSecWiki 中首次公开了由火线云安全实验室所制作的云服务攻防矩阵，之外还包含了多篇云安全原创文章以及云安全漏洞靶场。

CloudSecWiki 在线地址：[cloudsec.huoxian.cn](https://cloudsec.huoxian.cn)


## 本地部署方案
1.克隆项目到本地

```bash
git clone https://github.com/HuoCorp/CloudSecWiki.git
cd CloudSecWiki
```

2.安装`npm`依赖并编译

```bash
npm install
npm run build
```

3.将`build`目录放入 nginx 服务的静态资源目录即可