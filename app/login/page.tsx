
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [msg, setMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setMsg("");
    setLoading(true);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    setLoading(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    router.push("/account");
    router.refresh();
  }

  return (
    <main className="wrap">
      <div className="auth panel">
        <Link href="/">← Autera</Link>

        <h1>Вход</h1>

        <form onSubmit={submit}>
          <label>
            Email
            <input
              className="field"
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
          </label>

          <label>
            Пароль
            <input
              className="field"
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <button className="btn" disabled={loading}>
            {loading ? "Входим..." : "Войти"}
          </button>
        </form>

        {msg && <p className="message">{msg}</p>}

        <p className="muted">
          Нет аккаунта? <Link href="/register">Регистрация</Link>
        </p>
      </div>
    </main>
  );
}
