/**
 * 全站路由。欢迎 / 生成器 / 登录注册 / 协议政策 / 管理端。书签 /app.html 会跳到 /app。
 */
import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";
import { AuthProvider } from "../features/auth/AuthContext";
import { AdminOpsPage } from "../pages/admin/AdminOpsPage";
import { AdminOverviewPage } from "../pages/admin/AdminOverviewPage";
import { AdminUsersPage } from "../pages/admin/AdminUsersPage";
import { AdminVisitsPage } from "../pages/admin/AdminVisitsPage";
import { ContactPage } from "../pages/ContactPage";
import { EditorPage } from "../pages/EditorPage";
import { LandingPage } from "../pages/LandingPage";
import { LoginPage } from "../pages/LoginPage";
import { PrivacyPage } from "../pages/PrivacyPage";
import { SharePage } from "../pages/SharePage";
import { RegisterPage } from "../pages/RegisterPage";
import { TermsPage } from "../pages/TermsPage";
import { AdminLayout } from "./AdminLayout";
import { RequireAdmin } from "./RequireAdmin";
import { RequireAuth } from "./RequireAuth";
import { SeoHead } from "./SeoHead";
import { PageTracker } from "./PageTracker";
import { ScrollToTop } from "./ScrollToTop";

export function AppRouter() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <SeoHead />
        <ScrollToTop />
        <PageTracker />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route
            path="/app"
            element={
              <RequireAuth>
                <EditorPage />
              </RequireAuth>
            }
          />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/terms" element={<TermsPage />} />
          <Route path="/privacy" element={<PrivacyPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/s/:token" element={<SharePage />} />
          <Route
            path="/admin"
            element={
              <RequireAdmin>
                <AdminLayout />
              </RequireAdmin>
            }
          >
            <Route index element={<AdminOverviewPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="visits" element={<AdminVisitsPage />} />
            <Route path="ops" element={<AdminOpsPage />} />
          </Route>
          <Route path="/app.html" element={<Navigate to="/app" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
