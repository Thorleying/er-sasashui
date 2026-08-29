/**
 * 联系作者与作者介绍。展示维护者背景与微信联系方式。
 */
import { CopyOutlined, WechatOutlined } from "@ant-design/icons";
import { Button, Card, Space, Tag, Typography } from "antd";
import { showSuccess } from "../app/feedback";
import { UserLayout } from "../app/UserLayout";

/** 作者微信 ID，页内展示与复制共用。 */
export const AUTHOR_WECHAT_ID = "coder_Thorleying";

const AUTHOR_SKILLS = ["全栈开发", "Java", "Python", "逆向工程", "Web 应用", "数据库设计"] as const;

/** 复制微信号到剪贴板。 */
async function copyWechatId() {
  try {
    await navigator.clipboard.writeText(AUTHOR_WECHAT_ID);
    showSuccess("微信号已复制");
  } catch {
    showSuccess(`请手动复制：${AUTHOR_WECHAT_ID}`);
  }
}

/** 联系作者页：作者介绍 + 微信联系方式。 */
export function ContactPage() {
  return (
    <UserLayout>
      <article className="contact-wrap">
        <Typography.Title level={2}>联系作者</Typography.Title>
        <Typography.Paragraph type="secondary" className="contact-lead">
          ER洒洒水由个人维护。使用中遇到问题、想提需求或合作，欢迎通过微信联系。
        </Typography.Paragraph>

        <Card className="contact-card" title="关于作者">
          <Typography.Paragraph>
            全栈开发 <strong>3 年</strong>
            经验，长期做 Web 产品与工具类项目。技术栈覆盖{" "}
            <strong>Java</strong>、<strong>Python</strong> 等后端方向，也熟悉前端工程化与部署；
            对<strong>逆向分析</strong>、协议与系统底层有一定实践，习惯从问题出发把链路打通。
          </Typography.Paragraph>
          <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
            做 ER洒洒水，是想让建表语句到 ER 图这件事更省事——尤其给课设、毕设写文档的同学省时间。
          </Typography.Paragraph>
          <div className="contact-skills" aria-label="技术方向">
            {AUTHOR_SKILLS.map((skill) => (
              <Tag key={skill}>{skill}</Tag>
            ))}
          </div>
        </Card>

        <Card className="contact-card" title="微信联系">
          <div className="contact-wechat">
            <WechatOutlined aria-hidden style={{ fontSize: 28, color: "var(--color-accent-green, #788c5d)" }} />
            <div>
              <Typography.Text type="secondary">微信号</Typography.Text>
              <Typography.Title level={4} style={{ margin: "4px 0 0" }}>
                {AUTHOR_WECHAT_ID}
              </Typography.Title>
            </div>
            <Space wrap>
              <Button type="primary" icon={<CopyOutlined />} onClick={() => void copyWechatId()}>
                复制微信号
              </Button>
            </Space>
          </div>
          <Typography.Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 0 }}>
            添加时请备注来意（例如「ER洒洒水反馈」），方便通过好友申请。
          </Typography.Paragraph>
        </Card>
      </article>
    </UserLayout>
  );
}
