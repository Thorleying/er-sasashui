/**
 * 全站页脚。欢迎页、法律页、管理端用；登录注册不挂，协议入口在表单里。
 */
import { Typography } from "antd";
import { Link } from "react-router-dom";
import "./user-layout.css";

/** 页脚只放法律入口和站点名，不放作者或外链。 */
export function SiteFooter() {
  return (
    <footer className="site-footer">
      <nav className="site-footer-links" aria-label="法律信息">
        <Link to="/terms">用户协议</Link>
        <Link to="/privacy">隐私政策</Link>
        <Link to="/contact">联系作者</Link>
      </nav>
      <Typography.Text type="secondary">ER洒洒水</Typography.Text>
    </footer>
  );
}
