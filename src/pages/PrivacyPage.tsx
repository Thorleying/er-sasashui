/**
 * 隐私政策。只写代码里已确认的数据处理，缺的项标明待补充。
 */
import { Typography } from "antd";
import { Link } from "react-router-dom";
import { UserLayout } from "../app/UserLayout";

/** 隐私政策页。只陈述已实现的数据处理，不编造未上线能力。 */
export function PrivacyPage() {
  return (
    <UserLayout>
      <article className="legal-wrap">
        <Typography.Title level={2}>隐私政策</Typography.Title>
        <Typography.Paragraph type="secondary">
          更新日期 /
          生效日期：2026-08-29。产品：ER洒洒水。运营方法定名称、注册地址、对外联系邮箱待补充。本文根据当前代码中的数据处理整理，不是合规结论或律师意见。
        </Typography.Paragraph>
        <Typography.Paragraph>
          <strong>敏感信息说明：</strong>
          密码以哈希存储，会话凭证放在 HttpOnly Cookie。建表语句默认在你的浏览器本地解析，接口不接收
          SQL 原文。管理员可以查看注册邮箱、自动生成的显示名和操作类型。
        </Typography.Paragraph>

        <Typography.Title level={3}>1. 我们处理哪些信息</Typography.Title>
        <Typography.Paragraph>
          注册 /
          登录（必要）：邮箱、密码（仅存哈希）、系统生成的显示名（「用户」加四位数字）、角色、注册时间、最近登录时间。
        </Typography.Paragraph>
        <Typography.Paragraph>
          使用生成器（登录后）：操作记录包括动作类型（注册、登录、退出、生成
          ER、导出）以及导出格式等短标签；记录可能带请求 IP。不收集建表语句正文。
        </Typography.Paragraph>
        <Typography.Paragraph>
          浏览器本地：主题偏好写入 localStorage；登录会话 Cookie 名为
          er_session，HttpOnly，供保持登录。
        </Typography.Paragraph>
        <Typography.Paragraph>
          当前代码未接入支付、短信、邮件营销、广告、统计分析 SDK、第三方登录。
        </Typography.Paragraph>

        <Typography.Title level={3}>2. 处理目的</Typography.Title>
        <Typography.Paragraph>
          创建和维持账号、校验登录、提供生成器、记录管理端所需的使用情况、保障服务安全。拒绝提供邮箱和密码则无法注册，也无法使用生成器。
        </Typography.Paragraph>

        <Typography.Title level={3}>3. 存储与期限</Typography.Title>
        <Typography.Paragraph>
          账号与操作记录存在本机配置的数据库或开发用内存库。内存库在进程重启后会丢失。保留期限与对外托管位置待运营方确认；开发阶段未设定自动删除周期。
        </Typography.Paragraph>

        <Typography.Title level={3}>4. 共享与委托</Typography.Title>
        <Typography.Paragraph>
          当前实现没有把个人资料交给广告或分析服务。若日后部署到云主机或
          CDN，将补充受托方名单。管理员账号可在管理端查看用户列表和操作记录。
        </Typography.Paragraph>

        <Typography.Title level={3}>5. 你的权利</Typography.Title>
        <Typography.Paragraph>
          登录后可使用生成器。目前没有自助更正资料、导出或注销入口。需要更正邮箱或删除账号时，须由运营方人工处理（联系方式待补充）。
        </Typography.Paragraph>

        <Typography.Title level={3}>6. 未成年人</Typography.Title>
        <Typography.Paragraph>
          本服务面向能够独立完成注册的用户。我们不会主动收集不满十四周岁未成年人的个人信息。若发现此类账号，将配合删除。
        </Typography.Paragraph>

        <Typography.Title level={3}>7. 政策变更</Typography.Title>
        <Typography.Paragraph>
          处理方式发生变化时，我们会更新本页日期。继续使用即视为知悉更新。
        </Typography.Paragraph>

        <Typography.Paragraph>
          另见 <Link to="/terms">《用户协议》</Link>。
        </Typography.Paragraph>
      </article>
    </UserLayout>
  );
}
