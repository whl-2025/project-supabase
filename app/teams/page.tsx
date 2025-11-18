"use client";

import { useState, useEffect } from "react";
import { 
  Card, List, Button, Space, message, Modal, Form, Input, Typography,
  Avatar, Tag, Empty, Popconfirm
} from 'antd';
import {
  TeamOutlined,
  PlusOutlined,
  DeleteOutlined,
  UserOutlined,
  CrownOutlined,
} from '@ant-design/icons';
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";

const { Title, Text } = Typography;
const { TextArea } = Input;

interface Team {
  id: string;
  name: string;
  description: string | null;
  owner_id: string;
  created_at: string;
  member_count?: number;
}

export default function TeamsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(true);
  const [teams, setTeams] = useState<Team[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [form] = Form.useForm();

  useEffect(() => {
    checkUser();
    fetchTeams();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
    }
  };

  const fetchTeams = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 获取用户拥有的团队
      const { data: ownedTeams, error: ownedError } = await supabase
        .from('teams')
        .select('*')
        .eq('owner_id', user.id);

      if (ownedError) throw ownedError;

      // 获取用户加入的团队
      const { data: memberTeams, error: memberError } = await supabase
        .from('team_members')
        .select('team_id, teams(*)')
        .eq('user_id', user.id);

      if (memberError) throw memberError;

      // 合并团队列表
      const allTeams = [
        ...(ownedTeams || []),
        ...(memberTeams?.map((m: any) => m.teams).filter(Boolean) || []),
      ];

      // 去重
      const uniqueTeams = Array.from(
        new Map(allTeams.map(team => [team.id, team])).values()
      );

      // 获取每个团队的成员数量
      for (const team of uniqueTeams) {
        const { count } = await supabase
          .from('team_members')
          .select('*', { count: 'exact', head: true })
          .eq('team_id', team.id);
        team.member_count = count || 0;
      }

      setTeams(uniqueTeams);
    } catch (err: any) {
      message.error("加载团队列表失败: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCreate = async (values: any) => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: team, error } = await supabase
        .from('teams')
        .insert({
          name: values.name,
          description: values.description,
          owner_id: user.id,
        })
        .select()
        .single();

      if (error) throw error;

      // 添加创建者为团队成员
      await supabase.from('team_members').insert({
        team_id: team.id,
        user_id: user.id,
        role: 'owner',
      });

      message.success("团队创建成功");
      setModalVisible(false);
      form.resetFields();
      fetchTeams();
    } catch (err: any) {
      message.error("创建失败: " + err.message);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from('teams')
        .delete()
        .eq('id', id);

      if (error) throw error;

      message.success("删除成功");
      fetchTeams();
    } catch (err: any) {
      message.error("删除失败: " + err.message);
    }
  };

  return (
    <DashboardLayout>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2}>团队管理</Title>
            <Text type="secondary">创建和管理您的团队</Text>
          </div>
          <Button 
            type="primary" 
            icon={<PlusOutlined />}
            onClick={() => setModalVisible(true)}
          >
            创建团队
          </Button>
        </div>

        <Card>
          {teams.length === 0 ? (
            <Empty
              image={<TeamOutlined style={{ fontSize: 80, color: '#d9d9d9' }} />}
              description="还没有团队"
            >
              <Button type="primary" icon={<PlusOutlined />} onClick={() => setModalVisible(true)}>
                创建第一个团队
              </Button>
            </Empty>
          ) : (
            <List
              grid={{ gutter: 16, xs: 1, sm: 2, md: 2, lg: 3, xl: 4 }}
              dataSource={teams}
              loading={loading}
              renderItem={(team) => (
                <List.Item>
                  <Card
                    hoverable
                    actions={[
                      <Button key="view" type="link" icon={<UserOutlined />}>
                        成员 ({team.member_count || 0})
                      </Button>,
                      <Popconfirm
                        key="delete"
                        title="确定要删除这个团队吗？"
                        onConfirm={() => handleDelete(team.id)}
                        okText="确定"
                        cancelText="取消"
                      >
                        <Button type="link" danger icon={<DeleteOutlined />}>
                          删除
                        </Button>
                      </Popconfirm>,
                    ]}
                  >
                    <Card.Meta
                      avatar={
                        <Avatar 
                          size={48} 
                          icon={<TeamOutlined />} 
                          style={{ backgroundColor: '#1890ff' }}
                        />
                      }
                      title={
                        <Space>
                          {team.name}
                          <Tag icon={<CrownOutlined />} color="gold">拥有者</Tag>
                        </Space>
                      }
                      description={
                        <Space direction="vertical" size="small" style={{ width: '100%' }}>
                          <Text type="secondary" ellipsis>
                            {team.description || '暂无描述'}
                          </Text>
                          <Text type="secondary" style={{ fontSize: 12 }}>
                            创建于 {new Date(team.created_at).toLocaleDateString('zh-CN')}
                          </Text>
                        </Space>
                      }
                    />
                  </Card>
                </List.Item>
              )}
            />
          )}
        </Card>

        <Modal
          title="创建团队"
          open={modalVisible}
          onOk={() => form.submit()}
          onCancel={() => {
            setModalVisible(false);
            form.resetFields();
          }}
        >
          <Form
            form={form}
            layout="vertical"
            onFinish={handleCreate}
          >
            <Form.Item
              name="name"
              label="团队名称"
              rules={[{ required: true, message: '请输入团队名称' }]}
            >
              <Input placeholder="输入团队名称" />
            </Form.Item>
            <Form.Item
              name="description"
              label="团队描述"
            >
              <TextArea
                placeholder="输入团队描述（可选）"
                rows={4}
              />
            </Form.Item>
          </Form>
        </Modal>
      </Space>
    </DashboardLayout>
  );
}
