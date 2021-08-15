const mailer = require("@sendgrid/mail");
mailer.setApiKey(process.env.SENDGRID_SECRET_KEY);

/**
 *
 * @param {{
 *  to: String
 *  from: String
 *  subject: String
 *  text: String
 *  html: String
 * }} message
 */
const send = async ({
  to,
  from = `"Hoopla" <${process.env.EMAIL_FROM}>`,
  subject,
  text,
}) => {
  if (!to) {
    throw new Error('Not attempting to send email. Missing Parameter "to"');
  }

  if (!text) {
    throw new Error('Not attempting to send email. Missing Parameter "text"');
  }

  if (!subject) {
    throw new Error(
      'Not attempting to send email. Missing Parameter "subject"'
    );
  }

  try {
    return await mailer.send({ to, from, subject, text });
  } catch (reason) {
    console.error(reason);
  }
};

module.exports = {
  send,
};
