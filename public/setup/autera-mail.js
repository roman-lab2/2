// Autera: paste into Code.gs in a separate Google Apps Script project.
// The admin panel replaces this configuration before copying.
const AUTERA = {}; // AUTERA_CONFIG

function installAuteraMail() {
  auteraCheckSender_();
  MailApp.getRemainingDailyQuota(); // Requests permission to send, not read mail.
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'sendAuteraEmails') ScriptApp.deleteTrigger(trigger);
  });
  ScriptApp.newTrigger('sendAuteraEmails').timeBased().everyMinutes(1).create();
  return sendAuteraEmails();
}

function stopAuteraMail() {
  ScriptApp.getProjectTriggers().forEach(function (trigger) {
    if (trigger.getHandlerFunction() === 'sendAuteraEmails') ScriptApp.deleteTrigger(trigger);
  });
}

function auteraCheckSender_() {
  if (!AUTERA.url || !AUTERA.publicKey || !AUTERA.token || !AUTERA.sender) throw new Error('AUTERA_CONFIG_MISSING');
  const actual = Session.getEffectiveUser().getEmail().trim().toLowerCase();
  if (actual !== AUTERA.sender.trim().toLowerCase()) throw new Error('WRONG_GOOGLE_ACCOUNT: open the configured sender account');
  return actual;
}

function auteraRpc_(name, body) {
  const response = UrlFetchApp.fetch(AUTERA.url + '/rest/v1/rpc/' + name, {
    method: 'post', contentType: 'application/json',
    headers: { apikey: AUTERA.publicKey },
    payload: JSON.stringify(Object.assign({p_token: AUTERA.token, p_sender: AUTERA.sender}, body)),
    muteHttpExceptions: true,
  });
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) throw new Error('AUTERA_API_' + response.getResponseCode());
  return JSON.parse(response.getContentText());
}

function auteraAcknowledge_(id, lease) {
  const done = auteraRpc_('autera_mail_finish', {p_id: id, p_lease: lease, p_result: 'sent', p_error: null});
  if (!done) throw new Error('AUTERA_ACK_NOT_SAVED');
}

function sendAuteraEmails() {
  auteraCheckSender_();
  const lock = LockService.getScriptLock();
  if (!lock.tryLock(1000)) return 0;
  const journal = PropertiesService.getScriptProperties();
  let sent = 0;
  try {
    // Repair an interrupted acknowledgement without sending the email again.
    const pending = journal.getProperties();
    Object.keys(pending).filter(function (key) { return key.indexOf('autera_sent_') === 0; }).forEach(function (key) {
      const receipt = JSON.parse(pending[key]);
      auteraAcknowledge_(receipt.id, receipt.lease);
      journal.deleteProperty(key);
    });
    for (let i = 0; i < 10; i++) {
      const quota = Math.min(100, MailApp.getRemainingDailyQuota());
      const job = auteraRpc_('autera_mail_next', {p_quota: quota});
      if (!job) break;
      const message = auteraMessage_(job);
      try {
        MailApp.sendEmail({to: job.email, subject: message.subject, body: message.text, htmlBody: message.html, name: 'Autera', replyTo: AUTERA.sender});
      } catch (error) {
        const details = String(error && error.message || error).toLowerCase();
        const quotaError = /quota|too many times|limit exceeded/.test(details);
        const invalid = /invalid email|invalid recipient|invalid argument.*recipient/.test(details);
        auteraRpc_('autera_mail_finish', {p_id: job.id, p_lease: job.lease_id, p_result: quotaError || invalid ? 'failed' : 'uncertain', p_error: quotaError ? 'DAILY_QUOTA' : invalid ? 'INVALID_RECIPIENT' : 'DELIVERY_UNCERTAIN'});
        if (!invalid) break;
        continue;
      }
      // Keep the receipt until the server confirms it was saved.
      const key = 'autera_sent_' + job.id;
      journal.setProperty(key, JSON.stringify({id: job.id, lease: job.lease_id}));
      auteraAcknowledge_(job.id, job.lease_id);
      journal.deleteProperty(key);
      sent++;
    }
    return sent;
  } finally {
    lock.releaseLock();
  }
}

function auteraEscape_(value) {
  return String(value).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
}

function auteraMessage_(job) {
  const date = new Date(job.starts_at);
  const day = Utilities.formatDate(date, 'Europe/Moscow', 'dd.MM.yyyy');
  const time = Utilities.formatDate(date, 'Europe/Moscow', 'HH:mm');
  const confirmed = job.event === 'confirmed';
  const title = confirmed ? 'Ваша запись подтверждена' : job.event === 'declined' ? 'Запись не подтверждена' : 'Ваша запись отменена';
  const detail = confirmed
    ? 'Ожидаем вас ' + day + ' в ' + time + ' (МСК) по адресу: ' + AUTERA.address + '.'
    : 'Запись на ' + day + ' в ' + time + ' (МСК) ' + (job.event === 'declined' ? 'не подтверждена' : 'отменена') + '. Выбранное время освобождено. Вы можете выбрать другую дату на сайте.';
  const demo = AUTERA.demo ? 'Это демонстрационный проект. Реального визита нет, приезжать по указанному адресу не нужно.' : '';
  const greeting = 'Здравствуйте, ' + job.customer_name + '!';
  const text = [greeting,title+'.',detail,'Номер записи: '+job.reference,demo,'Autera: '+AUTERA.siteUrl].filter(Boolean).join('\n\n');
  const e = auteraEscape_;
  const html = '<!doctype html><html lang="ru"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>'+e(title)+'</title></head><body style="margin:0;padding:24px 12px;background:#edf5fb;font-family:Arial,Helvetica,sans-serif;color:#183447"><table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:580px;background:#ffffff;border:1px solid #caddeb"><tr><td style="padding:30px 26px"><p style="margin:0 0 24px;font-size:24px;font-weight:bold">AUTERA.</p><p style="font-size:16px;line-height:1.6">'+e(greeting)+'</p><h1 style="font-size:26px;line-height:1.3;margin:16px 0">'+e(title)+'</h1><p style="font-size:16px;line-height:1.7">'+e(detail)+'</p><p style="font-size:16px;line-height:1.7"><strong>Номер записи:</strong> '+e(job.reference)+'</p><p style="font-size:16px;line-height:1.7;color:#4e6a80">'+e(demo)+'</p><table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#72afe0" style="border-radius:3px"><a href="'+e(AUTERA.siteUrl)+'/booking/" style="display:inline-block;padding:15px 22px;color:#183447;font-size:16px;text-decoration:none;font-weight:bold">Открыть сайт Autera</a></td></tr></table><p style="margin:26px 0 0;font-size:13px;line-height:1.7;color:#4e6a80">Это письмо отправлено в связи с вашей записью в Autera. Если вы не записывались, сообщите об этом ответным письмом.</p></td></tr></table></td></tr></table></body></html>';
  return {subject:'Autera: '+title.toLowerCase()+' · '+job.reference,text:text,html:html};
}
