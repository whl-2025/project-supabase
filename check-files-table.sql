-- 检查 files 表是否存在

-- 1. 查看 files 表结构
SELECT 
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_name = 'files'
ORDER BY ordinal_position;

-- 2. 查看 files 表的策略
SELECT * FROM pg_policies WHERE tablename = 'files';

-- 3. 查看 storage.objects 表的策略
SELECT * FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects';

-- 4. 查看 documents bucket 是否存在
SELECT * FROM storage.buckets WHERE name = 'documents';
