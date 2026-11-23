import { redirect } from "next/navigation";

import { AppHeader } from "@/components/app-header";
import { MobileNav } from "@/components/mobile-nav";
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
    <div className="min-h-screen bg-background">
      <AppHeader />

      <div className="mx-auto w-full max-w-5xl px-5 py-8 pb-[calc(5rem+env(safe-area-inset-bottom))] sm:px-8 sm:py-12 sm:pb-[calc(3rem+env(safe-area-inset-bottom))]">
        {children}
      </div>

      <MobileNav />
    </div>
  );
}
