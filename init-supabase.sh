#!/bin/bash

# 等待数据库启动
echo "等待数据库启动..."
sleep 5

# 连接到数据库并执行迁移
PGPASSWORD=your-super-secret-jwt-token-with-at-least-32-characters-long psql -h localhost -p 54322 -U postgres -d postgres -f supabase/migrations/20240101000000_init_projects.sql

echo "数据库迁移完成！"

