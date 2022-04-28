---
title: 华为云 OBS 对象存储攻防
id: huaweicloud_obs
---

## 0x00前言：
其实华为云和其他云的攻防利用方式大同小异，师傅们可以对照着前几篇云安全对象存储攻防文章享用。

<!-- more -->

阿里云 https://zone.huoxian.cn/d/918-oss
腾讯云 https://zone.huoxian.cn/d/949-cos
谷歌云 https://zone.huoxian.cn/d/931
微软云 https://zone.huoxian.cn/d/940
AWS https://zone.huoxian.cn/d/907-aws-s3

下面就简单列举下华为云对象存储下的攻防手段。

## 0x01、Bucket劫持
华为云bucket劫持和阿里云的差不多，注意的是华为云在删除掉自己的bucket后30分钟后才可重新注册相同名称的bucket
https://console.huaweicloud.com/console/?region=af-south-1#/obs/manager/buckets
进入华为云的对象存储服务、桶列表、创建桶
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-09/1646798519-102207-image.png)
当bucket名称存在时会报错
请求的桶名已经存在，或被其他用户占用，请重新输入。
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-09/1646798539-5406-image.png)

## 0x02、Bucket爆破
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-09/1646798595-161756-image.png)
不存在，返回NoSuchBucket
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-09/1646798608-170516-image.png)
存在，返回AccessDenied
## 0x03、Access Key Id、Secret Access Key泄漏
Github 敏感信息泄露
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-09/1646798623-486163-image.png)
反编译目标 APK
目标网站源代码泄露
返回包、JS文件泄漏
...
## 0x04、特定的bucket策略配置
CORS，限制指定的Referer头，自定义设置Referer头
无指定Referer
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-09/1646798674-538638-image.png)
指定Referer
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-09/1646798702-784057-image.png)
curl命令验证
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-09/1646798725-192550-image.png)
## 0x05、任意文件上传（无法解析）
上传html等后缀的文件无法解析，直接下载
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-09/1646798736-720385-image.png)
但是其存在分享功能，分享出来的文件是可以解析的
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-09/1646798748-375869-image.png)
但是分享有时间限制
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-09/1646798762-208019-image.png)
从上图中可以看到，分享的链接只保持1分钟到18小时
## 0x06、文件覆盖
下面是华为云官方文档介绍，是可以覆盖掉对象
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-09/1646798779-761099-image.png)
这里没实际搭建环境，使用官方工具做个演示，可以看到bucket中文件名为ddddd.jpg，我们上传一个同文件名的文件
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-09/1646798791-349846-image.png)
可以看到文件名一样就会覆盖前面的对象
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-09/1646798806-72895-image.png)
## 0x07、Bucket Object 遍历
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-09/1646798817-737756-image.png)
如上图，如果设置为公共读或者公共读写就会导致object遍历（设置公共的时候会有提示，问题有可能会出现在复制桶策略上）
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-09/1646798833-125971-image.png)
可拼接key来下载文件
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-09/1646798852-370422-image.png)
## 0x08、Bucket ACL配置错误
如果错误配置了对匿名用户的ACL访问权限，就会造成匿名用户修改Bucket ACL策略，遍历存储桶
实际上只需要给匿名用户配置ACL写入权限即可，但是在请求时需要用户的ID，暂时知道读取权限可以获取用户ID，其他地方应该也可以获取到用户ID；这里为了方便也给予了读取权限
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-09/1646798883-443644-image.png)
首先我们正常访问一下
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-09/1646798872-789500-image.png)
Access Denied，没有权限，我们看一下ACL策略
https://hxsecurity.obs.cn-north-4.myhuaweicloud.com/?acl
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-09/1646798894-389104-image.png)
可以看到用户ID和权限配置，利用手段就是PUT请求，修改ACL策略
```
PUT /?acl HTTP/1.1
Host: demosecurity.obs.cn-north-4.myhuaweicloud.com
Sec-Ch-Ua: "Chromium";v="95", ";Not A Brand";v="99"
Sec-Ch-Ua-Mobile: ?0
Sec-Ch-Ua-Platform: "macOS"
Upgrade-Insecure-Requests: 1
User-Agent: Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/95.0.4638.69 Safari/537.36
Accept: text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.9
Sec-Fetch-Site: none
Sec-Fetch-Mode: navigate
Sec-Fetch-User: ?1
Sec-Fetch-Dest: document
Accept-Encoding: gzip, deflate
Accept-Language: zh-CN,zh;q=0.9
Connection: close
Content-Length: 575

<AccessControlPolicy xmlns="http://obs.cn-north-4.myhuaweicloud.com/doc/2015-06-30/">
  
  <Owner> 
    <ID>0a84535a6780f2340fd8c121220e3d660</ID> 
  </Owner>  
  <AccessControlList>   
    <Grant> 
      <Grantee> 
        <ID>0a84535a6780f2311212190e3d660</ID>
      </Grantee>
      #拥有者的权限
      <Permission>FULL_CONTROL</Permission>
      <Delivered>false</Delivered>
    </Grant>
    <Grant>
      <Grantee>
        <Canned>Everyone</Canned>
      </Grantee>
      #匿名用户的权限
      <Permission>FULL_CONTROL</Permission>
    </Grant>
  </AccessControlList>
</AccessControlPolicy>
```
 修改此处的Permission为FULL_CONTROL
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-09/1646798912-491804-image.png)
放行返回控制台看一下
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-09/1646798923-684931-image.png)
拥有了桶访问权限的读取和写入权限，验证下，重新访问
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-03-09/1646798938-479252-image.png)
同样的道理，如果我们修改用户只有write权限，没有读取权限，就会导致网站瘫痪

漏洞利用方式可能有错，利用手段也不止于此，希望各位师傅轻喷，也希望师傅们在火线zone多分享分享
