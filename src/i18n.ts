/** 首页与工具界面文案。kicker / title / subtitle 是品牌区，改站名时三处一起动。 */
export const I18N = {
  zh: {
    kicker: "SQL / DBML → ER",
    title: "<em>ER</em>洒洒水",
    subtitle: "贴上建表语句，实体关系图马上出来。",
    hint: '<span class="header-hint-row">双击改字 · 滚轮缩放 · 拖拽排布</span><span class="header-hint-row header-hint-row--secondary">Ctrl+Z 撤销 · Ctrl+Y 重做</span>',
    pageTitle: "ER洒洒水",
    backHome: "返回首页",
    cardInputTitle: "SQL / DBML",
    cardPreviewTitle: "预览",
    showComment: "展示 COMMENT",
    editorPlaceholder: "在此处粘贴您的 CREATE TABLE 或 DBML 语句...",
    btnGenerate: "生成 ER 图",
    btnGenerateShort: "生成",
    btnExportLabel: "导出",
    btnShare: "分享链接",
    exportGenerating: "生成",
    exportSaved: "已保存",
    btnSmartLayout: "智能调整",
    btnQuickLayout: "快速布局",
    legendEntity: "实体",
    legendRelation: "关系",
    legendAttribute: "属性",
    legendPk: "主键",
    tipShowBg: "显示背景",
    tipHideBg: "隐藏背景",
    tipColorOn: "开启着色",
    tipColorOff: "关闭着色",
    tipShowAttrs: "显示属性",
    tipHideAttrs: "隐藏属性",
    tipForceOn: "开启持续力导向",
    tipForceOff: "关闭持续力导向",
    tipAutoAvoidOn: "开启自动避让",
    tipAutoAvoidOff: "关闭自动避让",
    tipFontSize: "调整图中文字大小",
    tipHistory: "查看生成历史",
    tipFullscreen: "全屏预览",
    tipExitFullscreen: "退出全屏",
    historyTitle: "生成历史",
    historyEmpty: "暂无历史记录",
    historyEmptyHint: "每次生成 ER 图后会自动保存快照",
    historyHint: "拖拽或滚轮浏览 · 点击恢复",
    historyRestore: "恢复",
    historyDelete: "删除",
    historyClose: "关闭",
    historyEntities: "个实体",
    historyColored: "彩色",
    historyMono: "黑白",
    historyAttrsHidden: "隐藏属性",
    historyComment: "显示注释",
    errEmpty: "输入为空。",
    errNoTable: "未找到有效的 CREATE TABLE 或 Table 定义。请确保您的 SQL 或 DBML 语法正确。",
    errParse: "SQL 解析失败",
    errParseHint: "。请检查 SQL 语法是否正确。",
    errExportNoGraph: "请先生成 ER 图",
    errExportSvg: "SVG 导出失败",
    errExportPng: "PNG 导出失败",
    errExportDrawio: "Drawio 导出失败",
    errExportZip: "ZIP 导出失败",
    errExportZipNeedsTables: "至少需要 2 张表才能导出 ZIP",
    errShareNoGraph: "请先生成 ER 图再分享",
    errShareFailed: "分享链接生成失败",
    shareModalTitle: "只读分享链接",
    shareModalHint: "任何人打开链接都可查看 ER 图，无法修改 SQL 或布局。链接 90 天后失效。",
    shareExpiresHint: "链接有效期 90 天，到期后需重新生成。",
    shareCopy: "复制链接",
    shareCopied: "已复制",
    shareReadonlyBanner: "只读分享 · 登录后可编辑并生成自己的 ER 图",
    shareLoginToEdit: "登录编辑",
    shareLoading: "加载分享…",
    shareNotFoundTitle: "分享不存在或已过期",
    shareNotFoundHint: "链接可能已失效，请联系分享者重新生成。",
    warnTitle: "解析警告",
    warnDismiss: "关闭解析警告",
    warnMore: "还有 {n} 条",
    timeJustNow: "刚刚",
    timeMinAgo: "{n} 分钟前",
    timeHrAgo: "{n} 小时前",
    restoredSession: "已恢复上次编辑的图",
    loadSample: "加载示例",
    ariaCancel: "取消",
    sample: `-- 示例 DBML，请在此处粘贴您的 DBML 或 SQL 语句
Table 用户 {
  编号 INT [pk, increment]
  用户名 VARCHAR(255) [not null]
  邮箱 VARCHAR(255) [unique]
  创建时间 TIMESTAMP
}

Table 国家 {
  编号 INT [pk]
  名称 VARCHAR(255) [not null]
}

Table 文章 {
  文章编号 INT [pk]
  内容 TEXT
}

Ref: 用户.属于 > 国家.编号
Ref: 文章.作者 > 用户.编号
`,
  },
  en: {
    kicker: "SQL / DBML → ER",
    title: "<em>ER</em>洒洒水",
    subtitle: "Paste the schema. The diagram just shows up.",
    hint: '<span class="header-hint-row">Double-click to edit · Scroll to zoom · Drag to arrange</span><span class="header-hint-row header-hint-row--secondary">Ctrl+Z undo · Ctrl+Y redo</span>',
    pageTitle: "ER洒洒水",
    backHome: "Back home",
    cardInputTitle: "SQL / DBML",
    cardPreviewTitle: "Preview",
    showComment: "Show comments",
    editorPlaceholder: "Paste your CREATE TABLE or DBML statement here...",
    btnGenerate: "Generate",
    btnGenerateShort: "Gen",
    btnExportLabel: "Export",
    btnShare: "Share link",
    exportGenerating: "Generating",
    exportSaved: "Saved",
    btnSmartLayout: "Smart adjustment",
    btnQuickLayout: "Quick layout",
    legendEntity: "Entity",
    legendRelation: "Relationship",
    legendAttribute: "Attribute",
    legendPk: "Primary key",
    tipShowBg: "Show background",
    tipHideBg: "Hide background",
    tipColorOn: "Enable color",
    tipColorOff: "Disable color",
    tipShowAttrs: "Show attributes",
    tipHideAttrs: "Hide attributes",
    tipForceOn: "Enable continuous force",
    tipForceOff: "Disable continuous force",
    tipAutoAvoidOn: "Enable auto avoidance",
    tipAutoAvoidOff: "Disable auto avoidance",
    tipFontSize: "Adjust diagram font size",
    tipHistory: "View generation history",
    tipFullscreen: "Fullscreen preview",
    tipExitFullscreen: "Exit fullscreen",
    historyTitle: "Generation history",
    historyEmpty: "No history yet",
    historyEmptyHint: "A snapshot is saved every time you generate the ER diagram",
    historyHint: "Drag or scroll to browse · Click a card to restore",
    historyRestore: "Restore",
    historyDelete: "Delete",
    historyClose: "Close",
    historyEntities: "entities",
    historyColored: "Colored",
    historyMono: "Mono",
    historyAttrsHidden: "Attrs hidden",
    historyComment: "Comments",
    errEmpty: "Input is empty.",
    errNoTable:
      "No valid CREATE TABLE or Table definition found. Make sure your SQL or DBML syntax is correct.",
    errParse: "SQL parsing failed",
    errParseHint: ". Please check your SQL syntax.",
    errExportNoGraph: "Generate the ER diagram first",
    errExportSvg: "SVG export failed",
    errExportPng: "PNG export failed",
    errExportDrawio: "Drawio export failed",
    errExportZip: "ZIP export failed",
    errExportZipNeedsTables: "At least 2 tables are required for ZIP export",
    errShareNoGraph: "Generate the ER diagram before sharing",
    errShareFailed: "Failed to create share link",
    shareModalTitle: "Read-only share link",
    shareModalHint: "Anyone with the link can view the diagram. SQL and layout cannot be edited. Links expire after 90 days.",
    shareExpiresHint: "This link expires in 90 days.",
    shareCopy: "Copy link",
    shareCopied: "Copied",
    shareReadonlyBanner: "Read-only share · Sign in to edit and create your own diagrams",
    shareLoginToEdit: "Sign in",
    shareLoading: "Loading share…",
    shareNotFoundTitle: "Share not found or expired",
    shareNotFoundHint: "The link may have expired. Ask the sender for a new one.",
    warnTitle: "Parser warnings",
    warnDismiss: "Dismiss parser warnings",
    warnMore: "{n} more",
    timeJustNow: "just now",
    timeMinAgo: "{n} min ago",
    timeHrAgo: "{n} hr ago",
    restoredSession: "Restored your last diagram",
    loadSample: "Load sample",
    ariaCancel: "Cancel",
    sample: `-- Sample DBML — paste your DBML or SQL statements here
Table User {
  ID INT [pk, increment]
  Username VARCHAR(255) [not null]
  Email VARCHAR(255) [unique]
  CreatedAt TIMESTAMP
}

Table Country {
  ID INT [pk]
  Name VARCHAR(255) [not null]
}

Table Article {
  ArticleID INT [pk]
  Content TEXT
}

Ref: User.BelongsTo > Country.ID
Ref: Article.Author > User.ID
`,
  },
} as const;

export type Language = keyof typeof I18N;

/** 中英文内置示例都属于一次性演示内容，不应进入用户的生成历史。 */
export function isInitialSampleInput(input: unknown): boolean {
  const trimmed = String(input == null ? "" : input).trim();
  return trimmed === I18N.zh.sample.trim() || trimmed === I18N.en.sample.trim();
}
