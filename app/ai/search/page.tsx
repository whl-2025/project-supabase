"use client";

import { useState, useEffect } from "react";
import { 
  Card, Input, Button, Space, message, List, Typography, Tag, Empty,
  Slider, InputNumber, Row, Col, Spin
} from 'antd';
import {
  SearchOutlined,
  RobotOutlined,
  FileTextOutlined,
} from '@ant-design/icons';
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface SearchResult {
  id: string;
  item_id: string;
  title: string;
  content: string;
  similarity: number;
  category: string | null;
  metadata: any;
}

export default function AISearchPage() {
  const router = useRouter();
  const supabase = createClient();
  const [loading, setLoading] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const [threshold, setThreshold] = useState(0.8);  // 提高到 80%
  const [maxResults, setMaxResults] = useState(10);

  useEffect(() => {
    checkUser();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
    }
  };

  const handleSearch = async () => {
    if (!query.trim()) {
      message.warning("请输入搜索内容");
      return;
    }

    try {
      setLoading(true);
      const response = await fetch('/api/ai/search', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          query: query.trim(),
          threshold,
          limit: maxResults,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '搜索失败');
      }

      setResults(data.results || []);
      
      if (data.results.length === 0) {
        message.info('没有找到相关结果，请尝试其他关键词或降低相似度阈值');
      } else {
        const avgSimilarity = data.results.reduce((sum: number, r: any) => sum + r.similarity, 0) / data.results.length;
        message.success(`找到 ${data.results.length} 个相关结果，平均相似度: ${(avgSimilarity * 100).toFixed(1)}%`);
        
        // 如果平均相似度太低，给出警告
        if (avgSimilarity < 0.75) {
          message.warning('搜索结果相似度较低，建议检查模型配置或提高阈值');
        }
      }
    } catch (err: any) {
      message.error(err.message || '搜索失败');
      console.error("搜索错误:", err);
    } finally {
      setLoading(false);
    }
  };

  const getSimilarityColor = (similarity: number) => {
    if (similarity >= 0.9) return 'green';
    if (similarity >= 0.8) return 'blue';
    if (similarity >= 0.7) return 'orange';
    return 'default';
  };

  return (
    <DashboardLayout>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div>
          <Title level={2}>语义搜索</Title>
          <Text type="secondary">使用 AI 进行智能语义搜索</Text>
        </div>

        {/* 搜索区域 */}
        <Card>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>搜索内容</Text>
              <TextArea
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="输入要搜索的内容，例如：React 组件开发"
                rows={4}
                onPressEnter={(e) => {
                  if (e.ctrlKey || e.metaKey) {
                    handleSearch();
                  }
                }}
              />
              <Text type="secondary" style={{ fontSize: 12 }}>
                提示：按 Ctrl+Enter 快速搜索
              </Text>
            </div>

            <Row gutter={16}>
              <Col span={12}>
                <Text>相似度阈值: {threshold}</Text>
                <Slider
                  min={0}
                  max={1}
                  step={0.1}
                  value={threshold}
                  onChange={setThreshold}
                  marks={{
                    0: '0',
                    0.5: '0.5',
                    1: '1',
                  }}
                />
              </Col>
              <Col span={12}>
                <Text>返回结果数量</Text>
                <InputNumber
                  min={1}
                  max={50}
                  value={maxResults}
                  onChange={(value) => setMaxResults(value || 10)}
                  style={{ width: '100%' }}
                />
              </Col>
            </Row>

            <Button
              type="primary"
              size="large"
              icon={<SearchOutlined />}
              onClick={handleSearch}
              loading={loading}
              block
            >
              搜索
            </Button>
          </Space>
        </Card>

        {/* 搜索结果 */}
        <Card title={`搜索结果 (${results.length})`}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <Spin size="large" />
              <div style={{ marginTop: 16 }}>
                <Text type="secondary">正在搜索...</Text>
              </div>
            </div>
          ) : results.length === 0 ? (
            <Empty
              image={<RobotOutlined style={{ fontSize: 80, color: '#d9d9d9' }} />}
              description="暂无搜索结果"
            >
              <Text type="secondary">
                请输入搜索内容并点击搜索按钮
              </Text>
            </Empty>
          ) : (
            <List
              dataSource={results}
              renderItem={(result) => (
                <List.Item>
                  <Card
                    hoverable
                    style={{ width: '100%' }}
                    bodyStyle={{ padding: 16 }}
                  >
                    <Space direction="vertical" size="small" style={{ width: '100%' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Space>
                          <FileTextOutlined style={{ fontSize: 20, color: '#1890ff' }} />
                          <Text strong style={{ fontSize: 16 }}>{result.title}</Text>
                        </Space>
                        <Tag color={getSimilarityColor(result.similarity)}>
                          相似度: {(result.similarity * 100).toFixed(1)}%
                        </Tag>
                      </div>
                      
                      {result.category && (
                        <Tag color="blue">{result.category}</Tag>
                      )}
                      
                      <Paragraph
                        ellipsis={{ rows: 3, expandable: true, symbol: '展开' }}
                        style={{ marginBottom: 0 }}
                      >
                        {result.content}
                      </Paragraph>
                    </Space>
                  </Card>
                </List.Item>
              )}
            />
          )}
        </Card>

        {/* 使用说明 */}
        <Card title="使用说明">
          <Space direction="vertical">
            <Text>1. 在搜索框中输入要查找的内容</Text>
            <Text>2. 调整相似度阈值（越高越严格）</Text>
            <Text>3. 设置返回结果数量</Text>
            <Text>4. 点击搜索按钮或按 Ctrl+Enter</Text>
            <Text type="secondary" style={{ fontSize: 12 }}>
              注意：搜索前请确保已在"知识库管理"中添加并向量化数据
            </Text>
          </Space>
        </Card>
      </Space>
    </DashboardLayout>
  );
}
