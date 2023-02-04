import 'dotenv/config';
import { SMTPServer } from 'smtp-server';
import { simpleParser } from 'mailparser';

import uploadAttachments from './ipfs.js';
import { generateBody, sendEmail, computeSize } from './email.js';

import { createServer, observeInbound, observeOutbound, incrementEmailCounter } from './metrics.js';

const parseMail = async (stream) => {
  const options = {};
  const parsed = await simpleParser(stream, options);

  console.log(`Taille du mail entrant: ${computeSize(parsed)}`);
  incrementEmailCounter();
  observeInbound(computeSize(parsed));

  const attachments = parsed.attachments;
  const items = await uploadAttachments(attachments);

  if (items.length > 0) {
    parsed.html = generateBody(parsed.html, items);
    observeOutbound(computeSize(parsed));
    return parsed;
  }

  parsed.html = parsed.html;
  observeOutbound(computeSize(parsed));
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

const PROMETHEUS_PORT = process.env.PROMETHEUS_PORT ?? 9000;
createServer().listen(PROMETHEUS_PORT, () => {
  console.log(`Prometheus metrics exposed on ${PROMETHEUS_PORT}`)
});

server.listen(process.env.SMTP_PROXY_PORT);
