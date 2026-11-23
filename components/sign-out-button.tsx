"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { Button } from "@/components/ui/button";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

type SignOutButtonProps = {
  /** icon — маленькая кнопка в шапке, full — широкая кнопка с подписью. */
  variant?: "icon" | "full";
  className?: string;
};

export function SignOutButton({
  variant = "icon",
  className,
}: SignOutButtonProps) {
  const router = useRouter();
  const [leaving, setLeaving] = useState(false);

  async function handleSignOut() {
    setLeaving(true);

    const supabase = createClient();
    await supabase.auth.signOut();

    router.push("/login");
    router.refresh();
  }

  if (variant === "full") {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={handleSignOut}
        disabled={leaving}
        className={cn("w-full", className)}
      >
        <LogOut className="mr-1 h-4 w-4" />
        {leaving ? "Выходим…" : "Выйти из аккаунта"}
      </Button>
    );
  }

  return (
    <button
      type="button"
      onClick={handleSignOut}
      disabled={leaving}
      aria-label="Выйти из аккаунта"
      title="Выйти"
      className={cn(
        "rounded-md p-2 text-muted-foreground transition hover:bg-danger/10 hover:text-danger focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50",
        className
      )}
    >
      <LogOut className="h-4 w-4" />
    </button>
  );
}

export default SignOutButton;
