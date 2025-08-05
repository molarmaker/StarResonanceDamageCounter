#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

console.log('📦 准备发布包...');

// 创建发布目录
const releaseDir = 'release-v2.1.0';
if (fs.existsSync(releaseDir)) {
    fs.rmSync(releaseDir, { recursive: true });
}
fs.mkdirSync(releaseDir);

// 复制必要文件
const filesToCopy = [
    'dist/star-resonance-counter.exe',
    'dist/README.txt',
    'dist/release-info.json',
    'LICENSE',
    'README.md'
];

console.log('📋 复制文件...');
for (const file of filesToCopy) {
    if (fs.existsSync(file)) {
        const fileName = path.basename(file);
        fs.copyFileSync(file, path.join(releaseDir, fileName));
        console.log(`✅ ${fileName}`);
    } else {
        console.log(`⚠️ 跳过不存在的文件: ${file}`);
    }
}

// 创建版本说明
const changelog = `# 星痕共鸣战斗数据统计工具 v2.1.0

## 🎉 新功能

### ✅ 已实现
- 成功打包为独立exe文件
- Web界面展示功能
- 实时数据更新
- API接口支持
- 模拟战斗数据展示

### ⚠️ 当前限制
- 演示版本，不包含网络抓包功能
- 需要Windows环境重新编译cap模块获得完整功能

## 📦 文件说明

- \`star-resonance-counter.exe\` - 主程序（演示版本）
- \`README.txt\` - 使用说明
- \`release-info.json\` - 发布信息
- \`LICENSE\` - 许可证文件
- \`README.md\` - 项目文档

## 🚀 使用方法

1. 下载并解压文件
2. 双击运行 \`star-resonance-counter.exe\`
3. 选择日志级别（推荐：info）
4. 打开浏览器访问：http://localhost:8989
5. 查看模拟的战斗数据

## 🔧 技术细节

- 打包工具：pkg
- 目标平台：Windows x64
- Node.js版本：18.x
- 文件大小：约48MB

## 📋 下一步计划

1. Windows环境测试
2. cap模块重新编译
3. 完整版本打包
4. 安装包制作
5. GitHub Releases发布

## 🐛 已知问题

- cap模块需要在Windows环境下编译
- 需要管理员权限运行（完整版本）
- 需要安装Npcap驱动（完整版本）

## 📞 技术支持

如有问题，请：
1. 查看README.txt文件
2. 检查项目文档
3. 提交GitHub Issue

---
构建时间: ${new Date().toLocaleString()}
版本: v2.1.0
`;

fs.writeFileSync(path.join(releaseDir, 'CHANGELOG.md'), changelog);

// 创建安装说明
const installGuide = `# 安装指南

## 快速安装

1. 下载 \`star-resonance-counter.exe\`
2. 双击运行程序
3. 按照提示操作

## 系统要求

- Windows 10/11 (x64)
- 至少100MB可用磁盘空间
- 网络连接（用于Web界面）

## 完整版本安装（可选）

要获得网络抓包功能，需要：

1. 安装Node.js 18+
2. 安装Visual Studio Build Tools
3. 安装Python 3.10+
4. 安装Npcap驱动
5. 重新编译cap模块

## 故障排除

### 程序无法启动
- 检查Windows Defender设置
- 以管理员身份运行
- 检查系统兼容性

### Web界面无法访问
- 检查端口8989是否被占用
- 检查防火墙设置
- 确保程序正在运行

### 数据不显示
- 这是演示版本，显示模拟数据
- 完整版本需要游戏运行

## 许可证

本项目采用 MPL-2.0 许可证。
`;

fs.writeFileSync(path.join(releaseDir, 'INSTALL.md'), installGuide);

console.log('📝 生成文档文件');

// 创建发布信息
const releaseInfo = {
    version: '2.1.0',
    buildDate: new Date().toISOString(),
    platform: 'Windows x64',
    nodeVersion: '18.x',
    fileSize: fs.statSync(path.join('dist', 'star-resonance-counter.exe')).size,
    features: [
        '独立exe文件',
        'Web界面展示',
        'API接口',
        '模拟数据',
        '实时更新'
    ],
    limitations: [
        '演示版本',
        '不包含网络抓包功能',
        '需要Windows环境重新编译cap模块'
    ],
    files: fs.readdirSync(releaseDir)
};

fs.writeFileSync(
    path.join(releaseDir, 'release-info.json'), 
    JSON.stringify(releaseInfo, null, 2)
);

console.log('📊 更新发布信息');

// 显示发布包内容
console.log('\n📦 发布包内容:');
const releaseFiles = fs.readdirSync(releaseDir);
for (const file of releaseFiles) {
    const filePath = path.join(releaseDir, file);
    const stats = fs.statSync(filePath);
    const size = stats.size > 1024 * 1024 
        ? `${(stats.size / (1024 * 1024)).toFixed(2)} MB`
        : `${(stats.size / 1024).toFixed(2)} KB`;
    console.log(`  ${file} (${size})`);
}

console.log('\n🎉 发布包准备完成！');
console.log(`📁 发布目录: ${releaseDir}/`);
console.log(`📦 文件数量: ${releaseFiles.length}`);

console.log('\n📋 发布步骤:');
console.log('1. 测试exe文件在Windows环境下的运行');
console.log('2. 上传到GitHub Releases');
console.log('3. 编写发布说明');
console.log('4. 通知用户下载');

console.log('\n💡 提示:');
console.log('- 建议在多个Windows版本上测试');
console.log('- 可以创建压缩包方便分发');
console.log('- 考虑添加数字签名');