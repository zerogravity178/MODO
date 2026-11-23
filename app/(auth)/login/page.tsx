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

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setLoading(true);

    const supabase = createClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password,
    });

    if (signInError) {
      setError(signInError.message);
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
        <CardTitle className="text-2xl">Вход</CardTitle>
        <CardDescription>Войдите, чтобы открыть свои модули.</CardDescription>
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
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
            />
          </Field>

          <Button type="submit" disabled={loading} className="w-full">
            {loading ? "Входим…" : "Войти"}
          </Button>
        </form>

        {error && <Notice className="mt-4">{error}</Notice>}

        <p className="mt-6 text-sm text-muted-foreground">
          Нет аккаунта?{" "}
          <Link
            href="/register"
            className="inline-flex min-h-9 items-center font-medium text-primary hover:underline"
          >
            Зарегистрироваться
          </Link>
        </p>
      </CardContent>
    </Card>
  );
}
