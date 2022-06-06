---
title: AWS ELB、VPC 和 IAM 服务攻防
id: aws_elb_vpc_iam
---

## 0x00 前言
在 AWS 中，不管是 EC2 还是 RDS 都会使用到 VPC (Virtual Private Cloud) 虚拟网络环境服务，在 EC2 中可能会用到 ELB (Elastic Load Balancing) 弹性负载均衡服务，IAM (Identity and Access Management) 可以帮助 AWS 用户安全地控制对 AWS 资源的访问。
这里站在攻击者的视角简单看看 VPC、ELB 和 IAM 服务所面临的一些风险点。
## 0x01 信息收集
### 1、网段信息
在 VPC 中可以看到目标网段信息，拿到这些信息后，在进行内网横向时就可以更有专注性，在一定程度上提高内网横向的效率。
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-05-05/1651741390-838366-image.png)

或者通过命令行获取目标子网信息
```
aws ec2 describe-subnets --query 'Subnets[].CidrBlock'
```
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-05-05/1651741406-23687-image.png)
### 2、流日志
在 VPC 中，可以通过创建查看流日志的信息，去判断目标 IP 的流量信息，从而判断出高价值目标，方便接下来的内网横向。
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-05-05/1651741407-10735-image.png)

### 3、安全组配置信息
在 AWS VPC 控制台中，可以查看到目标的安全组信息，如果安全组配置了一些只允许单个 IP 访问的策略，那么可以认为这个 IP 是一个高价值 IP，例如这样的配置。
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-05-05/1651741423-458849-image.png)

或者使用命令行查看入站规则中的端口和源IP范围
```
aws ec2 describe-security-groups --query 'SecurityGroups[].IpPermissions[].[FromPort,IpRanges]'
```
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-05-05/1651741432-7489-image.png)

同时在安全组中，如果遇到开放所有端口并且允许所有人访问的情况，那么也可以认为这是存在一定安全风险的。
### 4、IAM 用户角色权限信息
如果可以访问到目标的 IAM 信息，则可以对当前用户的 IAM 用户角色权限信息进行收集，这有助于更全面的了解到当前目标使用了那些云服务以及策略的划分。
例如通过下面的这些角色，可以猜测出当前目标使用了 EKS、ELB、RDS 等服务，那么在进行横向的时候，就可以多关注关注有没有这方面的资产。
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-05-05/1651741438-581968-image.png)

或者使用命令行查看
```
aws iam list-roles --query 'Roles[].RoleName'
```
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-05-05/1651741444-568707-image.png)


## 0x02 权限提升
### 1、 在 IAM 中分配用户权限
如果当前用户具备编辑 IAM 策略的权限，但没有某些服务权限的话，那么可以在 IAM 中开启这个服务权限，以实现提权。
例如下面这个用户，在打开 EC2 时提示我们没有权限
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-05-05/1651741451-743767-image.png)

但是这个用户是具有 IAM 的编辑权限的，因此我们可以将 AmazonEC2FullAccess 权限赋予给这个用户
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-05-05/1651741458-203159-image.png)

此时再次访问 EC2 界面，发现就可以成功访问了，这样就实现了提权。
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-05-05/1651741465-693115-image.png)

## 0x03 权限维持
### 1、利用 IAM 进行权限维持
利用 IAM 进行权限维持的原理也比较简单，直接在 IAM 中创建一个拥有高权限的用户即可。
例如这里选择添加用户，访问类型选择控制台密码
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-05-05/1651741473-168158-image.png)

「设置权限」选择「直接附加现有策略」，策略选择「AdministratorAccess」，即表示附加所有策略
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-05-05/1651741484-787764-image.png)

创建完成后，会提供自动生成的密码与登录地址，使用这个登录地址和密码直接登录即可，这时我们就制作好了一个后门账户。
## 0x04 影响
### 1、恶意修改安全组
攻击者可以通过恶意修改安全组，比如将允许特定 IP 访问的策略改成允许所有人访问，以方便自己的测试。

或者将安全组修改为禁止允许所有人访问，导致目标对外服务不可访问。
### 2、恶意释放弹性 IP
攻击者可以通过恶意释放弹性 IP，造成目标实例 IP 变动导致域名绑定 IP 失效，以至于域名不可访问等影响。
### 3、HTTP 请求走私攻击
如果 EC2 配置了 ELB，那么攻击者可以尝试对 EC2 上的 Web 服务发起 HTTP 请求走私攻击，从而绕过认证。
### 4、恶意修改防火墙策略
攻击者可以通过恶意修改防火墙策略，将自己的攻击 IP 添加到防火墙策略内，从而方便自己的攻击。
或者将防火墙策略设置为禁止所有人访问，导致目标对外服务不可访问。
