import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Вход — modo",
};

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-neutral-50 px-4 py-12 dark:bg-neutral-950">
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
