import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  // Lets a second dev server (e.g. another Claude session's preview) run in
  // this folder without the two fighting over one .next directory.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
};
export default nextConfig;
