"use client";

import { useState, useEffect } from "react";
import { 
  Table, Button, Space, message, Popconfirm, Typography, Card,
  Upload, Tag, Modal
} from 'antd';
import {
  UploadOutlined,
  DeleteOutlined,
  DownloadOutlined,
  FileOutlined,
  PlusOutlined,
} from '@ant-design/icons';
import type { ColumnsType } from 'antd/es/table';
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";

const { Title, Text } = Typography;

interface FileRecord {
  id: string;
  name: string;
  size: number;
  mime_type: string;
  storage_path: string;
  url: string | null;
  created_at: string;
  project_id: string | null;
}

export default function FilesPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [files, setFiles] = useState<FileRecord[]>([]);
  const [uploadModalVisible, setUploadModalVisible] = useState(false);

  useEffect(() => {
    checkUser();
    fetchFiles();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
    }
  };

  const fetchFiles = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setFiles(data || []);
    } catch (err: any) {
      message.error("加载文件列表失败: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('files')
        .delete()
        .eq('id', id);

      if (error) throw error;

      message.success("删除成功");
      fetchFiles();
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
    if (mimeType.includes('zip') || mimeType.includes('rar')) return '📦';
    return '📁';
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
      title: '大小',
      dataIndex: 'size',
      key: 'size',
      width: 120,
      render: (size: number) => formatFileSize(size),
    },
    {
      title: '类型',
      dataIndex: 'mime_type',
      key: 'mime_type',
      width: 200,
      render: (mimeType: string) => (
        <Tag>{mimeType.split('/')[1] || mimeType}</Tag>
      ),
    },
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
      width: 200,
      render: (_: any, record: FileRecord) => (
        <Space>
          <Button
            type="link"
            icon={<DownloadOutlined />}
            disabled
          >
            下载
          </Button>
          <Popconfirm
            title="确定要删除这个文件吗？"
            onConfirm={() => handleDelete(record.id)}
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
          onCancel={() => setUploadModalVisible(false)}
          footer={null}
        >
          <Space direction="vertical" style={{ width: '100%' }} size="large">
            <Text type="secondary">
              注意：当前为演示模式，文件上传功能需要配置 Supabase Storage。
            </Text>
            <Upload.Dragger
              name="file"
              multiple
              disabled
            >
              <p className="ant-upload-drag-icon">
                <FileOutlined />
              </p>
              <p className="ant-upload-text">点击或拖拽文件到此区域上传</p>
              <p className="ant-upload-hint">
                支持单个或批量上传
              </p>
            </Upload.Dragger>
            <Text type="secondary" style={{ fontSize: 12 }}>
              提示：要启用文件上传功能，请在 Supabase Dashboard 中创建 Storage Bucket，
              并配置相应的权限策略。
            </Text>
          </Space>
        </Modal>
      </Space>
    </DashboardLayout>
  );
}
