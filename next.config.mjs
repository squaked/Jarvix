import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));

function readPkgVersion() {
  try {
    const pkg = JSON.parse(
      readFileSync(join(__dirname, "package.json"), "utf8"),
    );
    return typeof pkg.version === "string" ? pkg.version : "0.0.0";
  } catch {
    return "0.0.0";
  }
}

/** Short git ref at build / dev-server start — no manual bumps per commit. */
function readGitShort() {
  const vercel = process.env.VERCEL_GIT_COMMIT_SHA?.trim();
  if (vercel && /^[a-f0-9]+$/.test(vercel)) {
    return vercel.length >= 7 ? vercel.slice(0, 7) : vercel;
  }
  try {
    return execSync("git rev-parse --short HEAD", {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "ignore"],
    }).trim();
  } catch {
    return "";
  }
}

const PKG_VERSION = readPkgVersion();
const GIT_REV = readGitShort();

/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_JARVIX_PKG_VERSION: PKG_VERSION,
    NEXT_PUBLIC_JARVIX_GIT_REV: GIT_REV || "unknown",
  },
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
