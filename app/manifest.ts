import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "modo — твои инструменты",
    short_name: "modo",
    description:
      "Личные модули для коллекций, расходов и списков дел. Данные хранятся в вашем аккаунте.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#f97316",
    lang: "ru",
    orientation: "portrait",
    icons: [
      {
        src: "/icons/icon-192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any",
      },
      {
        src: "/icons/icon-512-maskable.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "maskable",
      },
    ],
  };
}
