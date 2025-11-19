-- 设置 Storage 策略用于文件管理

-- 注意：documents bucket 需要在 Supabase Dashboard 中手动创建

-- 1. 设置 Storage 策略

-- 允许用户上传文件到自己的目录
CREATE POLICY "Users can upload files to their own directory"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 允许用户查看自己的文件
CREATE POLICY "Users can view their own files"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 允许用户更新自己的文件
CREATE POLICY "Users can update their own files"
ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 允许用户删除自己的文件
CREATE POLICY "Users can delete their own files"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'documents' AND
  (storage.foldername(name))[1] = auth.uid()::text
);

-- 2. 添加注释
COMMENT ON COLUMN files.user_id IS '文件所有者ID';
COMMENT ON COLUMN files.storage_path IS '存储路径格式: user_id/project_id/filename';
