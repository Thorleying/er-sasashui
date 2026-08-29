/**
 * 欢迎页：Hero 演示 + 三特性 + 三步漏斗。生成必须登录，首页画布只做演示。
 */
import {
  ArrowRightOutlined,
  CodeOutlined,
  DragOutlined,
  ExportOutlined,
  ReloadOutlined,
} from "@ant-design/icons";
import { Button, Card, Col, Row, Steps, Typography } from "antd";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserLayout } from "../app/UserLayout";
import { useAuth } from "../features/auth/AuthContext";
import { destroyHero, initHero, rebuildHero, resetHeroLayout } from "../landing/hero";

export function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();

  useEffect(() => {
    document.body.classList.add("is-landing");
    initHero();
    const id = window.setTimeout(() => rebuildHero(), 80);
    const onTheme = () => rebuildHero();
    window.addEventListener("sql2er-theme", onTheme);
    return () => {
      document.body.classList.remove("is-landing");
      window.clearTimeout(id);
      window.removeEventListener("sql2er-theme", onTheme);
      destroyHero();
    };
  }, []);

  /** 未登录带回来源去登录，已登录进生成器。 */
  const openGenerator = () => {
    if (user) {
      navigate("/app");
      return;
    }
    navigate("/login", { state: { from: "/app" } });
  };

  return (
    <UserLayout landing variant="landing">
      <header className="hero">
        <div className="hero-grid">
          <div className="hero-copy">
            <div className="hero-kicker-row">
              <Typography.Text type="secondary">SQL / DBML → ER</Typography.Text>
              <span className="hero-free">免费使用</span>
            </div>
            <h1 className="display hero-title">
              <span>把建表语句，</span>
              <span className="line-2">
                变成<em>ER 图</em>
              </span>
            </h1>
            <p className="hero-lead">
              登录后贴上 SQL 或 DBML，马上出实体关系图。解析在浏览器里完成，建表语句不会上传。
            </p>
            <div className="hero-cta">
              <Button
                className="hero-cta-btn"
                type="primary"
                size="large"
                icon={<ArrowRightOutlined />}
                onClick={openGenerator}
              >
                {user ? "打开生成器" : "登录后生成"}
              </Button>
            </div>
            <Typography.Paragraph type="secondary" className="hero-hint">
              右侧是演示，可以拖。
            </Typography.Paragraph>
          </div>

          <div className="er-stage" id="erStage">
            <span className="er-chip">试试拖动</span>
            <Button
              className="er-reset"
              id="erReset"
              type="text"
              aria-label="重置布局"
              icon={<ReloadOutlined />}
              onClick={() => resetHeroLayout()}
            />
            <div id="hero-er" aria-label="可拖动的 Chen 模型 ER 图：用户、国家、文章" />
            <div className="er-fallback" role="status" aria-live="polite">
              <p className="er-fallback-loading">正在绘制 ER 图…</p>
              <p className="er-fallback-failed">图没出来，刷新试试。</p>
            </div>
          </div>
        </div>
      </header>

      <div className="landing-sections">
        <section id="features">
          <div className="landing-section-head">
            <Typography.Text type="secondary">怎么用</Typography.Text>
            <Typography.Title level={2}>贴上，生成，带走</Typography.Title>
            <Typography.Paragraph type="secondary" className="landing-section-lead">
              三件事：读得懂的表结构、能拖的图、能带走的文件。
            </Typography.Paragraph>
          </div>
          <Row gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <Card className="landing-feature-card" bordered>
                <div className="landing-feature-icon" aria-hidden="true">
                  <CodeOutlined />
                </div>
                <Typography.Title level={4}>贴 SQL / DBML</Typography.Title>
                <Typography.Paragraph type="secondary">
                  DBML 是 Database Markup Language，用几行文本描述表、字段和外键，比一长串 CREATE
                  TABLE 好读。两种都能贴。
                </Typography.Paragraph>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card className="landing-feature-card" bordered>
                <div className="landing-feature-icon" aria-hidden="true">
                  <DragOutlined />
                </div>
                <Typography.Title level={4}>拖两下排好</Typography.Title>
                <Typography.Paragraph type="secondary">
                  节点能拖、能改字，不满意再点智能调整。
                </Typography.Paragraph>
              </Card>
            </Col>
            <Col xs={24} md={8}>
              <Card className="landing-feature-card" bordered>
                <div className="landing-feature-icon" aria-hidden="true">
                  <ExportOutlined />
                </div>
                <Typography.Title level={4}>导出就走</Typography.Title>
                <Typography.Paragraph type="secondary">
                  PNG、SVG、Drawio 都能出，作业和文档都够用。
                </Typography.Paragraph>
              </Card>
            </Col>
          </Row>
        </section>

        <section id="how">
          <div className="landing-section-head">
            <Typography.Text type="secondary">流程</Typography.Text>
            <Typography.Title level={2}>三步出图</Typography.Title>
          </div>
          <Steps
            responsive
            items={[
              { title: "登录或注册", description: "没有账号先注册。" },
              { title: "贴上代码", description: "SQL 或 DBML 都行。" },
              { title: "生成并带走", description: "出图、拖一拖、导出。" },
            ]}
          />
        </section>

        <Card className="landing-cta-band">
          <div className="landing-cta">
            <div>
              <Typography.Title level={3} style={{ marginTop: 0 }}>
                免费出图
              </Typography.Title>
              <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                登录后就能开始。
              </Typography.Paragraph>
            </div>
            <Button type="primary" size="large" onClick={openGenerator}>
              {user ? "打开生成器" : "去登录"}
            </Button>
          </div>
        </Card>
      </div>
    </UserLayout>
  );
}
