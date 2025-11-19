-- 修复 Storage 上传问题的完整 SQL

-- 1. 检查当前状态
SELECT '=== 检查 bucket 配置 ===' as step;
SELECT * FROM storage.buckets WHERE name = 'documents';

SELECT '=== 检查 Storage 策略 ===' as step;
SELECT * FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects';

-- 2. 删除所有旧策略
DROP POLICY IF EXISTS "Users can upload files to their own directory" ON storage.objects;
DROP POLICY IF EXISTS "Users can view their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their own files" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their own files" ON storage.objects;

-- 3. 创建新的策略（使用更简单的条件）

-- 允许认证用户上传到 documents bucket
CREATE POLICY "Allow authenticated uploads"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'documents');

-- 允许认证用户查看 documents bucket 中的文件
CREATE POLICY "Allow authenticated reads"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'documents');

-- 允许认证用户更新自己的文件
CREATE POLICY "Allow authenticated updates"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'documents');

-- 允许认证用户删除自己的文件
CREATE POLICY "Allow authenticated deletes"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'documents');

-- 4. 验证策略已创建
SELECT '=== 验证新策略 ===' as step;
SELECT policyname, cmd, qual, with_check 
FROM pg_policies 
WHERE schemaname = 'storage' AND tablename = 'objects';

-- 5. 检查 files 表的 RLS
SELECT '=== 检查 files 表策略 ===' as step;
SELECT * FROM pg_policies WHERE tablename = 'files';
