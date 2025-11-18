"use client";

import { useState, useEffect } from "react";
import { 
  Card, Form, Input, Button, Space, message, Typography, Switch,
  Select, Divider, Avatar, Upload
} from 'antd';
import {
  UserOutlined,
  LockOutlined,
  BellOutlined,
  SkinOutlined,
  UploadOutlined,
} from '@ant-design/icons';
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";

const { Title, Text } = Typography;
const { TextArea } = Input;

export default function SettingsPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [profileForm] = Form.useForm();
  const [passwordForm] = Form.useForm();
  const [settingsForm] = Form.useForm();

  useEffect(() => {
    checkUser();
    loadSettings();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
    } else {
      setUser(user);
    }
  };

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 加载用户设置
      const { data: settings } = await supabase
        .from('user_settings')
        .select('*')
        .eq('user_id', user.id)
        .single();

      if (settings) {
        settingsForm.setFieldsValue(settings);
      }

      // 设置个人资料表单
      profileForm.setFieldsValue({
        email: user.email,
        bio: settings?.bio || '',
      });
    } catch (err: any) {
      console.error("加载设置失败:", err);
    }
  };

  const handleUpdateProfile = async (values: any) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // 更新用户设置
      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          bio: values.bio,
        });

      if (error) throw error;

      message.success("个人资料更新成功");
    } catch (err: any) {
      message.error("更新失败: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleChangePassword = async (values: any) => {
    try {
      setLoading(true);

      if (values.newPassword !== values.confirmPassword) {
        message.error("两次输入的密码不一致");
        return;
      }

      const { error } = await supabase.auth.updateUser({
        password: values.newPassword
      });

      if (error) throw error;

      message.success("密码修改成功");
      passwordForm.resetFields();
    } catch (err: any) {
      message.error("修改失败: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateSettings = async (values: any) => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('user_settings')
        .upsert({
          user_id: user.id,
          theme: values.theme,
          language: values.language,
          notifications_enabled: values.notifications_enabled,
          email_notifications: values.email_notifications,
        });

      if (error) throw error;

      message.success("设置更新成功");
    } catch (err: any) {
      message.error("更新失败: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <Space direction="vertical" size="large" style={{ width: '100%', maxWidth: 800 }}>
        <div>
          <Title level={2}>系统设置</Title>
          <Text type="secondary">管理您的账户和偏好设置</Text>
        </div>

        {/* 个人资料 */}
        <Card title={<><UserOutlined /> 个人资料</>}>
          <Form
            form={profileForm}
            layout="vertical"
            onFinish={handleUpdateProfile}
          >
            <Form.Item label="头像">
              <Space>
                <Avatar size={64} icon={<UserOutlined />} />
                <Upload>
                  <Button icon={<UploadOutlined />}>上传头像</Button>
                </Upload>
              </Space>
            </Form.Item>

            <Form.Item
              label="邮箱"
              name="email"
            >
              <Input disabled />
            </Form.Item>

            <Form.Item
              label="个人简介"
              name="bio"
            >
              <TextArea 
                rows={4} 
                placeholder="介绍一下自己..."
                maxLength={200}
                showCount
              />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading}>
                保存资料
              </Button>
            </Form.Item>
          </Form>
        </Card>

        {/* 修改密码 */}
        <Card title={<><LockOutlined /> 修改密码</>}>
          <Form
            form={passwordForm}
            layout="vertical"
            onFinish={handleChangePassword}
          >
            <Form.Item
              label="新密码"
              name="newPassword"
              rules={[
                { required: true, message: '请输入新密码' },
                { min: 6, message: '密码至少6个字符' },
              ]}
            >
              <Input.Password placeholder="输入新密码" />
            </Form.Item>

            <Form.Item
              label="确认密码"
              name="confirmPassword"
              rules={[
                { required: true, message: '请确认密码' },
              ]}
            >
              <Input.Password placeholder="再次输入新密码" />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading}>
                修改密码
              </Button>
            </Form.Item>
          </Form>
        </Card>

        {/* 偏好设置 */}
        <Card title={<><SkinOutlined /> 偏好设置</>}>
          <Form
            form={settingsForm}
            layout="vertical"
            onFinish={handleUpdateSettings}
            initialValues={{
              theme: 'light',
              language: 'zh-CN',
              notifications_enabled: true,
              email_notifications: true,
            }}
          >
            <Form.Item
              label="主题"
              name="theme"
            >
              <Select>
                <Select.Option value="light">浅色</Select.Option>
                <Select.Option value="dark">深色</Select.Option>
                <Select.Option value="auto">跟随系统</Select.Option>
              </Select>
            </Form.Item>

            <Form.Item
              label="语言"
              name="language"
            >
              <Select>
                <Select.Option value="zh-CN">简体中文</Select.Option>
                <Select.Option value="en-US">English</Select.Option>
              </Select>
            </Form.Item>

            <Divider />

            <Form.Item
              label="通知设置"
              name="notifications_enabled"
              valuePropName="checked"
            >
              <Switch checkedChildren="开启" unCheckedChildren="关闭" />
            </Form.Item>

            <Form.Item
              label="邮件通知"
              name="email_notifications"
              valuePropName="checked"
            >
              <Switch checkedChildren="开启" unCheckedChildren="关闭" />
            </Form.Item>

            <Form.Item>
              <Button type="primary" htmlType="submit" loading={loading}>
                保存设置
              </Button>
            </Form.Item>
          </Form>
        </Card>

        {/* 账户操作 */}
        <Card title="账户操作">
          <Space direction="vertical" style={{ width: '100%' }}>
            <div>
              <Text type="danger">危险操作</Text>
              <br />
              <Text type="secondary">这些操作不可逆，请谨慎操作</Text>
            </div>
            <Button danger disabled>删除账户</Button>
          </Space>
        </Card>
      </Space>
    </DashboardLayout>
  );
}
