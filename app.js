require('dotenv').config();
const SMTPServer = require('smtp-server').SMTPServer;
const fs = require('fs');
const simpleParser = require('mailparser').simpleParser;
const SMTPConnection = require('nodemailer/lib/smtp-connection');
const SMTPComposer = require('nodemailer/lib/mail-composer');

const connection = new SMTPConnection({
  host: process.env.SMTP_HOST,
  port: parseInt(process.env.SMTP_PORT),
  secure: process.env.SMTP_SECURE === 'true' ? true : false,
});

const parseMail = (stream, session, callback) => {
  const options = {};
  simpleParser(stream, options).then(parsed => {
    const attachments = parsed.attachments;
    
    const html = parsed.text + '<br /><br />Les pièces-jointes de cet email ont été détachées';

    connection.login({
      user: process.env.AUTH_USERNAME,
      pass: process.env.AUTH_PASSWORD
    });

    connection._socket.write(`XFORWARD NAME=${process.env.SMTP_SERVER} ADDR=${process.env.SMTP_ADDR} PROTO=ESMTP\r\n`, 'utf-8');
    connection._socket.write(`XFORWARD HELO=${process.env.SMTP_SERVER}\r\n`, 'utf-8');

    const mail = new SMTPComposer({
      to: parsed.to,
      from: parsed.from,
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

    const envelope = {
      to: parsed.to,
      from: parsed.from
    };

    mail.compile().build((err, message) => {
      const data = message.toString();
      connection.send(envelope, data);
      connection.quit();
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
