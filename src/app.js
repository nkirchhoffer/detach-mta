import 'dotenv/config';
import { SMTPServer } from 'smtp-server';
import { simpleParser } from 'mailparser';

import uploadAttachments from './ipfs.js';
import { generateBody, sendEmail, computeSize, computeRecipientsCount, hasAttachments } from './email.js';
import { storeMailInfo } from './metrics.js';

const parseMail = async (stream) => {
  const options = {};
  const parsed = await simpleParser(stream, options);

  const metrics = {
    date: '',
    inboundSize: 0,
    outboundSize: 0,
    recipientsCount: 0,
    sender: '',
    hasAttachments: true
  };

  metrics.date = parsed.date.toISOString();
  metrics.recipientsCount = computeRecipientsCount(parsed);
  metrics.sender = parsed.from.text;
  metrics.inboundSize = computeSize(parsed);

  const attachments = parsed.attachments;
  const items = await uploadAttachments(attachments);

  if (items.length > 0) {
    parsed.html = generateBody(parsed.html, items);
    parsed.attachments = [];
    metrics.outboundSize = computeSize(parsed);
    metrics.hasAttachments = true;
    storeMailInfo(metrics);

    return parsed;
  }

  metrics.hasAttachments = false;
  metrics.outboundSize = computeSize(parsed);
  await storeMailInfo(metrics);

  parsed.html = parsed.html;
  return parsed;
}

const server = new SMTPServer({
  authOptional: true,
  onData: async (stream, session, callback) => {
    const mail = await parseMail(stream);

    await sendEmail(mail);
  },
  onAuth(auth, session, callback) {
    if (auth.username !== process.env.AUTH_USERNAME || auth.password !== process.env.AUTH_PASSWORD) {
      return callback(new Error('Invalid username or password'));
    }
    callback(null, { user: '123' });
  }
});

server.listen(process.env.SMTP_PROXY_PORT);
