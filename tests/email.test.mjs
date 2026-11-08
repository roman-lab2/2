import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";
import { normalizeEmail } from "../lib/email.ts";
const source = readFileSync(
  new URL("../public/setup/autera-mail.js", import.meta.url),
  "utf8",
);
const config = {
  url: "https://example.supabase.co",
  publicKey: "public-key",
  token: "a".repeat(64),
  sender: "sender@gmail.com",
  address: "Демо — Москва",
  siteUrl: "https://autera.example",
  demo: true,
};
function worker({
  account = "sender@gmail.com",
  quota = 100,
  throwMail = null,
  failAckOnce = false,
  journal = {},
} = {}) {
  const queue = [
    {
      id: "job-1",
      lease_id: "lease-1",
      event: "confirmed",
      email: "recipient@example.com",
      customer_name: "<img src=x onerror=alert(1)>",
      reference: "AU-DEMO",
      starts_at: "2026-11-09T06:00:00Z",
    },
  ];
  const calls = [];
  const sent = [];
  let used = false;
  let ackFailed = false;
  const context = {
    JSON,
    Object,
    String,
    Math,
    Date,
    Error,
    Session: { getEffectiveUser: () => ({ getEmail: () => account }) },
    Utilities: {
      formatDate: (_d, _tz, pattern) =>
        pattern === "HH:mm" ? "09:00" : "09.11.2026",
    },
    LockService: {
      getScriptLock: () => ({ tryLock: () => true, releaseLock: () => {} }),
    },
    MailApp: {
      getRemainingDailyQuota: () => quota,
      sendEmail: (message) => {
        if (throwMail) throw Error(throwMail);
        sent.push(message);
      },
    },
    PropertiesService: {
      getScriptProperties: () => ({
        getProperties: () => ({ ...journal }),
        setProperty: (key, value) => {
          journal[key] = value;
        },
        deleteProperty: (key) => {
          delete journal[key];
        },
      }),
    },
    UrlFetchApp: {
      fetch: (url, options) => {
        const body = JSON.parse(options.payload);
        calls.push({ url, body });
        if (url.endsWith("autera_mail_finish") && failAckOnce && !ackFailed) {
          ackFailed = true;
          throw Error("NETWORK");
        }
        let result = null;
        if (url.endsWith("autera_mail_next") && !used && body.p_quota > 0) {
          used = true;
          result = queue[0];
        }
        if (url.endsWith("autera_mail_finish")) result = true;
        return {
          getResponseCode: () => 200,
          getContentText: () => JSON.stringify(result),
        };
      },
    },
  };
  vm.createContext(context);
  vm.runInContext(
    source.replace(
      "const AUTERA = {}; // AUTERA_CONFIG",
      "const AUTERA = " + JSON.stringify(config) + ";",
    ),
    context,
  );
  return { context, calls, sent, journal };
}
test("email validation trims and normalizes, rejects headers and missing addresses", () => {
  assert.equal(normalizeEmail("  DEMO+1@Example.COM  "), "demo+1@example.com");
  for (const email of [
    "",
    "a@",
    "a@example.com\r\nBcc: victim@example.com",
    "a,b@example.com",
    "name @example.com",
  ])
    assert.equal(normalizeEmail(email), null);
});
test("worker refuses a different Google account before any API call or email", () => {
  const w = worker({ account: "admin@gmail.com" });
  assert.throws(() => w.context.sendAuteraEmails(), /WRONG_GOOGLE_ACCOUNT/);
  assert.equal(w.sent.length, 0);
  assert.equal(w.calls.length, 0);
});
test("confirmation contains Moscow date, demo address and escaped HTML", () => {
  const w = worker();
  assert.equal(w.context.sendAuteraEmails(), 1);
  assert.equal(w.sent.length, 1);
  const message = w.sent[0];
  assert.match(message.body, /09.11.2026 в 09:00 \(МСК\)/);
  assert.match(message.body, /Демо — Москва/);
  assert.match(message.htmlBody, /&lt;img/);
  assert.doesNotMatch(message.htmlBody, /<img src=x/);
  assert.equal(message.replyTo, "sender@gmail.com");
  assert.equal(
    w.calls.filter((c) => c.url.endsWith("autera_mail_finish")).length,
    1,
  );
});
test("exhausted free quota does not claim or send a message", () => {
  const w = worker({ quota: 0 });
  assert.equal(w.context.sendAuteraEmails(), 0);
  assert.equal(w.sent.length, 0);
  assert.equal(w.calls[0].body.p_quota, 0);
});
test("lost acknowledgement is repaired without sending the email twice", () => {
  const w = worker({ failAckOnce: true });
  assert.throws(() => w.context.sendAuteraEmails(), /NETWORK/);
  assert.equal(w.sent.length, 1);
  assert.equal(Object.keys(w.journal).length, 1);
  w.context.sendAuteraEmails();
  assert.equal(w.sent.length, 1);
  assert.equal(Object.keys(w.journal).length, 0);
});
test("uncertain send errors stop automatic resending", () => {
  const w = worker({ throwMail: "unexpected transport failure" });
  assert.equal(w.context.sendAuteraEmails(), 0);
  const report = w.calls.find((c) => c.url.endsWith("autera_mail_finish"));
  assert.equal(report.body.p_result, "uncertain");
  assert.equal(report.body.p_error, "DELIVERY_UNCERTAIN");
});
test("declined and cancelled messages state the right decision", () => {
  const w = worker();
  for (const event of ["declined", "cancelled"]) {
    const message = w.context.auteraMessage_({
      event,
      customer_name: "Демо",
      reference: "AU-TEST",
      starts_at: "2026-11-09T06:00:00Z",
    });
    assert.match(
      message.text,
      event === "declined" ? /не подтверждена/ : /отменена/,
    );
    assert.match(message.text, /время освобождено/);
  }
});
