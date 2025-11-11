"use client";

import { useState, useEffect } from "react";
import { Modal, Form, Input, Select, message } from 'antd';
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

const { TextArea } = Input;
const { Option } = Select;

interface ProjectModalProps {
  isOpen: boolean;
  onClose: () => void;
  projectId?: string;
  initialData?: {
    name: string;
    description: string;
    status: string;
  };
}

export default function ProjectModal({ isOpen, onClose, projectId, initialData }: ProjectModalProps) {
  const [form] = Form.useForm();
  const [loading, setLoading] = useState(false);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        form.setFieldsValue(initialData);
      } else {
        form.resetFields();
      }
    }
  }, [isOpen, initialData, form]);

  const handleSubmit = async () => {
    try {
      const values = await form.validateFields();
      setLoading(true);

      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("未登录");

      if (projectId) {
        // 更新项目
        const { error } = await supabase
          .from("projects")
          .update(values)
          .eq("id", projectId);

        if (error) throw error;
        message.success("更新成功");
      } else {
        // 创建项目
        const { error } = await supabase.from("projects").insert([
          {
            ...values,
            owner_id: user.id,
          },
        ]);

        if (error) throw error;
        message.success("创建成功");
      }

      form.resetFields();
      onClose();
      router.refresh();
    } catch (err: any) {
      if (err.errorFields) {
        // 表单验证错误
        return;
      }
      message.error(err.message || "操作失败");
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    form.resetFields();
    onClose();
  };

  return (
    <Modal
      title={projectId ? "编辑项目" : "新建项目"}
      open={isOpen}
      onOk={handleSubmit}
      onCancel={handleCancel}
      confirmLoading={loading}
      okText={projectId ? "更新" : "创建"}
      cancelText="取消"
      width={600}
    >
      <Form
        form={form}
        layout="vertical"
        initialValues={{ status: 'active' }}
      >
        <Form.Item
          label="项目名称"
          name="name"
          rules={[{ required: true, message: '请输入项目名称' }]}
        >
          <Input placeholder="输入项目名称" />
        </Form.Item>

        <Form.Item
          label="项目描述"
          name="description"
        >
          <TextArea rows={4} placeholder="输入项目描述（可选）" />
        </Form.Item>

        <Form.Item
          label="项目状态"
          name="status"
          rules={[{ required: true, message: '请选择项目状态' }]}
        >
          <Select placeholder="选择项目状态">
            <Option value="active">进行中</Option>
            <Option value="completed">已完成</Option>
            <Option value="paused">已暂停</Option>
          </Select>
        </Form.Item>
      </Form>
    </Modal>
  );
}
