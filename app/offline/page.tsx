import Link from "next/link";

export const metadata = {
  title: "Нет сети — modo",
};

export const dynamic = "force-static";

/** Отдаётся service worker'ом, когда навигация не удалась. */
export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-6 text-center">
      <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary text-2xl">
        📴
      </span>

      <h1 className="text-xl font-semibold text-foreground">
        Нет подключения
      </h1>

      <p className="max-w-xs text-sm text-muted-foreground">
        modo не смог связаться с сервером. Проверьте интернет и попробуйте снова
        — данные никуда не делись.
      </p>

      <Link
        href="/"
        className="mt-2 rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary-hover"
      >
        Повторить
      </Link>
    </main>
  );
}
