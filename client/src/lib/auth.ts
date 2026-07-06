import api, { clearAuthStorage, saveAuthData, getStoredUser } from "./api";

export interface AuthUser {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  role: "STUDENT" | "SUPERVISOR" | "ADMIN";
  status: string;
  avatarUrl?: string;
  phone?: string;
  studentProfile?: any;
  supervisorProfile?: any;
}

// ─── Auth API calls ────────────────────────────────────────────────────────────

export const authLogin = async (email: string, password: string) => {
  const res = await api.post("/auth/login", { email, password });
  const { user, accessToken, refreshToken } = res.data;
  saveAuthData(user, accessToken, refreshToken);
  return user as AuthUser;
};

export const authRegister = async (data: Record<string, any>) => {
  const res = await api.post("/auth/register", data);
  const { user, accessToken, refreshToken } = res.data;
  saveAuthData(user, accessToken, refreshToken);
  return user as AuthUser;
};

export const authLogout = async () => {
  try {
    await api.post("/auth/logout");
  } catch {
    // Silent — clear local storage regardless
  } finally {
    clearAuthStorage();
  }
};

export const authGetMe = async (): Promise<AuthUser | null> => {
  try {
    const res = await api.get("/auth/me");
    return res.data as AuthUser;
  } catch {
    return null;
  }
};

export const authForgotPassword = async (email: string) => {
  const res = await api.post("/auth/forgot-password", { email });
  return res.data;
};

export const authResetPassword = async (token: string, password: string) => {
  const res = await api.post("/auth/reset-password", { token, password });
  return res.data;
};

// ─── Session helpers ───────────────────────────────────────────────────────────

export const getCurrentUser = (): AuthUser | null => getStoredUser();

export const isAuthenticated = (): boolean => {
  const user = getStoredUser();
  return !!user;
};

export const getUserRole = (): "STUDENT" | "SUPERVISOR" | "ADMIN" | null => {
  const user = getStoredUser();
  return user?.role ?? null;
};

export const getUserDisplayName = (): string => {
  const user = getStoredUser();
  if (!user) return "Unknown";
  return `${user.firstName} ${user.lastName}`;
};

export const getUserInitials = (): string => {
  const user = getStoredUser();
  if (!user) return "??";
  return `${user.firstName?.[0] ?? ""}${user.lastName?.[0] ?? ""}`.toUpperCase();
};
