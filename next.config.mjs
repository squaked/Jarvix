/** @type {import('next').NextConfig} */
const nextConfig = {
  experimental: {
    serverComponentsExternalPackages: ["eventkit-node"],
  },
  webpack: (config, { isServer }) => {
    if (isServer) {
      config.externals.push("eventkit-node");
    }
    return config;
  },
};

export default nextConfig;
