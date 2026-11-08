"use client";
import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import config from "@/lib/public-config.json";
import { MailStatus, normalizeEmail } from "@/lib/email";

export function MailSetup({ adminEmail }: { adminEmail: string }) {
  const initialized = useRef(false);
  const [status, setStatus] = useState<MailStatus | null>(null);
  const [sender, setSender] = useState("a64763774@gmail.com");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(false);
  const [replace, setReplace] = useState(false);
  const refresh = useCallback(async () => {
    const { data, error } = await supabase.rpc("autera_mail_status");
    if (error) setError("Не удалось проверить подключение почты.");
    else {
      setStatus(data);
      if (!initialized.current && data.sender) setSender(data.sender);
      initialized.current = true;
    }
  }, []);
  useEffect(() => {
    refresh();
    const timer = setInterval(refresh, 15000);
    return () => clearInterval(timer);
  }, [refresh]);
  async function prepare() {
    const address = normalizeEmail(sender);
    setError("");
    if (!address || !address.endsWith("@gmail.com")) {
      setError("Укажите адрес отдельного Gmail-аккаунта для отправки.");
      return;
    }
    if (address === adminEmail.toLowerCase()) {
      setError(
        "Для отправки используйте отдельный аккаунт, а не почту администратора.",
      );
      return;
    }
    setBusy(true);
    try {
      const response = await fetch("/setup/autera-mail.js");
      if (!response.ok) throw new Error();
      const template = await response.text();
      if (!template.includes("const AUTERA = {}; // AUTERA_CONFIG"))
        throw new Error();
      const bytes = crypto.getRandomValues(new Uint8Array(32));
      const token = Array.from(bytes, (b) =>
        b.toString(16).padStart(2, "0"),
      ).join("");
      const script = template.replace(
        "const AUTERA = {}; // AUTERA_CONFIG",
        "const AUTERA = " +
          JSON.stringify(
            {
              url: config.supabaseUrl,
              publicKey: config.supabasePublishableKey,
              token,
              sender: address,
              address: "Демо — Москва, ул. Автомобильная, 10",
              siteUrl: window.location.origin,
              demo: true,
            },
            null,
            2,
          ) +
          ";",
      );
      const { error } = await supabase.rpc("autera_mail_configure", {
        p_token: token,
        p_sender: address,
      });
      if (error) throw new Error();
      setCode(script);
      setReplace(false);
      setCopied(false);
      await refresh();
    } catch {
      setError(
        "Не удалось подготовить подключение. Проверьте соединение и повторите.",
      );
    } finally {
      setBusy(false);
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
    } catch {
      setError("Выделите и скопируйте код из поля ниже вручную.");
    }
  }
  return (
    <section className="mail-setup">
      <h2>Письма клиентам</h2>
      <p>
        После подтверждения или отмены записи письмо отправится с отдельного
        Gmail-аккаунта. Платный SMS-сервис и собственный домен не нужны.
      </p>
      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}
      <div
        className={"alert " + (status?.active ? "alert-success" : "")}
        role="status"
      >
        {!status
          ? "Проверяем подключение…"
          : status.active
            ? "Отправка подключена" +
              (status.sender ? " · " + status.sender : "")
            : status.configured
              ? "Код подготовлен. Google ещё не подключён или автоотправка остановлена."
              : "Автоотправка ещё не подключена. Письма не отправляются."}
        {status?.last_poll_at && (
          <span className="mail-status-detail">
            Последняя проверка:{" "}
            {new Date(status.last_poll_at).toLocaleString("ru-RU")}{" "}
            {status.remaining_quota != null
              ? "· Осталось отправок сегодня: " + status.remaining_quota
              : ""}
          </span>
        )}
      </div>
      <p className="small muted">
        Бесплатный лимит обычного Google-аккаунта — 100 получателей в сутки.
        Действуют текущие квоты Google. Отправка обычно происходит в течение
        нескольких минут после решения администратора.
      </p>
      {(!status?.configured || replace) && (
        <div className="mail-connect">
          <label className="field-label">
            Почта для отправки
            <input
              className="input"
              type="email"
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              value={sender}
              onChange={(e) => setSender(e.target.value)}
            />
          </label>
          <button
            className="button button-primary"
            disabled={busy}
            onClick={prepare}
          >
            {busy ? "Подготавливаем…" : "Подготовить подключение Gmail"}
          </button>
          {replace && (
            <p className="small">
              Новый код отключит старое подключение. Для продолжения отправки
              установите новый код в Google.
            </p>
          )}
        </div>
      )}
      {code && (
        <div className="mail-instructions">
          <h3>Подключение в Google</h3>
          <ol>
            <li>
              Откройте{" "}
              <a
                className="text-link"
                href={
                  "https://script.google.com/home/start?authuser=" +
                  encodeURIComponent(sender)
                }
                target="_blank"
                rel="noreferrer"
              >
                новый проект Google Apps Script
              </a>{" "}
              под аккаунтом <strong>{sender}</strong>.
            </li>
            <li>
              Замените содержимое файла <strong>Code.gs</strong> кодом ниже и
              сохраните проект.
            </li>
            <li>
              В списке функций выберите <strong>installAuteraMail</strong>,
              нажмите «Выполнить» и разрешите отправку почты. Развёртывать
              веб-приложение не нужно.
            </li>
            <li>Вернитесь сюда и нажмите «Проверить подключение».</li>
          </ol>
          <p>
            Код проверяет аккаунт отправителя перед каждым запуском. Доступ к
            чтению писем ему не нужен.
          </p>
          <button className="button button-outline" onClick={copy}>
            {copied ? "Код скопирован" : "Скопировать код"}
          </button>
          <details>
            <summary>Показать код для ручного копирования</summary>
            <textarea
              className="input mail-code"
              readOnly
              rows={14}
              value={code}
              onFocus={(e) => e.currentTarget.select()}
              aria-label="Код Google Apps Script"
            />
          </details>
          <p className="small muted">
            Код содержит ключ только для очереди уведомлений. Храните его в
            своём проекте Google, не публикуйте. После закрытия страницы
            подготовленный код не сохраняется в браузере.
          </p>
        </div>
      )}
      <div className="mail-setup-actions">
        <button className="button button-outline" onClick={refresh}>
          Проверить подключение
        </button>
        {status?.configured && !code && !replace && (
          <button className="text-link" onClick={() => setReplace(true)}>
            Подготовить новый код
          </button>
        )}
      </div>
      <p className="small muted">
        Для остановки откройте проект Google и выполните функцию stopAuteraMail.
        При исчерпании дневного лимита очередь сохранится. При неопределённом
        результате письмо не отправляется повторно автоматически — проверьте
        журнал Apps Script.
      </p>
    </section>
  );
}
