"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/components/providers/AuthProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { getApiBase } from "@/lib/api";

export default function VerifyEmailPage() {
  const { user, token, loading, logout } = useAuth();
  const router = useRouter();

  const [code, setCode] = useState("");
  const [sending, setSending] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [info, setInfo] = useState("");
  const [error, setError] = useState("");

  const autoSentRef = useRef(false);

  useEffect(() => {
    if (loading) return;

    if (!user || !token) {
      router.replace("/");
      return;
    }

    if (!user.must_verify_email) {
      router.replace(user.role === "ADMIN" ? "/dashboard" : "/my-workload");
      return;
    }
  }, [user, token, loading, router]);

  useEffect(() => {
    if (!user || !token || !user.must_verify_email || autoSentRef.current) return;
    autoSentRef.current = true;
    void sendCode();
  }, [user, token]);

  async function sendCode() {
    if (!token) return;

    setSending(true);
    setError("");
    setInfo("");

    try {
      const res = await fetch(`${getApiBase()}/api/auth/send-verification-code`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.detail || "Failed to send verification code.");
      }

      setInfo("A verification code has been sent to your email address.");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to send verification code.");
    } finally {
      setSending(false);
    }
  }

  async function handleVerify(e: React.FormEvent) {
    e.preventDefault();
    if (!token) return;

    setVerifying(true);
    setError("");
    setInfo("");

    try {
      const res = await fetch(`${getApiBase()}/api/auth/verify-email`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ code }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        throw new Error(data?.detail || "Verification failed.");
      }

      setInfo("Email verified successfully. Redirecting...");
      window.location.href = "/";
    } catch (e) {
      setError(e instanceof Error ? e.message : "Verification failed.");
    } finally {
      setVerifying(false);
    }
  }

  if (loading || !user) {
    return <div className="p-8 text-sm text-muted-foreground">Loading…</div>;
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Verify your email</CardTitle>
        </CardHeader>

        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            This is your first login. Please verify your identity before entering the system.
          </p>

          <p className="text-sm">
            Email: <span className="font-medium">{user.email || "No email found"}</span>
          </p>

          {info ? (
            <div className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">
              {info}
            </div>
          ) : null}

          {error ? (
            <div className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </div>
          ) : null}

          <form onSubmit={handleVerify} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="code">Verification code</Label>
              <Input
                id="code"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="Enter 6-digit code"
                inputMode="numeric"
                maxLength={6}
                required
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" disabled={verifying || code.trim().length !== 6} className="flex-1">
                {verifying ? "Verifying..." : "Verify email"}
              </Button>

              <Button type="button" variant="outline" onClick={sendCode} disabled={sending}>
                {sending ? "Sending..." : "Resend code"}
              </Button>
            </div>
          </form>

          <Button
            type="button"
            variant="ghost"
            className="w-full"
            onClick={() => {
              logout();
              router.replace("/");
            }}
          >
            Sign out
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}