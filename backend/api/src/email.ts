export interface TransactionalEmail {
  to: string;
  subject: string;
  html: string;
  text: string;
}

const sentEmailsBuffer: TransactionalEmail[] = [];

export function getSentEmails(): readonly TransactionalEmail[] {
  return sentEmailsBuffer;
}

export function clearSentEmails(): void {
  sentEmailsBuffer.length = 0;
}

/**
 * Sends a transactional auth email via Resend when `RESEND_API_KEY` is configured,
 * or logs cleanly to stdout in development / captures in-memory during tests.
 */
export async function sendTransactionalEmail(email: TransactionalEmail): Promise<void> {
  if (process.env.NODE_ENV === "test") {
    sentEmailsBuffer.push(email);
    return;
  }

  const apiKey = process.env.RESEND_API_KEY?.trim();
  const from = process.env.EMAIL_FROM?.trim() || "GaneGan <onboarding@resend.dev>";

  if (!apiKey) {
    console.info(`[auth-email] to=${email.to} subject="${email.subject}"\n${email.text}`);
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: [email.to],
      subject: email.subject,
      html: email.html,
      text: email.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    console.error(`[auth-email] Resend failed HTTP ${res.status}: ${body}`);
    console.info(`[auth-email] dev-fallback to=${email.to} subject="${email.subject}"\n${email.text}`);
  }
}
