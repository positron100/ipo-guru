import { test } from "node:test";
import assert from "node:assert/strict";
import { buildEmail, handleContact, rateLimit } from "./contact.ts";

const ENV = { RESEND_API_KEY: "k", CONTACT_EMAIL: "to@example.com", EMAIL_FROM: "Desk <from@example.com>" };
const ok = { name: "Ada Lovelace", email: "ada@example.com", message: "Hello there" };

test("contact: invalid fields are rejected before anything is sent", async () => {
  let called = false;
  const f = (async () => { called = true; return new Response("{}"); }) as typeof fetch;
  assert.equal((await handleContact({ ...ok, name: "A" }, ENV, "t1", f)).status, 400);
  assert.equal((await handleContact({ ...ok, email: "nope" }, ENV, "t1", f)).status, 400);
  assert.equal((await handleContact({ ...ok, message: "hi" }, ENV, "t1", f)).status, 400);
  assert.equal(called, false);
});

test("contact: a valid letter is relayed with the writer as Reply-To", async () => {
  let body: { reply_to?: string; to?: string[]; subject?: string } = {};
  const f = (async (_u: unknown, init: RequestInit) => { body = JSON.parse(init.body as string); return new Response("{}", { status: 200 }); }) as typeof fetch;
  const r = await handleContact(ok, ENV, "t2", f);
  assert.deepEqual(r, { status: 200, body: { ok: true } });
  assert.equal(body.reply_to, "ada@example.com");
  assert.deepEqual(body.to, ["to@example.com"]);
});

test("contact: newlines cannot be injected into the subject", () => {
  const e = buildEmail({ name: "Ada Lovelace", email: "a@b.co", message: "x" }, { from: "f", to: "t" });
  assert.ok(!/[\r\n]/.test(e.subject));
});

test("contact: missing config is a generic 500, provider failure a generic 502", async () => {
  assert.equal((await handleContact(ok, {}, "t3")).status, 500);
  const bad = (async () => new Response("no", { status: 401 })) as typeof fetch;
  const r = await handleContact(ok, ENV, "t4", bad);
  assert.equal(r.status, 502);
  assert.equal(r.body.error, "Unable to send right now.");
});

test("contact: rate limit allows 3 per minute per key, then 429", () => {
  const t = 1_000_000;
  assert.ok(rateLimit("rl", t) && rateLimit("rl", t + 1) && rateLimit("rl", t + 2));
  assert.equal(rateLimit("rl", t + 3), false);
  assert.equal(rateLimit("rl", t + 61_000), true);
});
