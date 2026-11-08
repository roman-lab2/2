"use client";
import { useCallback, useEffect, useState } from "react";
import { supabase } from "@/lib/supabase/client";
import { Booking, services, statusLabels } from "@/lib/catalog";
import {
  addDays,
  formatDate,
  formatTime,
  HOURS,
  isFutureSlot,
  moscowDate,
  slotISO,
} from "@/lib/schedule";
import { Icon } from "@/components/icon";
import type { User } from "@supabase/supabase-js";
export default function Admin() {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const [allowed, setAllowed] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [logging, setLogging] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [loading, setLoading] = useState(false);
  const [date, setDate] = useState("");
  const [status, setStatus] = useState("all");
  const [search, setSearch] = useState("");
  const [tab, setTab] = useState("bookings");
  const [slotDay, setSlotDay] = useState("");
  const [slots, setSlots] = useState<{ starts_at: string; state: string }[]>(
    [],
  );
  const [busy, setBusy] = useState("");
  const [cancelId, setCancelId] = useState("");
  const [slotLoading, setSlotLoading] = useState(false);
  const checkUser = useCallback(async (nextUser: User | null) => {
    setUser(nextUser);
    setAllowed(false);
    if (nextUser) {
      const { data, error } = await supabase
        .from("autera_admins")
        .select("user_id")
        .eq("user_id", nextUser.id)
        .maybeSingle();
      if (error) setError("Не удалось проверить доступ. Повторите вход.");
      else if (data) setAllowed(true);
      else
        setError(
          "У этого аккаунта нет доступа администратора. Обратитесь к владельцу проекта.",
        );
    }
    setReady(true);
  }, []);
  useEffect(() => {
    setSlotDay(moscowDate());
    supabase.auth.getUser().then(({ data }) => checkUser(data.user));
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      setTimeout(() => checkUser(session?.user || null), 0);
    });
    return () => data.subscription.unsubscribe();
  }, [checkUser]);
  const load = useCallback(async () => {
    if (!allowed) return;
    setLoading(true);
    const { data, error } = await supabase
      .from("autera_bookings")
      .select("*")
      .gte("starts_at", slotISO(addDays(moscowDate(), -30), 0))
      .order("starts_at", { ascending: true })
      .limit(1000);
    if (error) setError("Не удалось загрузить записи. Повторите запрос.");
    else setBookings(data || []);
    setLoading(false);
  }, [allowed]);
  const loadSlots = useCallback(async () => {
    if (!allowed || !slotDay) return;
    setSlotLoading(true);
    const { data, error } = await supabase
      .from("autera_slots")
      .select("starts_at,state")
      .gte("starts_at", slotISO(slotDay, 0))
      .lt("starts_at", slotISO(addDays(slotDay, 1), 0));
    if (error) setError("Не удалось загрузить расписание.");
    else setSlots(data || []);
    setSlotLoading(false);
  }, [allowed, slotDay]);
  useEffect(() => {
    if (allowed) {
      load();
      const timer = setInterval(load, 30000);
      return () => clearInterval(timer);
    }
  }, [allowed, load]);
  useEffect(() => {
    loadSlots();
  }, [loadSlots]);
  async function login(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setLogging(true);
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: email.trim(),
        password,
      });
      if (error) setError("Не удалось войти. Проверьте почту и пароль.");
      else await checkUser(data.user);
      setPassword("");
    } catch {
      setError("Нет соединения. Повторите вход.");
    } finally {
      setLogging(false);
    }
  }
  async function logout() {
    const { error } = await supabase.auth.signOut();
    if (error) {
      setError("Не удалось выйти. Повторите.");
      return;
    }
    setUser(null);
    setAllowed(false);
    setBookings([]);
    setError("");
  }
  async function updateStatus(item: Booking, next: string) {
    setBusy(item.id);
    setError("");
    setNotice("");
    try {
      const { data, error } = await supabase
        .from("autera_bookings")
        .update({ status: next })
        .eq("id", item.id)
        .eq("status", item.status)
        .select("id");
      if (error || !data?.length)
        setError(
          "Запись изменилась или обновление не удалось. Обновите список.",
        );
      else {
        setNotice(
          "Запись " +
            item.reference +
            ": " +
            statusLabels[next].toLowerCase() +
            ".",
        );
        setCancelId("");
        await load();
        await loadSlots();
      }
    } finally {
      setBusy("");
    }
  }
  async function setAvailability(hours: number[], blocked: boolean) {
    setBusy("schedule");
    setError("");
    setNotice("");
    try {
      const rows = hours.map((h) => ({
        starts_at: slotISO(slotDay, h),
        state: blocked ? "blocked" : "available",
      }));
      const { error } = await supabase
        .from("autera_slots")
        .upsert(rows, { onConflict: "starts_at" });
      if (error)
        setError(
          "Расписание изменилось или слот уже забронирован. Обновите расписание.",
        );
      else
        setNotice(
          blocked
            ? "Выбранное время закрыто для записи."
            : "Выбранное время открыто для записи.",
        );
      await loadSlots();
    } finally {
      setBusy("");
    }
  }
  if (!ready)
    return (
      <main id="main" className="container empty-page">
        <p role="status">Проверяем доступ…</p>
      </main>
    );
  if (!allowed)
    return (
      <main id="main" className="container admin-login">
        <div className="login-panel">
          <span className="login-lock">
            <Icon name="lock" size={27} />
          </span>
          <span className="eyebrow">AUTERA / ДЛЯ АДМИНИСТРАТОРА</span>
          <h1>Вход для администратора</h1>
          <p className="muted">Закрытая панель управления записями.</p>
          {error && (
            <div className="alert alert-error" role="alert">
              {error}
            </div>
          )}
          {user ? (
            <button className="button button-outline" onClick={logout}>
              Выйти и выбрать другой аккаунт
            </button>
          ) : (
            <form onSubmit={login}>
              <label className="field-label">
                Электронная почта
                <input
                  className="input"
                  autoComplete="username"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </label>
              <label className="field-label">
                Пароль
                <input
                  className="input"
                  type="password"
                  autoComplete="current-password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
              <button className="button button-primary" disabled={logging}>
                {logging ? "Проверяем…" : "Войти в панель"}{" "}
                <Icon name="diagonal" size={18} />
              </button>
            </form>
          )}
          <p className="small muted">
            Вход доступен только назначенному владельцем администратору.
          </p>
        </div>
      </main>
    );
  const today = moscowDate();
  const todayRecords = bookings.filter(
    (b) =>
      moscowDate(new Date(b.starts_at)) === today && b.status !== "cancelled",
  );
  const filtered = bookings.filter(
    (b) =>
      (!date || moscowDate(new Date(b.starts_at)) === date) &&
      (status === "all" || b.status === status) &&
      (!search ||
        [b.customer_name, b.phone, b.car, b.reference].some((s) =>
          s.toLowerCase().includes(search.toLowerCase()),
        )),
  );
  const stateAt = (h: number) =>
    slots.find(
      (s) =>
        new Date(s.starts_at).getTime() ===
        new Date(slotISO(slotDay, h)).getTime(),
    )?.state || "available";
  const mutableHours = HOURS.filter(
    (h) => isFutureSlot(slotDay, h) && stateAt(h) !== "reserved",
  );
  return (
    <main id="main" className="container admin-main">
      <div className="admin-heading">
        <div>
          <span className="eyebrow">AUTERA / ПАНЕЛЬ УПРАВЛЕНИЯ</span>
          <h1>Записи в сервис</h1>
          <p className="muted">{user?.email} · время московское</p>
        </div>
        <button className="button button-outline" onClick={logout}>
          Выйти <Icon name="diagonal" size={16} />
        </button>
      </div>
      <div className="admin-stats">
        <div>
          <span>Сегодня, без отменённых</span>
          <strong>{todayRecords.length}</strong>
        </div>
        <div>
          <span>Новые записи</span>
          <strong>
            {bookings.filter((b) => b.status === "booked").length}
          </strong>
        </div>
        <div>
          <span>Выполнено за 30 дней</span>
          <strong>
            {
              bookings.filter(
                (b) =>
                  b.status === "completed" &&
                  new Date(b.starts_at) < new Date(),
              ).length
            }
          </strong>
        </div>
      </div>
      <div className="admin-tabs">
        <button
          className={tab === "bookings" ? "active" : ""}
          onClick={() => setTab("bookings")}
        >
          Записи
        </button>
        <button
          className={tab === "schedule" ? "active" : ""}
          onClick={() => setTab("schedule")}
        >
          Доступность времени
        </button>
      </div>
      {error && (
        <div className="alert alert-error" role="alert">
          {error}
        </div>
      )}
      {notice && (
        <div className="alert alert-success" role="status">
          {notice}
        </div>
      )}
      {tab === "bookings" ? (
        <>
          <div className="admin-filters">
            <label className="field-label">
              Дата
              <input
                className="input"
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
            <label className="field-label">
              Статус
              <select
                className="input"
                value={status}
                onChange={(e) => setStatus(e.target.value)}
              >
                <option value="all">Все статусы</option>
                {Object.entries(statusLabels).map(([key, label]) => (
                  <option value={key} key={key}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Поиск
              <input
                className="input"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Имя, телефон, авто или номер"
              />
            </label>
            <button
              className="button button-outline"
              onClick={load}
              disabled={loading}
            >
              {loading ? "Обновляем…" : "Обновить"}
            </button>
            {date && (
              <button className="text-link" onClick={() => setDate("")}>
                Все даты
              </button>
            )}
          </div>
          <div className="records-meta">
            {filtered.length} записей · показаны визиты за последние 30 дней и
            предстоящие
          </div>
          {loading && bookings.length === 0 ? (
            <p role="status">Загружаем записи…</p>
          ) : filtered.length === 0 ? (
            <div className="admin-empty">
              <Icon name="calendar" size={35} />
              <h3>Записей пока нет</h3>
              <p>Новые записи появятся здесь после бронирования на сайте.</p>
            </div>
          ) : (
            <div className="booking-records">
              {filtered.map((b) => (
                <article className="record" key={b.id}>
                  <div className="record-date">
                    <strong>{formatDate(b.starts_at)}</strong>
                    <span>{formatTime(b.starts_at)}</span>
                    <small>МСК</small>
                  </div>
                  <div className="record-info">
                    <div className="record-top">
                      <strong>
                        {services.find((s) => s.id === b.service_id)?.name ||
                          b.service_id}
                      </strong>
                      <span className={"status status-" + b.status}>
                        {statusLabels[b.status]}
                      </span>
                    </div>
                    <p>
                      {b.customer_name} ·{" "}
                      <a href={"tel:" + b.phone}>{b.phone}</a>
                    </p>
                    <p className="muted">{b.car}</p>
                    {b.comment && <p className="record-comment">{b.comment}</p>}
                    <small className="muted">{b.reference}</small>
                  </div>
                  <div className="record-actions">
                    {b.status === "booked" && (
                      <button
                        className="button button-small button-primary"
                        disabled={!!busy}
                        onClick={() => updateStatus(b, "confirmed")}
                      >
                        Подтвердить
                      </button>
                    )}
                    {b.status === "confirmed" && (
                      <button
                        className="button button-small button-primary"
                        disabled={!!busy || new Date(b.starts_at) > new Date()}
                        title="Выполнить можно после начала приёма"
                        onClick={() => updateStatus(b, "completed")}
                      >
                        Выполнено
                      </button>
                    )}
                    {["booked", "confirmed"].includes(b.status) &&
                      (cancelId === b.id ? (
                        <>
                          <span className="small">Освободить время?</span>
                          <button
                            className="button button-small button-danger"
                            disabled={!!busy}
                            onClick={() => updateStatus(b, "cancelled")}
                          >
                            Да, отменить
                          </button>
                          <button
                            className="text-link small"
                            onClick={() => setCancelId("")}
                          >
                            Оставить запись
                          </button>
                        </>
                      ) : (
                        <button
                          className="text-link small"
                          disabled={!!busy}
                          onClick={() => setCancelId(b.id)}
                        >
                          Отменить запись
                        </button>
                      ))}
                  </div>
                </article>
              ))}
            </div>
          )}
        </>
      ) : (
        <section className="availability-panel">
          <h2>Расписание приёма</h2>
          <p className="muted">
            Закройте отдельные часы или целый день. Забронированное время нельзя
            закрыть — сначала отмените запись.
          </p>
          <div className="availability-tools">
            <label className="field-label">
              Дата
              <input
                className="input"
                type="date"
                min={today}
                max={addDays(today, 45)}
                value={slotDay}
                onChange={(e) => setSlotDay(e.target.value)}
              />
            </label>
            <button
              className="button button-outline"
              disabled={!!busy || slotLoading || !mutableHours.length}
              onClick={() => setAvailability(mutableHours, true)}
            >
              Закрыть свободное время дня
            </button>
            <button
              className="button button-outline"
              disabled={!!busy || slotLoading || !mutableHours.length}
              onClick={() => setAvailability(mutableHours, false)}
            >
              Открыть свободное время дня
            </button>
            <button className="text-link" onClick={loadSlots}>
              Обновить
            </button>
          </div>
          {slotLoading ? (
            <p role="status">Загружаем расписание…</p>
          ) : (
            <div className="availability-grid">
              {HOURS.map((h) => (
                <div key={h} className={"availability-slot " + stateAt(h)}>
                  <strong>
                    {h}:00–{h + 1}:00
                  </strong>
                  <span>
                    {stateAt(h) === "reserved"
                      ? "Забронировано"
                      : stateAt(h) === "blocked"
                        ? "Закрыто"
                        : "Свободно"}
                  </span>
                  <button
                    className="button button-small button-outline"
                    disabled={
                      !!busy ||
                      stateAt(h) === "reserved" ||
                      !isFutureSlot(slotDay, h)
                    }
                    onClick={() =>
                      setAvailability([h], stateAt(h) !== "blocked")
                    }
                  >
                    {stateAt(h) === "blocked" ? "Открыть" : "Закрыть"}
                  </button>
                </div>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
