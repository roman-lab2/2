import test from "node:test";
import assert from "node:assert/strict";
import {
  addDays,
  moscowDate,
  isFutureSlot,
  slotISO,
  normalizePhone,
} from "../lib/schedule.ts";
test("Moscow date stays correct across UTC midnight and month boundaries", () => {
  assert.equal(moscowDate(new Date("2026-11-08T21:30:00Z")), "2026-11-09");
  assert.equal(addDays("2026-12-31", 1), "2027-01-01");
  assert.equal(slotISO("2026-11-09", 9), "2026-11-09T06:00:00.000Z");
});
test("booking cutoff rejects elapsed time and the next 30 minutes", () => {
  const now = new Date("2026-11-09T06:35:00Z");
  assert.equal(isFutureSlot("2026-11-09", 9, now), false);
  assert.equal(isFutureSlot("2026-11-09", 10, now), false);
  assert.equal(isFutureSlot("2026-11-09", 11, now), true);
});
test("Russian phones normalize common formats and reject incomplete numbers", () => {
  assert.equal(normalizePhone("8 (999) 123-45-67"), "+79991234567");
  assert.equal(normalizePhone("9991234567"), "+79991234567");
  assert.equal(normalizePhone("+7 (000) 000-00-00"), "+70000000000");
  assert.equal(normalizePhone("+1 555 123 4567"), null);
  assert.equal(normalizePhone("12345"), null);
});
