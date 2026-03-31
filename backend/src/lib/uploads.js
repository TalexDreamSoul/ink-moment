import { UPLOAD_TICKET_TTL } from "./constants.js";
import { createSignedToken, generateId, verifySignedToken } from "./crypto.js";

function normalizeFilename(filename = "file") {
  return filename.replace(/[^\w.\-]/g, "_");
}

export async function createUploadTicket(env, userId, namespace, originalFilename = "upload.bin") {
  const fileId = generateId("file");
  const safeNamespace = (namespace || "uploads").replace(/[^\w/-]/g, "");
  const filename = normalizeFilename(originalFilename);
  const key = `${safeNamespace}/${fileId}_${filename}`;
  const expiresAt = Date.now() + UPLOAD_TICKET_TTL;
  const ticket = await createSignedToken(
    {
      key,
      userId,
      expiresAt,
    },
    env.UPLOAD_SECRET || env.SESSION_SECRET || "upload-secret"
  );

  return {
    key,
    expiresAt,
    ticket,
  };
}

export async function verifyUploadTicket(env, ticket) {
  const payload = await verifySignedToken(
    ticket,
    env.UPLOAD_SECRET || env.SESSION_SECRET || "upload-secret"
  );

  if (!payload || payload.expiresAt <= Date.now()) {
    return null;
  }

  return payload;
}
