#!/usr/bin/env node

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');

console.log('🚀 开始构建星痕共鸣战斗数据统计工具...');

// 检查必要文件
const requiredFiles = [
    'server-demo.js',
    'package.json',
    'public/index.html',
    'algo/pb.js'
];

console.log('📋 检查必要文件...');
for (const file of requiredFiles) {
    if (!fs.existsSync(file)) {
        console.error(`❌ 缺少必要文件: ${file}`);
        process.exit(1);
    }
    console.log(`✅ ${file}`);
}

// 创建dist目录
if (!fs.existsSync('dist')) {
    fs.mkdirSync('dist');
    console.log('📁 创建dist目录');
}

// 构建Windows版本
console.log('🔨 构建Windows版本...');
try {
    execSync('pkg . --targets node18-win-x64 --output dist/star-resonance-counter.exe', { 
        stdio: 'inherit' 
    });
    console.log('✅ Windows版本构建成功');
} catch (error) {
    console.error('❌ Windows版本构建失败:', error.message);
    process.exit(1);
}

// 检查生成的文件
const exePath = path.join('dist', 'star-resonance-counter.exe');
if (fs.existsSync(exePath)) {
    const stats = fs.statSync(exePath);
    const fileSizeInMB = (stats.size / (1024 * 1024)).toFixed(2);
    console.log(`📦 生成文件: ${exePath} (${fileSizeInMB} MB)`);
} else {
    console.error('❌ 未找到生成的exe文件');
    process.exit(1);
}

// 创建发布信息
const releaseInfo = {
    version: '2.1.0',
    buildDate: new Date().toISOString(),
    platform: 'Windows x64',
    nodeVersion: '18.x',
    features: [
        'Web界面展示',
        'API接口',
        '模拟数据',
        '实时更新'
    ],
    limitations: [
        '演示版本，不包含网络抓包功能',
        '需要Windows环境重新编译cap模块获得完整功能'
    ],
    fileSize: fs.statSync(exePath).size
};

fs.writeFileSync(
    path.join('dist', 'release-info.json'), 
    JSON.stringify(releaseInfo, null, 2)
);

console.log('📝 生成发布信息文件');

// 创建使用说明
const readme = `# 星痕共鸣战斗数据统计工具 v2.1.0

## 快速开始

1. 双击运行 \`star-resonance-counter.exe\`
2. 选择日志级别（推荐：info）
3. 打开浏览器访问：http://localhost:8989
4. 查看模拟的战斗数据

## 重要说明

⚠️ 这是演示版本，不包含网络抓包功能
- 当前版本仅用于测试打包功能
- 要获得完整功能，需要在Windows环境下重新编译cap模块
- 完整版本需要安装Npcap驱动和Visual Studio Build Tools

## 功能特性

- ✅ Web界面展示
- ✅ 实时数据更新
- ✅ API接口
- ✅ 模拟战斗数据
- ⚠️ 网络抓包（需要完整版本）

## 技术支持

如有问题，请查看项目文档或提交Issue。

---
构建时间: ${new Date().toLocaleString()}
`;

fs.writeFileSync(path.join('dist', 'README.txt'), readme);

console.log('📖 生成使用说明文件');

console.log('\n🎉 构建完成！');
console.log('📁 输出目录: dist/');
console.log('📦 主要文件: star-resonance-counter.exe');
console.log('📝 说明文件: README.txt');
console.log('📊 发布信息: release-info.json');

console.log('\n📋 下一步：');
console.log('1. 在Windows环境下测试exe文件');
console.log('2. 重新编译cap模块获得完整功能');
console.log('3. 创建安装包包含Npcap驱动');
console.log('4. 发布到GitHub Releases');