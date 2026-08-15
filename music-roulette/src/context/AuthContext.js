import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import { api, saveToken, clearToken, getToken } from "../config/api";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const { data } = await api.get("/auth/me");
      setUser(data.user);
    } catch {}
  }, []);

  useEffect(() => {
    (async () => {
      const token = await getToken();
      if (token) {
        try {
          const { data } = await api.get("/auth/me");
          setUser(data.user);
        } catch {
          await clearToken();
        }
      }
      setLoading(false);
    })();
  }, []);

  const register = async ({ name, email, password }) => {
    const { data } = await api.post("/auth/register", { name, email, password });
    await saveToken(data.token);
    setUser(data.user);
  };

  const login = async ({ email, password }) => {
    const { data } = await api.post("/auth/login", { email, password });
    await saveToken(data.token);
    setUser(data.user);
  };

  const logout = async () => {
    await clearToken();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, register, login, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
