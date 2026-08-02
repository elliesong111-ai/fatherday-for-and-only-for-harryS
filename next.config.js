/** @type {import('next').NextConfig} */
const nextConfig = {
  headers: async () => [
    {
      source: "/sw.js",
      headers: [{ key: "Service-Worker-Allowed", value: "/" }],
    },
  ],
};

module.exports = nextConfig;
