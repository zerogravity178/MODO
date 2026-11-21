"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default function Home() {
  const [email, setEmail] = useState("");
  const [open, setOpen] = useState(false);

  return (
    <main className="container flex min-h-screen flex-col items-center justify-center gap-8 py-16">
      <div className="space-y-2 text-center">
        <h1 className="text-4xl font-bold tracking-tight">modo</h1>
        <p className="text-muted-foreground">
          Next.js 14 · App Router · TypeScript · Tailwind CSS · shadcn/ui ·
          Supabase
        </p>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Проверка компонентов</CardTitle>
          <CardDescription>
            Если вы видите эту карточку и кнопка открывает окно — всё
            установлено правильно.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@example.com"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />
          </div>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="w-full">Открыть диалог</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Dialog работает</DialogTitle>
                <DialogDescription>
                  Компоненты shadcn/ui собраны и подключены.
                </DialogDescription>
              </DialogHeader>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Закрыть
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </CardContent>
        <CardFooter className="justify-between text-sm text-muted-foreground">
          <span>email: {email || "—"}</span>
          <Button variant="link" className="px-0">
            ссылка
          </Button>
        </CardFooter>
      </Card>
    </main>
  );
}
