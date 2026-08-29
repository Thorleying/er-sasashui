/**
 * 用户协议。按当前产品能力撰写，不是律师意见。
 */
import { Typography } from "antd";
import { Link } from "react-router-dom";
import { UserLayout } from "../app/UserLayout";

/** 用户协议页。运营主体待补充，正文按当前产品能力写。 */
export function TermsPage() {
  return (
    <UserLayout>
      <article className="legal-wrap">
        <Typography.Title level={2}>用户协议</Typography.Title>
        <Typography.Paragraph type="secondary">
          更新日期 /
          生效日期：2026-08-29。适用于网站「ER洒洒水」。运营方法定名称与联系方式待补充，当前为开发/本地部署。本文不是法律意见。
        </Typography.Paragraph>

        <Typography.Title level={3}>1. 服务内容</Typography.Title>
        <Typography.Paragraph>
          本产品提供将 SQL / DBML 建表语句在浏览器中解析并生成 ER 图、以及导出图片或 Drawio
          的功能。生成器仅对已登录用户开放。首页演示图可以拖动，不等于已使用生成器。
        </Typography.Paragraph>

        <Typography.Title level={3}>2. 账号</Typography.Title>
        <Typography.Paragraph>
          注册时你需要提供邮箱和密码。系统会自动生成显示名（格式为「用户」加四位数字），注册页不收集自定义昵称。你对账号下的操作负责。不得将账号提供给他人用于违法用途。
        </Typography.Paragraph>

        <Typography.Title level={3}>3. 使用规则</Typography.Title>
        <Typography.Paragraph>
          你应保证提交的内容合法。禁止利用本服务攻击系统、批量滥用、或上传/粘贴他人未授权的数据。本服务默认不把建表语句上传到服务器；请不要在本机浏览器中粘贴你无权处理的敏感库结构。
        </Typography.Paragraph>

        <Typography.Title level={3}>4. 免责声明</Typography.Title>
        <Typography.Paragraph>
          生成结果仅供参考，不构成对数据库设计或作业的保证。服务按「现状」提供，开发部署期间可能中断、清空本地内存数据或调整功能。
        </Typography.Paragraph>

        <Typography.Title level={3}>5. 协议变更</Typography.Title>
        <Typography.Paragraph>
          协议更新后会在本页公布新的日期。继续使用即视为知悉更新。如不同意，请停止使用并退出登录。
        </Typography.Paragraph>

        <Typography.Paragraph>
          另见 <Link to="/privacy">《隐私政策》</Link>。
        </Typography.Paragraph>
      </article>
    </UserLayout>
  );
}
