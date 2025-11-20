"use client";

import { useState, useEffect, useRef } from 'react';
import { Card, Input, Button, List, Avatar, Space, Typography, Badge, Spin, message } from 'antd';
import { SendOutlined, UserOutlined } from '@ant-design/icons';
import { createClient } from '@/utils/supabase/client';
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

export default function ProjectChat() {
  const supabase = createClient();
  const [messages, setMessages] = useState<Message[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<OnlineUser[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [currentUserId, setCurrentUserId] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
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
        updatePresence(user.id, 'online');
      }
    };
    getUser();

    // 页面卸载时更新状态为离线
    return () => {
      if (currentUserId) {
        updatePresence(currentUserId, 'offline');
      }
    };
  }, []);

  // 更新在线状态
  const updatePresence = async (userId: string, status: 'online' | 'offline') => {
    await supabase
      .from('user_presence')
      .upsert({
        user_id: userId,
        status,
        last_seen: new Date().toISOString(),
      }, {
        onConflict: 'user_id'
      });
  };

  // 加载历史消息
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        setLoading(true);
        
        // 获取最近 100 条消息
        const { data: messagesData, error: messagesError } = await supabase
          .from('chat_messages')
          .select(`
            id,
            user_id,
            content,
            created_at
          `)
          .order('created_at', { ascending: true })
          .limit(100);

        if (messagesError) throw messagesError;

        // 获取用户信息
        if (messagesData && messagesData.length > 0) {
          const { data: usersData } = await supabase.auth.admin.listUsers();
          
          const userMap = new Map(
            usersData?.users.map(u => [u.id, u.email]) || []
          );

          const messagesWithUsers = messagesData.map(msg => ({
            ...msg,
            user_email: userMap.get(msg.user_id) || '未知用户'
          }));

          setMessages(messagesWithUsers);
        }

        // 获取在线用户
        await fetchOnlineUsers();
      } catch (err: any) {
        console.error('加载消息失败:', err);
        message.error('加载消息失败');
      } finally {
        setLoading(false);
      }
    };

    fetchMessages();
  }, []);

  // 获取在线用户
  const fetchOnlineUsers = async () => {
    const { data, error } = await supabase
      .from('user_presence')
      .select('user_id, status, last_seen')
      .eq('status', 'online')
      .gte('last_seen', new Date(Date.now() - 5 * 60 * 1000).toISOString()); // 5分钟内活跃

    if (!error && data) {
      // 获取用户邮箱
      const { data: usersData } = await supabase.auth.admin.listUsers();
      const userMap = new Map(
        usersData?.users.map(u => [u.id, u.email]) || []
      );
      
      const usersWithEmail = data.map(user => ({
        ...user,
        user_email: userMap.get(user.user_id) || '未知用户'
      }));
      
      setOnlineUsers(usersWithEmail);
    }
  };

  // 订阅实时消息
  useEffect(() => {
    const channel = supabase
      .channel('global-chat')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        async (payload) => {
          const newMessage = payload.new as Message;
          
          // 获取发送者信息
          const { data: userData } = await supabase.auth.admin.listUsers();
          const user = userData?.users.find(u => u.id === newMessage.user_id);
          
          setMessages(prev => [...prev, {
            ...newMessage,
            user_email: user?.email || '未知用户'
          }]);
          
          setTimeout(scrollToBottom, 100);
        }
      )
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'user_presence'
        },
        () => {
          fetchOnlineUsers();
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
    };
  }, []);

  // 发送消息后滚动
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // 发送消息
  const handleSend = async () => {
    if (!inputValue.trim()) {
      message.warning('请输入消息内容');
      return;
    }

    if (inputValue.length > 1000) {
      message.warning('消息长度不能超过 1000 字符');
      return;
    }

    setSending(true);
    try {
      const { error } = await supabase
        .from('chat_messages')
        .insert({
          user_id: currentUserId,
          content: inputValue.trim(),
        });

      if (error) throw error;

      setInputValue('');
      
      // 更新在线状态
      updatePresence(currentUserId, 'online');
    } catch (err: any) {
      console.error('发送消息失败:', err);
      message.error('发送失败');
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
