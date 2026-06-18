import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "ManaForge",
    short_name: "ManaForge",
    description: "Collection, decks Commander, fullsets et communauté Magic.",
    start_url: "/",
    scope: "/",
    display: "standalone",
    background_color: "#101116",
    theme_color: "#f59e0b",
    orientation: "portrait",
    categories: ["games", "utilities"],
    icons: [
      {
        src: "/icons/manaforge-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "maskable",
      },
      {
        src: "/icons/manaforge-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}