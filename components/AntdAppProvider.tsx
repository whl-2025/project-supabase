"use client";

import { App } from 'antd';
import { ReactNode } from 'react';

export default function AntdAppProvider({ children }: { children: ReactNode }) {
  return <App>{children}</App>;
}
