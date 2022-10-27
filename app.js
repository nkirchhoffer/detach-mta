require('dotenv').config();
const SMTPServer = require('smtp-server').SMTPServer;
const fs = require('fs');
const simpleParser = require('mailparser').simpleParser;
const nodemailer = require('nodemailer');

const transporter = nodemailer.createTransport({
        host: process.env.SMTP_SERVER,
        port: process.env.SMTP_PORT,
        secure: process.env.SMTP_SECURE,
        auth: {
                user: process.env.SMTP_USER,
                pass: process.env.SMTP_PASSWORD
        }
});

const parseMail = (stream, session, callback) => {
  const options = {};
  simpleParser(stream, options).then(parsed => {
    const attachments = parsed.attachments,
    
    const html = parsed.html + '<br /><br />Les pièces-jointes de cet email ont été détachées';

    const mail = {
      to: parsed.to.text,
      from: parsed.from.text,
      cc: parsed.cc,
      bcc: parsed.bcc,
      subject: parsed.subject,
      text: parsed.text,
      html: parsed.html,
      replyTo: parsed.replyTo,
      inReplyTo: parsed.inReplyTo,
      references: parsed.references,
      encoding: 'utf-8',
      messageId: parsed.messageId,
      date: parsed.date
    };

    transporter.sendMail(mail);
    console.log(`Mail ${parsed.subject} renvoyé`);
  })
}

const server = new SMTPServer({
        onData(stream, session, callback) {
                const options = {};
                simpleParser(stream, options)
                        .then(parsed => {
                                const attachments = parsed.attachments;
                                parsed.attachments = [];
                                console.log(parsed);
                                transporter.sendMail(parsed);
                }).catch(console.error);
                stream.on('end', callback);

        },
        onAuth(auth, session, callback) {
                if (auth.username !== process.env.AUTH_USERNAME || auth.password !== process.env.AUTH_PASSWORD) {
                        return callback(new Error('Invalid username or password'));
                }
                callback(null, { user: '123' });
        }
});

server.listen(9830);
