equire('dotenv').config();
const SMTPServer = require('smtp-server').SMTPServer;
const {constants} = require('crypto');
const fs = require('fs');
const util = require('util');
const simpleParser = require('mailparser').simpleParser;
const {SMTPChannel} = require('smtp-channel');
const SMTPComposer = require('nodemailer/lib/mail-composer');

const channel = new SMTPChannel({
  host: process.env.SMTP_SERVER,
  port: process.env.SMTP_PORT
});

const parseMail = async (stream, session, callback) => {
  const options = {};
  const parsed = await simpleParser(stream, options)
	const attachments = parsed.attachments;
	const handler = console.log;
	const html = parsed.text + '<br /><br />Les pièces-jointes de cet email ont été détachées';
	
	await channel.connect();
	await channel.write(`EHLO ${process.env.SMTP_HOSTNAME}\r\n`, {handler});
	let token = Buffer.from(`\u0000${process.env.SMTP_USER}\u0000${process.env.SMTP_PASSWORD}`, 'utf-8').toString('base64');
	await channel.write(`AUTH PLAIN ${token}\r\n`, {handler});
	await channel.write(`XFORWARD NAME=${process.env.TP_HOSTNAME} ADDR=${process.env.SMTP_ADDR} PROTO=ESMTP\r\n`, {handler});
	await channel.write(`XFORWARD HELO=${process.env.SMTP_HOSTNAME}\r\n`, {handler});
	console.log(`MAIL FROM ${parsed.from.text}`);
	let from = parsed.from.text.match(/\<(.*)\>/);
	if (!from) {
		from = parsed.from.text;
	} else {
		from = from[1];
	}
	console.log(from);
	await channel.write(`MAIL FROM: ${from}\r\n`, {handler})
	console.log(`RCPT TO: ${parsed.to.text}\r\n`)
	await channel.write(`RCPT TO: ${from}\r\n`, {handler});

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

	const message = await mail.compile().build();
	const data = message.toString();
	await channel.write('DATA\r\n', {handler});
	await channel.write(`${data.replace(/^\./m,'..')}\r\n.\r\n`, {handler});
	await channel.write(`QUIT\r\n`, {handler});
	console.log(`Message ${parsed.subject} sent successfully`);
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