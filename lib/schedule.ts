export const TIME_ZONE = "Europe/Moscow";
export const HOURS = Array.from({ length: 10 }, (_, i) => i + 9);
export function moscowDate(now = new Date()) {
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(now);
}
export function addDays(day: string, count: number) {
  const date = new Date(`${day}T12:00:00+03:00`);
  date.setUTCDate(date.getUTCDate() + count);
  return moscowDate(date);
}
export function slotISO(day: string, hour: number) {
  return new Date(
    `${day}T${String(hour).padStart(2, "0")}:00:00+03:00`,
  ).toISOString();
}
export function isFutureSlot(day: string, hour: number, now = new Date()) {
  return (
    new Date(slotISO(day, hour)).getTime() > now.getTime() + 30 * 60 * 1000
  );
}
export function formatDate(iso: string, long = false) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: TIME_ZONE,
    day: "numeric",
    month: long ? "long" : "short",
    ...(long ? { year: "numeric" as const } : {}),
  }).format(new Date(iso));
}
export function formatTime(iso: string) {
  return new Intl.DateTimeFormat("ru-RU", {
    timeZone: TIME_ZONE,
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(iso));
}
export function normalizePhone(value: string) {
  let digits = value.replace(/\D/g, "");
  if (digits.length === 11 && digits[0] === "8") digits = "7" + digits.slice(1);
  if (digits.length === 10) digits = "7" + digits;
  return digits.length === 11 && digits[0] === "7" ? "+" + digits : null;
}
