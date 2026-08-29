/**
 * 主题写 localStorage。语言已固定中文，不再提供切换。
 */

export function currentTheme(): "light" | "dark" {
  const explicit = document.documentElement.getAttribute("data-theme");
  if (explicit === "light" || explicit === "dark") return explicit;
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export function setTheme(theme: "light" | "dark") {
  document.documentElement.setAttribute("data-theme", theme);
  localStorage.setItem("sql2er-theme", theme);
  window.dispatchEvent(new CustomEvent("sql2er-theme", { detail: { theme } }));
}
