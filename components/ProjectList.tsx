"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Link from "next/link";
import { useRouter } from "next/navigation";

interface Project {
  id: string;
  name: string;
  description: string | null;
  status: string;
  created_at: string;
}

export default function ProjectList() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    try {
      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      setProjects(data || []);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("确定要删除这个项目吗？")) return;

    try {
      const { error } = await supabase.from("projects").delete().eq("id", id);
      if (error) throw error;
      router.refresh();
      fetchProjects();
    } catch (err: any) {
      alert("删除失败: " + err.message);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <div className="flex flex-col items-center gap-4">
          <svg className="animate-spin h-10 w-10 text-blue-500" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
          </svg>
          <p className="text-gray-600 font-medium">加载中...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50/80 border border-red-200 text-red-700 px-6 py-4 rounded-xl flex items-center gap-3">
        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
        </svg>
        <span>错误: {error}</span>
      </div>
    );
  }

  if (projects.length === 0) {
    return (
      <div className="text-center py-16 bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20">
        <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl mb-4">
          <svg className="w-10 h-10 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
        </div>
        <p className="text-gray-600 mb-2 text-lg font-medium">还没有项目</p>
        <p className="text-gray-500 mb-6 text-sm">开始创建你的第一个项目吧</p>
        <Link
          href="/projects/new"
          className="inline-flex items-center gap-2 text-blue-500 hover:text-blue-600 font-semibold transition-colors"
        >
          创建第一个项目
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
          </svg>
        </Link>
      </div>
    );
  }

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
      {projects.map((project) => (
        <div
          key={project.id}
          className="bg-white/80 backdrop-blur-sm rounded-2xl shadow-lg border border-white/20 p-6 hover:shadow-xl hover:-translate-y-1 transition-all duration-300 card-hover"
        >
          <div className="flex justify-between items-start mb-4">
            <h3 className="text-lg font-bold text-gray-900 flex-1 pr-2">{project.name}</h3>
            <span
              className={`px-3 py-1 text-xs font-semibold rounded-full ${
                project.status === "active"
                  ? "bg-gradient-to-r from-green-100 to-emerald-100 text-green-700 border border-green-200"
                  : project.status === "completed"
                  ? "bg-gradient-to-r from-blue-100 to-blue-200 text-blue-600 border border-blue-300"
                  : "bg-gradient-to-r from-gray-100 to-slate-100 text-gray-700 border border-gray-200"
              }`}
            >
              {project.status === "active" ? "进行中" : project.status === "completed" ? "已完成" : "已暂停"}
            </span>
          </div>
          
          {project.description && (
            <p className="text-sm text-gray-600 mb-4 line-clamp-2 min-h-[2.5rem]">
              {project.description}
            </p>
          )}
          
          <div className="flex items-center gap-2 text-xs text-gray-500 mb-5">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            {new Date(project.created_at).toLocaleDateString("zh-CN", {
              year: "numeric",
              month: "long",
              day: "numeric"
            })}
          </div>

          <div className="flex gap-2 pt-4 border-t border-gray-100">
            <Link
              href={`/projects/${project.id}`}
              className="flex-1 text-center text-sm font-medium text-blue-500 hover:text-blue-600 hover:bg-blue-50 py-2.5 rounded-lg transition-colors"
            >
              查看
            </Link>
            <Link
              href={`/projects/${project.id}/edit`}
              className="flex-1 text-center text-sm font-medium text-gray-600 hover:text-gray-700 hover:bg-gray-50 py-2.5 rounded-lg transition-colors"
            >
              编辑
            </Link>
            <button
              onClick={() => handleDelete(project.id)}
              className="flex-1 text-sm font-medium text-red-600 hover:text-red-700 hover:bg-red-50 py-2.5 rounded-lg transition-colors"
            >
              删除
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

