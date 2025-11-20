"use client";

import { useState, useEffect, useRef } from 'react';
import { Card, Input, Button, List, Avatar, Space, Typography, Badge, Spin, message } from 'antd';
import { SendOutlined, UserOutlined } from '@ant-design/icons';
import { createClient } from '@/utils/supabase/client';
// 🔴 Realtime 类型导入
// RealtimeChannel: Supabase Realtime 频道的类型定义
import type { RealtimeChannel } from '@supabase/supabase-js';

const { Text } = Typography;
const { TextArea } = Input;

interface Message {
  id: string;
  user_id: string;
  content: string;
  created_at: string;
  user_email?: string;
}

interface OnlineUser {
  user_id: string;
  user_email?: string;
  status: string;
  last_seen: string;
}

export default function GlobalChat() {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const [currentUserEmail, setCurrentUserEmail] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  // 🔴 Realtime 频道引用
  // 用于存储 Realtime 频道实例，以便在组件卸载时取消订阅
  const channelRef = useRef<RealtimeChannel | null>(null);

  // 滚动到底部
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // 获取用户信息
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        setCurrentUserEmail(user.email || '未知用户');
        await updatePresence(user.id, user.email || '未知用户', 'online');
        await fetchOnlineUsers();
      }
    };
    getUser();

    // 页面卸载时更新状态为离线
    return () => {
      const cleanup = async () => {
        if (currentUserId) {
          await updatePresence(currentUserId, currentUserEmail, 'offline');
        }
      };
      cleanup();
    };
  }, []);

  // 更新在线状态（非 Realtime，普通数据库操作）
  // ❌ 这是普通的 UPSERT 操作，不是 Realtime
  // 🔴 但更新成功后会触发 Realtime 推送给所有订阅的客户端
  const updatePresence = async (userId: string, userEmail: string, status: 'online' | 'offline') => {
    try {
      const { error } = await supabase
        .from('user_presence')
        .upsert({
          user_id: userId,
          user_email: userEmail,
          status,
          last_seen: new Date().toISOString(),
        });
      
      if (error) {
        console.error('更新在线状态失败:', error);
      }
      // 🔴 更新成功后，Realtime 会自动推送给所有订阅了 user_presence 表的客户端
      // 触发他们的 .on('postgres_changes', ...) 回调函数
    } catch (err) {
      console.error('更新在线状态异常:', err);
    }
  };

  // 加载历史消息（非 Realtime，普通数据库查询）
  // ❌ 这是普通的 SELECT 查询，不是 Realtime
  // 用于页面初始化时加载已有的消息
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        
        // 获取最近 100 条消息
        const { data: messagesData, error: messagesError } = await supabase
          .from('chat_messages')
          .select('id, user_id, user_email, content, created_at')
          .order('created_at', { ascending: true })  // 按时间升序
          .limit(100);  // 限制100条

        if (messagesError) {
          console.error('获取消息失败:', messagesError);
          throw messagesError;
        }

        if (messagesData) {
          setMessages(messagesData);
        }
      } catch (err: any) {
        console.error('加载消息失败:', err);
        message.error('加载消息失败: ' + err.message);
      } finally {
        setLoading(false);
      }
    };

    if (currentUserId) {
      fetchMessages();
    }
  }, [currentUserId]);

  // 获取在线用户（非 Realtime，普通数据库查询）
  // ❌ 这是普通的 SELECT 查询，不是 Realtime
  // 🔴 但这个函数会在 Realtime 回调中被调用
  // 当 user_presence 表有变化时，Realtime 推送触发这个函数
  const fetchOnlineUsers = async () => {
    try {
      const { data, error } = await supabase
        .from('user_presence')
        .select('user_id, user_email, status, last_seen')
        .eq('status', 'online')  // 只查询在线用户
        .gte('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString());  // 5分钟内活跃

      if (error) {
        console.error('获取在线用户失败:', error);
        return;
      }

      if (data) {
        setOnlineUsers(data);
      }
    } catch (err) {
      console.error('获取在线用户异常:', err);
    }
  };

  // ==================== 🔴 Realtime 订阅实时消息 ====================
  // 这是整个聊天室的核心功能：通过 WebSocket 实时接收数据库变化
  useEffect(() => {
    // 确保用户已登录才开始订阅
    if (!currentUserId) return;

    console.log('开始订阅实时消息...');

    // 🔴 步骤1: 创建 Realtime 频道
    // channel() 创建一个命名频道，用于组织和管理订阅
    // 'global-chat' 是频道名称，可以自定义
    const channel = supabase
      .channel('global-chat')
      
      // 🔴 步骤2: 监听 chat_messages 表的 INSERT 事件
      // 当有新消息插入数据库时，这个回调会被触发
      .on(
        'postgres_changes',  // 监听 PostgreSQL 数据库变化
        {
          event: 'INSERT',   // 只监听插入事件（新消息）
          schema: 'public',  // 数据库 schema
          table: 'chat_messages'  // 监听的表名
        },
        (payload) => {
          // 🔴 Realtime 回调函数：收到新消息时自动执行
          // payload 包含：
          // - payload.new: 新插入的数据
          // - payload.old: 旧数据（INSERT 时为空）
          // - payload.eventType: 事件类型（INSERT/UPDATE/DELETE）
          console.log('收到新消息:', payload);
          
          // 提取新消息数据
          const newMessage = payload.new as Message;
          
          // 数据补全：如果 Realtime 推送的数据缺少 user_email
          // 且消息是当前用户发送的，则使用当前用户的邮箱
          if (!newMessage.user_email && newMessage.user_id === currentUserId) {
            newMessage.user_email = currentUserEmail;
          }
          
          // 🔴 更新消息列表状态
          setMessages(prev => {
            // 防止重复添加：检查消息 ID 是否已存在
            // 这是因为发送消息时我们手动添加了一次（备用方案）
            // Realtime 推送时可能会重复
            if (prev.some(msg => msg.id === newMessage.id)) {
              return prev;  // 已存在，不添加
            }
            // 将新消息追加到列表末尾
            return [...prev, newMessage];
          });
          
          // 延迟滚动到底部，确保 DOM 已更新
          setTimeout(scrollToBottom, 100);
        }
      )
      
      // 🔴 步骤3: 监听 user_presence 表的所有事件
      // 当用户上线、下线或更新状态时触发
      .on(
        'postgres_changes',
        {
          event: '*',  // 监听所有事件（INSERT/UPDATE/DELETE）
          schema: 'public',
          table: 'user_presence'  // 在线状态表
        },
        () => {
          // 🔴 Realtime 回调函数：在线状态变化时执行
          console.log('在线状态变化');
          
          // 重新获取在线用户列表
          // 这是一个普通的数据库查询，不是 Realtime
          fetchOnlineUsers();
        }
      )
      
      // 🔴 步骤4: 开始订阅（建立 WebSocket 连接）
      // subscribe() 会：
      // 1. 建立与 Supabase Realtime 服务器的 WebSocket 连接
      // 2. 注册上面定义的所有监听器
      // 3. 开始接收实时推送
      .subscribe((status) => {
        // 订阅状态回调：
        // - SUBSCRIBED: 订阅成功
        // - CHANNEL_ERROR: 频道错误
        // - TIMED_OUT: 超时
        // - CLOSED: 连接关闭
        console.log('订阅状态:', status);
      });

    // 🔴 步骤5: 保存频道引用
    // 用于后续取消订阅
    channelRef.current = channel;

    // 🔴 步骤6: 清理函数（组件卸载时执行）
    return () => {
      console.log('取消订阅');
      // 取消订阅，关闭 WebSocket 连接
      // 这很重要，避免内存泄漏和不必要的网络连接
      channel.unsubscribe();
    };
  }, [currentUserId]);  // 依赖 currentUserId，用户登录后才订阅
  // ==================== 🔴 Realtime 订阅结束 ====================

  // 发送消息后滚动
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 发送消息（非 Realtime，普通数据库操作）
  const handleSend = async () => {
    // 输入验证
    if (!inputValue.trim()) {
      message.warning('请输入消息内容');
      return;
    }

    if (inputValue.length > 1000) {
      message.warning('消息长度不能超过 1000 字符');
      return;
    }

    if (!currentUserId) {
      message.error('用户未登录');
      return;
    }

    setSending(true);
    try {
      // ❌ 这是普通的数据库 INSERT 操作，不是 Realtime
      // 但插入成功后会触发 Realtime 推送
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: currentUserId,
          user_email: currentUserEmail,
          content: inputValue.trim(),
        })
        .select();  // 返回插入的数据

      if (error) {
        console.error('发送消息错误:', error);
        throw error;
      }

      console.log('消息发送成功:', data);
      
      // 🔴 手动添加消息到列表（备用方案）
      // 为什么需要手动添加？
      // 1. 立即显示消息，不等待 Realtime 推送（更好的用户体验）
      // 2. 防止 Realtime 延迟或失败
      // 3. Realtime 回调中有重复检查，不会导致消息重复
      if (data && data.length > 0) {
        const newMessage = data[0];
        setMessages(prev => {
          // 避免重复添加
          if (prev.some(msg => msg.id === newMessage.id)) {
            return prev;
          }
          return [...prev, newMessage];
        });
        setTimeout(scrollToBottom, 100);
      }
      
      setInputValue('');
      
      // 更新在线状态（保持活跃）
      // 这个操作会触发 user_presence 表的 UPDATE 事件
      // 🔴 从而触发 Realtime 推送，其他用户会看到你的在线状态更新
      await updatePresence(currentUserId, currentUserEmail, 'online');
    } catch (err: any) {
      console.error('发送消息失败:', err);
      message.error('发送失败: ' + err.message);
    } finally {
      setSending(false);
    }
  };

  // 处理键盘事件
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // 格式化时间
  const formatTime = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    
    if (diff < 60000) return '刚刚';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
    
    return date.toLocaleString('zh-CN', {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // 获取用户名首字母
  const getUserInitial = (email?: string) => {
    if (!email) return '?';
    return email.charAt(0).toUpperCase();
  };

  return (
    <div style={{ height: '600px', display: 'flex', flexDirection: 'column' }}>
      {/* 在线成员 */}
      <Card size="small" style={{ marginBottom: 16 }}>
        <Space wrap>
          <Text strong>在线成员</Text>
          <Badge count={onlineUsers.length} showZero />
          {onlineUsers.slice(0, 10).map(user => (
            <Badge key={user.user_id} status="success" text={user.user_email || '用户'} />
          ))}
          {onlineUsers.length > 10 && (
            <Text type="secondary">等 {onlineUsers.length} 人</Text>
          )}
        </Space>
      </Card>

      {/* 消息列表 */}
      <Card 
        style={{ flex: 1, overflow: 'hidden', marginBottom: 16 }}
        styles={{ body: { height: '100%', overflow: 'auto', padding: 16 } }}
      >
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px 0' }}>
            <Spin size="large" />
          </div>
        ) : messages.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 0', color: '#999' }}>
            <Text type="secondary">还没有消息，发送第一条消息吧！</Text>
          </div>
        ) : (
          <List
            dataSource={messages}
            renderItem={(msg) => {
              const isOwn = msg.user_id === currentUserId;
              return (
                <List.Item
                  style={{
                    border: 'none',
                    padding: '8px 0',
                    justifyContent: isOwn ? 'flex-end' : 'flex-start'
                  }}
                >
                  <div style={{
                    maxWidth: '70%',
                    display: 'flex',
                    flexDirection: isOwn ? 'row-reverse' : 'row',
                    gap: 8
                  }}>
                    <Avatar 
                      style={{ 
                        backgroundColor: isOwn ? '#1890ff' : '#87d068',
                        flexShrink: 0
                      }}
                      icon={<UserOutlined />}
                    >
                      {getUserInitial(msg.user_email)}
                    </Avatar>
                    <div style={{ flex: 1 }}>
                      <div style={{
                        display: 'flex',
                        gap: 8,
                        marginBottom: 4,
                        flexDirection: isOwn ? 'row-reverse' : 'row'
                      }}>
                        <Text strong style={{ fontSize: 12 }}>
                          {isOwn ? '我' : msg.user_email}
                        </Text>
                        <Text type="secondary" style={{ fontSize: 12 }}>
                          {formatTime(msg.created_at)}
                        </Text>
                      </div>
                      <div style={{
                        padding: '8px 12px',
                        borderRadius: 8,
                        backgroundColor: isOwn ? '#1890ff' : '#f0f0f0',
                        color: isOwn ? '#fff' : '#000',
                        wordBreak: 'break-word',
                        whiteSpace: 'pre-wrap'
                      }}>
                        {msg.content}
                      </div>
                    </div>
                  </div>
                </List.Item>
              );
            }}
          />
        )}
        <div ref={messagesEndRef} />
      </Card>

      {/* 输入框 */}
      <Card size="small">
        <Space.Compact style={{ width: '100%' }}>
          <TextArea
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="输入消息... (Enter 发送, Shift+Enter 换行)"
            autoSize={{ minRows: 1, maxRows: 4 }}
            maxLength={1000}
            disabled={sending}
          />
          <Button
            type="primary"
            icon={<SendOutlined />}
            onClick={handleSend}
            loading={sending}
            disabled={!inputValue.trim()}
          >
            发送
          </Button>
        </Space.Compact>
        <Text type="secondary" style={{ fontSize: 12, marginTop: 4, display: 'block' }}>
          {inputValue.length}/1000
        </Text>
      </Card>
    </div>
  );
}
