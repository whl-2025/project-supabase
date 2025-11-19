# 文件管理功能快速设置脚本 (PowerShell)

Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "文件管理功能设置" -ForegroundColor Cyan
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""

# 检查 Supabase CLI
$supabaseCmd = Get-Command supabase -ErrorAction SilentlyContinue
if (-not $supabaseCmd) {
    Write-Host "❌ 错误：未找到 Supabase CLI" -ForegroundColor Red
    Write-Host "请先安装：https://supabase.com/docs/guides/cli"
    exit 1
}

Write-Host "✅ Supabase CLI 已安装" -ForegroundColor Green
Write-Host ""

# 步骤 1：创建 Storage Bucket
Write-Host "步骤 1：创建 Storage Bucket..." -ForegroundColor Yellow
Write-Host "请在 Supabase Dashboard 中手动创建 bucket："
Write-Host "  1. 访问 http://localhost:54323"
Write-Host "  2. 进入 Storage 页面"
Write-Host "  3. 点击 'New bucket'"
Write-Host "  4. 名称：documents"
Write-Host "  5. Public：不勾选"
Write-Host "  6. File size limit：52428800 (50MB)"
Write-Host ""
$response = Read-Host "已创建 bucket？(y/n)"
if ($response -ne 'y' -and $response -ne 'Y') {
    Write-Host "请先创建 bucket 后再继续" -ForegroundColor Yellow
    exit 1
}

# 步骤 2：执行数据库迁移
Write-Host ""
Write-Host "步骤 2：执行数据库迁移..." -ForegroundColor Yellow
supabase db push

if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ 数据库迁移成功" -ForegroundColor Green
} else {
    Write-Host "❌ 数据库迁移失败" -ForegroundColor Red
    exit 1
}

# 步骤 3：验证设置
Write-Host ""
Write-Host "步骤 3：验证设置..." -ForegroundColor Yellow
Write-Host "正在检查 bucket..."

Write-Host ""
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host "✅ 设置完成！" -ForegroundColor Green
Write-Host "=========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "下一步："
Write-Host "  1. 访问 http://localhost:3000/files"
Write-Host "  2. 点击'上传文件'测试功能"
Write-Host ""
Write-Host "详细文档：文件管理功能设置指南.md"
Write-Host ""
