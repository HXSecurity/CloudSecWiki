---
title: 阿里云 VPC 与 LB 和 RAM 的信息收集
id: aliyun_vpc_lb_ram
---

# VPC环境搭建

### 1、创建第一个VPC

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage23d60009185c9fe26c9b0cfcfbd81f12-88786-20220401154905674.png)

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageb119a293138741b2c985f2d74294f6aa-182872-20220401154911082.png)

### 2、创建一个NAT

创建一个NAT，并在访问模式中选择SNAT，这样，同一个VPC中的所有机器人，都可以通过NAT网关访问公网

随后等待即可

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImagef289de6d55aa56305e219cd6170d3780-47966-20220401154916552.png)

### 3、创建一个ACL

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage2667563f7995bf9c483d9ffcfbc9576a-33100-20220401154929308.png)

### 4、创建第二个VPC

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage93ff67a450f181f205a021de1c7158c2-83727-20220401154935966.png)

同样把第二个VPC放在可用区H

### 5、创建第二个NAT

为第二个VPC创建一个NAT，与第一个VPC一样，这里我们选择SNAT

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImagec6e1710d4a7b24ef7ba34d9941829236-199660-20220401154944207.png)

随后等待即可

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage65aa3666168d4af129cc03c00b6f6572-40734-20220401154950493.png)

### 6、创建第二个网络ACL

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage61a16429f1b8bf448a4fc39fe23aa91b-31262-20220401154958515.png)

现在有两个VPC，我们来整体看一下目前的情况

VPC

- 子网192.168.0.0/16
- 公网NAT 101.201.123.203
- 交换机 vsw-2zefutsi7rnb0qai09b2y
- 路由 vtb-2zeo25fbiv7v3zcdjbjys
- ACL vpc-2ze4lqiw3cl7y3zvkj55e

VPC2

- 子网192.168.0.0/16
- 公网NAT 59.110.13.178
- 交换机 vsw-2zen9qtw6woqzqbzhhp4y
- 路由 vtb-2ze8owepmc98208dkh1e6
- ACL nacl-2zewc7vl9elzvlj7454v2

# VPC可能存在的问题

### 信息收集（AK泄露）

在使用阿里云cli之前，需要配置好AK

```bash
aliyun configure --mode ak
```

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImagee1b7d33b69a1037684378eead2b10d3a-578527-20220401155024786.png)

### 1、VPC

```bash
aliyun vpc DescribeVpcs
```

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage56c83ea24434013f2474c5d3486f6f22-1978741-20220401155505963.png)

从这里我们可以看到我们的子网信息，NAT的名称，VPC的所有人

![image-20220401155704989](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220401155704989.png)

### 2、Switch

```bash
aliyun vpc DescribeVSwitches
```

使用该命令可以查看所有的路由表，如果想查看指定的路由表，可以通过—help来查看所需要的参数

![image-20220401155728548](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220401155728548.png)

![image-20220401155736512](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220401155736512.png)

在获取VPC的信息的时候，我们获取到了所有人的账户ID，这里也可以通过所有人的ID来进行筛选与收集

```bash
aliyun vpc DescribeVSwitches --VSwitchOwnerId xxx
```

![image-20220401155753924](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220401155753924.png)

### 3、NAT

```bash
 aliyun vpc DescribeNatGateways
```

![image-20220401155852258](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220401155852258.png)

可以通过该命令收集所有NAT网关信息，通过上面返回的信息，也可以查询SNAT表

![image-20220401155905497](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220401155905497.png)

### 4、ACL

```bash
aliyun vpc DescribeNetworkAcls
# 详细API文档 https://help.aliyun.com/document_detail/34964.html
```

通过该命令可以获取所有ACL

![image-20220401160100957](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220401160100957.png)

### 5、安全组

```bash
aliyun ecs DescribeSecurityGroups
# 使用该命令可以获取目前所有的安全组信息 https://help.aliyun.com/document_detail/25556.html
```

![image-20220401160122900](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220401160122900.png)

### 6 、LB

可以使用该命令收集获取SLB等信息

```bash
aliyun slb DescribeLoadBalancers
```

![image-20220506160039563](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220506160039563.png)

### 7、总结

其实AK泄露的利用方法有很多，以下提供两种思路

#### 1、思路一

第一种思路是通过官方文档来进行KEY泄露的利用，首先打开阿里云官网

![image-20220402145952204](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220402145952204.png)

![image-20220402150047191](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220402150047191.png)

在这里不要选择直达或者说别的，直接选更多推荐

![image-20220402150133259](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220402150133259.png)

来到这里之后直接选择帮助文档，注意下面的来自的那个路径，然后进去看API即可

![image-20220402150207123](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220402150207123.png)

每一种接口名包括参数都会有解释

![image-20220402150236473](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220402150236473.png)

带上这些接口用阿里云 cli试就完事了

不过上述的这种方法，其实效率极低，等于在爆破了，爆破这个KEY到底有多少的权限，而且我们在纯黑盒的模式下拿到一个KEY，有可能权限很小，但是你花了很长的时间去尝试KEY的权限有多大，这是很麻烦的

#### 2、思路二

其实这种思路就跟写存储桶利用或者检测工具一个原理，调SDK，把危险权限，或者有必要的权限全部请求一遍，然后就能知道结果了

![image-20220402151357840](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220402151357840.png)

工具的初衷就是帮助人解决繁琐的流程



# 什么是RAM

不同的云厂商对于RAM的叫法都不太相同，比如，在AWS中，访问控制又称为IAM，在阿里云中，又被称为RAM，在腾讯云中又被称为CAM

| 云厂商 | 名称 |
| ------ | ---- |
| 腾讯云 | CAM  |
| 阿里云 | RAM  |
| AWS    | IAM  |

![image-20220407104037742](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220407104037742.png)

上图取自阿里云： [RAM用户概览 (aliyun.com)](https://help.aliyun.com/document_detail/122148.html?spm=5176.21213303.J_6704733920.17.588953c9ykJprR&scm=20140722.S_help%40%40文档%40%40122148.S_os%2Bhot.ID_122148-RL_RAM-LOC_helpmain-OR_ser-V_2-P0_2)

那么理解一下，也就是一个管理员权限的阿里云账户，可以生成多个RAM用户，这些RAM可以给不同的权限，没有指定权限的RAM用户无法访问对应的服务

那么常见的场景就是在企业中，运维需要给一个员工分配账号，假设他只需要RDS下的操作权限，那么按照权限最小化的原则，那么就只给他分配使用RDS需要分配的权限，不会超过这个权限范围内

# RAM可能存在的问题

## 1、元数据

其实在ECS中的安全就已经讲到了，如果在ECS中部署的程序存在SSRF或者RCE（这里我们来说SSRF，并且假设当前的场景是有回显的SSRF，那么我们通过`http://100.100.100.200/latest/meta-data/`这个地址，获取ECS中的元数据，其实这里会存在一个问题，比如我们想读取临时的凭证，用这个凭证登录控制台，或者操作`aliyun cli`的话，其实默认配置下是不行的

![image-20220407104731233](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220407104731233.png)

![image-20220407105025068](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220407105025068.png)

上面的图片中我们可以看到一个SSRF的靶场，我们获取到的元数据，其实中间并没有一个叫RAM的目录，这上述能读到的东西，都无法让攻击者利用漏洞进行下一步（至少在默认配置下），那么我们来回答上面的问题，为什么ECS在默认配置下是没有RAM的元数据目录

![image-20220407104912061](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220407104912061.png)

我们在ECS中，必须为当前ECS去手动授予RAM角色，既然涉及到授予角色，必然就会存在权限过大的问题，那么假设管理员给的权限比较大

![image-20220407105153681](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220407105153681.png)

给了一个`AdministratorAccess`权限，那么此时如果造成了SSRF的话，就会出现下面的情况

![image-20220407105120157](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220407105120157.png)

攻击者通过SSRF请求元数据获取到了ram的AK

![image-20220407105245684](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220407105245684.png)

![image-20220407105348359](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220407105348359.png)

那么此时就可以通过阿里云cli命令行工具，来操作该RAM用户拥有权限的资源，例如通过这个登陆控制台

首先获取当前的账号别名

```bash
aliyun ram GetAccountAlias
```

![image-20220413113819824](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220413113819824.png)

创建RAM用户

```bash
aliyun ram CreateUser --UserName xxx
```

![image-20220413113834914](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220413113834914.png)

为RAM用户启用Web登陆

```bash
aliyun ram CreateLoginProfile --UserName xxx --Password xxxx
```

![image-20220407105749507](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220407105749507.png)

为指定用户添加权限
```bash
aliyun ram AttachPolicyToUser --PolicyType System --PolicyName AdministratorAccess --UserName xxx
```

![image-20220407105831795](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220407105831795.png)

随后就可以登录控制台了

![image-20220407105849301](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220407105849301.png)

![image-20220407105856934](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220407105856934.png)

![image-20220407105924618](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220407105924618.png)

当然，上述情况是理想情况，具体实际的还得看实战中情况而定

## 2、AK泄露

虽然AK泄露属于大部分的云产品都有这种问题，但是也无法避免，多半都是用户侧配置上的问题

如何调用API可参考：https://help.aliyun.com/document_detail/43766.html ，这里就不一一列举

![image-20220413113622189](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220413113622189.png)
