import {
  ADMIN_SESSION_TTL,
  MINIAPP_SESSION_TTL,
} from "./constants.js";
import { first, run, mapUserProfile } from "./db.js";
import { getBearerToken } from "./http.js";
import { generateId, randomToken, sha256Hex } from "./crypto.js";

async function createSession(db, tableName, ownerColumn, ownerId, ttl) {
  const sessionId = generateId(tableName === "admin_sessions" ? "as" : "ms");
  const token = randomToken(32);
  const tokenHash = await sha256Hex(token);
  const now = Date.now();
  const expiresAt = now + ttl;

  await run(
    db,
    `INSERT INTO ${tableName} (id, ${ownerColumn}, token_hash, expires_at, created_at, last_used_at)
     VALUES (?, ?, ?, ?, ?, ?)`,
    sessionId,
    ownerId,
    tokenHash,
    expiresAt,
    now,
    now
  );

  return {
    id: sessionId,
    token,
    expiresAt,
  };
}

async function findSession(db, tableName, ownerColumn, request, bodyToken = "") {
  const incomingToken = bodyToken || getBearerToken(request);
  if (!incomingToken) {
    return null;
  }

  const tokenHash = await sha256Hex(incomingToken);
  const session = await first(
    db,
    `SELECT * FROM ${tableName} WHERE token_hash = ?`,
    tokenHash
  );

  if (!session) {
    return null;
  }

  if (session.expires_at <= Date.now()) {
    await run(db, `DELETE FROM ${tableName} WHERE id = ?`, session.id);
    return null;
  }

  await run(
    db,
    `UPDATE ${tableName} SET last_used_at = ? WHERE id = ?`,
    Date.now(),
    session.id
  );

  const owner = await first(
    db,
    `SELECT * FROM ${
      ownerColumn === "user_id" ? "users" : "admin_accounts"
    } WHERE id = ?`,
    session[ownerColumn]
  );

  if (!owner) {
    await run(db, `DELETE FROM ${tableName} WHERE id = ?`, session.id);
    return null;
  }

  return {
    token: incomingToken,
    session,
    owner,
  };
}

export async function createMiniappSession(env, userId) {
  return createSession(env.DB, "miniapp_sessions", "user_id", userId, MINIAPP_SESSION_TTL);
}

export async function createAdminSession(env, adminId) {
  return createSession(env.DB, "admin_sessions", "admin_id", adminId, ADMIN_SESSION_TTL);
}

export async function requireMiniappSession(request, env, bodyToken = "") {
  const result = await findSession(env.DB, "miniapp_sessions", "user_id", request, bodyToken);
  if (!result) {
    return null;
  }

  return {
    ...result,
    profile: mapUserProfile(result.owner),
  };
}

export async function requireAdminSession(request, env, bodyToken = "") {
  return findSession(env.DB, "admin_sessions", "admin_id", request, bodyToken);
}

export async function clearSession(env, tableName, token) {
  if (!token) {
    return;
  }

  const tokenHash = await sha256Hex(token);
  await run(env.DB, `DELETE FROM ${tableName} WHERE token_hash = ?`, tokenHash);
}
