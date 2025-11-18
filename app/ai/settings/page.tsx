"use client";

import { useState, useEffect } from "react";
import { 
  Form, Input, Button, Card, Space, message, 
  InputNumber, Slider, Divider, Typography,
  Alert, Tag
} from 'antd';
import { 
  CheckCircleOutlined, CloseCircleOutlined,
  SyncOutlined
} from '@ant-design/icons';
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";

const { Title, Text, Paragraph } = Typography;

interface AISettings {
  ollama_url: string;
  api_key?: string;
  chat_model: string;
  similarity_threshold: number;
  max_results: number;
  chunk_size: number;
  temperature: number;
  max_tokens: number;
}

export default function AISettingsPage() {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const [testing, setTesting] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'success' | 'error' | null>(null);
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkUser();
    loadSettings();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
    }
  };

  const loadSettings = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data, error } = await supabase
        .from("ai_settings")
        .select("*")
        .eq("user_id", user.id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      if (data) {
        form.setFieldsValue(data);
      }
    } catch (err: any) {
      message.error("加载设置失败: " + err.message);
    }
  };

  const handleTestConnection = async () => {
    setTesting(true);
    setConnectionStatus(null);

    try {
      const url = form.getFieldValue('ollama_url') || 'http://localhost:11434';
      
      const response = await fetch(`${url}/api/tags`, {
        method: 'GET',
      });

      if (!response.ok) {
        throw new Error('连接失败');
      }

      const data = await response.json();
      const models = data.models?.map((m: any) => m.name) || [];
      
      setAvailableModels(models);
      setConnectionStatus('success');
      message.success(`连接成功！找到 ${models.length} 个模型`);
    } catch (err: any) {
      setConnectionStatus('error');
      message.error("连接失败，请检查 API 地址或使用其他 AI 服务");
    } finally {
      setTesting(false);
    }
  };

  const handleSave = async (values: AISettings) => {
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("未登录");

      const { error } = await supabase
        .from("ai_settings")
        .upsert({
          user_id: user.id,
          ...values,
        });

      if (error) throw error;

      message.success("保存成功");
    } catch (err: any) {
      message.error("保存失败: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <Space direction="vertical" size="large" style={{ width: '100%', maxWidth: 800 }}>
        <div>
          <Title level={2}>模型配置</Title>
          <Text type="secondary">配置 AI 模型 API 和参数</Text>
        </div>

        <Alert
          message="支持多种 AI 服务"
          description={
            <div>
              <Paragraph>
                <strong>本地模型（Ollama）：</strong>
              </Paragraph>
              <Paragraph>
                1. 安装 Ollama: <a href="https://ollama.ai" target="_blank" rel="noopener noreferrer">https://ollama.ai</a><br/>
                2. 拉取模型: <code>ollama pull llama2</code><br/>
                3. API 地址: <code>http://localhost:11434</code>
              </Paragraph>
              <Paragraph>
                <strong>OpenAI API：</strong>
              </Paragraph>
              <Paragraph>
                1. API 地址: <code>https://api.openai.com/v1</code><br/>
                2. 需要填写 API Key<br/>
                3. 模型名称: <code>gpt-4</code>, <code>gpt-3.5-turbo</code> 等
              </Paragraph>
              <Paragraph style={{ marginBottom: 0 }}>
                <strong>其他兼容服务：</strong> Claude, Gemini, 本地部署的模型等
              </Paragraph>
            </div>
          }
          type="info"
          showIcon
        />

        <Form
          form={form}
          layout="vertical"
          onFinish={handleSave}
          initialValues={{
            ollama_url: 'http://localhost:11434',
            api_key: '',
            chat_model: 'gpt-3.5-turbo',
            similarity_threshold: 0.7,
            max_results: 5,
            chunk_size: 500,
            temperature: 0.7,
            max_tokens: 2000,
          }}
        >
          <Card title="连接配置" style={{ marginBottom: 16 }}>
            <Form.Item
              label="API 地址"
              name="ollama_url"
              rules={[{ required: true, message: '请输入 API 地址' }]}
              tooltip="本地 Ollama: http://localhost:11434 | OpenAI: https://api.openai.com/v1"
            >
              <Input placeholder="http://localhost:11434" />
            </Form.Item>

            <Form.Item
              label="API Key"
              name="api_key"
              tooltip="如果使用 OpenAI、Claude 等需要认证的 API，请填写 API Key。本地 Ollama 不需要"
            >
              <Input.Password placeholder="可选，使用 OpenAI 等服务时需要填写" />
            </Form.Item>

            <Form.Item>
              <Space>
                <Button 
                  icon={<SyncOutlined />} 
                  onClick={handleTestConnection}
                  loading={testing}
                >
                  测试连接
                </Button>
                {connectionStatus === 'success' && (
                  <Tag icon={<CheckCircleOutlined />} color="success">
                    连接成功
                  </Tag>
                )}
                {connectionStatus === 'error' && (
                  <Tag icon={<CloseCircleOutlined />} color="error">
                    连接失败
                  </Tag>
                )}
              </Space>
            </Form.Item>

            {availableModels.length > 0 && (
              <Alert
                message={`可用模型: ${availableModels.join(', ')}`}
                type="success"
                showIcon
              />
            )}
          </Card>

          <Card title="模型配置" style={{ marginBottom: 16 }}>
            <Form.Item
              label="模型名称"
              name="chat_model"
              rules={[{ required: true, message: '请输入模型名称' }]}
              tooltip="OpenAI: gpt-4, gpt-3.5-turbo | Ollama: llama2, mistral, deepseek-coder | Claude: claude-3-opus 等"
            >
              <Input placeholder="例如: gpt-4, llama2, deepseek-coder:1.3b" />
            </Form.Item>
          </Card>

          <Card title="向量搜索配置" style={{ marginBottom: 16 }}>
            <Form.Item
              label={`相似度阈值: ${form.getFieldValue('similarity_threshold') || 0.7}`}
              name="similarity_threshold"
              tooltip="控制搜索结果的相似度要求，值越高越严格"
            >
              <Slider min={0} max={1} step={0.1} />
            </Form.Item>

            <Form.Item
              label="返回结果数量"
              name="max_results"
              tooltip="每次搜索返回的最大结果数"
            >
              <InputNumber min={1} max={20} style={{ width: '100%' }} />
            </Form.Item>

            <Form.Item
              label="文档分块大小（字符）"
              name="chunk_size"
              tooltip="文档向量化时的分块大小"
            >
              <InputNumber min={100} max={2000} step={100} style={{ width: '100%' }} />
            </Form.Item>
          </Card>

          <Card title="生成参数" style={{ marginBottom: 16 }}>
            <Form.Item
              label={`Temperature: ${form.getFieldValue('temperature') || 0.7}`}
              name="temperature"
              tooltip="控制输出的随机性，值越高越随机，越低越确定"
            >
              <Slider min={0} max={2} step={0.1} />
            </Form.Item>

            <Form.Item
              label="最大 Token 数"
              name="max_tokens"
              tooltip="限制生成的最大长度"
            >
              <InputNumber min={100} max={4000} step={100} style={{ width: '100%' }} />
            </Form.Item>
          </Card>

          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit" loading={loading}>
                保存配置
              </Button>
              <Button onClick={() => form.resetFields()}>
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Space>
    </DashboardLayout>
  );
}
