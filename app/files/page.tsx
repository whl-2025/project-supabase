"use client";

import { useState, useEffect } from "react";
import { 
  Table, Button, Space, message, Popconfirm, Typography, Card,
  Upload, Tag, Modal, Select, Progress, Alert
} from 'antd';
import {
  UploadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FileOutlined,
  FolderOutlined,
  InboxOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import type { UploadFile, UploadProps } from 'antd/es/upload';
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";

const { Title, Text } = Typography;
const { Dragger } = Upload;

interface FileRecord {
  id: string;
  name: string;                    // 原始文件名（中文）
  storage_filename: string;        // Storage 文件名（时间戳_随机.ext）
  size: number;
  mime_type: string;
  storage_path: string;
  url: string | null;
  created_at: string;
  project_id: string | null;
  user_id: string;
}

interface Project {
  id: string;
  name: string;
}

// 文件配置
const FILE_CONFIG = {
  maxSize: 50 * 1024 * 1024, // 50MB
  allowedTypes: [
    // 文档
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-powerpoint',
    'application/vnd.openxmlformats-officedocument.presentationml.presentation',
    'text/plain',
    'text/markdown',
    // 图片
    'image/jpeg',
    'image/png',
    'image/gif',
    'image/webp',
    'image/svg+xml',
    // 压缩文件
    'application/zip',
    'application/x-rar-compressed',
    'application/x-7z-compressed',
  ],
  allowedExtensions: [
    '.pdf', '.doc', '.docx', '.xls', '.xlsx', '.ppt', '.pptx',
    '.txt', '.md', '.jpg', '.jpeg', '.png', '.gif', '.webp', '.svg',
    '.zip', '.rar', '.7z'
  ]
};

export default function FilesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [projects, setProjects] = useState<Project[]>([]);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [fileList, setFileList] = useState<UploadFile[]>([]);
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState<{ [key: string]: number }>({});
  const [userId, setUserId] = useState<string>('');

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
      return;
    }
    setUserId(user.id);
    fetchFiles(user.id);
    fetchProjects(user.id);
  };

  const fetchFiles = async (uid: string) => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .eq('user_id', uid)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (err: any) {
      message.error("加载文件列表失败: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchProjects = async (uid: string) => {
    try {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .eq('owner_id', uid)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (err: any) {
      console.error("加载项目列表失败:", err);
    }
  };

  const validateFile = (file: File): boolean => {
    // 检查文件大小
    if (file.size > FILE_CONFIG.maxSize) {
      message.error(`文件 ${file.name} 超过大小限制（最大 50MB）`);
      return false;
    }

    // 检查文件类型
    const fileExtension = '.' + file.name.split('.').pop()?.toLowerCase();
    if (!FILE_CONFIG.allowedTypes.includes(file.type) && 
        !FILE_CONFIG.allowedExtensions.includes(fileExtension)) {
      message.error(`文件 ${file.name} 类型不支持`);
      return false;
    }

    return true;
  };

  const uploadProps: UploadProps = {
    multiple: true,
    fileList,
    beforeUpload: (file) => {
      if (!validateFile(file)) {
        return Upload.LIST_IGNORE;
      }
      setFileList(prev => [...prev, file as any]);
      return false; // 阻止自动上传
    },
    onRemove: (file) => {
      setFileList(prev => prev.filter(f => f.uid !== file.uid));
    },
  };

  const handleUpload = async () => {
    console.log('=== handleUpload 被调用 ===');
    console.log('fileList:', fileList);
    console.log('selectedProject:', selectedProject);
    console.log('userId:', userId);

    if (fileList.length === 0) {
      console.log('❌ 文件列表为空');
      message.warning('请选择要上传的文件');
      return;
    }

    if (!selectedProject) {
      console.log('❌ 未选择项目');
      message.warning('请选择项目');
      return;
    }

    if (!userId) {
      console.log('❌ 用户ID为空');
      message.error('用户未登录');
      return;
    }

    console.log('✅ 验证通过，开始上传');
    setUploading(true);

    try {
      // 调试信息
      console.log('开始上传，用户ID:', userId);
      console.log('项目ID:', selectedProject);
      console.log('文件数量:', fileList.length);

      for (const file of fileList) {
        const originalFile = file as any as File;
        
        // 获取文件扩展名
        const fileExtension = originalFile.name.split('.').pop() || '';
        
        // 生成唯一文件名：使用时间戳 + 随机数
        const timestamp = Date.now();
        const random = Math.random().toString(36).substring(2, 8);
        const uniqueFileName = `${timestamp}_${random}.${fileExtension}`;
        
        // 构建存储路径：user_id/project_id/unique_filename
        const storagePath = `${userId}/${selectedProject}/${uniqueFileName}`;
        
        console.log('原始文件名:', originalFile.name);
        console.log('存储文件名:', uniqueFileName);
        console.log('存储路径:', storagePath);
        console.log('文件信息:', {
          name: originalFile.name,
          size: originalFile.size,
          type: originalFile.type
        });
        
        // 上传到 Supabase Storage
        const { data: uploadData, error: uploadError } = await supabase.storage
          .from('documents')
          .upload(storagePath, originalFile, {
            cacheControl: '3600',
            upsert: false,
          });

        if (uploadError) {
          console.error('上传错误详情:', uploadError);
          throw new Error(`上传 ${originalFile.name} 失败: ${uploadError.message}`);
        }

        console.log('上传成功:', uploadData);

        // 获取公共 URL
        const { data: urlData } = supabase.storage
          .from('documents')
          .getPublicUrl(storagePath);

        // 保存文件记录到数据库
        const { error: dbError } = await supabase
          .from('files')
          .insert({
            user_id: userId,
            project_id: selectedProject,
            name: originalFile.name,              // 原始文件名（中文）
            storage_filename: uniqueFileName,     // Storage 文件名
            size: originalFile.size,
            mime_type: originalFile.type,
            storage_path: storagePath,
            url: urlData.publicUrl,
          });

        if (dbError) {
          throw new Error(`保存文件记录失败: ${dbError.message}`);
        }
      }

      message.success(`成功上传 ${fileList.length} 个文件`);
      setUploadModalVisible(false);
      setFileList([]);
      setSelectedProject(null);
      setUploadProgress({});
      fetchFiles(userId);
    } catch (err: any) {
      message.error(err.message || '上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleDownload = async (record: FileRecord) => {
    try {
      const { data, error } = await supabase.storage
        .from('documents')
        .download(record.storage_path);

      if (error) throw error;

      // 创建下载链接
      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = record.name;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      message.success('下载成功');
    } catch (err: any) {
      message.error('下载失败: ' + err.message);
    }
  };

  const handleDelete = async (record: FileRecord) => {
    try {
      // 从 Storage 删除文件
      const { error: storageError } = await supabase.storage
        .from('documents')
        .remove([record.storage_path]);

      if (storageError) throw storageError;

      // 从数据库删除记录
      const { error: dbError } = await supabase
        .from('files')
        .delete()
        .eq('id', record.id);

      if (dbError) throw dbError;

      message.success("删除成功");
      fetchFiles(userId);
    } catch (err: any) {
      message.error("删除失败: " + err.message);
    }
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) return '🖼️';
    if (mimeType.startsWith('video/')) return '🎥';
    if (mimeType.startsWith('audio/')) return '🎵';
    if (mimeType.includes('pdf')) return '📄';
    if (mimeType.includes('word')) return '📝';
    if (mimeType.includes('excel') || mimeType.includes('spreadsheet')) return '📊';
    if (mimeType.includes('presentation') || mimeType.includes('powerpoint')) return '📊';
    if (mimeType.includes('zip') || mimeType.includes('rar') || mimeType.includes('7z')) return '📦';
    if (mimeType.includes('text')) return '📃';
    return '📁';
  };

  const getProjectName = (projectId: string | null) => {
    if (!projectId) return '-';
    const project = projects.find(p => p.id === projectId);
    return project?.name || projectId;
  };

  const columns: ColumnsType<FileRecord> = [
    {
      title: '文件名',
      dataIndex: 'name',
      key: 'name',
      render: (name: string, record: FileRecord) => (
        <Space>
          <span style={{ fontSize: 20 }}>{getFileIcon(record.mime_type)}</span>
          <span>{name}</span>
        </Space>
      ),
    },
    {
      title: '所属项目',
      dataIndex: 'project_id',
      key: 'project_id',
      width: 150,
      render: (projectId: string | null) => (
        <Space>
          <FolderOutlined />
          <span>{getProjectName(projectId)}</span>
        </Space>
      ),
    },
    {
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: 100,
      render: (size: number) => formatFileSize(size),
    },
    // {
    //   title: '类型',
    //   dataIndex: 'mime_type',
    //   key: 'mime_type',
    //   width: 120,
    //   render: (mimeType: string) => {
    //     const type = mimeType.split('/')[1] || mimeType;
    //     return <Tag>{type.toUpperCase()}</Tag>;
    //   },
    // },
    {
      title: '上传时间',
      dataIndex: 'created_at',
      key: 'created_at',
      width: 180,
      render: (date: string) => new Date(date).toLocaleString('zh-CN'),
    },
    {
      title: '操作',
      key: 'action',
      width: 180,
      render: (_: any, record: FileRecord) => (
        <Space>
          <Button
            type="link"
            icon={<DownloadOutlined />}
            onClick={() => handleDownload(record)}
          >
            下载
          </Button>
          <Popconfirm
            title="确定要删除这个文件吗？"
            description="删除后无法恢复"
            onConfirm={() => handleDelete(record)}
            okText="确定"
            cancelText="取消"
          >
            <Button type="link" danger icon={<DeleteOutlined />}>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ];

  return (
    <DashboardLayout>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2}>文件管理</Title>
            <Text type="secondary">管理您的项目文件和文档</Text>
          </div>
          <Button 
            type="primary" 
            icon={<UploadOutlined />}
            onClick={() => setUploadModalVisible(true)}
          >
            上传文件
          </Button>
        </div>

        <Card>
          <Table
            columns={columns}
            dataSource={files}
            rowKey="id"
            loading={loading}
            pagination={{
              pageSize: 10,
              showSizeChanger: true,
              showTotal: (total) => `共 ${total} 个文件`,
            }}
          />
        </Card>

        <Modal
          title="上传文件"
          open={uploadModalVisible}
          onCancel={() => {
            if (!uploading) {
              setUploadModalVisible(false);
              setFileList([]);
              setSelectedProject(null);
              setUploadProgress({});
            }
          }}
          onOk={handleUpload}
          okText="开始上传"
          cancelText="取消"
          confirmLoading={uploading}
          width={600}
        >
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Alert
              message="文件上传规则"
              description={
                <ul style={{ margin: 0, paddingLeft: 20 }}>
                  <li>单个文件最大 50MB</li>
                  <li>支持文档：PDF, Word, Excel, PPT, TXT, Markdown</li>
                  <li>支持图片：JPG, PNG, GIF, WebP, SVG</li>
                  <li>支持压缩：ZIP, RAR, 7Z</li>
                </ul>
              }
              type="info"
              showIcon
            />

            <div>
              <Text strong>选择项目</Text>
              <Select
                style={{ width: '100%', marginTop: 8 }}
                placeholder="请选择文件所属项目"
                value={selectedProject}
                onChange={setSelectedProject}
                disabled={uploading}
              >
                {projects.map(project => (
                  <Select.Option key={project.id} value={project.id}>
                    <Space>
                      <FolderOutlined />
                      {project.name}
                    </Space>
                  </Select.Option>
                ))}
              </Select>
            </div>

            <div>
              <Text strong>选择文件</Text>
              <Dragger {...uploadProps} disabled={uploading} style={{ marginTop: 8 }}>
                <p className="ant-upload-drag-icon">
                  <InboxOutlined />
                </p>
                <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
                <p className="ant-upload-hint">
                  支持单个或批量上传，最大 50MB
                </p>
              </Dragger>
            </div>

            {uploading && fileList.length > 0 && (
              <div>
                <Text strong>上传进度</Text>
                {fileList.map(file => (
                  <div key={file.uid} style={{ marginTop: 8 }}>
                    <Text>{file.name}</Text>
                    <Progress 
                      percent={uploadProgress[file.uid] || 0} 
                      status={uploadProgress[file.uid] === 100 ? 'success' : 'active'}
                    />
                  </div>
                ))}
              </div>
            )}
          </Space>
        </Modal>
      </Space>
    </DashboardLayout>
  );
}
