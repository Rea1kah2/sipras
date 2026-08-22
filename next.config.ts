import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    serverActions: {
      // Foto aset dikirim lewat server action, dan batas bawaannya cuma 1MB.
      // 4MB cukup untuk foto kamera HP yang sudah dikompres, sekaligus tetap
      // menahan unggahan raksasa yang memberatkan server.
      bodySizeLimit: "4mb",
    },
  },
};

export default nextConfig;
