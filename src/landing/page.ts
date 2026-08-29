/**
 * 欢迎页交互：主题、中英切换、滚动显现、懒加载 hero ER 图。
 * 样式已在 index.html head 挂上；这里不再 import CSS。
 * 从本文件解析 `../assets/base.css` 会指到不存在的 src/assets/，
 * 整页脚本挂掉后右侧 Hero 只剩空盒。
 */

type LandingLang = "zh" | "en";

const LANDING_COPY: Record<LandingLang, Record<string, string>> = {
  zh: {
    skip: "跳到正文",
    navFeatures: "特性",
    navHow: "用法",
    badge: "贴上就出图",
    hero1: "把建表语句，",
    hero2: "变成<em>ER 图</em>",
    lead: "贴上 SQL 或 DBML，实体关系图马上出来。解析都在浏览器里完成。",
    cta: "打开生成器",
    live: "试试拖动",
    fallback: "正在绘制 ER 图…",
    fallbackFailed: "图没出来，刷新试试。",
    featEyebrow: "就这三步",
    featTitle: "贴上，生成，<em>带走</em>",
    feat1Title: "贴 SQL / DBML",
    feat1Body: "建表语句丢进去就行，外键会自动认成关系。",
    feat2Title: "拖两下排好",
    feat2Body: "节点能拖、能改字，不满意再点智能调整。",
    feat3Title: "导出就走",
    feat3Body: "PNG、SVG、Drawio 都能出，作业和文档都够用。",
    howEyebrow: "用法",
    howTitle: "打开就能<em>用</em>",
    how1Title: "打开生成器",
    how1Body: "点首页按钮，直接进编辑器。",
    how2Title: "贴上代码",
    how2Body: "SQL 或 DBML 都行。",
    how3Title: "生成并带走",
    how3Body: "出图、拖一拖、导出。",
    ctaEyebrow: "现在就出图",
    ctaTitle: "准备好把 SQL <em>变成图</em>了吗？",
    ctaBody: "不用登录，数据也不上传。",
  },
  en: {
    skip: "Skip to content",
    navFeatures: "Features",
    navHow: "How",
    badge: "Paste and go",
    hero1: "Turn table DDL into",
    hero2: "an <em>ER diagram</em>",
    lead: "Paste SQL or DBML. The diagram shows up in your browser.",
    cta: "Open the editor",
    live: "Try dragging",
    fallback: "Drawing the ER diagram…",
    fallbackFailed: "The diagram did not load. Refresh and try again.",
    featEyebrow: "Three steps",
    featTitle: "Paste, generate, <em>done</em>",
    feat1Title: "Paste SQL / DBML",
    feat1Body: "Drop in CREATE TABLE statements. Foreign keys become relations.",
    feat2Title: "Nudge the layout",
    feat2Body: "Drag nodes, edit labels, or hit smart layout.",
    feat3Title: "Export and leave",
    feat3Body: "PNG, SVG, and Drawio are enough for homework and docs.",
    howEyebrow: "How",
    howTitle: "Open it and <em>go</em>",
    how1Title: "Open the editor",
    how1Body: "Hit the button on this page.",
    how2Title: "Paste the schema",
    how2Body: "SQL or DBML both work.",
    how3Title: "Generate and export",
    how3Body: "Make the diagram, drag a bit, export.",
    ctaEyebrow: "Ready",
    ctaTitle: "Turn SQL into a <em>diagram</em>",
    ctaBody: "No login. Nothing uploaded.",
  },
};

function detectLang(): LandingLang {
  const saved = localStorage.getItem("sql2er-lang");
  if (saved === "zh" || saved === "en") return saved;
  const list =
    navigator.languages && navigator.languages.length
      ? navigator.languages
      : [navigator.language || "en"];
  return list.some((item) => (item || "").toLowerCase().startsWith("zh")) ? "zh" : "en";
}

function applyLang(lang: LandingLang) {
  const dict = LANDING_COPY[lang];
  document.documentElement.setAttribute("lang", lang === "zh" ? "zh-CN" : "en");
  document.querySelectorAll<HTMLElement>("[data-i18n]").forEach((el) => {
    const key = el.getAttribute("data-i18n");
    if (key && dict[key] !== undefined) el.textContent = dict[key];
  });
  document.querySelectorAll<HTMLElement>("[data-i18n-html]").forEach((el) => {
    const key = el.getAttribute("data-i18n-html");
    if (key && dict[key] !== undefined) el.innerHTML = dict[key];
  });
  const langLabel = document.getElementById("langLabel");
  if (langLabel) langLabel.textContent = lang === "zh" ? "EN" : "中";
}

function applyTheme(theme: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("sql2er-theme", theme);
}

function currentTheme(): "light" | "dark" {
  const explicit = document.documentElement.getAttribute("data-theme");
  if (explicit === "light" || explicit === "dark") return explicit;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

function setupScrollReveal() {
  const nodes = document.querySelectorAll(".scroll-reveal");
  if (!("IntersectionObserver" in window)) {
    nodes.forEach((el) => el.classList.add("is-visible"));
    return;
  }
  const io = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (!entry.isIntersecting) return;
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      });
    },
    { threshold: 0.1 },
  );
  nodes.forEach((el) => io.observe(el));
}

/**
 * 右侧 Hero 失败时写出可读文案。
 * 只改状态 class，不碰解析。
 */
function markStageFailed(stage: HTMLElement | null): void {
  if (!stage) return;
  stage.classList.remove("is-loading", "is-building");
  stage.classList.add("is-failed");
}

function setupHero() {
  const erStage = document.getElementById("erStage");
  let heroModulePromise: Promise<typeof import("./hero") | null> | null = null;

  const loadHero = () => {
    if (!heroModulePromise) {
      erStage?.classList.add("is-loading");
      erStage?.classList.remove("is-failed");
      heroModulePromise = import("./hero")
        .then((mod) => {
          try {
            mod.initHero();
          } catch (err) {
            markStageFailed(erStage);
            console.error("Hero ER init failed:", err);
          }
          return mod;
        })
        .catch((err) => {
          markStageFailed(erStage);
          console.error("Hero ER module failed to load:", err);
          return null;
        });
    }
    return heroModulePromise;
  };

  const rebuildHeroSoon = () => {
    if (!heroModulePromise) return;
    void heroModulePromise.then((mod) => {
      if (mod) window.setTimeout(() => mod.rebuildHero(), 60);
    });
  };

  // Hero 就在首屏，必须马上加载。再等 IntersectionObserver 只会让右侧一直空着。
  if (erStage) {
    void loadHero();
  }

  document.getElementById("erReset")?.addEventListener("click", () => {
    void loadHero().then((mod) => {
      if (mod) mod.resetHeroLayout();
    });
  });

  return { rebuildHeroSoon };
}

function setupLandingPage() {
  let lang = detectLang();
  applyLang(lang);
  applyTheme(currentTheme());

  const { rebuildHeroSoon } = setupHero();
  setupScrollReveal();

  document.getElementById("langBtn")?.addEventListener("click", () => {
    lang = lang === "zh" ? "en" : "zh";
    localStorage.setItem("sql2er-lang", lang);
    applyLang(lang);
    rebuildHeroSoon();
  });

  document.getElementById("themeBtn")?.addEventListener("click", () => {
    applyTheme(currentTheme() === "dark" ? "light" : "dark");
    rebuildHeroSoon();
  });
}

setupLandingPage();
