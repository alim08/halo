"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { api, setAuth } from "@/lib/api";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    if (password.length < 8) {
      setError("Password must be at least 8 characters");
      return;
    }

    setLoading(true);
    try {
      const res = await api.auth.register(email, password);
      setAuth(res.access_token, res.refresh_token);
      router.push("/onboarding");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Registration failed";
      setError(message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="flex min-h-screen flex-col items-center justify-center px-4 py-12"
      style={{ backgroundColor: "#fff7fb" }}
    >
      {/* Brand anchor */}
      <div className="mb-8 flex flex-col items-center">
        <div
          className="flex h-16 w-16 items-center justify-center rounded-xl"
          style={{ backgroundColor: "#9500cb" }}
        >
          <span className="material-symbols-rounded text-3xl text-white">
            auto_awesome
          </span>
        </div>
        <h1
          className="mt-4 text-4xl font-black"
          style={{ color: "#211824" }}
        >
          Halo
        </h1>
        <p
          className="mt-1 text-base"
          style={{ color: "#504254" }}
        >
          Create your account and find your people.
        </p>
      </div>

      {/* Card */}
      <div
        className="w-full max-w-md overflow-hidden rounded-xl shadow-xl"
        style={{ backgroundColor: "#ffffff", borderColor: "rgba(212,192,215,0.3)", borderWidth: 1 }}
      >
        <div className="p-8">
          {/* Social login buttons */}
          <button
            type="button"
            className="flex w-full items-center justify-center gap-3 rounded-lg border py-3 text-base font-semibold transition-colors hover:bg-gray-50"
            style={{ borderColor: "#d4c0d7", color: "#211824" }}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24">
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
            Continue with Google
          </button>

          <button
            type="button"
            className="mt-3 flex w-full items-center justify-center gap-3 rounded-lg py-3 text-base font-semibold text-white transition-opacity hover:opacity-90"
            style={{ backgroundColor: "#211824" }}
          >
            <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.05 20.28c-.98.95-2.05.88-3.08.4-1.09-.5-2.08-.48-3.24 0-1.44.62-2.2.44-3.06-.4C2.79 15.25 3.51 7.59 9.05 7.31c1.35.07 2.29.74 3.08.8 1.18-.24 2.31-.93 3.57-.84 1.51.12 2.65.72 3.4 1.8-3.12 1.87-2.38 5.98.48 7.13-.57 1.5-1.31 2.99-2.54 4.09zM12.03 7.25c-.15-2.23 1.66-4.07 3.74-4.25.29 2.58-2.34 4.5-3.74 4.25z" />
            </svg>
            Continue with Apple
          </button>

          {/* Divider */}
          <div className="my-6 flex items-center gap-4">
            <div className="h-px flex-1" style={{ backgroundColor: "#d4c0d7" }} />
            <span className="text-sm" style={{ color: "#827286" }}>or</span>
            <div className="h-px flex-1" style={{ backgroundColor: "#d4c0d7" }} />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-5">
            {error && (
              <div className="rounded-lg bg-red-50 p-3 text-sm text-red-600">
                {error}
              </div>
            )}

            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium"
                style={{ color: "#504254" }}
              >
                Email
              </label>
              <input
                id="email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="block w-full rounded-lg border px-4 py-3 text-base outline-none transition-all focus:ring-2"
                style={{
                  borderColor: "#d4c0d7",
                  color: "#211824",
                  backgroundColor: "#ffffff",
                }}
                placeholder="you@example.com"
              />
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium"
                style={{ color: "#504254" }}
              >
                Password
              </label>
              <input
                id="password"
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full rounded-lg border px-4 py-3 text-base outline-none transition-all focus:ring-2"
                style={{
                  borderColor: "#d4c0d7",
                  color: "#211824",
                  backgroundColor: "#ffffff",
                }}
                placeholder="At least 8 characters"
              />
            </div>

            <div>
              <label
                htmlFor="confirm"
                className="mb-1.5 block text-sm font-medium"
                style={{ color: "#504254" }}
              >
                Confirm Password
              </label>
              <input
                id="confirm"
                type="password"
                required
                minLength={8}
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="block w-full rounded-lg border px-4 py-3 text-base outline-none transition-all focus:ring-2"
                style={{
                  borderColor: "#d4c0d7",
                  color: "#211824",
                  backgroundColor: "#ffffff",
                }}
                placeholder="Repeat password"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-lg py-4 text-lg font-bold text-white transition-opacity hover:opacity-90 disabled:opacity-50"
              style={{
                backgroundColor: "#9500cb",
                boxShadow: "0 8px 24px rgba(149,0,203,0.2)",
              }}
            >
              {loading ? "Creating account..." : "Create Account"}
            </button>
          </form>
        </div>

        {/* Card footer */}
        <div
          className="px-8 py-4 text-center text-sm"
          style={{ backgroundColor: "#f9e9fa", color: "#504254" }}
        >
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-semibold hover:underline"
            style={{ color: "#9500cb" }}
          >
            Sign in
          </Link>
        </div>
      </div>

      {/* Decorative icons */}
      <div className="mt-6 flex gap-6 opacity-20" style={{ color: "#9500cb" }}>
        <span className="material-symbols-rounded text-2xl">favorite</span>
        <span className="material-symbols-rounded text-2xl">group</span>
        <span className="material-symbols-rounded text-2xl">chat_bubble</span>
        <span className="material-symbols-rounded text-2xl">explore</span>
      </div>

      {/* Footer links */}
      <div className="mt-6 flex gap-6 text-xs" style={{ color: "#827286" }}>
        <Link href="/legal" className="hover:underline">Legal</Link>
        <Link href="/help" className="hover:underline">Help</Link>
        <Link href="/privacy" className="hover:underline">Privacy</Link>
        <Link href="/terms" className="hover:underline">Terms</Link>
      </div>
    </main>
  );
}
