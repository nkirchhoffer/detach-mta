import 'dotenv/config';
import { SMTPServer } from 'smtp-server';
import { simpleParser } from 'mailparser';

import uploadAttachments from './ipfs.js';
import { generateBody, sendEmail } from './email.js';


const parseMail = async (stream) => {
  const options = {};
  const parsed = await simpleParser(stream, options)
  const attachments = parsed.attachments;

  const items = await uploadAttachments(attachments);

  if (items.length > 0) {
    parsed.html = generateBody(parsed.html, items);
    return parsed;
  }

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

server.listen(9830);
