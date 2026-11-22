"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { createClient } from "@/lib/supabase/client";

export default function RegisterPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setNotice(null);
    setLoading(true);

    const supabase = createClient();
    const { data, error: signUpError } = await supabase.auth.signUp({
      email: email.trim(),
      password,
    });

    if (signUpError) {
      setError(signUpError.message);
      setLoading(false);
      return;
    }

    // Если в Supabase включено подтверждение email — сессии ещё нет.
    if (!data.session) {
      setNotice("Аккаунт создан. Подтвердите email по ссылке в письме.");
      setLoading(false);
      return;
    }

    router.push("/");
    router.refresh();
  }

  return (
    <Card className="border-neutral-200 shadow-sm dark:border-neutral-800">
      <CardHeader className="space-y-1">
        <div className="mb-2 h-1 w-10 rounded-full bg-[#f97316]" />
        <CardTitle className="text-2xl">Регистрация</CardTitle>
        <CardDescription>Создайте аккаунт modo за минуту.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
              className="focus-visible:ring-[#f97316]"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Пароль</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="Минимум 6 символов"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
              className="focus-visible:ring-[#f97316]"
            />
          </div>

          <Button
            type="submit"
            disabled={loading}
            className="w-full bg-[#f97316] text-white hover:bg-[#ea6a0b] focus-visible:ring-[#f97316]"
          >
            {loading ? "Создаём…" : "Создать аккаунт"}
          </Button>
        </form>

        {error && (
          <p role="alert" className="mt-4 text-sm text-red-600 dark:text-red-400">
            {error}
          </p>
        )}

        {notice && (
          <p role="status" className="mt-4 text-sm text-emerald-600 dark:text-emerald-400">
            {notice}
          </p>
        )}

        <p className="mt-6 text-sm text-neutral-500 dark:text-neutral-400">
          Уже есть аккаунт?{" "}
          <Link
            href="/login"
            className="inline-flex min-h-9 items-center font-medium text-[#f97316] hover:underline"
          >
            Войти
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
