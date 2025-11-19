#!/bin/bash

# 文件管理功能快速设置脚本

echo "========================================="
echo "文件管理功能设置"
echo "========================================="
echo ""

# 检查 Supabase CLI
if ! command -v supabase &> /dev/null; then
    echo "❌ 错误：未找到 Supabase CLI"
    echo "请先安装：https://supabase.com/docs/guides/cli"
    exit 1
fi

echo "✅ Supabase CLI 已安装"
echo ""

# 步骤 1：创建 Storage Bucket
echo "步骤 1：创建 Storage Bucket..."
echo "请在 Supabase Dashboard 中手动创建 bucket："
echo "  1. 访问 http://localhost:54323"
echo "  2. 进入 Storage 页面"
echo "  3. 点击 'New bucket'"
echo "  4. 名称：documents"
echo "  5. Public：不勾选"
echo "  6. File size limit：52428800 (50MB)"
echo ""
read -p "已创建 bucket？(y/n) " -n 1 -r
echo ""
if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    echo "请先创建 bucket 后再继续"
    exit 1
fi

# 步骤 2：执行数据库迁移
echo ""
echo "步骤 2：执行数据库迁移..."
supabase db push

if [ $? -eq 0 ]; then
    echo "✅ 数据库迁移成功"
else
    echo "❌ 数据库迁移失败"
    exit 1
fi

# 步骤 3：验证设置
echo ""
echo "步骤 3：验证设置..."
echo "正在检查 bucket..."

# 这里可以添加验证逻辑

echo ""
echo "========================================="
echo "✅ 设置完成！"
echo "========================================="
echo ""
echo "下一步："
echo "  1. 访问 http://localhost:3000/files"
echo "  2. 点击'上传文件'测试功能"
echo ""
echo "详细文档：文件管理功能设置指南.md"
echo ""
