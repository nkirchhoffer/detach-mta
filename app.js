require('dotenv').config();
const SMTPServer = require('smtp-server').SMTPServer;
const {constants} = require('crypto');
const fs = require('fs');
const simpleParser = require('mailparser').simpleParser;
const {SMTPChannel} = require('smtp-channel');
const SMTPComposer = require('nodemailer/lib/mail-composer');

const channel = new SMTPChannel({
  host: process.env.SMTP_SERVER,
  port: process.env.SMTP_PORT
});

const parseMail = (stream, session, callback) => {
  const options = {};
  simpleParser(stream, options).then(parsed => {
    const attachments = parsed.attachments;
    const handler = console.log;
    const html = parsed.text + '<br /><br />Les pièces-jointes de cet email ont été détachées';
    
    channel.connect();
    channel.write(`EHLO ${process.env.SMTP_HOSTNAME}\r\n`, {handler});
    let token = Buffer.from(`\u0000${process.env.SMTP_USER}\u0000${process.env.SMTP_PASSWORD}`, 'utf-8').toString('base64');
    channel.write(`AUTH PLAIN ${token}\r\n`, {handler});
    channel.write(`MAIL FROM: ${parsed.from.text}\r\n`, {handler})
    channel.write(`RCPT TO: ${parsed.to.text}\r\n`, {handler}); 
    channel.write(`XFORWARD NAME=${process.env.SMTP_HOSTNAME} ADDR=${process.env.SMTP_ADDR} PROTO=ESMTP\r\n`, {handler});
    channel.write(`XFORWARD HELO=${process.env.SMTP_HOSTNAME}\r\n`, {handler});

    const mail = new SMTPComposer({
      to: parsed.to.text,
      from: parsed.from.text,
      cc: parsed.cc,
      bcc: parsed.bcc,
      subject: parsed.subject,
      text: parsed.text,
      html: html,
      replyTo: parsed.replyTo,
      inReplyTo: parsed.inReplyTo,
      references: parsed.references,
      encoding: 'utf-8',
      messageId: parsed.messageId,
      date: parsed.date
    });

    mail.compile().build((err, message) => {
      const data = message.toString();
      channel.write('DATA\r\n', {handler});
      channel.write(`${data}\r\n`, {handler});
      channel.write(`.\r\n`, {handler})
      channel.write(`QUIT\r\n`, {handler});
      console.log(`Message ${parsed.subject} sent successfully`);
    });
  });
}

const server = new SMTPServer({
        authOptional: true,
        onData: parseMail,
        onAuth(auth, session, callback) {
                if (auth.username !== process.env.AUTH_USERNAME || auth.password !== process.env.AUTH_PASSWORD) {
                        return callback(new Error('Invalid username or password'));
                }
                callback(null, { user: '123' });
        }
});

server.listen(9830);
