---
title: 腾讯云 CVM 弹性计算服务攻防
id: tencent_cvm
---

## 0x01 初始访问
### 1. SSRF与元数据
腾讯云服务器会公开每个实例的内部服务，如果发现云服务器中的SSRF漏洞，可以直接查询主机实例的元数据从而进一步深入利用。

<!-- more -->

当发现在云服务器上存在的 SSRF 漏洞，可尝试如下请求：

```
http://metadata.tencentyun.com/latest/meta-data/  获取 metadata 版本信息。
查询实例元数据。

http://metadata.tencentyun.com/latest/meta-data/placement/region
获取实例物理所在地信息。

http://metadata.tencentyun.com/latest/meta-data/local-ipv4 
获取实例内网 IP。实例存在多张网卡时，返回 eth0 设备的网络地址。

http://metadata.tencentyun.com/latest/meta-data/public-ipv4
获取实例公网 IP。

http://metadata.tencentyun.com/network/interfaces/macs/${mac}/vpc-id
实例网络接口 VPC 网络 ID。

在获取到角色名称后，可以通过以下链接取角色的临时凭证，${role-name} 为CAM 角色的名称：
http://metadata.tencentyun.com/latest/meta-data/cam/security-credentials/${role-name}
```

如果查询到存在SSRF漏洞的服务器在云上，则可以尝试读取角色的临时凭证进而接管该角色的身份，要注意的是只有在实例绑定了 CAM 角色后才能获取到临时凭证，如果没有指定CAM 角色的名称，接口会返回404。
相关漏洞案例：
https://hackerone.com/reports/341876

### 2. 凭证泄露

- **控制台登录凭证泄露**

腾讯云控制台支持邮箱、QQ、子用户的密码登录，这类数据较多泄露在可公开访问的网盘文件中，获取到账号密码后可登录控制台对云服务器执行密码重置，删除实例，shell命令执行等操作。

- **API 密钥泄露**

API 密钥是构建腾讯云 API 请求的重要凭证，这类数据较多泄露在GitHub、逆向后的客户端源码、js前端代码中，获取到SecretId和SecretKey后相当于拥有了对应用户的身份权限，如果该账户下有权限管理云服务器，则可以通过检索主机接管账户下的云服务器。
推荐使用图形化工具接管云主机：https://yun.cloudbility.com/

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-30/1648621943-432421-image.png)

  输入正确的API密钥后会检索当前身份各区域是否有云主机管理权限：

 ![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-30/1648621968-144288-image.png)

  导入云主机后可通过基础运维功能图形化管理云服务器：

 ![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-30/1648621978-444151-image.png)

- **其他关键身份凭证信息泄露。**

比如证书、签名、token、远程连接密码、私钥等数据。这类数据较多泄露在某些配置文件中。

### 3. 账户劫持

  利用云厂商控制台本身的漏洞对用户账号进行劫持，常见的比如携带token信息的任意URL跳转、XSS、暴力破解等攻击手段进入其他用户的控制台进而获取云服务器权限。

### 4. 镜像投毒

  部分操作系统会出现无人维护更新的情况，云服务商会将这些系统的镜像下线或者替换，自定义服务器镜像可以让用户有更多的选择空间以满足业务的需求。攻击者可以制作带有后门的恶意镜像，通过共享镜像进行操作系统投毒，比如预设一些定时任务、劫持正常系统命令等操作。

## 0x02 命令执行

### 1. 通过云控制台执行命令

  攻击者在初始访问阶段获取到平台登录凭据后，可以利用平台凭据登录云平台，并直接使用云平台提供的Web控制台登录云服务器实例，在成功登录实例后，攻击者可以在实例内部执行命令。

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-30/1648622115-501213-image.png)

  找到自动化助手后创建命令

 ![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-30/1648622143-794619-image.png)

保存后执行，点击命令名称后显示返回详情：

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-30/1648622156-250708-image.png)

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-30/1648622183-29029-image.png)

### 2. 命令行工具 TCCLI 执行命令

安装命令行工具 TCCLI 

`sudo pip install tccli`

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-30/1648622224-973866-image.png)

配置API密钥

`tccli configure`

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-30/1648622248-458063-image.png)

生成json格式示例：

`tccli tat RunCommand  -generate-cli-skeleton`

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-30/1648622261-833779-image.png)

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-30/1648622351-387328-image.png)

将生成的json数据保存至本地后，设置Content（base64后的命令）和InstanceIds（实例ID）后执行：

`tcclitat RunCommand  --cli-input-json file://D:\learn\1.json`

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-30/1648622375-382784-image.png)

成功执行ping命令：

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-30/1648622384-263732-image.png)

### 3. 利用云服务器上的服务漏洞

  参考传统渗透测试的方法，可通过SSH弱口令、web应用漏洞、中间件漏洞、操作系统主机漏洞等方式获取云服务器权限。

## 0x03 权限维持

### 1. 修改启动配置

  访问https://console.cloud.tencent.com/autoscaling/config，修改启动配置，在设置主机步骤时可添加shell脚本，可以加入反弹shell脚本或者其他恶意命令。

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-30/1648622429-284144-image.png)

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-30/1648622439-445060-image.png)

### 2. 恶意镜像库插入后门

在控制台中进入实例镜像页面，通过制作带有后门镜像对云服务器进行权限维持，后面一旦用户使用恶意镜像创建实例，便会触发后门程序。

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-30/1648622446-869122-image.png)

### 3. 创建多个API密钥

作为构建腾讯云 API 请求的重要凭证，API密钥的保管至关重要，若攻击者有了控制台权限，可创建多个API密钥以做备用。

### 4. 创建多个子账号

执行以下命令创建一个用户

`tccli cam AddUser --Name=test124 --Remark=test --ConsoleLogin=1 --UseApi=1 --Password=Test@123456 --NeedResetPassword=0 --PhoneNum=10086 --CountryCode=+86 --Email=123@qq.com`

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-30/1648622857-530030-image.png)

获取用户权限边界,当前显示改用户没有添加任何策略，因此无法操作cvm:

`tccli cam GetUserPermissionBoundary --TargetUin=100024621854`

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-30/1648622864-834344-image.png)

列出策略列表：

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-30/1648622874-170101-image.png)

将PolicyId=1的策略即管理员权限绑定给新建的用户

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-30/1648622885-5028-image.png)

至此成功创建一个新的管理员账户。

## 0x04 权限提升

参考传统渗透测试的方法，可通过内核漏洞、应用程序漏洞、主机服务漏洞等方式对云服务器进行提权。

## 0x05 防御绕过

### 1、关闭告警通知

在控制台-主机安全-告警设置处可关闭包括入侵检测、安全漏洞、安全基线、攻击检测、网页防篡改等通知

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-30/1648622900-462363-image.png)

关闭异常登录告警实例：

`tccli cwp ModifyWarningSetting  --cli-input-json file://D:\learn\1.json`

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-30/1648622919-634469-image.png)

### 2、绕过风控限制

部分云厂商的风控机制有时会拦截掉一些敏感操作：

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-30/1648622932-964136-image.png)

需要绕过风控也是控制台接管攻击方式的一个弊端，经测试，扫码成功后其实后端会返回一个有效的token值来允许用户的操作，设想如果该token校验值没有和控制台用户身份进行绑定，就可能使用该token对其他用户的云服务器进行非法操作，这里只提供一种绕过思路，腾讯云本身不存在该问题。

## 0x06 横向移动

### 1. 网段信息

在控制台-私有网络处可查询有用户创建的私有网段信息：

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-30/1648622943-985647-image.png)

使用API密钥查询VPC列表：

`tccli vpc DescribeVpcs`

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-30/1648622955-337677-image.png)

### 2. 通用密码或者远程登录密钥

运维配置实例时可能是统一用批量脚本进行创建的，获取控制台权限后可以通过读取统一配置的密码或者远程登录密钥攻击其他云服务器。
使用API密钥查询密钥对列表：

`tccli cvm DescribeKeyPairs`

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-30/1648623017-391222-image.png)

### 3. 元数据窃取

元数据中检索用户数据的接口也常被用来在漏洞案例中证明危害，很多时候我们希望在创建实例时能够自动对加载一些配置，比如添加用户、配置网络，下载某些软件并安装等等，user-data能让用户自定义配置文件和脚本，这些启动脚本可能包括密码、私钥、源代码等，通过如下地址访问腾讯云服务器实例创建时默认加载的脚本：
http://metadata.tencentyun.com/latest/user-data

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-30/1648623033-579325-image.png)

参考案例：https://hackerone.com/reports/53088
