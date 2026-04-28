/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    // Only rewrite to localhost in development to avoid hardcoded URLs in production.
    // In production, use the NEXT_PUBLIC_API_URL environment variable instead.
    if (process.env.NODE_ENV !== "development") {
      return [];
    }

    return [
      {
        source: "/v1/:path*",
        destination: "http://localhost:8080/v1/:path*",
      },
    ];
  },
};

module.exports = nextConfig;