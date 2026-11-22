import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { createClient } from "@/lib/supabase/server";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-white dark:bg-neutral-950">
      <AppHeader />

      <div className="mx-auto w-full max-w-4xl px-5 py-8 pb-[calc(2rem+env(safe-area-inset-bottom))] sm:px-8 sm:py-12 sm:pb-[calc(3rem+env(safe-area-inset-bottom))]">
        {children}
      </div>
    </div>
  );
}
