"use client";

import React, { createContext, useContext, useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { request } from "@/lib/api";

export interface UserSession {
  user_id: string;
  email: string;
  role: string;
  org_id: string | null;
  full_name: string;
  preferred_lang: string;
}

interface AuthContextType {
  user: UserSession | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => void;
  signup: (email: string, password: string, name: string, phone: string, lang: string) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

function parseJwt(token: string): any {
  try {
    const base64Url = token.split('.')[1];
    const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    const jsonPayload = decodeURIComponent(
      atob(base64)
        .split('')
        .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
        .join('')
    );
    return JSON.parse(jsonPayload);
  } catch (e) {
    return null;
  }
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserSession | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function loadSession() {
      // Fast path: read localStorage first — zero network wait for returning users
      const token = localStorage.getItem("access_token");
      if (token) {
        const claims = parseJwt(token);
        if (claims && claims.exp * 1000 > Date.now()) {
          // Valid JWT — show dashboard immediately, validate with server in background
          setUser({
            user_id: claims.sub,
            email: claims.email,
            role: claims.role,
            org_id: claims.org_id,
            full_name: claims.full_name || claims.email.split("@")[0],
            preferred_lang: claims.preferred_lang || "en",
          });
          setIsLoading(false);

          // Background validation — silently refresh user data or clear stale token
          request("GET", "/auth/me")
            .then((me) => {
              setUser({
                user_id: me.id,
                email: me.email,
                role: me.role,
                org_id: me.org_id,
                full_name: me.full_name,
                preferred_lang: me.preferred_lang,
              });
            })
            .catch(() => {
              localStorage.removeItem("access_token");
              setUser(null);
            });
          return;
        }
        // Expired token — remove it before hitting the network
        localStorage.removeItem("access_token");
      }

      // Slow path: no local token, try cookie-based auth (first visit / incognito)
      try {
        const me = await request("GET", "/auth/me");
        setUser({
          user_id: me.id,
          email: me.email,
          role: me.role,
          org_id: me.org_id,
          full_name: me.full_name,
          preferred_lang: me.preferred_lang,
        });
      } catch {
        // Not authenticated — stay on landing page
      } finally {
        setIsLoading(false);
      }
    }
    loadSession();
  }, []);

  const login = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const data = await request("POST", "/auth/login", { email, password });
      localStorage.setItem("access_token", data.access_token);
      
      const claims = parseJwt(data.access_token);
      const session = {
        user_id: claims ? claims.sub : "mock-uid",
        email: email,
        role: data.role,
        org_id: data.org_id,
        full_name: data.full_name,
        preferred_lang: data.preferred_lang,
      };
      setUser(session);
      
      if (data.role === "super_admin") {
        router.push("/admin");
      } else {
        router.push("/dashboard");
      }
    } catch (e) {
      throw e;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      await request("POST", "/auth/logout");
    } catch (e) {
      console.warn("API logout request failed:", e);
    }
    localStorage.removeItem("access_token");
    setUser(null);
    router.push("/");
  };

  const signup = async (email: string, password: string, name: string, phone: string, lang: string) => {
    setIsLoading(true);
    try {
      const data = await request("POST", "/auth/signup", {
        email,
        password,
        role: "sme_owner",
        full_name: name,
        preferred_lang: lang,
        phone_in: phone
      });
      localStorage.setItem("access_token", data.access_token);
      
      const claims = parseJwt(data.access_token);
      setUser({
        user_id: claims ? claims.sub : "mock-uid",
        email: email,
        role: data.role,
        org_id: data.org_id,
        full_name: data.full_name,
        preferred_lang: data.preferred_lang,
      });
      
      router.push("/dashboard");
    } catch (e) {
      throw e;
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        signup,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
