"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { services, money } from "@/lib/catalog";
import { MailStatus, normalizeEmail } from "@/lib/email";
import { supabase } from "@/lib/supabase/client";
import {
  addDays,
  formatDate,
  formatTime,
  HOURS,
  isFutureSlot,
  moscowDate,
  normalizePhone,
  slotISO,
} from "@/lib/schedule";

type Slot = { starts_at: string; state: string };
export default function BookingPage() {
  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState("");
  const [day, setDay] = useState("");
  const [hour, setHour] = useState<number | null>(null);
  const [slots, setSlots] = useState<Slot[]>([]);
  const [loading, setLoading] = useState(false);
  const [slotError, setSlotError] = useState("");
  const [refresh, setRefresh] = useState(0);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [mailStatus, setMailStatus] = useState<MailStatus | null>(null);
  const [car, setCar] = useState("");
  const [comment, setComment] = useState("");
  const [consent, setConsent] = useState(false);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<{
    id: string;
    starts: string;
    email: string;
  } | null>(null);
  const [today, setToday] = useState("");
  const id = useRef("");
  const submittedPayload = useRef("");
  useEffect(() => {
    supabase.rpc("autera_mail_status").then(({ data }) => setMailStatus(data));
    const date = moscowDate();
    setToday(date);
    setDay(date);
    const query = new URLSearchParams(window.location.search).get("service");
    if (services.some((s) => s.id === query)) {
      setServiceId(query!);
      setStep(2);
    }
  }, []);
  useEffect(() => {
    const timer = setInterval(() => {
      setToday(moscowDate());
      setRefresh((r) => r + 1);
    }, 20000);
    return () => clearInterval(timer);
  }, []);
  useEffect(() => {
    if (!day) return;
    let active = true;
    setLoading(true);
    setSlotError("");
    supabase
      .from("autera_slots")
      .select("starts_at,state")
      .gte("starts_at", slotISO(day, 0))
      .lt("starts_at", slotISO(addDays(day, 1), 0))
      .then(({ data, error }) => {
        if (!active) return;
        setLoading(false);
        if (error) {
          setSlotError(
            "Не удалось получить свободное время. Проверьте соединение и повторите.",
          );
          setSlots([]);
        } else {
          setSlots(data || []);
        }
      });
    return () => {
      active = false;
    };
  }, [day, refresh]);
  const service = services.find((s) => s.id === serviceId);
  const stateAt = (h: number) =>
    slots.find(
      (s) =>
        new Date(s.starts_at).getTime() === new Date(slotISO(day, h)).getTime(),
    )?.state;
  const unavailable = (h: number) =>
    !isFutureSlot(day, h) || ["reserved", "blocked"].includes(stateAt(h) || "");
  useEffect(() => {
    if (step === 3 && id.current) return;
    if (
      hour !== null &&
      (!isFutureSlot(day, hour) ||
        slots.some(
          (s) =>
            new Date(s.starts_at).getTime() ===
              new Date(slotISO(day, hour)).getTime() && s.state !== "available",
        ))
    ) {
      setHour(null);
      setError("Выбранное время уже недоступно. Выберите другой слот.");
      if (step === 3) setStep(2);
    }
  }, [slots, day, hour, step]);
  const selectedISO = day && hour !== null ? slotISO(day, hour) : "";
  function move(next: number) {
    setError("");
    setStep(next);
    requestAnimationFrame(() => {
      const heading = document.getElementById("booking-heading");
      heading?.focus({ preventScroll: true });
      heading?.scrollIntoView({ block: "start" });
    });
  }
  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (saving) return;
    setError("");
    const normalizedEmail = normalizeEmail(email);
    if (!normalizedEmail) {
      setError(
        "Укажите корректную электронную почту для уведомления о записи.",
      );
      return;
    }
    const normalized = normalizePhone(phone);
    if (!normalized) {
      setError(
        "Введите российский телефон: +7 и 10 цифр. Для демо можно +7 (000) 000-00-00.",
      );
      return;
    }
    if (!service || !selectedISO || !isFutureSlot(day, hour!)) {
      setError("Выберите доступное время записи.");
      return;
    }
    if (!consent || name.trim().length < 2 || car.trim().length < 2) {
      setError("Заполните имя, автомобиль и согласие на обработку данных.");
      return;
    }
    setSaving(true);
    const payload = JSON.stringify([
      serviceId,
      selectedISO,
      name.trim(),
      normalized,
      normalizedEmail,
      car.trim(),
      comment.trim(),
      consent,
    ]);
    if (!id.current || submittedPayload.current !== payload) {
      id.current = crypto.randomUUID();
      submittedPayload.current = payload;
    }
    try {
      const { error } = await supabase.rpc("autera_book", {
        p_id: id.current,
        p_service: serviceId,
        p_starts_at: selectedISO,
        p_name: name.trim(),
        p_phone: normalized,
        p_email: normalizedEmail,
        p_car: car.trim(),
        p_comment: comment.trim(),
        p_consent: consent,
      });
      if (error) {
        if (
          error.message.includes("SLOT_UNAVAILABLE") ||
          error.code === "23505"
        ) {
          setError(
            "Это время только что заняли. Выберите другой свободный слот.",
          );
          setHour(null);
          setRefresh((r) => r + 1);
          setStep(2);
          id.current = "";
        } else if (error.message.includes("EMAIL_REQUIRED")) {
          setError(
            "Для записи нужна электронная почта. Проверьте поле или обновите страницу.",
          );
        } else if (error.message.includes("BOOKING_LIMIT")) {
          setError(
            "Для этого телефона уже есть 3 предстоящие записи. Администратор может отменить лишние.",
          );
        } else if (error.message.includes("INVALID_TIME")) {
          setError("Время недоступно. Выберите другой слот.");
          setStep(2);
          setRefresh((r) => r + 1);
        } else {
          setError(
            "Не удалось сохранить запись. Проверьте соединение и повторите. Если запрос уже прошёл, повторная попытка не создаст вторую запись.",
          );
        }
      } else {
        setResult({
          id: id.current,
          starts: selectedISO,
          email: normalizedEmail,
        });
      }
    } catch {
      setError("Нет соединения с сервисом. Попробуйте ещё раз.");
    } finally {
      setSaving(false);
    }
  }
  function downloadCalendar() {
    if (!result || !service) return;
    const stamp = (d: Date) =>
      d
        .toISOString()
        .replace(/[-:]/g, "")
        .replace(/\.\d{3}/, "");
    const start = new Date(result.starts);
    const content = [
      "BEGIN:VCALENDAR",
      "VERSION:2.0",
      "PRODID:-//AUTERA//Demo booking//RU",
      "BEGIN:VEVENT",
      "UID:" + result.id + "@autera.demo",
      "DTSTAMP:" + stamp(new Date()),
      "DTSTART:" + stamp(start),
      "DTEND:" + stamp(new Date(start.getTime() + 3600000)),
      "SUMMARY:AUTERA — " + service.name + " (демо)",
      "DESCRIPTION:Демонстрационная запись. Реального визита нет.",
      "END:VEVENT",
      "END:VCALENDAR",
    ].join("\r\n");
    const url = URL.createObjectURL(
      new Blob([content], { type: "text/calendar;charset=utf-8" }),
    );
    const a = document.createElement("a");
    a.href = url;
    a.download = "autera-booking.ics";
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 30000);
  }
  if (result)
    return (
      <main id="main" className="container booking-main">
        <div className="success-card">
          <span className="success-icon">
            <Icon name="check" size={36} />
          </span>
          <h1>Запись сохранена</h1>
          <p className="reference">
            № AU-{result.id.replace(/-/g, "").slice(0, 10).toUpperCase()}
          </p>
          <div className="success-details">
            <div>
              <span>Услуга</span>
              <strong>{service?.name}</strong>
            </div>
            <div>
              <span>Когда</span>
              <strong>
                {formatDate(result.starts, true)}, {formatTime(result.starts)}{" "}
                МСК
              </strong>
            </div>
            <div>
              <span>Автомобиль</span>
              <strong>{car}</strong>
            </div>
          </div>
          <p>
            Время зарезервировано. Администратор проверит запись, а решение
            придёт на <strong>{result.email}</strong>.
          </p>
          {!mailStatus?.active && (
            <p className="alert">
              Автоотправка демо пока не подключена или временно не работает.
              Решение сохранится в системе; отправка станет доступна после
              подключения почты владельцем.
            </p>
          )}
          <p>Это демо: приезжать по демонстрационному адресу не нужно.</p>
          <p className="small muted">
            Сохраните номер записи. Для отмены демонстрационной записи
            обратитесь к владельцу проекта.
          </p>
          <div className="success-actions">
            <button
              className="button button-primary"
              onClick={downloadCalendar}
            >
              Добавить в календарь <Icon name="calendar" size={18} />
            </button>
            <Link className="button button-outline" href="/">
              На главную
            </Link>
          </div>
        </div>
      </main>
    );
  return (
    <main id="main" className="container booking-main">
      <div className="breadcrumb">
        <Link href="/">Главная</Link>
        <span>/</span>
        <span>Онлайн-запись</span>
      </div>
      <div className="booking-intro">
        <h1>Запись в сервис</h1>
        <p>Выберите услугу и время, затем оставьте контакты.</p>
      </div>
      <div className="booking-layout">
        <div className="booking-form-panel">
          <ol className="steps">
            {["Услуга", "Дата и время", "Ваши данные"].map((label, i) => (
              <li
                className={
                  step === i + 1 ? "current" : step > i + 1 ? "done" : ""
                }
                key={label}
              >
                <button
                  onClick={() => {
                    if (i + 1 < step) move(i + 1);
                  }}
                  disabled={i + 1 >= step}
                  aria-current={step === i + 1 ? "step" : undefined}
                >
                  <span>
                    {step > i + 1 ? <Icon name="check" size={14} /> : i + 1}
                  </span>
                  {label}
                </button>
              </li>
            ))}
          </ol>
          <div className="form-body">
            <h2 id="booking-heading" tabIndex={-1}>
              {step === 1
                ? "Выберите услугу"
                : step === 2
                  ? "Выберите дату и время"
                  : "Контакты и автомобиль"}
            </h2>
            <p className="muted form-caption">
              {step === 1
                ? "Выберите одно направление обслуживания."
                : step === 2
                  ? "Время московское. Приём и первичный осмотр — 1 час."
                  : "Укажите доступную вам почту для уведомления. Имя, телефон и автомобиль для демо можно выдумать."}
            </p>
            {error && (
              <div className="alert alert-error" role="alert">
                {error}
              </div>
            )}
            {step === 1 && (
              <>
                <div
                  className="service-options"
                  role="group"
                  aria-label="Выбор услуги"
                >
                  {services.map((s) => (
                    <button
                      className={
                        "service-option " +
                        (serviceId === s.id ? "selected" : "")
                      }
                      key={s.id}
                      onClick={() => setServiceId(s.id)}
                      aria-pressed={serviceId === s.id}
                    >
                      <Icon name={s.icon} size={24} />
                      <span>
                        <strong>{s.name}</strong>
                        <small>от {money(s.price)} ₽</small>
                      </span>
                      <span className="radio-circle">
                        {serviceId === s.id && <span />}
                      </span>
                    </button>
                  ))}
                </div>
                <div className="form-actions">
                  <span className="small muted">
                    Цены за работу, без запчастей
                  </span>
                  <button
                    className="button button-primary"
                    disabled={!service}
                    onClick={() => move(2)}
                  >
                    Выбрать время <Icon size={18} />
                  </button>
                </div>
              </>
            )}
            {step === 2 && (
              <>
                <label className="field-label" htmlFor="booking-date">
                  Дата визита
                </label>
                <input
                  id="booking-date"
                  className="input date-input"
                  type="date"
                  min={today}
                  max={today ? addDays(today, 45) : ""}
                  value={day}
                  onChange={(e) => {
                    setDay(e.target.value);
                    setHour(null);
                    setError("");
                  }}
                  required
                />
                <div className="quick-dates">
                  {today &&
                    Array.from({ length: 7 }, (_, i) => addDays(today, i)).map(
                      (d, i) => (
                        <button
                          key={d}
                          className={day === d ? "selected" : ""}
                          onClick={() => {
                            setDay(d);
                            setHour(null);
                            setError("");
                          }}
                        >
                          <small>
                            {i === 0
                              ? "Сегодня"
                              : i === 1
                                ? "Завтра"
                                : new Intl.DateTimeFormat("ru-RU", {
                                    weekday: "short",
                                    timeZone: "Europe/Moscow",
                                  }).format(new Date(d + "T12:00:00+03:00"))}
                          </small>
                          <strong>{Number(d.slice(8, 10))}</strong>
                        </button>
                      ),
                    )}
                </div>
                <div className="time-heading">
                  <span className="field-label">Время приёма</span>
                  <span className="small muted">МСК · UTC+3</span>
                </div>
                {slotError ? (
                  <div className="alert alert-error" role="alert">
                    {slotError}
                    <button
                      className="text-link"
                      onClick={() => setRefresh((r) => r + 1)}
                    >
                      Повторить загрузку <Icon size={16} />
                    </button>
                  </div>
                ) : loading ? (
                  <p className="loading-text" role="status">
                    Проверяем свободное время…
                  </p>
                ) : (
                  <>
                    <div className="time-grid">
                      {day &&
                        HOURS.map((h) => (
                          <button
                            key={h}
                            disabled={unavailable(h)}
                            aria-pressed={hour === h}
                            className={hour === h ? "selected" : ""}
                            onClick={() => {
                              setHour(h);
                              setError("");
                            }}
                          >
                            {h}:00
                            {hour === h && <Icon name="check" size={15} />}
                          </button>
                        ))}
                    </div>
                    {day && HOURS.every(unavailable) && (
                      <p className="alert">
                        На этот день свободного времени нет. Выберите другую
                        дату.
                      </p>
                    )}
                    <div className="slot-legend">
                      <span>
                        <i /> Свободно
                      </span>
                      <span>
                        <i /> Недоступно
                      </span>
                    </div>
                  </>
                )}
                <div className="form-actions">
                  <button className="text-link" onClick={() => move(1)}>
                    ← Назад
                  </button>
                  <button
                    className="button button-primary"
                    disabled={hour === null || loading || !!slotError}
                    onClick={() => move(3)}
                  >
                    Продолжить <Icon size={18} />
                  </button>
                </div>
              </>
            )}
            {step === 3 && (
              <form onSubmit={submit}>
                <div className="form-grid">
                  <label className="field-label">
                    Ваше имя
                    <input
                      className="input"
                      autoComplete="off"
                      placeholder="Алексей Демо"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      required
                      minLength={2}
                      maxLength={80}
                    />
                  </label>
                  <label className="field-label">
                    Телефон
                    <input
                      className="input"
                      type="tel"
                      autoComplete="off"
                      inputMode="tel"
                      placeholder="+7 (000) 000-00-00"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      required
                      maxLength={25}
                    />
                  </label>
                  <label className="field-label span-two">
                    Электронная почта
                    <input
                      className="input"
                      type="email"
                      inputMode="email"
                      autoComplete="off"
                      autoCapitalize="none"
                      autoCorrect="off"
                      spellCheck={false}
                      placeholder="name@example.com"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      maxLength={254}
                    />
                    <span className="field-help">
                      На этот адрес придёт подтверждение записи или уведомление
                      об отмене после решения администратора.
                    </span>
                    {!mailStatus?.active && (
                      <span className="field-help">
                        Автоотправка в демо пока не подключена или временно
                        недоступна. Почта сохранится вместе с записью.
                      </span>
                    )}
                  </label>
                  <label className="field-label span-two">
                    Автомобиль
                    <input
                      className="input"
                      placeholder="Например, Kia Rio, 2020"
                      value={car}
                      onChange={(e) => setCar(e.target.value)}
                      minLength={2}
                      maxLength={120}
                      required
                    />
                  </label>
                  <label className="field-label span-two">
                    Комментарий <span className="muted">— необязательно</span>
                    <textarea
                      className="input"
                      rows={3}
                      placeholder="Что беспокоит автомобиль?"
                      value={comment}
                      onChange={(e) => setComment(e.target.value)}
                      maxLength={600}
                    />
                  </label>
                </div>
                <label className="consent">
                  <input
                    type="checkbox"
                    checked={consent}
                    onChange={(e) => setConsent(e.target.checked)}
                    required
                  />
                  <span>
                    Согласен с{" "}
                    <Link href="/privacy/" target="_blank">
                      правилами обработки данных
                    </Link>{" "}
                    и понимаю, что это демонстрационная запись.
                  </span>
                </label>
                <div className="form-actions">
                  <button
                    type="button"
                    className="text-link"
                    disabled={saving}
                    onClick={() => move(2)}
                  >
                    ← Назад
                  </button>
                  <button
                    className="button button-primary"
                    disabled={saving || !consent}
                  >
                    {saving ? "Сохраняем…" : "Забронировать время"}{" "}
                    <Icon name="check" size={18} />
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
        <aside className="booking-summary">
          <span className="eyebrow">Ваша запись</span>
          <h3>{service?.name || "Услуга не выбрана"}</h3>
          <div className="summary-line">
            <Icon name="calendar" size={18} />
            <span>
              {selectedISO
                ? formatDate(selectedISO, true)
                : "Дата пока не выбрана"}
            </span>
          </div>
          <div className="summary-line">
            <Icon name="clock" size={18} />
            <span>
              {selectedISO
                ? formatTime(selectedISO) +
                  "–" +
                  String(hour! + 1).padStart(2, "0") +
                  ":00 МСК"
                : "Удобное время — на следующем шаге"}
            </span>
          </div>
          <div className="summary-price">
            <span>Ориентир за работу</span>
            <strong>
              {service ? "от " + money(service.price) + " ₽" : "—"}
            </strong>
          </div>
          <p>
            Итоговая стоимость и длительность ремонта — после диагностики и
            согласования.
          </p>
          <div className="summary-note">
            <Icon name="shield" size={20} />
            <span>Время резервируется сразу после успешной записи.</span>
          </div>
          <span className="demo-tag">ДЕМО · МОСКВА</span>
        </aside>
      </div>
    </main>
  );
}
