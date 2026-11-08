export function normalizeEmail(value: string) {
  const email = value.trim().toLowerCase();
  return email.length <= 254 &&
    /^[a-z0-9._%+!-]+@[a-z0-9.-]+\.[a-z]{2,63}$/.test(email)
    ? email
    : null;
}
export type MailStatus = {
  configured: boolean;
  active: boolean;
  sender?: string | null;
  last_poll_at?: string | null;
  remaining_quota?: number | null;
};
export type MailQueueItem = {
  id: string;
  booking_id: string;
  event: string;
  state: string;
  attempts: number;
  last_error: string | null;
  created_at: string;
  sent_at: string | null;
};
export const mailStateLabels: Record<string, string> = {
  pending: "Письмо в очереди",
  processing: "Письмо отправляется",
  sent: "Передано почтовому сервису",
  failed: "Ошибка отправки",
  uncertain: "Результат отправки не подтверждён",
  superseded: "Уведомление больше не актуально",
};
