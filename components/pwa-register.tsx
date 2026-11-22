"use client";

import { useEffect } from "react";

/**
 * Регистрирует service worker только в production: в dev он мешал бы
 * горячей перезагрузке и кэшировал устаревшие чанки.
 *
 * Заодно следит за обновлениями: новая версия sw.js активируется сразу,
 * иначе установленное на телефон приложение может неделями жить на старом
 * коде, пока пользователь не закроет его полностью.
 */
export function PwaRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined") return;
    if (!("serviceWorker" in navigator)) return;

    let disposed = false;

    const register = async () => {
      try {
        const registration = await navigator.serviceWorker.register("/sw.js", {
          scope: "/",
        });

        if (disposed) return;

        // Проверяем обновление при каждом запуске приложения.
        registration.update().catch(() => undefined);

        registration.addEventListener("updatefound", () => {
          const installing = registration.installing;
          if (!installing) return;

          installing.addEventListener("statechange", () => {
            // Новый воркер готов, а старый ещё управляет страницей —
            // значит это обновление, а не первая установка.
            if (
              installing.state === "activated" &&
              navigator.serviceWorker.controller
            ) {
              // Перезагружаем один раз, чтобы приложение перешло на новый код.
              window.location.reload();
            }
          });
        });
      } catch {
        // Приватный режим или запрет политики — приложение работает и без SW.
      }
    };

    if (document.readyState === "complete") {
      void register();
    } else {
      window.addEventListener(
        "load",
        () => {
          void register();
        },
        { once: true }
      );
    }

    return () => {
      disposed = true;
    };
  }, []);

  return null;
}

export default PwaRegister;
