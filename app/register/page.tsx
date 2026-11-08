 
"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function Register() {
  const [name, setName] = useState("");
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

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: name,
        },
      },
    });

    setLoading(false);

    if (error) {
      setMsg(error.message);
      return;
    }

    if (data.session) {
      router.push("/account");
      router.refresh();
    } else {
      setMsg(
        "Аккаунт создан, но вход не выполнен. Проверь настройки подтверждения email в Supabase."
      );
    }
  }

  return (
    <main className="wrap">
      <div className="auth panel">
        <Link href="/">← Autera</Link>

        <h1>Создать аккаунт</h1>

        <form onSubmit={submit}>
          <label>
            Имя
            <input
              className="field"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </label>

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
            Пароль (не менее 6 символов)
            <input
              className="field"
              type="password"
              minLength={6}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </label>

          <button className="btn" disabled={loading}>
            {loading ? "Создаём аккаунт..." : "Зарегистрироваться"}
          </button>
        </form>

        {msg && <p className="message">{msg}</p>}

        <p className="muted">
          Уже есть аккаунт? <Link href="/login">Войти</Link>
        </p>
      </div>
    </main>
  );
}
