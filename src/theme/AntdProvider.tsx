/**
 * 全站 antd 主题。颜色跟现有暖纸 token，字体只用系统黑体，不加载 webfont。
 */
import { App as AntdApp, ConfigProvider, theme } from "antd";
import zhCN from "antd/locale/zh_CN";
import dayjs from "dayjs";
import "dayjs/locale/zh-cn";
import { useEffect, useMemo, useState, type ReactNode } from "react";
import { currentTheme } from "../app/chrome";

dayjs.locale("zh-cn");

const SYSTEM_SANS =
  '"PingFang SC", "Hiragino Sans GB", "Microsoft YaHei UI", "Microsoft YaHei", sans-serif';

export function AntdProvider({ children }: { children: ReactNode }) {
  const [mode, setMode] = useState(currentTheme);

  useEffect(() => {
    const syncTheme = () => setMode(currentTheme());
    window.addEventListener("sql2er-theme", syncTheme);
    return () => {
      window.removeEventListener("sql2er-theme", syncTheme);
    };
  }, []);

  const antdTheme = useMemo(
    () => ({
      algorithm: mode === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm,
      token: {
        colorPrimary: "#d97757",
        colorInfo: "#6a9bcc",
        colorSuccess: "#6b8f47",
        colorWarning: "#c9943a",
        colorError: "#c0453a",
        colorBgLayout: mode === "dark" ? "#1a1916" : "#ece9e0",
        colorBgContainer: mode === "dark" ? "#2a2822" : "#fdfcf8",
        colorText: mode === "dark" ? "#eae7dc" : "#141413",
        borderRadius: 12,
        fontFamily: SYSTEM_SANS,
        fontSize: 16,
      },
    }),
    [mode],
  );

  return (
    <ConfigProvider locale={zhCN} theme={antdTheme} button={{ autoInsertSpace: false }}>
      <AntdApp>{children}</AntdApp>
    </ConfigProvider>
  );
}
