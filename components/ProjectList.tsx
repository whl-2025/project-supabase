"use client";

import { useEffect, useState } from "react";
import { Row, Col, Card, Tag, Button, Space, Spin, Empty, Popconfirm, message } from 'antd';
import { EyeOutlined, EditOutlined, DeleteOutlined, CalendarOutlined } from '@ant-design/icons';
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

const { Meta } = Card;

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
}

export default function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (err: any) {
      message.error("加载失败: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
      message.success("删除成功");
      router.refresh();
      fetchProjects();
    } catch (err: any) {
      message.error("删除失败: " + err.message);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '60px 0' }}>
        <Spin size="large" />
        <p style={{ marginTop: 16, color: '#999' }}>加载中...</p>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <Empty
        description="还没有项目"
        style={{ padding: '60px 0' }}
      >
        <Link href="/projects">
          <Button type="primary">创建第一个项目</Button>
        </Link>
      </Empty>
    );
  }

  const statusMap: Record<string, { text: string; color: string }> = {
    active: { text: '进行中', color: 'green' },
    completed: { text: '已完成', color: 'blue' },
    paused: { text: '已暂停', color: 'default' },
  };

  return (
    <Row gutter={[16, 16]}>
      {projects.map((project) => (
        <Col xs={24} sm={12} lg={8} key={project.id}>
          <Card
            hoverable
            actions={[
              <Link href={`/projects/${project.id}`} key="view">
                <EyeOutlined /> 查看
              </Link>,
              <Link href={`/projects/${project.id}/edit`} key="edit">
                <EditOutlined /> 编辑
              </Link>,
              <Popconfirm
                key="delete"
                title="确定要删除这个项目吗？"
                onConfirm={() => handleDelete(project.id)}
                okText="确定"
                cancelText="取消"
              >
                <span style={{ color: '#ff4d4f' }}>
                  <DeleteOutlined /> 删除
                </span>
              </Popconfirm>,
            ]}
          >
            <Meta
              title={
                <Space direction="vertical" size={4} style={{ width: '100%' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span>{project.name}</span>
                    <Tag color={statusMap[project.status]?.color || 'default'}>
                      {statusMap[project.status]?.text || project.status}
                    </Tag>
                  </div>
                </Space>
              }
              description={
                <Space direction="vertical" size={8} style={{ width: '100%' }}>
                  <div style={{ 
                    minHeight: 40, 
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical'
                  }}>
                    {project.description || '暂无描述'}
                  </div>
                  <div style={{ fontSize: 12, color: '#999' }}>
                    <CalendarOutlined /> {new Date(project.created_at).toLocaleDateString("zh-CN")}
                  </div>
                </Space>
              }
            />
          </Card>
        </Col>
      ))}
    </Row>
  );
}

