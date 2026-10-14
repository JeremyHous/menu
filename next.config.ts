import type { NextConfig } from "next";
import { IMAGE_MAX_BYTES } from "./app/menus/menu-image";

const nextConfig: NextConfig = {
  cacheComponents: true,
  images: {
    // Menu images are served from the project's public menu-images bucket;
    // no other remote images are allowed.
    remotePatterns: [
      new URL(
        `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/menu-images/**`,
      ),
    ],
  },
  experimental: {
    serverActions: {
      // The recipe form can carry an image. The default 1 MB limit is raised
      // to the image limit plus room for the other fields and multipart
      // overhead.
      bodySizeLimit: IMAGE_MAX_BYTES + 512 * 1024,
    },
  },
};

export default nextConfig;
