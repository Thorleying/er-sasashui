/**
 * 登录页。表单直接落在纸面上，不套卡片。
 */
import { Button, Form, Input } from "antd";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { AuthLayout } from "../app/AuthLayout";
import { showError } from "../app/feedback";
import { useAuth } from "../features/auth/AuthContext";
import { useState } from "react";

type LoginValues = { email: string; password: string };

/** 登录表单。侧栏海报由 AuthLayout 负责。 */
export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string } | null)?.from ?? "/app";
  const [form] = Form.useForm<LoginValues>();
  const [pending, setPending] = useState(false);

  async function onFinish(values: LoginValues) {
    setPending(true);
    const result = await login(values.email.trim(), values.password);
    setPending(false);
    if (!result.ok) {
      showError(result.message);
      form.getFieldInstance("email")?.focus?.();
      return;
    }
    navigate(from === "/login" ? "/app" : from, { replace: true });
  }

  return (
    <AuthLayout asideTitle="欢迎回来" asideLead="把建表语句变成 ER 图。">
      <div className="account-wrap">
        <h2 className="auth-form-title">登录</h2>
        <p className="auth-form-lead">用邮箱继续。</p>
        <Form form={form} layout="vertical" onFinish={(values) => void onFinish(values)}>
          <Form.Item
            label="邮箱"
            name="email"
            rules={[
              { required: true, message: "请填写邮箱" },
              { type: "email", message: "邮箱格式不正确" },
            ]}
          >
            <Input size="large" autoComplete="email" />
          </Form.Item>
          <Form.Item
            label="密码"
            name="password"
            rules={[{ required: true, message: "请填写密码" }]}
          >
            <Input.Password size="large" autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large" loading={pending}>
            进入
          </Button>
        </Form>
        <p className="account-legal">
          登录即表示同意 <Link to="/terms">《用户协议》</Link> 和{" "}
          <Link to="/privacy">《隐私政策》</Link>
        </p>
        <p className="account-switch">
          还没有账号？<Link to="/register">去注册</Link>
        </p>
      </div>
    </AuthLayout>
  );
}
