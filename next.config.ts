import type { NextConfig } from 'next';
const nextConfig: NextConfig = {
  // Lets a second dev server (e.g. another Claude session's preview) run in
  // this folder without the two fighting over one .next directory.
  distDir: process.env.NEXT_DIST_DIR ?? '.next',
  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          // Outbound links must never carry a URL path — invite tokens ride
          // in paths, and this is the backstop if one ever lingers on screen.
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ];
  },
};
export default nextConfig;
