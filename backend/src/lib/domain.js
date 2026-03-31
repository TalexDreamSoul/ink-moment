import {
  FEEDBACK_STATUS,
  NOTIFICATION_TYPE,
  ORG_MANAGE_ROLES,
  ROLE_ORDER,
  USER_REQUIRED_FIELDS,
} from "./constants.js";
import { all, first, run, startOfDay } from "./db.js";
import { generateId, randomInt } from "./crypto.js";

export function computeIsCompleted(profile) {
  return USER_REQUIRED_FIELDS.every((field) => {
    const value = profile[field];
    return typeof value === "string" ? value.trim() : value;
  });
}

export function getMissingFields(profile) {
  const labelMap = {
    name: "姓名",
    student_id: "学号/工号",
    college: "学院",
    grade_major: "年级专业",
    phone: "联系方式",
    counselor: "辅导员",
    gender: "性别",
  };

  return USER_REQUIRED_FIELDS.filter((field) => {
    const value = profile[field];
    return !(typeof value === "string" ? value.trim() : value);
  }).map((field) => labelMap[field] || field);
}

export function generateInviteCode() {
  const charset = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let code = "";
  for (let index = 0; index < 6; index += 1) {
    code += charset[randomInt(charset.length)];
  }
  return code;
}

export function generateVerifyCode() {
  return String(100000 + randomInt(900000));
}

export async function ensureInvitationCode(env, orgId, createdByUserId) {
  const existing = await first(
    env.DB,
    "SELECT * FROM invitation_codes WHERE org_id = ? AND status = 'active' ORDER BY created_at DESC LIMIT 1",
    orgId
  );
  if (existing) {
    return existing;
  }

  let code = generateInviteCode();
  while (
    await first(env.DB, "SELECT id FROM invitation_codes WHERE code = ?", code)
  ) {
    code = generateInviteCode();
  }

  const now = Date.now();
  const inviteId = generateId("invite");
  await run(
    env.DB,
    `INSERT INTO invitation_codes (id, org_id, code, status, created_by_user_id, created_at, updated_at)
     VALUES (?, ?, ?, 'active', ?, ?, ?)`,
    inviteId,
    orgId,
    code,
    createdByUserId,
    now,
    now
  );

  return first(env.DB, "SELECT * FROM invitation_codes WHERE id = ?", inviteId);
}

export async function createNotification(
  env,
  userId,
  type,
  title,
  content,
  relatedType = null,
  relatedId = null
) {
  if (!userId) {
    return null;
  }

  const notificationId = generateId("notify");
  const now = Date.now();
  await run(
    env.DB,
    `INSERT INTO notifications (id, user_id, type, title, content, related_type, related_id, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'unread', ?)`,
    notificationId,
    userId,
    type || NOTIFICATION_TYPE.system,
    title,
    content,
    relatedType,
    relatedId,
    now
  );

  return notificationId;
}

export async function rebuildDailyStat(env, userId, orgId, timestamp) {
  const statDate = startOfDay(timestamp);
  const nextDate = statDate + 24 * 60 * 60 * 1000;
  const rows = await all(
    env.DB,
    `SELECT duration_minutes
     FROM work_records
     WHERE user_id = ?
       AND org_id = ?
       AND clock_out_time IS NOT NULL
       AND clock_in_time >= ?
       AND clock_in_time < ?
       AND status != 'rejected'`,
    userId,
    orgId,
    statDate,
    nextDate
  );

  const totalMinutes = rows.reduce(
    (sum, row) => sum + (row.duration_minutes || 0),
    0
  );
  const recordCount = rows.length;
  const now = Date.now();

  if (recordCount === 0) {
    await run(
      env.DB,
      "DELETE FROM attendance_daily_stats WHERE user_id = ? AND org_id = ? AND stat_date = ?",
      userId,
      orgId,
      statDate
    );
    return;
  }

  const existing = await first(
    env.DB,
    "SELECT id FROM attendance_daily_stats WHERE user_id = ? AND org_id = ? AND stat_date = ?",
    userId,
    orgId,
    statDate
  );

  if (existing) {
    await run(
      env.DB,
      `UPDATE attendance_daily_stats
       SET total_minutes = ?, record_count = ?, updated_at = ?
       WHERE id = ?`,
      totalMinutes,
      recordCount,
      now,
      existing.id
    );
    return;
  }

  await run(
    env.DB,
    `INSERT INTO attendance_daily_stats
      (id, user_id, org_id, stat_date, total_minutes, record_count, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
    generateId("stat"),
    userId,
    orgId,
    statDate,
    totalMinutes,
    recordCount,
    now,
    now
  );
}

export async function getRoleFlags(env, userId) {
  const memberships = await all(
    env.DB,
    "SELECT role FROM organization_members WHERE user_id = ? AND status = 'active'",
    userId
  );

  return {
    isAdmin: memberships.some((item) =>
      ORG_MANAGE_ROLES.includes(item.role)
    ),
    isSupervisor: memberships.some((item) => item.role === "supervisor"),
  };
}

export function buildStatsRange(year, month) {
  if (!year && !month) {
    return null;
  }

  let startDate;
  let endDate;
  if (year && month) {
    startDate = new Date(Number(year), Number(month) - 1, 1);
    endDate = new Date(Number(year), Number(month), 1);
  } else if (year) {
    startDate = new Date(Number(year), 0, 1);
    endDate = new Date(Number(year) + 1, 0, 1);
  } else {
    const currentYear = new Date().getFullYear();
    startDate = new Date(currentYear, Number(month) - 1, 1);
    endDate = new Date(currentYear, Number(month), 1);
  }

  return {
    start: startDate.getTime(),
    end: endDate.getTime(),
  };
}

export function mapMembershipRole(role) {
  return role === "user" ? "member" : role;
}

export function sortMembersByRole(rows) {
  return [...rows].sort(
    (left, right) =>
      (ROLE_ORDER[left.role] ?? ROLE_ORDER.member) -
      (ROLE_ORDER[right.role] ?? ROLE_ORDER.member)
  );
}

export function legacyFeedbackStatus(status) {
  if (status === FEEDBACK_STATUS.replied) {
    return "replied";
  }
  if (status === FEEDBACK_STATUS.closed) {
    return "closed";
  }
  return "pending";
}
