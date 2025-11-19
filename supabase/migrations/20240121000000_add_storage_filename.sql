-- 添加 storage_filename 字段用于保存 Storage 中的实际文件名

-- 1. 添加新字段
ALTER TABLE files 
ADD COLUMN IF NOT EXISTS storage_filename TEXT;

-- 2. 添加注释
COMMENT ON COLUMN files.name IS '原始文件名（用户上传时的文件名，包含中文）';
COMMENT ON COLUMN files.storage_filename IS 'Storage 中的实际文件名（时间戳_随机字符串.扩展名）';
COMMENT ON COLUMN files.storage_path IS '完整存储路径（user_id/project_id/storage_filename）';

-- 3. 为现有数据填充 storage_filename（从 storage_path 中提取）
UPDATE files 
SET storage_filename = split_part(storage_path, '/', 3)
WHERE storage_filename IS NULL AND storage_path IS NOT NULL;

-- 4. 创建索引（方便通过 storage_filename 查询）
CREATE INDEX IF NOT EXISTS files_storage_filename_idx ON files(storage_filename);
