require('dotenv').config();
const {SMTPServer} = require('smtp-server');
const {simpleParser} = require('mailparser');
const {SMTPChannel} = require('smtp-channel');
const SMTPComposer = require('nodemailer/lib/mail-composer');
const Handlebars = require('handlebars');

const fs = require('fs');
const path = require('path');
const STORAGE_PATH = path.join(__dirname, 'files');

const channel = new SMTPChannel({
  host: process.env.SMTP_SERVER,
  port: process.env.SMTP_PORT
});
const handler = console.log;

const parseMail = async (stream) => {
  const options = {};
  const parsed = await simpleParser(stream, options)
  const attachments = parsed.attachments;

  const id = parsed.messageId.split('@')[0].substring(1)
  const items = await processAttachments(id, attachments);

  if (items.length > 0) {
    const bars = fs.readFileSync(path.join(__dirname, 'template.bars'));
    const template = Handlebars.compile(bars.toString('utf-8'));

    const html = template({
      data: parsed.html,
      count: items.length,
      one: items.length === 1 ? 1 : 0,
      items
    });

    parsed.html = html;
    return parsed;
  }

  parsed.html = parsed.html;
  return parsed;
}

const processAttachments = async (messageId, attachments) => {
  const items = [];
  const messageDir = path.join(STORAGE_PATH, messageId);
  fs.mkdirSync(messageDir, console.error);
  for (let i = 0; i < attachments.length; i++) {
    const attachment = attachments[i];
    const uri = path.join(messageDir, attachment.filename);
    fs.writeFileSync(uri, attachment.content, console.error);

    const url = new URL(path.join(messageId, attachment.filename), process.env.CDN_SERVER_BASE);

    items.push({
      filename: attachment.filename,
      url: url.href
    });
  }

  return items;
}

const sendEmail = async (message) => {
  const mail = new SMTPComposer({
    to: message.to.text,
    from: message.from.text,
    cc: message.cc,
    bcc: message.bcc,
    subject: message.subject,
    text: message.text,
    html: message.html,
    replyTo: message.replyTo,
    inReplyTo: message.inReplyTo,
    references: message.references,
    encoding: 'utf-8',
    messageId: message.messageId,
    date: message.date
  });

  /**
   * BEGINNING OF SMTP TRANSMISSION
   * COMMANDS EXPLAINED ON RFC 821
   * XFORWARD FOR POSTFIX PROXY
   */
  await channel.connect();
  await channel.write(`EHLO ${process.env.SMTP_HOSTNAME}\r\n`, {handler});
  let token = Buffer.from(`\u0000${process.env.SMTP_USER}\u0000${process.env.SMTP_PASSWORD}`, 'utf-8').toString('base64');
  await channel.write(`AUTH PLAIN ${token}\r\n`, {handler});

  const received = message.headers.received;
  const sender = received.split('(').split(' ');
  const hostname = sender[0];
  const addr = sender[1].substr(1,sender[1].length-3);

  await channel.write(`XFORWARD NAME=${hostname} ADDR=${addr} PROTO=ESMTP\r\n`, {handler});
  const id = message.messageId.split('@')[0].substring(1);
  await channel.write(`XFORWARD IDENT=${id}\r\n`, {handler});
  console.log(`MAIL FROM ${message.from.text}`);

  let from = message.from.text.match(/\<(.*)\>/);
  if (!from) {
    from = message.from.text;
  } else {
    from = from[1];
  }

  await channel.write(`MAIL FROM: ${from}\r\n`, {handler})
  await channel.write(`RCPT TO: ${message.to.text}\r\n`, {handler});

  const data = (await mail.compile().build()).toString();
  await channel.write('DATA\r\n', {handler});
  await channel.write(`${data.replace(/^\./m,'..')}\r\n.\r\n`, {handler});
  await channel.write(`QUIT\r\n`, {handler});
  console.log(`Message ${message.subject} sent successfully`);
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