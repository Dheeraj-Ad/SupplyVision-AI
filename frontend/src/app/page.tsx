"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/auth-context";

export default function Home() {
  const { isAuthenticated, isLoading, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading) {
      if (isAuthenticated) {
        if (user?.role === "super_admin") {
          router.replace("/admin");
        } else {
          router.replace("/dashboard");
        }
      } else {
        router.replace("/login");
      }
    }
  }, [isAuthenticated, isLoading, user, router]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-background text-gray-400">
      <div className="flex flex-col items-center space-y-4">
        <div className="w-12 h-12 border-t-2 border-accent rounded-full animate-spin"></div>
        <p className="font-mono text-sm tracking-wider">INITIALIZING SUPPLYVISION SECURE GATEWAY...</p>
      </div>
    </div>
  );
}
