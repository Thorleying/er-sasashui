import { I18N, type Language } from "./i18n";

/** 全站固定中文，不再读浏览器语言或 localStorage。 */
export function detectLang(): Language {
  return "zh";
}

/** 旧入口兼容：没有 `.lang-switch` 时什么也不做，只保证 html lang。 */
export function setupLanguageSwitch(_initialLang = detectLang()) {
  document.documentElement.setAttribute("lang", "zh-CN");
  document.title = I18N.zh.pageTitle;
  return "zh" as Language;
}
