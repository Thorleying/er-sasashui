/**
 * 生成器页：antd 全屏工作台。生成和导出前再向后端确认登录，防止绕过路由守卫。
 */
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import App from "../App";
import { UserLayout } from "../app/UserLayout";
import { useAuth } from "../features/auth/AuthContext";
import { reportOp } from "../features/auth/api";

/** 生成器页。路由守卫之后，操作前还要再问一次后端。 */
export function EditorPage() {
  const { user, requireSession } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    document.body.classList.add("is-app");
    return () => document.body.classList.remove("is-app");
  }, []);

  /** 会话失效就清掉前端态并回登录，不继续出图。 */
  async function beforeOperate() {
    const ok = await requireSession();
    if (!ok) {
      navigate("/login", { replace: true, state: { from: "/app" } });
    }
    return ok;
  }

  return (
    <UserLayout variant="editor">
      <App
        beforeOperate={beforeOperate}
        onGenerated={() => {
          if (user) void reportOp("generate_er");
        }}
        onExported={(format) => {
          if (user) void reportOp("export", format.toLowerCase());
        }}
      />
    </UserLayout>
  );
}
