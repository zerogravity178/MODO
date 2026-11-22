"use client";

import { useEffect } from "react";

/**
 * Регистрирует service worker только в production: в dev он мешал бы
 * горячей перезагрузке и кэшировал устаревшие чанки.
 */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    const register = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        // Приватный режим или запрет политики — приложение работает и без SW.
      });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
    }
  }, []);

  return null;
}

export default PwaRegister;
