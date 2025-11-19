"use client";

import { useState } from "react";
import { Button, Card, Space, Typography, Alert, Descriptions, Tag, Spin } from 'antd';
import { CheckCircleOutlined, CloseCircleOutlined, WarningOutlined } from '@ant-design/icons';
import DashboardLayout from "@/components/DashboardLayout";

const { Title, Text, Paragraph } = Typography;

interface DiagnosisResult {
  currentConfig: {
    apiUrl: string;
    model: string;
    hasApiKey: boolean;
  };
  storedVectors: {
    count: number;
    dimension: number | null;
  };
  currentModel: {
    dimension: number | null;
    testError: string | null;
  };
  expectedDimension: number | string;
  isConsistent: boolean;
  warning: string;
  recommendation: string;
}

export default function DiagnosePage() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosisResult | null>(null);

  const handleDiagnose = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/ai/diagnose', {
        method: 'POST',
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '诊断失败');
      }

      setResult(data.diagnosis);
    } catch (error: any) {
      console.error('诊断错误:', error);
      alert('诊断失败: ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <DashboardLayout>
      <Space direction="vertical" size="large" style={{ width: '100%', maxWidth: 900 }}>
        <div>
          <Title level={2}>AI 模型诊断</Title>
          <Text type="secondary">检查向量化和搜索是否使用了相同的模型</Text>
        </div>

        <Alert
          message="为什么需要诊断？"
          description={
            <div>
              <Paragraph>
                如果向量化和搜索使用了不同的模型，会导致：
              </Paragraph>
              <ul>
                <li>搜索结果不准确</li>
                <li>相似度计算错误</li>
                <li>完全不相关的内容被返回</li>
              </ul>
              <Paragraph style={{ marginBottom: 0 }}>
                <strong>解决方案：</strong>确保向量化和搜索使用相同的模型
              </Paragraph>
            </div>
          }
          type="info"
          showIcon
        />

        <Card>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <Button 
              type="primary" 
              size="large"
              onClick={handleDiagnose}
              loading={loading}
              block
            >
              开始诊断
            </Button>

            {loading && (
              <div style={{ textAlign: 'center', padding: '40px 0' }}>
                <Spin size="large" />
                <div style={{ marginTop: 16 }}>
                  <Text type="secondary">正在检查模型配置...</Text>
                </div>
              </div>
            )}

            {result && !loading && (
              <Space direction="vertical" size="large" style={{ width: '100%' }}>
                <Alert
                  message={result.isConsistent ? '✅ 模型配置一致' : '⚠️ 模型配置不一致'}
                  description={result.warning}
                  type={result.isConsistent ? 'success' : 'error'}
                  showIcon
                  icon={result.isConsistent ? <CheckCircleOutlined /> : <WarningOutlined />}
                />

                <Card title="当前配置" size="small">
                  <Descriptions column={1} bordered size="small">
                    <Descriptions.Item label="API 地址">
                      {result.currentConfig.apiUrl}
                    </Descriptions.Item>
                    <Descriptions.Item label="模型名称">
                      {result.currentConfig.model}
                    </Descriptions.Item>
                    <Descriptions.Item label="API Key">
                      {result.currentConfig.hasApiKey ? 
                        <Tag color="green">已配置</Tag> : 
                        <Tag color="default">未配置</Tag>
                      }
                    </Descriptions.Item>
                  </Descriptions>
                </Card>

                <Card title="已存储的向量" size="small">
                  <Descriptions column={1} bordered size="small">
                    <Descriptions.Item label="向量数量">
                      {result.storedVectors.count}
                    </Descriptions.Item>
                    <Descriptions.Item label="向量维度">
                      {result.storedVectors.dimension || '无数据'}
                    </Descriptions.Item>
                  </Descriptions>
                </Card>

                <Card title="当前模型测试" size="small">
                  <Descriptions column={1} bordered size="small">
                    <Descriptions.Item label="生成的向量维度">
                      {result.currentModel.dimension || '测试失败'}
                    </Descriptions.Item>
                    <Descriptions.Item label="期望维度">
                      {result.expectedDimension}
                    </Descriptions.Item>
                    <Descriptions.Item label="维度是否一致">
                      {result.isConsistent ? 
                        <Tag icon={<CheckCircleOutlined />} color="success">一致</Tag> : 
                        <Tag icon={<CloseCircleOutlined />} color="error">不一致</Tag>
                      }
                    </Descriptions.Item>
                    {result.currentModel.testError && (
                      <Descriptions.Item label="错误信息">
                        <Text type="danger">{result.currentModel.testError}</Text>
                      </Descriptions.Item>
                    )}
                  </Descriptions>
                </Card>

                <Card title="建议" size="small">
                  <Paragraph style={{ whiteSpace: 'pre-line' }}>
                    {result.recommendation}
                  </Paragraph>
                </Card>

                {!result.isConsistent && (
                  <Alert
                    message="修复步骤"
                    description={
                      <ol>
                        <li>前往"模型配置"页面，确认当前配置的模型</li>
                        <li>前往"知识库管理"页面</li>
                        <li>对所有数据项重新点击"向量化"按钮</li>
                        <li>重新测试搜索功能</li>
                      </ol>
                    }
                    type="warning"
                    showIcon
                  />
                )}
              </Space>
            )}
          </Space>
        </Card>

        <Card title="常见模型维度参考">
          <Descriptions column={2} bordered size="small">
            <Descriptions.Item label="text-embedding-3-small">1536 维</Descriptions.Item>
            <Descriptions.Item label="text-embedding-3-large">3072 维</Descriptions.Item>
            <Descriptions.Item label="text-embedding-ada-002">1536 维</Descriptions.Item>
            <Descriptions.Item label="nomic-embed-text">768 维</Descriptions.Item>
            <Descriptions.Item label="mxbai-embed-large">1024 维</Descriptions.Item>
            <Descriptions.Item label="deepseek-coder">2048 维</Descriptions.Item>
          </Descriptions>
        </Card>
      </Space>
    </DashboardLayout>
  );
}
