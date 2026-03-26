import Link from "next/link";

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center p-6">
      <div className="w-full max-w-md text-center">
        <h1 className="text-4xl font-bold tracking-tight">Halo</h1>
        <p className="mt-2 text-lg text-gray-500">Connection starts within.</p>

        <div className="mt-8 grid gap-3">
          <Link
            href="/register"
            className="w-full rounded-md bg-halo-primary px-4 py-3 text-white font-medium hover:bg-opacity-90"
          >
            Create account
          </Link>
          <Link
            href="/login"
            className="w-full rounded-md border border-gray-300 px-4 py-3 font-medium text-gray-900 hover:bg-gray-50"
          >
            Log in
          </Link>
          <Link
            href="/discovery"
            className="text-sm text-gray-500 underline-offset-2 hover:underline"
          >
            Continue as existing session
          </Link>
        </div>
      </div>
    </main>
  );
}
