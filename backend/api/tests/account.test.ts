import { describe, it, before, after } from "node:test";
import assert from "node:assert/strict";
import type { FastifyInstance } from "fastify";
import { buildServer } from "../src/server.js";

describe("Account Export & Deletion API", () => {
  let app: FastifyInstance;

  before(async () => {
    app = await buildServer({ logger: false });
    await app.ready();
  });

  after(async () => {
    await app.close();
  });

  it("rejects unauthenticated export and deletion with 401", async () => {
    const exp = await app.inject({ method: "GET", url: "/api/account/export" });
    assert.equal(exp.statusCode, 401);

    const del = await app.inject({
      method: "DELETE",
      url: "/api/account",
      payload: { confirm: "DELETE" },
    });
    assert.equal(del.statusCode, 401);
  });

  it("exports user data as JSON and deletes account with cascade", async () => {
    const email = `gdpr-${Date.now()}@example.com`;
    const signUp = await app.inject({
      method: "POST",
      url: "/api/auth/sign-up/email",
      payload: { name: "GDPR User", email, password: "StrongPassword123!" },
    });
    assert.equal(signUp.statusCode, 200);
    const { token } = JSON.parse(signUp.body);
    const authHeader = { authorization: `Bearer ${token}` };

    const plRes = await app.inject({
      method: "POST",
      url: "/api/playlists",
      headers: authHeader,
      payload: { name: "Export Mix" },
    });
    assert.equal(plRes.statusCode, 201);

    const likeRes = await app.inject({
      method: "PUT",
      url: "/api/likes/dQw4w9WgXcQ",
      headers: authHeader,
      payload: { title: "Test Song", artist: "Test Artist" },
    });
    assert.equal(likeRes.statusCode, 200);

    const exp = await app.inject({
      method: "GET",
      url: "/api/account/export",
      headers: authHeader,
    });
    assert.equal(exp.statusCode, 200);
    assert.match(String(exp.headers["content-disposition"]), /ganegan-export\.json/);
    const exported = JSON.parse(exp.body);
    assert.equal(exported.user.email, email);
    assert.equal(exported.playlists.length, 1);
    assert.equal(exported.playlists[0].name, "Export Mix");
    assert.equal(exported.likes.length, 1);

    // Requires explicit confirm: "DELETE"
    const badDel = await app.inject({
      method: "DELETE",
      url: "/api/account",
      headers: authHeader,
      payload: { confirm: "nope" },
    });
    assert.equal(badDel.statusCode, 400);

    const del = await app.inject({
      method: "DELETE",
      url: "/api/account",
      headers: authHeader,
      payload: { confirm: "DELETE" },
    });
    assert.equal(del.statusCode, 200);
    assert.equal(JSON.parse(del.body).ok, true);

    // Session is cascaded and no longer valid
    const afterDel = await app.inject({
      method: "GET",
      url: "/api/account/export",
      headers: authHeader,
    });
    assert.equal(afterDel.statusCode, 401);
  });
});
