#!/bin/bash

# 等待数据库启动
echo "等待数据库启动..."
sleep 5

# 设置密码
export PGPASSWORD=your-super-secret-jwt-token-with-at-least-32-characters-long

# 执行项目表迁移
echo "执行项目表迁移..."
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/migrations/20240101000000_init_projects.sql

if [ $? -eq 0 ]; then
    echo "项目表迁移成功！"
else
    echo "项目表迁移失败！"
    exit 1
fi

# 执行 AI 功能迁移
echo "执行 AI 功能迁移..."
psql -h localhost -p 54322 -U postgres -d postgres -f supabase/migrations/20240102000000_init_ai_features.sql

if [ $? -eq 0 ]; then
    echo "AI 功能迁移成功！"
else
    echo "AI 功能迁移失败！"
    exit 1
fi

echo ""
echo "数据库迁移完成！"
echo "所有表已创建：projects, ai_settings, ai_conversations, ai_messages, documents, document_embeddings"

