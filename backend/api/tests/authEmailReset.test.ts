import { describe, it, before, after, beforeEach } from "node:test";
import assert from "node:assert/strict";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../src/server.js";
import { clearSentEmails, getSentEmails } from "../src/email.js";

function extractUrl(text: string): URL {
  const match = text.match(/https?:\/\/\S+/);
  assert.ok(match, `Expected URL in email text: ${text}`);
  return new URL(match[0]);
}

describe("Auth Email Verification & Password Reset", () => {
  let app: FastifyInstance;

  before(async () => {
    app = await buildServer({ logger: false });
    await app.ready();
  });

  after(async () => {
    await app.close();
  });

  beforeEach(() => {
    clearSentEmails();
  });

  it("sends verification email on sign-up and verifies email via token", async () => {
    const email = `verify-${Date.now()}@example.com`;
    const signUp = await app.inject({
      method: "POST",
      url: "/api/auth/sign-up/email",
      payload: { name: "Verify User", email, password: "InitialPassword123!" },
    });
    assert.equal(signUp.statusCode, 200);

    const emails = getSentEmails();
    assert.equal(emails.length, 1);
    assert.equal(emails[0].to, email);
    assert.match(emails[0].subject, /Verify/i);

    const verifyUrl = extractUrl(emails[0].text);
    const token = verifyUrl.searchParams.get("token");
    assert.ok(token, "Expected verification token in email URL");

    const verifyRes = await app.inject({
      method: "GET",
      url: `/api/auth/verify-email?token=${encodeURIComponent(token)}`,
    });
    assert.ok(verifyRes.statusCode === 200 || verifyRes.statusCode === 302);
  });

  it("sends reset password email and allows signing in with new password", async () => {
    const email = `reset-${Date.now()}@example.com`;
    const oldPassword = "OldPassword123!";
    const newPassword = "NewPassword456!";

    const signUp = await app.inject({
      method: "POST",
      url: "/api/auth/sign-up/email",
      payload: { name: "Reset User", email, password: oldPassword },
    });
    assert.equal(signUp.statusCode, 200);
    clearSentEmails();

    const reqReset = await app.inject({
      method: "POST",
      url: "/api/auth/request-password-reset",
      payload: { email, redirectTo: "http://localhost:3000/reset-password" },
    });
    assert.equal(reqReset.statusCode, 200);

    const emails = getSentEmails();
    assert.equal(emails.length, 1);
    assert.equal(emails[0].to, email);
    assert.match(emails[0].subject, /Reset/i);

    const resetUrl = extractUrl(emails[0].text);
    const token = resetUrl.searchParams.get("token") || resetUrl.pathname.split("/").filter(Boolean).pop();
    assert.ok(token, "Expected reset token in email URL");

    const resetRes = await app.inject({
      method: "POST",
      url: "/api/auth/reset-password",
      payload: { newPassword, token },
    });
    assert.equal(resetRes.statusCode, 200);

    const oldLogin = await app.inject({
      method: "POST",
      url: "/api/auth/sign-in/email",
      payload: { email, password: oldPassword },
    });
    assert.notEqual(oldLogin.statusCode, 200);

    const newLogin = await app.inject({
      method: "POST",
      url: "/api/auth/sign-in/email",
      payload: { email, password: newPassword },
    });
    assert.equal(newLogin.statusCode, 200);
  });
});
