---
title: 腾讯云 COS 对象存储攻防
id: tencent_cos
---

## 0x01 Bucket 公开访问
腾讯云存储桶的访问权限默认为私有读写权限,且存储桶名称会带上一串时间戳：

> 这个时间戳其实就是用户自己的 APPID 值

<!-- more -->

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-07/1646619897-229691-image.png)

账户中的访问策略包括用户组策略、用户策略、存储桶访问控制列表（ACL）和存储桶策略（Policy）等不同的策略类型。当腾讯云 COS 收到请求时，首先会确认请求者身份，并验证请求者是否拥有相关权限。验证的过程包括检查用户策略、存储桶访问策略和基于资源的访问控制列表，对请求进行鉴权。

![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-07/1646619904-160188-image.png)

--摘自腾讯云官方文档
上图我们仅配置了存储桶访问权限，于是因为设置了私有读写，无权访问该文件，Message 为 “Access Denied.”
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-07/1646619909-836714-image.png)

## 0x02 Bucket Object 遍历
如果策略中允许了Object的List操作，则在目标资源范围下，会将所有的Bucket Object显示出来，这时，Key值可以理解为文件的目录，通过拼接可获取对应的文件：
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-07/1646619915-588089-image.png)

有趣的是，在腾讯云的访问策略体系中，如果存储桶访问权限为私有读写，且 Policy 权限为匿名访问，那么 Policy 权限的优先级高于存储桶访问权限。
如果控制台配置了Policy权限，默认是对所有用户生效，并且允许所有操作，这时即使存储桶访问权限配置为私有读写，匿名用户也可通过遍历Bucket Object，获取对应的文件。
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-07/1646619921-669374-image.png)
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-07/1646619926-465949-image.png)


## 0x03 Bucket 爆破
当访问的存储桶不存在时，Message 为 “NoSuchBucket”，通过响应包返回内容的对比，可以筛选出已存在的存储桶域名。
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-07/1646619937-126107-image.png)

## 0x04 Bucket 接管
由于Bucket 接管是由于管理人员未删除指向该服务的DNS记录，攻击者创建同名Bucket进而让受害域名解析所造成的，关键在于攻击者是否可创建同名Bucket，腾讯云有特定的存储桶命名格式，即
```
<bucketname>-<appid>+cos.ap-nanjing.myqcloud.com
```
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-07/1646619947-13831-image.png)

而appid是在控制台用时间戳随机生成的，因此无法创建同名Bucket，故不存在Bucket 接管问题：
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-07/1646619952-217415-image.png)


## 0x05 任意文件上传与覆盖
由于Bucket不支持重复命名，所以当匿名用户拥有写入权限时，可通过任意文件上传对原有文件进行覆盖，通过PUT请求可上传和覆盖任意文件
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-07/1646619959-181505-image.png)

## 0x06 用户身份凭证（签名）泄露
通过 RESTful API 对对象存储（Cloud Object Storage，COS）可以发起 HTTP 匿名请求或 HTTP 签名请求。匿名请求一般用于需要公开访问的场景，例如托管静态网站；此外，绝大部分场景都需要通过签名请求完成。
签名请求相比匿名请求，多携带了一个签名值，签名是基于密钥（SecretId/SecretKey）和请求信息加密生成的字符串。SDK 会自动计算签名，您只需要在初始化用户信息时设置好密钥，无需关心签名的计算；对于通过 RESTful API 发起的请求，需要按照签名算法计算签名并添加到请求中。--摘自官方文档
代表腾讯云用户签名的参数为：SecretId/SecretKey，在开发过程中可能有如下几处操作失误会导致SecretId/SecretKey泄露，获取到SecretId/SecretKey相当于拥有了对应用户的权限，从而操控Bucket
### Github中配置文件中泄露凭证
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-07/1646619970-831294-image.png)

### 小程序\APP反编译源码中泄露凭证
### 错误使用SDK泄露凭证
常见场景：代码调试时不时从服务器端获取签名字符串，而是从客户端获取硬编码的签名字符串
官方SDK使用文档：https://cloud.tencent.com/document/product/436/8095
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-07/1646619978-923960-image.png)

### 第三方组件配置不当导致泄露凭证
常见场景：/actuator/heapdump堆转储文件泄露SecretId/SecretKey
## 0x07 Bucket ACL 可读/写
列出Bucket Object提示无权访问：
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-07/1646619986-46380-image.png)

查看Bucket的ACL配置，发现有http://cam.qcloud.com/groups/global/AllUsers下有FULL_CONTROL权限
```
GET /?acl HTTP/1.1
Host: <BucketName-APPID>.cos.<Region>.myqcloud.com
Date: GMT Date
Authorization: Auth String
```
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-07/1646619999-446660-image.png)


官方文档中有对ACL权限配置参数的说明：https://cloud.tencent.com/document/product/436/30752#.E6.93.8D.E4.BD.9C-permission
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-07/1646620006-451246-image.png)

FULL_CONTROL代表匿名用户有完全控制权限，于是在通过PUT ACL写入策略，将存储桶的访问权限配置为公有读写：
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-07/1646620013-494342-image.png)
