/**
 * 欢迎页：对照 dbdiagram / ChartDB / QuickDBD 的常见首页结构，
 * 补场景、方言、导出和 FAQ；生成必须登录，画布只做演示。
 */
import {
  ArrowRightOutlined,
  CodeOutlined,
  CommentOutlined,
  DragOutlined,
  ExportOutlined,
  FileImageOutlined,
  GlobalOutlined,
  LockOutlined,
  ReloadOutlined,
  SolutionOutlined,
} from "@ant-design/icons";
import { Button, Card, Col, Collapse, Row, Typography } from "antd";
import { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { UserLayout } from "../app/UserLayout";
import { useLandingReveal } from "../app/useLandingReveal";
import { useAuth } from "../features/auth/AuthContext";
import { destroyHero, initHero, rebuildHero, resetHeroLayout } from "../landing/hero";
import "../app/landing-home.css";

const DIALECTS = ["MySQL", "PostgreSQL", "SQL Server", "DBML"];

const FEATURES = [
  {
    icon: <CodeOutlined />,
    title: "贴 SQL 或 DBML",
    body: "CREATE TABLE、外键、常见方言都能读。也认 DBML，几行文本就能描述表和关系。",
  },
  {
    icon: <LockOutlined />,
    title: "解析在浏览器里",
    body: "建表语句不上传。对照 ChartDB / dbdiagram 的云端导入，这里默认本地算完。",
  },
  {
    icon: <CommentOutlined />,
    title: "展示 COMMENT",
    body: "表、字段、外键上的 COMMENT 能画到图上。课设要中文名时，打开开关即可，不必手改每个椭圆。",
  },
  {
    icon: <DragOutlined />,
    title: "Chen 记法，能拖",
    body: "实体、关系、属性按课设常用画法出图。节点能拖、能改字，再一键智能调整。",
  },
  {
    icon: <ExportOutlined />,
    title: "PNG / SVG / Drawio",
    body: "作业、论文、文档直接带走。Drawio 还能继续改，不必锁死在本站。",
  },
  {
    icon: <GlobalOutlined />,
    title: "方言不用先选对",
    body: "MySQL、PostgreSQL、SQL Server 的常见写法都能贴，不用先装桌面建模软件。",
  },
  {
    icon: <SolutionOutlined />,
    title: "给课设和毕设",
    body: "不是仓库同步或 AI 改表工具。目标很窄：把语句变成能交的 ER 图。",
  },
];

const USE_CASES = [
  { title: "计算机毕设", body: "有建表语句，缺一张能放进论文的 Chen 图。" },
  { title: "数据库课设", body: "老师要实体、联系、属性，不要 crow's foot 工程图。" },
  { title: "文档配图", body: "README 或设计说明里需要一眼能看懂的关系。" },
  { title: "口头讲表", body: "讨论外键时拖两下，比对着一屏 SQL 指。" },
];

const EXPORTS = [
  { icon: <FileImageOutlined />, title: "PNG", body: "直接插进 Word / PPT。" },
  { icon: <ExportOutlined />, title: "SVG", body: "放大不糊，适合打印。" },
  { icon: <CodeOutlined />, title: "Drawio", body: "拿到桌面再改一版。" },
];

const FAQS = [
  {
    key: "upload",
    label: "SQL 会上传到服务器吗？",
    children:
      "生成在浏览器里完成，建表语句不会作为解析内容上传。登录只用来记账号和操作，不拿你的表结构去出图。",
  },
  {
    key: "login",
    label: "为什么生成器要登录？",
    children:
      "首页右侧是演示，谁都能拖。要贴自己的 SQL 出图，需要登录，方便保存操作记录，也避免匿名刷接口。",
  },
  {
    key: "comment",
    label: "COMMENT 会出现在图上吗？",
    children:
      "会。打开生成器里的「展示 COMMENT」，表、字段、外键上的注释会画成图上的中文名。本仓库 database/schema.sql 也按这个习惯写了字段注释。",
  },
  {
    key: "dialect",
    label: "支持哪些语句？",
    children:
      "以 CREATE TABLE 和外键为主，覆盖 MySQL、PostgreSQL、SQL Server 的常见写法，也支持 DBML。不是全量 SQL 执行器。",
  },
  {
    key: "vs",
    label: "和 dbdiagram、ChartDB 有什么不同？",
    children:
      "那些产品偏工程库表、协作和仓库同步。ER洒洒水只做 Chen 记法出图，给课设、毕设和文档配图，解析默认留在本机。",
  },
];

export function LandingPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  useLandingReveal([]);

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
              登录后贴上 SQL 或 DBML，马上出 Chen
              记法实体关系图。解析在浏览器里完成，适合毕设、课设和论文配图。
            </p>
            <div className="hero-dialects" aria-label="支持的方言">
              {DIALECTS.map((name) => (
                <span key={name}>{name}</span>
              ))}
            </div>
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
              右侧是演示，可以拖。自己的语句请进生成器。
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
        <section id="features" className="landing-reveal">
          <div className="landing-section-head">
            <Typography.Text type="secondary">能力</Typography.Text>
            <Typography.Title level={2}>贴上，生成，带走</Typography.Title>
            <Typography.Paragraph type="secondary" className="landing-section-lead">
              对照常见的文本出图式工具：这里认 SQL / DBML，出的是课设用的 Chen
              图，并且默认不把语句送到云端解析。
            </Typography.Paragraph>
          </div>
          <Row className="landing-stagger" gutter={[16, 16]}>
            {FEATURES.map((item) => (
              <Col xs={24} md={12} lg={8} key={item.title}>
                <Card className="landing-feature-card" bordered hoverable>
                  <div className="landing-feature-icon" aria-hidden="true">
                    {item.icon}
                  </div>
                  <Typography.Title level={4}>{item.title}</Typography.Title>
                  <Typography.Paragraph type="secondary">{item.body}</Typography.Paragraph>
                </Card>
              </Col>
            ))}
          </Row>
        </section>

        <section className="landing-reveal">
          <div className="landing-section-head">
            <Typography.Text type="secondary">场景</Typography.Text>
            <Typography.Title level={2}>谁会用到</Typography.Title>
          </div>
          <Row className="landing-stagger" gutter={[16, 16]}>
            {USE_CASES.map((item) => (
              <Col xs={24} sm={12} key={item.title}>
                <article className="landing-usecase">
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              </Col>
            ))}
          </Row>
        </section>

        <section className="landing-reveal">
          <div className="landing-section-head">
            <Typography.Text type="secondary">对比</Typography.Text>
            <Typography.Title level={2}>少开三个软件</Typography.Title>
          </div>
          <Row className="landing-stagger" gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <article className="landing-compare">
                <span className="landing-compare-kicker">相对手绘</span>
                <h3>不用对着格子纸描菱形</h3>
                <p>有语句就出实体和联系，改表后重新贴一次，不必整张重画。</p>
              </article>
            </Col>
            <Col xs={24} md={8}>
              <article className="landing-compare">
                <span className="landing-compare-kicker">相对桌面工具</span>
                <h3>不用装 Workbench</h3>
                <p>浏览器打开就能用。课设要的是 Chen 图，不是工程逆向那套 crow's foot。</p>
              </article>
            </Col>
            <Col xs={24} md={8}>
              <article className="landing-compare">
                <span className="landing-compare-kicker">相对云端建模</span>
                <h3>语句默认不出门</h3>
                <p>不连你的线上库，也不用先写一段 introspection SQL。</p>
              </article>
            </Col>
          </Row>
        </section>

        <section id="how" className="landing-reveal">
          <div className="landing-section-head">
            <Typography.Text type="secondary">流程</Typography.Text>
            <Typography.Title level={2}>三步出图</Typography.Title>
          </div>
          <Row className="landing-stagger" gutter={[16, 16]}>
            <Col xs={24} md={8}>
              <article className="landing-step">
                <span className="landing-step-index">01</span>
                <h3>登录或注册</h3>
                <p>没有账号先注册。首页演示谁都能看，自己的语句进生成器。</p>
              </article>
            </Col>
            <Col xs={24} md={8}>
              <article className="landing-step">
                <span className="landing-step-index">02</span>
                <h3>贴上代码</h3>
                <p>SQL 或 DBML 都行。常见建表和外键写法可以直接贴。</p>
              </article>
            </Col>
            <Col xs={24} md={8}>
              <article className="landing-step">
                <span className="landing-step-index">03</span>
                <h3>生成并带走</h3>
                <p>出图、拖一拖、导出 PNG / SVG / Drawio。</p>
              </article>
            </Col>
          </Row>
        </section>

        <section className="landing-reveal">
          <div className="landing-section-head">
            <Typography.Text type="secondary">导出</Typography.Text>
            <Typography.Title level={2}>交作业够用的三种</Typography.Title>
          </div>
          <Row className="landing-stagger" gutter={[16, 16]}>
            {EXPORTS.map((item) => (
              <Col xs={24} md={8} key={item.title}>
                <article className="landing-export-card">
                  <div className="landing-feature-icon" aria-hidden="true">
                    {item.icon}
                  </div>
                  <h3>{item.title}</h3>
                  <p>{item.body}</p>
                </article>
              </Col>
            ))}
          </Row>
        </section>

        <section className="landing-reveal landing-faq">
          <div className="landing-section-head">
            <Typography.Text type="secondary">问答</Typography.Text>
            <Typography.Title level={2}>常见问题</Typography.Title>
          </div>
          <Collapse accordion items={FAQS} bordered={false} />
        </section>

        <Card className="landing-cta-band landing-reveal">
          <div className="landing-cta">
            <div>
              <Typography.Title level={3} style={{ marginTop: 0 }}>
                免费出图
              </Typography.Title>
              <Typography.Paragraph type="secondary" style={{ marginBottom: 0 }}>
                登录后贴语句即可。演示在上面，随时能拖。
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
