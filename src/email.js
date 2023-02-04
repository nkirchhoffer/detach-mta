import { SMTPChannel } from 'smtp-channel';
import SMTPComposer from 'nodemailer/lib/mail-composer/index.js';

const channel = new SMTPChannel({
    host: process.env.SMTP_SERVER,
    port: process.env.SMTP_PORT
  });
const handler = console.log;

import Handlebars from 'handlebars';
import { JSDOM } from 'jsdom';

export default async function sendEmail(message) {
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
      await channel.connect({ handler, timeout: 3000 });
      await channel.write(`EHLO ${process.env.SMTP_HOSTNAME}\r\n`, { handler });
      let token = Buffer.from(`\u0000${process.env.SMTP_USER}\u0000${process.env.SMTP_PASSWORD}`, 'utf-8').toString('base64');
      await channel.write(`AUTH PLAIN ${token}\r\n`, { handler });
    
      const received = message.headers.get('received');
      const sender = received.split('(')[1].split(' ');
      const hostname = sender[0];
      const addr = sender[1].substr(1, sender[1].length - 3);
    
      //await channel.write(`XFORWARD HELO=${hostname} NAME=${hostname} ADDR=${addr} PROTO=ESMTP\r\n`, { handler });
      //await channel.write(`XFORWARD IDENT=${message.messageId}\r\n`, { handler });
      console.log(`MAIL FROM ${message.from.text}`);
    
      let from = message.from.text.match(/\<(.*)\>/);
      if (!from) {
        from = message.from.text;
      } else {
        from = from[1];
      }
    
      channel.on('close', () => console.log('Channel has been closed'));
    
      await channel.write(`MAIL FROM: ${from}\r\n`, { handler })
      await channel.write(`RCPT TO: ${message.to.text}\r\n`, { handler });
    
      const data = (await mail.compile().build()).toString();
      await channel.write('DATA\r\n', { handler });
      await channel.write(`${data.replace(/^\./m, '..')}\r\n.\r\n`, { handler });
      await channel.write('QUIT\r\n', { handler })
      await channel.close();
      console.log(`Message ${message.subject} sent successfully`);
};

export default function generateBody(messageBody, items) {
    const bars = fs.readFileSync(path.join('./templates', 'template.html.hbs'));
    const template = Handlebars.compile(bars.toString('utf-8'));

    const html = template({
      count: items.length,
      one: items.length === 1 ? 1 : 0,
      items
    });

    const dom = new JSDOM(messageBody);
    const body = dom.window.document.querySelector('body');
    const detachment = new JSDOM(html);

    console.log("detachment.window.document : \n" + detachment.window.document.querySelector('body'));
    body.appendChild(detachment.window.document.querySelector('body'));

    return dom.serialize();
}