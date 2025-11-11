"use client";

import { useEffect, useState } from 'react';
import { Row, Col, Card, Statistic, Typography, Spin } from 'antd';
import { ProjectOutlined, CheckCircleOutlined, SyncOutlined } from '@ant-design/icons';
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";
import ProjectList from "@/components/ProjectList";

const { Title, Text } = Typography;

interface Project {
  id: string;
  status: string;
}

export default function HomePage() {
  const [user, setUser] = useState<any>(null);
  const [stats, setStats] = useState({ total: 0, active: 0, completed: 0 });
  const [loading, setLoading] = useState(true);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    const checkUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      
      if (!user) {
        router.push("/login");
        return;
      }

      setUser(user);

      // 获取项目统计数据
      const { data: projects } = await supabase
        .from("projects")
        .select("*");

      setStats({
        total: projects?.length || 0,
        active: projects?.filter((p: Project) => p.status === "active").length || 0,
        completed: projects?.filter((p: Project) => p.status === "completed").length || 0,
      });

      setLoading(false);
    };

    checkUser();
  }, [router, supabase]);

  if (loading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '100vh' 
      }}>
        <Spin size="large" />
      </div>
    );
  }

  return (
    <DashboardLayout>
      <div style={{ marginBottom: 24 }}>
        <Title level={2} style={{ marginBottom: 8 }}>首页</Title>
        <Text type="secondary">
          欢迎回来，{user?.email || "用户"}
        </Text>
      </div>

      <Row gutter={[16, 16]} style={{ marginBottom: 24 }}>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="总项目数"
              value={stats.total}
              prefix={<ProjectOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="进行中"
              value={stats.active}
              prefix={<SyncOutlined spin />}
              valueStyle={{ color: '#52c41a' }}
            />
          </Card>
        </Col>
        <Col xs={24} sm={8}>
          <Card>
            <Statistic
              title="已完成"
              value={stats.completed}
              prefix={<CheckCircleOutlined />}
              valueStyle={{ color: '#1890ff' }}
            />
          </Card>
        </Col>
      </Row>

      <div>
        <Title level={3} style={{ marginBottom: 16 }}>我的项目</Title>
        <ProjectList />
      </div>
    </DashboardLayout>
  );
}
