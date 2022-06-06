---
title: AWS S3 对象存储攻防
id: aws_s3
---

## 0x00 前言

对象存储（Object-Based Storage），也可以叫做面向对象的存储，现在也有不少厂商直接把它叫做云存储。

<!-- more -->

说到对象存储就不得不提 Amazon，Amazon S3 (Simple Storage Service) 简单存储服务，是 Amazon 的公开云存储服务，与之对应的协议被称为 S3 协议，目前 S3 协议已经被视为公认的行业标准协议，因此目前国内主流的对象存储厂商基本上都会支持 S3 协议。

在 Amazon S3 标准下中，对象存储中可以有多个桶（Bucket），然后把对象（Object）放在桶里，对象又包含了三个部分：Key、Data 和 Metadata

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-02-22/1645499226-857665-image.png)


- Key 是指存储桶中的唯一标识符，例如一个 URL 为：https://teamssix.s3.ap-northeast-2.amazonaws.com/flag，这里的 teamssix 是存储桶 Bucket 的名称，/flag 就是 Key

- Data 就很容易理解，就是存储的数据本体

- Metadata 即元数据，可以简单的理解成数据的标签、描述之类的信息，这点不同于传统的文件存储，在传统的文件存储中这类信息是直接封装在文件里的，有了元数据的存在，可以大大的加快对象的排序、分类和查找。



操作使用 Amazon S3 的方式也有很多，主要有以下几种：

- AWS 控制台操作
- AWS 命令行工具操作

- AWS SDK 操作
- REST API 操作，通过 REST API，可以使用 HTTP 请求创建、提取和删除存储桶和对象。



关于对象存储就介绍到这里，下面来看看在对象存储下的一些攻防手法。

## 0x01 Bucket 公开访问

在 Bucket 的 ACL 处，可以选择允许那些人访问

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-02-22/1645499237-416387-image.png)


如果设置为所有人可列出对象，那么只要知道 URL 链接就能访问，对于设置为私有的情况下，则需要有签名信息才能访问，例如 https://teamssix.s3.ap-northeast-2.amazonaws.com/flag?response-content-disposition=xxx&X-Amz-Security-Token=xxx&X-Amz-Algorithm=xxx&X-Amz-Date=xxx&X-Amz-SignedHeaders=xxx&X-Amz-Expires=xxx&X-Amz-Credential=xxx&X-Amz-Signature=xxx



对于敏感文件，建议权限设置为私有，并培养保护签名信息的安全意识。

理论上，如果公开权限文件的名称设置的很复杂，也能在一定程度上保证安全，但不建议这样做，对于敏感文件，设置为私有权限的安全性要更高。

## 0x02 Bucket 爆破

当不知道 Bucket 名称的时候，可以通过爆破获得 Bucket 名称，这有些类似于目录爆破，只不过目录爆破一般通过状态码判断，而这个通过页面的内容判断。



当 Bucket 不存在有两种返回情况，分别是 InvalidBucketName 和 NoSuchBucket

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-02-22/1645499246-519741-image.png)

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-02-22/1645499256-936192-image.png)


当 Bucket 存在时也会有两种情况，一种是列出 Object

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-02-22/1645499265-505241-image.png)


另一种是返回 AccessDenied

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-02-22/1645499273-373808-image.png)


这样通过返回内容的不同，就可以进行 Bucket 名称爆破了，知道 Bucket 名称后，Key 的爆破也就很容易了。

## 0x03 Bucket Object 遍历

在 s3 中如果在 Bucket 策略处，设置了 s3:ListBucket 的策略，就会导致 Bucket Object 遍历

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-02-22/1645499283-669847-image.png)


在使用 MinIO 的时候，如果 Bucket 设置为公开，那么打开目标站点默认就会列出 Bucket 里所有的 Key

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-02-22/1645499288-336338-image.png)


将 Key 里的值拼接到目标站点后，就能访问该 Bucket 里相应的对象了


## 0x04 任意文件上传与覆盖

如果对象存储配置不当，比如公共读写，那么可能就会造成任意文件上传与文件覆盖。

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-02-22/1645499307-776657-image.png)


如果目标的对象存储支持 html 解析，那就可以利用任意文件上传进行 XSS 钓鱼、挂暗链、挂黑页、供应链投毒等操作。

## 0x05 AccessKeyId、SecretAccessKey 泄露

如果目标的 AccessKeyId、SecretAccessKey 泄露，那么就能获取到目标对象存储的所有权限，一般可以通过以下几种方法进行收集：

- Github 敏感信息搜索

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-02-22/1645499320-108806-image.png)


- 反编译目标 APK
- 目标网站源代码泄露

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-02-22/1645499327-842576-image.png)


## 0x06 Bucket 接管

假如在进行渗透时，发现目标的一个子域显示如下内容

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-02-22/1645499334-545797-image.png)


通过页面特征，可以判断出这是一个 Amazon 的 S3，而且页面显示 NoSuchBucket，说明这个 Bucket 可以接管的，同时 Bucket 的名称在页面中也告诉了我们，为 test.teamssix.com



那么我们就直接在 AWS 控制台里创建一个名称为 test.teamssix.com 的 Bucket 就可以接管了

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-02-22/1645499341-665421-image.png)


创建完 Bucket 后，再次访问发现就显示 AccessDenied 了，说明该 Bucket 已经被我们接管了。

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-02-22/1645499350-259640-image.png)


将该 Bucket 设置为公开，并上传个文件试试

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-02-22/1645499362-300482-image.png)


在该子域名下访问这个 test.txt 文件

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-02-22/1645499368-740653-image.png)


可以看到通过接管 Bucket 成功接管了这个子域名的权限

## 0x07 Bucket ACL 可写

列出目标 Bucket 提示被拒绝

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-02-22/1645499376-890500-image.png)


查看目标 Bucket ACL 策略发现是可读的，且策略如下

```python
aws s3api get-bucket-acl --bucket teamssix
```

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-02-22/1645499384-341862-image.png)


查询官方文档，内容如下：
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-02-22/1645499390-374501-image.png)


![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-02-22/1645499395-1106-image.png)




通过官方文档，可以分析出这个策略表示任何人都可以访问、写入当前 Bucket 的 ACL



那么也就是说如果我们把权限修改为 FULL_CONTROL 后，就可以控制这个 Bucket 了，最后修改后的策略如下：

```json
{
    "Owner": {
        "ID": "d24***5"
    },
    "Grants": [
	{
            "Grantee": {
                "Type": "Group", 
                "URI": "http://acs.amazonaws.com/groups/global/AllUsers"
            }, 
            "Permission": "FULL_CONTROL"
        } 
    ]
}
```

将该策略写入

```python
aws s3api put-bucket-acl --bucket teamssix --access-control-policy file://acl.json
```

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-02-22/1645499424-805159-image.png)




再次尝试，发现就可以列出对象了

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-02-22/1645499444-119347-image.png)


## 0x08 Object ACL 可写

读取 Object 时提示被禁止

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-02-22/1645499451-422849-image.png)


查看目标 Object 策略发现是可读的，且内容如下：

```python
aws s3api get-object-acl --bucket teamssix --key flag
```

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-02-22/1645499458-956354-image.png)


这个策略和上面的 Bucket ACL 策略一样，表示任何人都可以访问、写入当前 ACL，但是不能读取、写入对象



将权限修改为 FULL_CONTROL 后，Object ACL 策略如下：

```json
{
    "Owner": {
        "ID": "d24***5"
    },
    "Grants": [
	{
            "Grantee": {
                "Type": "Group", 
                "URI": "http://acs.amazonaws.com/groups/global/AllUsers"
            }, 
            "Permission": "FULL_CONTROL"
        } 
    ]
}
```

将该策略写入后，就可以读取对象了

```python
aws s3api put-object-acl --bucket teamssix --key flag --access-control-policy file://acl.json
```

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-02-22/1645499468-863365-image.png)


## 0x09 特定的 Bucket 策略配置

有些 Bucket 会将策略配置成只允许某些特定条件才允许访问，当我们知道这个策略后，就可以访问该 Bucket 的相关对象了。



例如下面这个策略：

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-02-22/1645499478-787411-image.png)


```python
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Sid": "TeamsSixFlagPolicy",
            "Effect": "Allow",
            "Principal": "*",
            "Action": "s3:GetObject",
            "Resource": "arn:aws:s3:::teamssix/flag",
            "Condition": {
                "StringLike": {
                    "aws:UserAgent": "TeamsSix"
                }
            }
        }
    ]
}
```

当直接访问 teamssix/flag 的时候会提示 AccessDenied

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-02-22/1645499487-425160-image.png)


而加上对应的 User-Agent 时，就可以正常访问了

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-02-22/1645499501-781848-image.png)


在实战中，可以去尝试读取对方的策略，如果对方策略没做读取的限制，也许就能读到。

其次在进行信息收集的时候，可以留意一下对方可能会使用什么策略，然后再去尝试访问看看那些原本是 AccessDenied 的对象是否能够正常访问。

## 0x10 Bucket 策略可写

### 修改策略获得敏感文件

现有以下 Bucket 策略

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-02-22/1645499512-234327-image.png)


可以看到根据当前配置，我们可以对 Bucket 策略进行读写，但如果想读取 s3://teamssix/flag 是被禁止的

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-02-22/1645499517-90763-image.png)


因为当前策略允许我们写入 Bucket 策略，因此可以将策略里原来的 Deny 改为 Allow，这样就能访问到原来无法访问的内容了。

修改后的策略如下：

```shell
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Principal": {
                "AWS": [
                    "*"
                ]
            },
            "Action": [
                "s3:GetBucketPolicy",
                "s3:PutBucketPolicy"
            ],
            "Resource": [
                "arn:aws:s3:::teamssix"
            ]
        },
        {
            "Effect": "Allow",
            "Principal": {
                "AWS": [
                    "*"
                ]
            },
            "Action": [
                "s3:GetObject"
            ],
            "Resource": [
                "arn:aws:s3:::teamssix/flag"
            ]
        }
    ]
}
```

这里将第 20 行由原来的 Deny 改成了 Allow

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-02-22/1645499526-890183-image.png)


当策略写入后，可以看到成功获取到了原本 Deny 的内容

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-02-22/1645499537-630790-image.png)


### 修改网站引用的 s3 资源进行钓鱼

当策略可写的时候，除了上面的将可原本不可访问的数据设置为可访问从而获得敏感数据外，如果目标网站引用了某个 s3 上的资源文件，而且我们可以对该策略进行读写的话，也可以将原本可访问的资源权限设置为不可访问，这样就会导致网站瘫痪了。



例如这样的一个页面

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-02-22/1645499544-828341-image.png)


查看源代码可以看到引用了 s3 上的资源

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-02-22/1645499552-6499-image.png)


查看 Bucket 策略，发现该 s3 的 Bucket 策略是可读可写的

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-02-22/1645499559-771545-image.png)


这时我们可以修改 Bucket 的静态文件，使用户输入账号密码的时候，将账号密码传到我们的服务器上

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-02-22/1645499572-310411-image.png)


当用户输入账号密码时，我们的服务器就会收到请求了

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-02-22/1645499580-358305-image.png)


### 修改 Bucket 策略为 Deny 使业务瘫痪

除了上面的利用手法外，也可以将策略设置为 Deny

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-02-22/1645499588-612098-image.png)


当策略 PUT 上去后，网站业务就无法正常使用了

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-02-22/1645499595-801806-image.png)


> 参考文章：
>
> https://www.ithome.com/0/501/133.htm
>
> https://mp.weixin.qq.com/s/eZ8OAO5ELgUNvVricIStGA
>
> https://mp.weixin.qq.com/s/r0DuASP6gH_48b5sJ1DCTw
>
> https://blog.csdn.net/bandaoyu/article/details/117469496
>
> https://docs.aws.amazon.com/zh_cn/AmazonS3/latest/userguide/Welcome.html
>
> https://docs.aws.amazon.com/zh_cn/AmazonS3/latest/userguide/acl-overview.html
>
> https://docs.aws.amazon.com/zh_cn/AmazonS3/latest/userguide/access-policy-language-overview.html
