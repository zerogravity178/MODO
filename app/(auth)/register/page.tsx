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
import { Field, FieldInput } from "@/components/ui/field";
import { Notice } from "@/components/ui/notice";
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
    <Card className="border-border shadow-sm">
      <CardHeader className="space-y-1">
        <div className="mb-2 h-1 w-10 rounded-full bg-primary" />
        <CardTitle className="text-2xl">Регистрация</CardTitle>
        <CardDescription>Создайте аккаунт modo за минуту.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <Field id="email" label="Email">
            <FieldInput
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              required
            />
          </Field>

          <Field id="password" label="Пароль">
            <FieldInput
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="Минимум 6 символов"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              minLength={6}
              required
            />
          </Field>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Создаём…" : "Создать аккаунт"}
          </Button>
        </form>

        {error && <Notice className="mt-4">{error}</Notice>}

        {notice && (
          <Notice kind="success" className="mt-4">
            {notice}
          </Notice>
        )}

        <p className="mt-6 text-sm text-muted-foreground">
          Уже есть аккаунт?{" "}
          <Link
            href="/login"
            className="inline-flex min-h-9 items-center font-medium text-primary hover:underline"
          >
            Войти
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
