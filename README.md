# 小红书笔记采集助手

一款 Chrome/Edge 扩展插件，用于一键提取小红书笔记信息并保存到飞书多维表格中。

## 功能特点

- 自动提取小红书笔记的标题、作者、正文内容、标签等信息
- 记录笔记的互动数据，如点赞数、收藏数和评论数
- 支持添加个人批注和关键词标记
- 一键将数据同步到飞书多维表格，方便后续整理和分析
- 通过侧边栏操作，不影响正常浏览体验

## 使用方法

### 1. 安装插件

- 从 Chrome 网上应用店安装（审核通过后提供链接）
- 或者通过开发者模式加载已解压的扩展程序

### 2. 配置飞书多维表格

1. 在飞书多维表格中创建一个新表格，包含以下字段：
   - note_id（文本）
   - url（文本）
   - 标题（文本）
   - 作者（文本）
   - 正文（多行文本）
   - 标签（多选）
   - 点赞（数字）
   - 收藏（数字）
   - 评论（数字）
   - 批注（多行文本）
   - 关键词（文本）
   - 发布日期（文本）
   - 也可以直接使用[此模板](https://ai.feishu.cn/base/Krhkb2XvTa2D1asGsZTcxpdunUf)
2. 创建飞书开放平台应用并获取权限
   - 创建[飞书开放平台应用](https://open.feishu.cn/app)
   - 获取应用的 App ID 和 App Secret
   - 为应用开通多维表格权限

### 3. 配置插件

1. 点击 Chrome/Edge 工具栏中的插件图标，打开侧边栏
2. 填写配置信息：
   - 表格 URL：复制飞书多维表格的完整 URL, URL注意格式：https://ai.feishu.cn/base/xxxxxx?table=xxxxx（存储在多维表格空间非知识库空间）
   - app_token：填写飞书应用的 App ID
   - app_secret：填写飞书应用的 App Secret
3. 点击"保存配置"

### 4. 采集笔记

1. 打开小红书笔记页面
2. 点击 Chrome/Edge 工具栏中的插件图标，打开侧边栏
3. 可选：添加批注和关键词
4. 点击"采集笔记"按钮
5. 数据将自动提取并保存到飞书多维表格中

## 权限说明

- **activeTab**: 用于访问当前标签页的内容，以便提取小红书笔记的信息
- **storage**: 用于保存您的飞书API配置信息
- **sidePanel**: 用于提供侧边栏界面
- **host_permissions** (https://open.feishu.cn/*): 用于与飞书API通信

## 隐私说明

插件只会在您主动点击"采集"按钮时才会提取当前页面的信息，且所有数据仅保存在您自己的飞书账户中。

## 开发者信息

- GitHub 仓库：[https://github.com/ElleLiu/redbook-collect](https://github.com/ElleLiu/redbook-collect)

## 项目参考

- [https://github.com/comeonzhj/redbook-collect](https://github.com/comeonzhj/redbook-collect)
