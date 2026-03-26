import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";

const BASE = "http://localhost:8080";
const WS_BASE = "ws://localhost:8080";

function sh(cmd) {
  return execSync(cmd, { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] }).trim();
}

async function jfetch(url, opts = {}) {
  const res = await fetch(url, opts);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

function waitOpen(ws, timeoutMs = 8000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("websocket open timeout")), timeoutMs);
    ws.addEventListener(
      "open",
      () => {
        clearTimeout(t);
        resolve();
      },
      { once: true }
    );
    ws.addEventListener(
      "error",
      () => {
        clearTimeout(t);
        reject(new Error("websocket open error"));
      },
      { once: true }
    );
  });
}

function waitForNewMessage(ws, expectedMatchID, expectedBody, timeoutMs = 10000) {
  return new Promise((resolve, reject) => {
    const t = setTimeout(() => reject(new Error("did not receive new_message event in time")), timeoutMs);

    ws.addEventListener("message", (evt) => {
      try {
        const raw = JSON.parse(String(evt.data));
        if (!raw || raw.type !== "new_message") return;

        const payload = raw.payload || {};
        const msg = payload.message || payload;
        const matchID = payload.match_id || msg.match_id;

        if (matchID !== expectedMatchID) return;
        if (!msg || msg.body !== expectedBody) return;

        clearTimeout(t);
        resolve({ raw, msg, matchID });
      } catch {
        // Ignore malformed events.
      }
    });
  });
}

async function main() {
  const ts = Date.now();
  const emailA = `ws.a.${ts}@example.com`;
  const emailB = `ws.b.${ts}@example.com`;
  const pass = "password123";

  const regA = await jfetch(`${BASE}/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: emailA, password: pass }),
  });
  const regB = await jfetch(`${BASE}/v1/auth/register`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email: emailB, password: pass }),
  });

  if (regA.status !== 201 || regB.status !== 201) {
    throw new Error(`register failed: A=${regA.status} B=${regB.status}`);
  }

  const tokenA = regA.data.access_token;
  const tokenB = regB.data.access_token;
  if (!tokenA || !tokenB) throw new Error("missing access token(s)");

  const userA = sh(
    `cd /Users/adamlim/Developer/halo && docker compose exec -T postgres psql -U halo -d halo -At -c \"SELECT id FROM users WHERE email='${emailA}' LIMIT 1;\"`
  ).replace(/\s+/g, "");
  const userB = sh(
    `cd /Users/adamlim/Developer/halo && docker compose exec -T postgres psql -U halo -d halo -At -c \"SELECT id FROM users WHERE email='${emailB}' LIMIT 1;\"`
  ).replace(/\s+/g, "");
  if (!userA || !userB) throw new Error("failed to resolve user ids");

  const [ua, ub] = [userA, userB].sort();
  sh(
    `cd /Users/adamlim/Developer/halo && docker compose exec -T postgres psql -U halo -d halo -At -c \"INSERT INTO matches (user_a_id, user_b_id, created_at, updated_at) VALUES ('${ua}','${ub}', NOW(), NOW());\"`
  );
  const matchID = sh(
    `cd /Users/adamlim/Developer/halo && docker compose exec -T postgres psql -U halo -d halo -At -c \"SELECT id FROM matches WHERE user_a_id='${ua}' AND user_b_id='${ub}' ORDER BY created_at DESC LIMIT 1;\"`
  ).replace(/\s+/g, "");
  if (!matchID) throw new Error("failed to resolve match id");

  const ws = new WebSocket(`${WS_BASE}/v1/ws?token=${tokenB}`);
  await waitOpen(ws, 8000);

  const body = `hello realtime ${ts}`;
  const clientMessageID = randomUUID();
  const recvPromise = waitForNewMessage(ws, matchID, body, 10000);

  const sendRes = await jfetch(`${BASE}/v1/matches/${matchID}/messages`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${tokenA}`,
    },
    body: JSON.stringify({ body, client_message_id: clientMessageID }),
  });

  if (sendRes.status !== 201) {
    throw new Error(`send failed: status=${sendRes.status} body=${JSON.stringify(sendRes.data)}`);
  }

  const event = await recvPromise;

  console.log("WS_TEST_PASS=1");
  console.log(`MATCH_ID=${matchID}`);
  console.log(`SENT_MESSAGE_ID=${sendRes.data?.message?.id || ""}`);
  console.log(`RECEIVED_MESSAGE_ID=${event.msg?.id || ""}`);
  console.log(`RECEIVED_BODY=${event.msg?.body || ""}`);
  console.log(`RECEIVED_MATCH_ID=${event.matchID}`);

  ws.close();
}

main().catch((err) => {
  console.error("WS_TEST_PASS=0");
  console.error(`ERROR=${err && err.message ? err.message : String(err)}`);
  process.exit(1);
});
