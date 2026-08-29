/**
 * 注册页。不收集显示名；需勾选用户协议与隐私政策。不套卡片。
 */
import { Button, Checkbox, Form, Input } from "antd";
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AuthLayout } from "../app/AuthLayout";
import { showError } from "../app/feedback";
import { useAuth } from "../features/auth/AuthContext";

type RegisterValues = { email: string; password: string; agreed: boolean };

/** 注册表单。海报与登录页共用。 */
export function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form] = Form.useForm<RegisterValues>();
  const [pending, setPending] = useState(false);

  async function onFinish(values: RegisterValues) {
    setPending(true);
    const result = await register({
      email: values.email.trim(),
      password: values.password,
    });
    setPending(false);
    if (!result.ok) {
      showError(result.message);
      return;
    }
    navigate("/app", { replace: true });
  }

  return (
    <AuthLayout asideTitle="开一个账号" asideLead="邮箱就能开始。">
      <div className="account-wrap">
        <h2 className="auth-form-title">注册</h2>
        <p className="auth-form-lead">免费使用，马上就能出图。</p>
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
            extra="至少 8 位。"
            rules={[
              { required: true, message: "请填写密码" },
              { min: 8, message: "密码至少 8 位" },
            ]}
          >
            <Input.Password size="large" autoComplete="new-password" />
          </Form.Item>
          <Form.Item
            name="agreed"
            valuePropName="checked"
            rules={[
              {
                validator: async (_, value) => {
                  if (!value) throw new Error("请先阅读并同意《用户协议》和《隐私政策》");
                },
              },
            ]}
          >
            <Checkbox>
              我已阅读并同意 <Link to="/terms">《用户协议》</Link> 和{" "}
              <Link to="/privacy">《隐私政策》</Link>
            </Checkbox>
          </Form.Item>
          <Button type="primary" htmlType="submit" block size="large" loading={pending}>
            开始使用
          </Button>
        </Form>
        <p className="account-switch">
          已有账号？<Link to="/login">去登录</Link>
        </p>
      </div>
    </AuthLayout>
  );
}
