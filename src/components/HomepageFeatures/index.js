import React from 'react';
import { Table, Column, HeaderCell, Cell } from 'rsuite-table';
import 'rsuite-table/dist/css/rsuite-table.css';

const dataList = [
    {前期侦查: 'API 密钥泄露', 初始访问: 'Bucket 公开访问', 执行: '通过控制台执行', 权限提升: '利用应用程序提权', 权限维持: '在存储对象中植入后门', 防御绕过: '关闭安全监控服务', 信息收集: '用户账号数据泄露', 横向移动: '窃取云凭证横向移动', 影响: 'Bucket 接管'},
    {前期侦查: '控制台账号密码泄露', 初始访问: '特定的访问配置策略', 执行: '利用云厂商命令行工具执行', 权限提升: 'Bucket 策略可写', 权限维持: '写入用户数据', 防御绕过: '在监控区域外攻击', 信息收集: '对象存储敏感数据泄露', 横向移动: '窃取用户账号攻击其他应用', 影响: '任意文件上传覆盖'},
    {前期侦查: '临时访问凭证泄露', 初始访问: '元数据服务未授权访问', 执行: '使用云API执行', 权限提升: 'Object ACL 可写', 权限维持: '在云函数中添加后门', 防御绕过: '停止日志记录', 信息收集: '目标源代码信息', 横向移动: '通过控制台横向移动', 影响: '敏感数据泄露'},
    {前期侦查: '访问密码泄露', 初始访问: '云控制台非法登录', 执行: '写入用户数据执行', 权限提升: 'Bucket ACL 可写', 权限维持: '在自定义镜像库中导入后门镜像', 防御绕过: '日志清理', 信息收集: '共享快照', 横向移动: '使用实例账号爆破', 影响: '破坏存储数据'},
    {前期侦查: 'SDK 泄露', 初始访问: '账号劫持', 执行: '使用对象存储工具执行', 权限提升: '通过访问管理提权', 权限维持: '创建访问密钥', 防御绕过: '通过代理访问', 信息收集: '元数据', 横向移动: '使用用户账号攻击其他应用', 影响: '植入后门'},
    {前期侦查: '前端代码泄露', 初始访问: '恶意的镜像', 执行: '利用后门文件执行', 权限提升: '创建高权限角色', 权限维持: '在 RAM 中创建辅助账号', 防御绕过: '', 信息收集: '云服务访问密钥', 横向移动: 'PostgreSQL 数据库 SSRF', 影响: '拒绝服务'},
    {前期侦查: '共享快照', 初始访问: '网络钓鱼', 执行: '利用应用程序执行', 权限提升: '利用服务自身漏洞进行提权', 权限维持: '利用远控软件', 防御绕过: '', 信息收集: '用户数据', 横向移动: '', 影响: '子域名接管'},
    {前期侦查: '', 初始访问: '应用程序漏洞', 执行: '利用 SSH、RDP 服务登录到实例执行命令', 权限提升: '低权限下收集到数据库里的高权限访问凭证信息', 权限维持: '控制台修改或添加数据库账户密码', 防御绕过: '', 信息收集: '获取配置文件中的应用凭证', 横向移动: '', 影响: '资源劫持'},
    {前期侦查: '', 初始访问: '服务弱口令', 执行: '利用远程命令执行漏洞执行', 权限提升: '在 RAM 中将低权限用户分配高权限策略', 权限维持: '命令行修改或添加数据库账户密码', 防御绕过: '', 信息收集: '获取实例网段信息', 横向移动: '', 影响: '窃取项目源码'},
    {前期侦查: '', 初始访问: '密码访问', 执行: '利用 SDK 执行', 权限提升: '', 权限维持: '共享快照', 防御绕过: '', 信息收集: '数据库连接历史记录', 横向移动: '', 影响: '窃取用户数据'},
    {前期侦查: '', 初始访问: '密钥访问', 执行: '数据库连接工具', 权限提升: '', 权限维持: '', 防御绕过: '', 信息收集: '数据库其他用户账号密码', 横向移动: '', 影响: '篡改数据'},
    {前期侦查: '', 初始访问: '', 执行: '', 权限提升: '', 权限维持: '', 防御绕过: '', 信息收集: '数据库中的敏感信息', 横向移动: '', 影响: '加密勒索'},
    {前期侦查: '', 初始访问: '', 执行: '', 权限提升: '', 权限维持: '', 防御绕过: '', 信息收集: '警告通知邮箱', 横向移动: '', 影响: '恶意公开共享'},
    {前期侦查: '', 初始访问: '', 执行: '', 权限提升: '', 权限维持: '', 防御绕过: '', 信息收集: '性能详情', 横向移动: '', 影响: '恶意修改安全组'},
    {前期侦查: '', 初始访问: '', 执行: '', 权限提升: '', 权限维持: '', 防御绕过: '', 信息收集: 'MSSQL 读取实例文件', 横向移动: '', 影响: '恶意释放弹性IP'},
    {前期侦查: '', 初始访问: '', 执行: '', 权限提升: '', 权限维持: '', 防御绕过: '', 信息收集: '流日志', 横向移动: '', 影响: '恶意修改防火墙策略'},
    {前期侦查: '', 初始访问: '', 执行: '', 权限提升: '', 权限维持: '', 防御绕过: '', 信息收集: '安全组配置信息', 横向移动: '', 影响: 'LB 中的 HTTP 请求走私攻击'},
    {前期侦查: '', 初始访问: '', 执行: '', 权限提升: '', 权限维持: '', 防御绕过: '', 信息收集: 'RAM 用户角色权限信息', 横向移动: '', 影响: 'Bucket 爆破'},
    {前期侦查: '', 初始访问: '', 执行: '', 权限提升: '', 权限维持: '', 防御绕过: '', 信息收集: '', 横向移动: '', 影响: 'Bucket Object 遍历'}
];

export default function HomepageFeatures(){
  return (
    <Table data={dataList} autoHeight affixHorizontalScrollbar cellBordered wordWrap headerHeight={60}>
    <Column flexGrow={1} minWidth={200} resizable align="center" verticalAlign="middle">
      <HeaderCell>前期侦查</HeaderCell>
      <Cell dataKey="前期侦查" />
    </Column>
   <Column flexGrow={1} minWidth={200}resizable align="center" verticalAlign="middle">
      <HeaderCell>初始访问</HeaderCell>
      <Cell dataKey="初始访问" />
    </Column>
     <Column flexGrow={1} minWidth={200}resizable align="center" verticalAlign="middle">
      <HeaderCell>执行</HeaderCell>
      <Cell dataKey="执行" />
    </Column>
    <Column flexGrow={1} minWidth={200}resizable align="center" verticalAlign="middle">
      <HeaderCell>权限提升</HeaderCell>
      <Cell dataKey="权限提升" />
    </Column>
    <Column flexGrow={1} minWidth={200}resizable align="center" verticalAlign="middle">
      <HeaderCell>权限维持</HeaderCell>
      <Cell dataKey="权限维持" />
    </Column>
    <Column flexGrow={1} minWidth={200}resizable align="center" verticalAlign="middle">
      <HeaderCell>防御绕过</HeaderCell>
      <Cell dataKey="防御绕过" />
    </Column>
    <Column flexGrow={1} minWidth={200}resizable align="center" verticalAlign="middle">
      <HeaderCell>信息收集</HeaderCell>
      <Cell dataKey="信息收集" />
    </Column>
    <Column flexGrow={1} minWidth={200}resizable align="center" verticalAlign="middle">
      <HeaderCell>横向移动</HeaderCell>
      <Cell dataKey="横向移动" />
    </Column>
    <Column flexGrow={1} minWidth={200}resizable align="center" verticalAlign="middle">
      <HeaderCell>影响</HeaderCell>
      <Cell dataKey="影响" />
    </Column>
  </Table>
  )
};