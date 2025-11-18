"use client";

import { useState, useEffect } from "react";
import { 
  Button, List, Card, Space, message, Popconfirm, Modal, Form, Input,
  Tag, Empty, Typography, Divider
} from 'antd';
import { 
  PlusOutlined, DeleteOutlined, SyncOutlined, 
  FileTextOutlined, CheckCircleOutlined, EditOutlined
} from '@ant-design/icons';
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";
import DashboardLayout from "@/components/DashboardLayout";

const { Title, Text, Paragraph } = Typography;
const { TextArea } = Input;

interface VectorItem {
  id: string;
  title: string;            // 标题
  content: string;          // 内容（将被向量化）
  category: string | null;  // 分类
  tags: string[] | null;    // 标签
  metadata: any;            // 元数据
  created_at: string;
  updated_at: string;
  embedding_count?: number; // 向量块数量
}

export default function VectorItemsPage() {
  const [items, setItems] = useState<VectorItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [vectorizing, setVectorizing] = useState<string | null>(null);
  const [creatingTestData, setCreatingTestData] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [editingItem, setEditingItem] = useState<VectorItem | null>(null);
  const [form] = Form.useForm();
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    checkUser();
    fetchItems();
  }, []);

  const checkUser = async () => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      router.push("/login");
    }
  };

  const fetchItems = async () => {
    try {
      setLoading(true);
      // 查询所有数据项
      const { data: items, error } = await supabase
        .from("vector_items")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      
      if (!items || items.length === 0) {
        setItems([]);
        return;
      }

      // 批量获取向量数量（使用 RPC 或直接查询）
      const itemIds = items.map(item => item.id);
      
      // 使用聚合查询获取每个数据项的向量数量
      const { data: counts, error: countsError } = await supabase
        .from("vector_item_embeddings")
        .select("item_id")
        .in("item_id", itemIds);

      if (countsError) {
        console.error("获取向量数量失败:", countsError);
      }

      // 统计每个数据项的向量数量
      const countMap = new Map<string, number>();
      if (counts) {
        counts.forEach((item: any) => {
          const currentCount = countMap.get(item.item_id) || 0;
          countMap.set(item.item_id, currentCount + 1);
        });
      }

      // 组合数据
      const itemsWithCounts = items.map(item => ({
        ...item,
        embedding_count: countMap.get(item.id) || 0,
      }));
      
      setItems(itemsWithCounts);
    } catch (err: any) {
      message.error("加载失败: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleAdd = () => {
    setEditingItem(null);
    form.resetFields();
    setModalVisible(true);
  };

  const handleEdit = (item: VectorItem) => {
    setEditingItem(item);  // 设置编辑项
    form.setFieldsValue({  // 填充表单
      title: item.title,
      content: item.content,
      category: item.category,
      tags: item.tags?.join(',') || '',
    });
    setModalVisible(true);  // 显示弹窗
  };

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
       // 获取用户信息（认证）
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("未登录");

      if (editingItem) {
        // 更新数据项
        const { error } = await supabase
          .from("vector_items")
          .update({
            title: values.title,
            content: values.content,
            category: values.category || null,
            tags: values.tags ? values.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : null,
          })
          // 调用: vector_items?id=eq.8cb9cf1c...
          .eq("id", editingItem.id);

        if (error) throw error;
        message.success("更新成功");
      } else {
        // 创建
        const { error } = await supabase
          .from("vector_items")
          .insert([{
            user_id: user.id,
            title: values.title,
            content: values.content,
            category: values.category || null,
            tags: values.tags ? values.tags.split(',').map((t: string) => t.trim()).filter(Boolean) : null,
          }]);

        if (error) throw error;
        message.success("创建成功");
      }

      setModalVisible(false);
      fetchItems();
    } catch (err: any) {
      message.error("操作失败: " + err.message);
    }
  };

  const handleVectorize = async (itemId: string) => {
    setVectorizing(itemId);
    try {
      const response = await fetch('/api/ai/vectorize-item', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ itemId }),
      });

      const data = await response.json();

      if (!response.ok) {
        let errorMsg = data.error || '向量化失败';
        if (data.details && data.details.length > 0) {
          errorMsg += '\n详细错误:\n' + data.details.join('\n');
        }
        throw new Error(errorMsg);
      }

      if (data.chunks === 0) {
        message.warning('向量化完成，但没有生成向量块，请检查内容是否为空');
      } else {
        message.success(`向量化完成，生成 ${data.chunks} 个向量块`);
      }
      
      fetchItems();
    } catch (err: any) {
      console.error("向量化错误:", err);
      Modal.error({
        title: '向量化失败',
        content: (
          <div>
            <p>{err.message}</p>
            <p style={{ marginTop: 8, fontSize: 12, color: '#999' }}>
              请检查：<br/>
              1. 模型配置页面的 API 地址是否正确<br/>
              2. 模型名称是否正确<br/>
              3. API Key 是否有效（如使用 OpenAI）<br/>
              4. 模型是否已安装（如使用 Ollama）
            </p>
          </div>
        ),
      });
    } finally {
      setVectorizing(null);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase
        .from("vector_items")
        .delete()
        .eq("id", id);

      if (error) throw error;
      message.success("删除成功");
      fetchItems();
    } catch (err: any) {
      message.error("删除失败: " + err.message);
    }
  };

  const handleCreateTestData = async () => {
    setCreatingTestData(true);
    try {
      const response = await fetch('/api/ai/test-data', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || '创建测试数据失败');
      }

      message.success(`成功创建 ${data.count} 个测试数据项`);
      fetchItems();
    } catch (err: any) {
      console.error("创建测试数据错误:", err);
      message.error("创建测试数据失败: " + err.message);
    } finally {
      setCreatingTestData(false);
    }
  };

  return (
    <DashboardLayout>
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <Title level={2} style={{ margin: 0 }}>数据项管理</Title>
            <Text type="secondary">管理用于向量搜索的数据项</Text>
          </div>
          <Space>
            <Button 
              onClick={handleCreateTestData}
              loading={creatingTestData}
            >
              创建测试数据
            </Button>
            <Button 
              type="primary" 
              icon={<PlusOutlined />}
              onClick={handleAdd}
            >
              添加数据项
            </Button>
          </Space>
        </div>

        <Card>
          <Space direction="vertical" size="middle" style={{ width: '100%' }}>
            <div>
              <Text strong>使用说明：</Text>
              <Paragraph type="secondary" style={{ marginBottom: 0 }}>
                1. 添加数据项（标题和内容）<br/>
                2. 点击"向量化"按钮将内容转换为向量<br/>
                3. 在语义搜索页面搜索相似内容
              </Paragraph>
            </div>
          </Space>
        </Card>

        <Divider />

        {loading ? (
          <Card loading />
        ) : items.length === 0 ? (
          <Empty
            image={<FileTextOutlined style={{ fontSize: 80, color: '#d9d9d9' }} />}
            description="还没有数据项"
          >
            <Button type="primary" icon={<PlusOutlined />} onClick={handleAdd}>
              添加第一个数据项
            </Button>
          </Empty>
        ) : (
          <List
            grid={{ gutter: 16, xs: 1, sm: 2, md: 2, lg: 3, xl: 3, xxl: 4 }}
            dataSource={items}
            renderItem={(item) => (
              <List.Item>
                <Card
                  hoverable
                  actions={[
                    <Button
                      key="edit"
                      type="link"
                      icon={<EditOutlined />}
                      onClick={() => handleEdit(item)}
                    >
                      编辑
                    </Button>,
                    <Button
                      key="vectorize"
                      type="link"
                      icon={<SyncOutlined spin={vectorizing === item.id} />}
                      onClick={() => handleVectorize(item.id)}
                      disabled={vectorizing === item.id}
                    >
                      向量化
                    </Button>,
                    <Popconfirm
                      key="delete"
                      title="确定要删除这个数据项吗？"
                      onConfirm={() => handleDelete(item.id)}
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
                    avatar={<FileTextOutlined style={{ fontSize: 24, color: '#1890ff' }} />}
                    title={item.title}
                    description={
                      <Space direction="vertical" size="small" style={{ width: '100%' }}>
                        <Text type="secondary" ellipsis>
                          {item.content.substring(0, 100)}...
                        </Text>
                        <div>
                          {item.category && (
                            <Tag color="blue">{item.category}</Tag>
                          )}
                          {item.embedding_count && item.embedding_count > 0 ? (
                            <Tag icon={<CheckCircleOutlined />} color="success">
                              已向量化 ({item.embedding_count})
                            </Tag>
                          ) : (
                            <Tag color="default">未向量化</Tag>
                          )}
                        </div>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {new Date(item.created_at).toLocaleString('zh-CN')}
                        </Text>
                      </Space>
                    }
                  />
                </Card>
              </List.Item>
            )}
          />
        )}
      </Space>

      <Modal
        title={editingItem ? "编辑数据项" : "添加数据项"}
        open={modalVisible}
        onOk={handleSubmit}
        onCancel={() => setModalVisible(false)}
        width={600}
      >
        <Form
          form={form}
          layout="vertical"
        >
          <Form.Item
            name="title"
            label="标题"
            rules={[{ required: true, message: '请输入标题' }]}
          >
            <Input placeholder="输入标题" />
          </Form.Item>
          <Form.Item
            name="content"
            label="内容"
            rules={[{ required: true, message: '请输入内容' }]}
          >
            <TextArea
              placeholder="输入内容"
              autoSize={{ minRows: 4, maxRows: 10 }}
            />
          </Form.Item>
          <Form.Item
            name="category"
            label="分类"
          >
            <Input placeholder="输入分类（可选）" />
          </Form.Item>
          <Form.Item
            name="tags"
            label="标签"
          >
            <Input placeholder="输入标签，用逗号分隔（可选）" />
          </Form.Item>
        </Form>
      </Modal>
    </DashboardLayout>
  );
}

