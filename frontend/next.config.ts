import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  trailingSlash: false,

  async redirects() {
    return [
      {
        source: '/:path+/',
        destination: '/:path+',
        permanent: true,
      },
      // Lowercase enforcement is typically best done in middleware, but for strict contract we could use middleware.
    ];
  }
};

export default nextConfig;
