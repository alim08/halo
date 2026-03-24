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
    <main className="flex min-h-screen items-center justify-center px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-halo-primary">Halo</h1>
          <p className="mt-2 text-gray-500">Create your account</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md bg-red-50 p-3 text-sm text-red-600">
              {error}
            </div>
          )}

          <div>
            <label htmlFor="email" className="block text-sm font-medium">
              Email
            </label>
            <input
              id="email"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 min-h-touch focus:border-halo-primary focus:outline-none focus:ring-1 focus:ring-halo-primary"
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium">
              Password
            </label>
            <input
              id="password"
              type="password"
              required
              minLength={8}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 min-h-touch focus:border-halo-primary focus:outline-none focus:ring-1 focus:ring-halo-primary"
            />
          </div>

          <div>
            <label htmlFor="confirm" className="block text-sm font-medium">
              Confirm Password
            </label>
            <input
              id="confirm"
              type="password"
              required
              minLength={8}
              value={confirm}
              onChange={(e) => setConfirm(e.target.value)}
              className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 min-h-touch focus:border-halo-primary focus:outline-none focus:ring-1 focus:ring-halo-primary"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-md bg-halo-primary px-4 py-3 min-h-touch text-white font-medium hover:bg-opacity-90 disabled:opacity-50"
          >
            {loading ? "Creating account…" : "Create Account"}
          </button>
        </form>

        <p className="text-center text-sm text-gray-500">
          Already have an account?{" "}
          <Link href="/login" className="text-halo-primary hover:underline">
            Log in
          </Link>
        </p>
      </div>
    </main>
  );
}
