"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { LoginForm } from "@/components/auth/LoginForm";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (loading) return;

    if (user) {
      if (user.must_verify_email) {
        router.replace("/verify-email");
        return;
      }

      router.replace(user.role === "ADMIN" ? "/dashboard" : "/my-workload");
    }
  }, [user, loading, router]);

  if (loading) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  }

  if (user) {
    return <div className="p-8 text-sm text-muted-foreground">Redirecting…</div>;
  }

  return <LoginForm />;
}