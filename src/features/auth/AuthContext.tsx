/**
 * 登录态：启动拉 /me，登录注册后写入用户，退出清 Cookie。
 */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { loginRequest, logoutRequest, meRequest, registerRequest } from "./api";
import type { PublicUser } from "./types";

type AuthContextValue = {
  user: PublicUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<{ ok: boolean; message: string }>;
  register: (input: {
    email: string;
    password: string;
  }) => Promise<{ ok: boolean; message: string }>;
  logout: () => Promise<void>;
  /** 生成/导出前再问后端，过期或伪造的前端态不能绕过。 */
  requireSession: () => Promise<boolean>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<PublicUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    meRequest().then((result) => {
      if (cancelled) return;
      setUser(result.code === 0 ? result.data : null);
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const login = useCallback(async (email: string, password: string) => {
    const result = await loginRequest(email, password);
    if (result.code === 0) {
      setUser(result.data);
      return { ok: true, message: "ok" };
    }
    return { ok: false, message: result.message };
  }, []);

  const register = useCallback(async (input: { email: string; password: string }) => {
    const result = await registerRequest(input);
    if (result.code === 0) {
      setUser(result.data);
      return { ok: true, message: "ok" };
    }
    return { ok: false, message: result.message };
  }, []);

  const logout = useCallback(async () => {
    await logoutRequest();
    setUser(null);
  }, []);

  /** 以 /me 为准。Cookie 失效时清掉 user，调用方应停手并去登录。 */
  const requireSession = useCallback(async () => {
    const result = await meRequest();
    if (result.code === 0) {
      setUser(result.data);
      return true;
    }
    setUser(null);
    return false;
  }, []);

  const value = useMemo(
    () => ({ user, loading, login, register, logout, requireSession }),
    [user, loading, login, register, logout, requireSession],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth 必须包在 AuthProvider 里");
  return ctx;
}
