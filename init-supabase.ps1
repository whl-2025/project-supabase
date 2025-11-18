# PowerShell script to initialize Supabase database migrations
# Usage: .\init-supabase.ps1

Write-Host "等待数据库启动..." -ForegroundColor Yellow
Start-Sleep -Seconds 5

$env:PGPASSWORD = "your-super-secret-jwt-token-with-at-least-32-characters-long"

Write-Host "执行项目表迁移..." -ForegroundColor Green
& psql -h localhost -p 54322 -U postgres -d postgres -f "supabase/migrations/20240101000000_init_projects.sql"

if ($LASTEXITCODE -eq 0) {
    Write-Host "项目表迁移成功！" -ForegroundColor Green
} else {
    Write-Host "项目表迁移失败！" -ForegroundColor Red
    exit 1
}

Write-Host "执行 AI 功能迁移..." -ForegroundColor Green
& psql -h localhost -p 54322 -U postgres -d postgres -f "supabase/migrations/20240102000000_init_ai_features.sql"

if ($LASTEXITCODE -eq 0) {
    Write-Host "AI 功能迁移成功！" -ForegroundColor Green
} else {
    Write-Host "AI 功能迁移失败！" -ForegroundColor Red
    exit 1
}

Write-Host "`n数据库迁移完成！" -ForegroundColor Green
Write-Host "所有表已创建：projects, ai_settings, ai_conversations, ai_messages, documents, document_embeddings" -ForegroundColor Cyan

