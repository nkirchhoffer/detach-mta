require('dotenv').config();
const SMTPServer = require('smtp-server').SMTPServer;
const fs = require('fs');
const simpleParser = require('mailparser').simpleParser;
const {SMTPClient} = require('smtp-client');
const SMTPComposer = require('nodemailer/lib/mail-composer');

const client = new SMTPClient({
  host: process.env.SMTP_SERVER,
  port: process.env.SMTP_PORT
});

const parseMail = (stream, session, callback) => {
  const options = {};
  simpleParser(stream, options).then(parsed => {
    const attachments = parsed.attachments;
    
    const html = parsed.text + '<br /><br />Les pièces-jointes de cet email ont été détachées';
    
    client.connect();
    client.greet({ hostname: process.env.SMTP_HOSTNAME});
    const token = Buffer.from(`\u0000${process.env.AUTH_USERNAME}\u0000${process.env.AUTH_PASSWORD}`, 'utf-8').toString('base64');
    client.write(`AUTH PLAIN ${token}\r\n`);
    //client.authPlain({ username: process.env.AUTH_USERNAME, password: process.env.AUTH_PASSWORD });
 
    client.write(`XFORWARD NAME=${process.env.SMTP_HOSTNAME} ADDR=${process.env.SMTP_ADDR} PROTO=ESMTP\r\n`, 'utf-8');
    client.write(`XFORWARD HELO=${process.env.SMTP_HOSTNAME}\r\n`, 'utf-8');

    client.mail({ from: parsed.from.text });
    client.rcpt({ to: parsed.to.text });

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
      client.data(data);
      client.quit();
      console.log(`Message ${parsed.subject} sent successfully`);
    });
  })
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
