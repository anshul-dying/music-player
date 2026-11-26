import { betterAuth } from "better-auth";
import { bearer } from "better-auth/plugins";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { getDb } from "@mp/db";
import { resolveAuthSecret } from "./authSecret.js";
import { sendTransactionalEmail } from "./email.js";

const defaultOrigins = ["http://localhost:3000", "http://localhost:4000"];
const envOrigins = process.env.CORS_ORIGIN
  ? process.env.CORS_ORIGIN.split(",").map((o) => o.trim()).filter(Boolean)
  : [];
export const trustedOrigins = Array.from(new Set([...defaultOrigins, ...envOrigins]));

export const auth = betterAuth({
  baseURL: process.env.BETTER_AUTH_URL ?? "http://localhost:4000",
  secret: resolveAuthSecret(),
  database: drizzleAdapter(getDb(), {
    provider: "pg",
  }),
  advanced: {
    ipAddress: {
      ipAddressHeaders: ["x-forwarded-for", "cf-connecting-ip", "x-real-ip"],
    },
  },
  rateLimit: {
    enabled: process.env.NODE_ENV !== "test",
    window: 60,
    max: 10,
    customRules: {
      "/sign-in/email": { window: 60, max: 5 },
      "/sign-up/email": { window: 60, max: 5 },
    },
  },
  emailAndPassword: {
    enabled: true,
    async sendResetPassword({ user, url }) {
      await sendTransactionalEmail({
        to: user.email,
        subject: "Reset your GaneGan password",
        text: `Reset your GaneGan password by visiting: ${url}`,
        html: `<p>Reset your GaneGan password by clicking <a href="${url}">this link</a>.</p>`,
      });
    },
  },
  emailVerification: {
    sendOnSignUp: true,
    autoSignInAfterVerification: true,
    async sendVerificationEmail({ user, url }) {
      await sendTransactionalEmail({
        to: user.email,
        subject: "Verify your GaneGan email",
        text: `Verify your GaneGan email address by visiting: ${url}`,
        html: `<p>Verify your GaneGan email address by clicking <a href="${url}">this link</a>.</p>`,
      });
    },
  },
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID ?? "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? "",
      enabled: Boolean(
        process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
      ),
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30, // 30 days
    updateAge: 60 * 60 * 24, // refresh every day
  },
  trustedOrigins,
  plugins: [bearer()],
});

export type Auth = typeof auth;
