# 星痕共鸣战斗数据统计工具 - 打包说明

## 概述

本项目已成功打包为独立的exe文件，但需要注意以下重要事项：

### ⚠️ 重要说明

1. **演示版本**：当前打包的版本是演示版本，不包含网络抓包功能
2. **完整版本**：要获得完整功能，需要在Windows环境下重新编译cap模块

## 文件说明

- `star-resonance-counter.exe` - 打包后的可执行文件（演示版本）
- `server-demo.js` - 演示版本的服务器代码
- `server.js` - 完整版本的服务器代码（需要cap模块）

## 使用方法

### 演示版本
1. 运行 `star-resonance-counter.exe`
2. 选择日志级别（info/debug）
3. 打开浏览器访问 `http://localhost:8989`
4. 查看模拟的战斗数据

### 完整版本构建步骤

要在Windows环境下构建完整版本，请按以下步骤操作：

1. **安装必要工具**
   ```bash
   # 安装Node.js 18+
   # 安装Visual Studio Build Tools
   # 安装Python 3.10+
   # 安装Npcap驱动
   ```

2. **恢复cap模块依赖**
   ```bash
   # 修改package.json，添加cap依赖
   npm install cap@^0.2.1
   ```

3. **重新打包**
   ```bash
   # 修改package.json中的main和bin为server.js
   pkg . --targets node18-win-x64 --output dist/star-resonance-counter-full.exe
   ```

## 技术细节

### 打包工具
- 使用 `pkg` 工具进行打包
- 目标平台：Windows x64
- Node.js版本：18.x

### 依赖处理
- 静态资源（public/, algo/）已包含在exe中
- 动态模块（cap）需要在目标环境编译

### 文件大小
- 演示版本：约50MB
- 完整版本：约60MB（包含cap模块）

## 发布说明

### v2.1.0 (演示版本)
- ✅ 成功打包为独立exe文件
- ✅ 包含Web界面和API接口
- ✅ 模拟数据展示功能
- ⚠️ 不包含网络抓包功能
- 📝 需要Windows环境重新编译cap模块

## 下一步计划

1. **Windows环境测试**：在Windows环境下测试cap模块编译
2. **完整版本打包**：生成包含网络抓包功能的完整版本
3. **安装包制作**：创建包含Npcap驱动的安装包
4. **用户文档**：编写详细的使用说明

## 故障排除

### 常见问题

1. **cap模块编译失败**
   - 确保安装了Visual Studio Build Tools
   - 确保安装了Python 3.10+
   - 确保安装了Npcap驱动

2. **网络抓包权限问题**
   - 以管理员身份运行exe文件
   - 确保Npcap驱动正确安装

3. **端口占用问题**
   - 确保8989端口未被占用
   - 检查防火墙设置

## 许可证

本项目采用 MPL-2.0 许可证。