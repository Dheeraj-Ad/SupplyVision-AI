"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Login is now embedded in the landing page — redirect there
export default function LoginRedirect() {
  const router = useRouter();
  useEffect(() => {
    router.replace("/#login");
  }, [router]);
  return null;
}
