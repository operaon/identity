const nodemailer = require('nodemailer');
const env = require('../config/env');

const transporter = env.email.enabled && env.email.host
  ? nodemailer.createTransport({
      host: env.email.host,
      port: env.email.port,
      secure: env.email.port === 465,
      auth: env.email.user ? { user: env.email.user, pass: env.email.password } : undefined,
    })
  : null;

const send = async ({ to, subject, text, html }) => {
  if (!transporter) return { sent: false, reason: 'EMAIL_NOT_CONFIGURED' };
  await transporter.sendMail({ from: env.email.from, to, subject, text, html });
  return { sent: true };
};

const sendPasswordReset = (user, token) => send({
  to: user.email,
  subject: 'Redefinição de senha — Operaon',
  text: `Use o token de redefinição dentro do prazo informado: ${token}`,
});

const sendEmailVerification = (user, token) => send({
  to: user.email,
  subject: 'Verificação de e-mail — Operaon',
  text: `Use o token de verificação dentro do prazo informado: ${token}`,
});

module.exports = { send, sendPasswordReset, sendEmailVerification };
