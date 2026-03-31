import {
  clearSession,
  createAdminSession,
  requireAdminSession,
} from "../lib/auth.js";
import { NOTIFICATION_TYPE } from "../lib/constants.js";
import { all, first, run } from "../lib/db.js";
import {
  createNotification,
  ensureInvitationCode,
  rebuildDailyStat,
} from "../lib/domain.js";
import { generateId, hashPassword, verifyPassword } from "../lib/crypto.js";
import { failure, readJson, success } from "../lib/http.js";

function mapAdmin(row) {
  if (!row) {
    return null;
  }

  return {
    id: row.id,
    username: row.username,
    displayName: row.display_name,
    role: row.role,
    status: row.status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function toInteger(value, fallback = null) {
  if (value === undefined || value === null || value === "") {
    return fallback;
  }

  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }

  return Math.trunc(parsed);
}

async function requireAdmin(request, env) {
  const auth = await requireAdminSession(request, env);
  if (!auth || auth.owner.status !== "active") {
    return null;
  }

  return {
    ...auth,
    admin: mapAdmin(auth.owner),
  };
}

function requireAuthFailure() {
  return failure("管理员未登录", 401, 401);
}

async function getSystemStatusPayload(env) {
  const [superAdmins, admins, organizations, users] = await Promise.all([
    first(
      env.DB,
      "SELECT COUNT(*) AS count FROM admin_accounts WHERE role = 'super_admin' AND status = 'active'"
    ),
    first(
      env.DB,
      "SELECT COUNT(*) AS count FROM admin_accounts WHERE status = 'active'"
    ),
    first(
      env.DB,
      "SELECT COUNT(*) AS count FROM organizations WHERE status = 'active'"
    ),
    first(env.DB, "SELECT COUNT(*) AS count FROM users"),
  ]);

  const superAdminCount = Number(superAdmins?.count || 0);
  const adminCount = Math.max(Number(admins?.count || 0) - superAdminCount, 0);

  return {
    hasSuperAdmin: superAdminCount > 0,
    superAdminCount,
    adminCount,
    orgCount: Number(organizations?.count || 0),
    userCount: Number(users?.count || 0),
    systemReady: superAdminCount > 0,
  };
}

async function handleLogin(request, env) {
  const body = await readJson(request);
  const username = String(body.username || "").trim();
  const password = String(body.password || "");

  if (!username || !password) {
    return failure("用户名和密码不能为空");
  }

  const admin = await first(
    env.DB,
    "SELECT * FROM admin_accounts WHERE username = ?",
    username
  );

  if (!admin || admin.status !== "active") {
    return failure("管理员账号不存在或已停用", 401, 401);
  }

  const isValid = await verifyPassword(
    password,
    admin.password_salt,
    admin.password_hash
  );
  if (!isValid) {
    return failure("用户名或密码错误", 401, 401);
  }

  const session = await createAdminSession(env, admin.id);
  return success(
    {
      token: session.token,
      tokenExpired: session.expiresAt,
      admin: mapAdmin(admin),
    },
    "登录成功"
  );
}

async function handleLogout(request, env) {
  const auth = await requireAdminSession(request, env);
  if (auth?.token) {
    await clearSession(env, "admin_sessions", auth.token);
  }

  return success(null, "已退出登录");
}

async function handleSystemStatus(_request, env) {
  return success(await getSystemStatusPayload(env), "获取成功");
}

async function handleBootstrap(request, env) {
  const status = await getSystemStatusPayload(env);
  if (status.hasSuperAdmin) {
    return failure("系统已初始化，无法重复创建超级管理员");
  }

  const body = await readJson(request);
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  const displayName = String(body.displayName || body.display_name || "").trim();
  const initKey = String(body.initKey || body.init_key || "");

  if (!username || !password || !displayName) {
    return failure("请完整填写管理员账号信息");
  }

  if (password.length < 8) {
    return failure("管理员密码至少 8 位");
  }

  if (env.INITIAL_ADMIN_KEY && initKey !== env.INITIAL_ADMIN_KEY) {
    return failure("初始化密钥错误", 403, 403);
  }

  const existed = await first(
    env.DB,
    "SELECT id FROM admin_accounts WHERE username = ?",
    username
  );
  if (existed) {
    return failure("管理员用户名已存在");
  }

  const passwordDigest = await hashPassword(password);
  const adminId = generateId("admin");
  const now = Date.now();

  await run(
    env.DB,
    `INSERT INTO admin_accounts
      (id, username, password_hash, password_salt, display_name, role, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'super_admin', 'active', ?, ?)`,
    adminId,
    username,
    passwordDigest.hashHex,
    passwordDigest.saltHex,
    displayName,
    now,
    now
  );

  const session = await createAdminSession(env, adminId);
  return success(
    {
      adminId,
      username,
      displayName,
      token: session.token,
      tokenExpired: session.expiresAt,
    },
    "系统初始化成功"
  );
}

async function handleOverview(request, env) {
  const auth = await requireAdmin(request, env);
  if (!auth) {
    return requireAuthFailure();
  }

  const [activeMembers, pendingClock, pendingFeedback, exportsCount, recentFeedback, recentExports, recentNotifications] =
    await Promise.all([
      first(
        env.DB,
        "SELECT COUNT(*) AS count FROM organization_members WHERE status = 'active'"
      ),
      first(
        env.DB,
        "SELECT COUNT(*) AS count FROM work_records WHERE audit_status = 'pending'"
      ),
      first(
        env.DB,
        "SELECT COUNT(*) AS count FROM feedback_items WHERE status = 'pending'"
      ),
      first(env.DB, "SELECT COUNT(*) AS count FROM export_jobs"),
      all(
        env.DB,
        `SELECT feedback_items.id, feedback_items.title, feedback_items.status, feedback_items.created_at,
                users.name AS user_name
         FROM feedback_items
         JOIN users ON users.id = feedback_items.user_id
         ORDER BY feedback_items.created_at DESC
         LIMIT 5`
      ),
      all(
        env.DB,
        `SELECT export_jobs.id, export_jobs.status, export_jobs.verify_code, export_jobs.created_at,
                users.name AS user_name, organizations.name AS org_name
         FROM export_jobs
         JOIN users ON users.id = export_jobs.user_id
         LEFT JOIN organizations ON organizations.id = export_jobs.org_id
         ORDER BY export_jobs.created_at DESC
         LIMIT 5`
      ),
      all(
        env.DB,
        `SELECT notifications.id, notifications.title, notifications.type, notifications.status,
                notifications.created_at, users.name AS user_name
         FROM notifications
         JOIN users ON users.id = notifications.user_id
         ORDER BY notifications.created_at DESC
         LIMIT 5`
      ),
    ]);

  return success({
    currentAdmin: auth.admin,
    system: await getSystemStatusPayload(env),
    metrics: {
      activeMemberCount: Number(activeMembers?.count || 0),
      pendingClockCount: Number(pendingClock?.count || 0),
      pendingFeedbackCount: Number(pendingFeedback?.count || 0),
      exportCount: Number(exportsCount?.count || 0),
    },
    recent: {
      feedback: recentFeedback,
      exports: recentExports,
      notifications: recentNotifications,
    },
  });
}

async function handleOrganizations(request, env) {
  const auth = await requireAdmin(request, env);
  if (!auth) {
    return requireAuthFailure();
  }

  const rows = await all(
    env.DB,
    `SELECT org.id, org.name, org.description, org.status, org.created_at, org.updated_at,
            org.owner_user_id, owner.name AS owner_name, invite.code AS invite_code,
            COUNT(DISTINCT members.id) AS member_count
     FROM organizations org
     LEFT JOIN users owner ON owner.id = org.owner_user_id
     LEFT JOIN organization_members members
       ON members.org_id = org.id AND members.status = 'active'
     LEFT JOIN invitation_codes invite
       ON invite.org_id = org.id AND invite.status = 'active'
     WHERE org.status = 'active'
     GROUP BY org.id, owner.name, invite.code
     ORDER BY org.created_at DESC`
  );

  return success(
    rows.map((row) => ({
      id: row.id,
      name: row.name,
      description: row.description || "",
      ownerUserId: row.owner_user_id,
      ownerName: row.owner_name || "未命名",
      memberCount: Number(row.member_count || 0),
      inviteCode: row.invite_code || "",
      status: row.status,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  );
}

async function handleOrganizationDetail(request, env, orgId) {
  const auth = await requireAdmin(request, env);
  if (!auth) {
    return requireAuthFailure();
  }

  const organization = await first(
    env.DB,
    `SELECT org.*, owner.name AS owner_name, invite.code AS invite_code
     FROM organizations org
     LEFT JOIN users owner ON owner.id = org.owner_user_id
     LEFT JOIN invitation_codes invite
       ON invite.org_id = org.id AND invite.status = 'active'
     WHERE org.id = ?`,
    orgId
  );

  if (!organization) {
    return failure("组织不存在", 404, 404);
  }

  let inviteCode = organization.invite_code || "";
  if (!inviteCode && organization.status === "active") {
    const invite = await ensureInvitationCode(env, orgId, organization.owner_user_id);
    inviteCode = invite.code;
  }

  const members = await all(
    env.DB,
    `SELECT members.id, members.org_id, members.user_id, members.role, members.status, members.joined_at,
            users.name, users.student_id, users.phone, users.college, users.grade_major, users.avatar_url,
            COALESCE(SUM(records.duration_minutes), 0) AS total_minutes
     FROM organization_members members
     JOIN users ON users.id = members.user_id
     LEFT JOIN work_records records
       ON records.user_id = members.user_id
      AND records.org_id = members.org_id
      AND records.clock_out_time IS NOT NULL
      AND records.status != 'rejected'
     WHERE members.org_id = ?
     GROUP BY members.id, members.org_id, members.user_id, members.role, members.status, members.joined_at,
              users.name, users.student_id, users.phone, users.college, users.grade_major, users.avatar_url
     ORDER BY members.joined_at DESC`,
    orgId
  );

  return success({
    organization: {
      id: organization.id,
      name: organization.name,
      description: organization.description || "",
      ownerUserId: organization.owner_user_id,
      ownerName: organization.owner_name || "未命名",
      inviteCode,
      status: organization.status,
      createdAt: organization.created_at,
      updatedAt: organization.updated_at,
    },
    members: members.map((row) => ({
      id: row.id,
      orgId: row.org_id,
      userId: row.user_id,
      name: row.name || "未填写姓名",
      studentId: row.student_id || "",
      phone: row.phone || "",
      college: row.college || "",
      gradeMajor: row.grade_major || "",
      avatarUrl: row.avatar_url || "",
      role: row.role,
      status: row.status,
      joinedAt: row.joined_at,
      totalMinutes: Number(row.total_minutes || 0),
    })),
  });
}

async function handleUpdateMemberRole(request, env, memberId) {
  const auth = await requireAdmin(request, env);
  if (!auth) {
    return requireAuthFailure();
  }

  const body = await readJson(request);
  const role = String(body.role || "").trim();

  if (!["admin", "supervisor", "member"].includes(role)) {
    return failure("无效的组织角色");
  }

  const member = await first(
    env.DB,
    `SELECT members.*, organizations.owner_user_id, organizations.name AS org_name
     FROM organization_members members
     JOIN organizations ON organizations.id = members.org_id
     WHERE members.id = ?`,
    memberId
  );

  if (!member) {
    return failure("成员记录不存在", 404, 404);
  }

  if (member.user_id === member.owner_user_id) {
    return failure("不能修改组织创建者的角色");
  }

  await run(
    env.DB,
    "UPDATE organization_members SET role = ? WHERE id = ?",
    role,
    memberId
  );

  await createNotification(
    env,
    member.user_id,
    NOTIFICATION_TYPE.system,
    "组织角色已更新",
    `您在组织「${member.org_name}」中的角色已调整为 ${role}`,
    "organization_member",
    memberId
  );

  return success(
    {
      memberId,
      role,
    },
    "角色更新成功"
  );
}

async function handleClockRecords(request, env) {
  const auth = await requireAdmin(request, env);
  if (!auth) {
    return requireAuthFailure();
  }

  const url = new URL(request.url);
  const conditions = ["1 = 1"];
  const bindings = [];

  const orgId = url.searchParams.get("orgId");
  const auditStatus = url.searchParams.get("auditStatus");
  const keyword = (url.searchParams.get("keyword") || "").trim();
  const limit = Math.min(toInteger(url.searchParams.get("limit"), 100) || 100, 200);

  if (orgId) {
    conditions.push("records.org_id = ?");
    bindings.push(orgId);
  }
  if (auditStatus) {
    conditions.push("records.audit_status = ?");
    bindings.push(auditStatus);
  }
  if (keyword) {
    const fuzzy = `%${keyword}%`;
    conditions.push(
      "(users.name LIKE ? OR users.student_id LIKE ? OR organizations.name LIKE ?)"
    );
    bindings.push(fuzzy, fuzzy, fuzzy);
  }

  const rows = await all(
    env.DB,
    `SELECT records.*, users.name AS user_name, users.student_id, organizations.name AS org_name
     FROM work_records records
     JOIN users ON users.id = records.user_id
     JOIN organizations ON organizations.id = records.org_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY records.clock_in_time DESC
     LIMIT ${limit}`,
    ...bindings
  );

  return success(
    rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name || "未填写姓名",
      studentId: row.student_id || "",
      orgId: row.org_id,
      orgName: row.org_name || "",
      clockInTime: row.clock_in_time,
      clockOutTime: row.clock_out_time,
      durationMinutes: Number(row.duration_minutes || 0),
      status: row.status,
      auditStatus: row.audit_status,
      auditReason: row.audit_reason || "",
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  );
}

async function handleAuditRecord(request, env, recordId) {
  const auth = await requireAdmin(request, env);
  if (!auth) {
    return requireAuthFailure();
  }

  const body = await readJson(request);
  const auditStatus = body.auditStatus || body.status;
  const reason = String(body.reason || "").trim();
  const adjustedMinutes =
    body.adjustedMinutes === undefined || body.adjustedMinutes === null || body.adjustedMinutes === ""
      ? null
      : toInteger(body.adjustedMinutes, null);

  if (!["approved", "rejected"].includes(auditStatus)) {
    return failure("审核状态无效");
  }
  if (adjustedMinutes !== null && adjustedMinutes < 0) {
    return failure("调整后的时长不能小于 0");
  }

  const record = await first(
    env.DB,
    `SELECT records.*, organizations.name AS org_name
     FROM work_records records
     JOIN organizations ON organizations.id = records.org_id
     WHERE records.id = ?`,
    recordId
  );
  if (!record) {
    return failure("打卡记录不存在", 404, 404);
  }

  const nextDuration =
    auditStatus === "approved" && adjustedMinutes !== null
      ? adjustedMinutes
      : Number(record.duration_minutes || 0);
  const nextStatus = auditStatus === "rejected" ? "rejected" : "completed";
  const now = Date.now();

  await run(
    env.DB,
    `UPDATE work_records
     SET audit_status = ?, status = ?, audit_reason = ?, audited_by_type = 'admin',
         audited_by_id = ?, duration_minutes = ?, updated_at = ?
     WHERE id = ?`,
    auditStatus,
    nextStatus,
    reason,
    auth.owner.id,
    nextDuration,
    now,
    recordId
  );

  if (
    auditStatus === "approved" &&
    adjustedMinutes !== null &&
    adjustedMinutes !== Number(record.duration_minutes || 0)
  ) {
    await run(
      env.DB,
      `INSERT INTO duration_adjustments
        (id, record_id, user_id, org_id, original_minutes, adjusted_minutes, reason,
         adjusted_by_admin_id, adjusted_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      generateId("adjust"),
      recordId,
      record.user_id,
      record.org_id,
      Number(record.duration_minutes || 0),
      adjustedMinutes,
      reason || "管理员调整时长",
      auth.owner.id,
      now
    );
  }

  await rebuildDailyStat(env, record.user_id, record.org_id, record.clock_in_time);

  const title = auditStatus === "approved" ? "打卡审核已通过" : "打卡审核未通过";
  const content = auditStatus === "approved"
    ? `您在组织「${record.org_name}」的打卡记录已通过审核${
        adjustedMinutes !== null ? `，时长调整为 ${nextDuration} 分钟` : ""
      }${reason ? `，备注：${reason}` : ""}`
    : `您在组织「${record.org_name}」的打卡记录未通过审核${reason ? `，原因：${reason}` : ""}`;

  await createNotification(
    env,
    record.user_id,
    NOTIFICATION_TYPE.audit_result,
    title,
    content,
    "work_record",
    recordId
  );

  return success(
    {
      recordId,
      auditStatus,
      durationMinutes: nextDuration,
    },
    "审核完成"
  );
}

async function handleFeedbackList(request, env) {
  const auth = await requireAdmin(request, env);
  if (!auth) {
    return requireAuthFailure();
  }

  const url = new URL(request.url);
  const conditions = ["1 = 1"];
  const bindings = [];
  const status = url.searchParams.get("status");

  if (status) {
    conditions.push("feedback_items.status = ?");
    bindings.push(status);
  }

  const rows = await all(
    env.DB,
    `SELECT feedback_items.*, users.name AS user_name, users.student_id
     FROM feedback_items
     JOIN users ON users.id = feedback_items.user_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY feedback_items.created_at DESC
     LIMIT 200`,
    ...bindings
  );

  return success(
    rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name || "未填写姓名",
      studentId: row.student_id || "",
      type: row.type,
      title: row.title,
      content: row.content,
      images: JSON.parse(row.images_json || "[]"),
      contact: row.contact || "",
      status: row.status,
      replyContent: row.reply_content || "",
      repliedAt: row.replied_at,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }))
  );
}

async function handleReplyFeedback(request, env, feedbackId) {
  const auth = await requireAdmin(request, env);
  if (!auth) {
    return requireAuthFailure();
  }

  const body = await readJson(request);
  const replyContent = String(body.replyContent || body.reply || "").trim();

  if (!replyContent) {
    return failure("回复内容不能为空");
  }

  const feedback = await first(
    env.DB,
    "SELECT * FROM feedback_items WHERE id = ?",
    feedbackId
  );
  if (!feedback) {
    return failure("反馈不存在", 404, 404);
  }

  const now = Date.now();
  await run(
    env.DB,
    `UPDATE feedback_items
     SET reply_content = ?, replied_by_admin_id = ?, replied_at = ?, status = 'replied', updated_at = ?
     WHERE id = ?`,
    replyContent,
    auth.owner.id,
    now,
    now,
    feedbackId
  );

  await createNotification(
    env,
    feedback.user_id,
    NOTIFICATION_TYPE.feedback_reply,
    "反馈已收到回复",
    `您提交的反馈「${feedback.title}」已收到管理员回复`,
    "feedback",
    feedbackId
  );

  return success(
    {
      feedbackId,
      repliedAt: now,
    },
    "回复成功"
  );
}

async function handleNotificationList(request, env) {
  const auth = await requireAdmin(request, env);
  if (!auth) {
    return requireAuthFailure();
  }

  const rows = await all(
    env.DB,
    `SELECT notifications.*, users.name AS user_name, users.student_id
     FROM notifications
     JOIN users ON users.id = notifications.user_id
     ORDER BY notifications.created_at DESC
     LIMIT 200`
  );

  return success(
    rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name || "未填写姓名",
      studentId: row.student_id || "",
      type: row.type,
      title: row.title,
      content: row.content,
      relatedType: row.related_type || "",
      relatedId: row.related_id || "",
      status: row.status,
      createdAt: row.created_at,
      readAt: row.read_at,
    }))
  );
}

async function handleNotificationCreate(request, env) {
  const auth = await requireAdmin(request, env);
  if (!auth) {
    return requireAuthFailure();
  }

  const body = await readJson(request);
  const title = String(body.title || "").trim();
  const content = String(body.content || "").trim();
  const type = body.type || NOTIFICATION_TYPE.system;

  if (!title || !content) {
    return failure("通知标题和内容不能为空");
  }

  let userIds = [];
  if (Array.isArray(body.userIds) && body.userIds.length > 0) {
    userIds = body.userIds.map((item) => String(item)).filter(Boolean);
  } else if (body.userId) {
    userIds = [String(body.userId)];
  } else {
    const rows = await all(env.DB, "SELECT id FROM users");
    userIds = rows.map((item) => item.id);
  }

  const uniqueUserIds = [...new Set(userIds)];
  for (const userId of uniqueUserIds) {
    await createNotification(env, userId, type, title, content, "admin_notice", auth.owner.id);
  }

  return success(
    {
      count: uniqueUserIds.length,
    },
    "通知发送成功"
  );
}

async function handleExportList(request, env) {
  const auth = await requireAdmin(request, env);
  if (!auth) {
    return requireAuthFailure();
  }

  const rows = await all(
    env.DB,
    `SELECT export_jobs.*, users.name AS user_name, users.student_id, organizations.name AS org_name
     FROM export_jobs
     JOIN users ON users.id = export_jobs.user_id
     LEFT JOIN organizations ON organizations.id = export_jobs.org_id
     ORDER BY export_jobs.created_at DESC
     LIMIT 200`
  );

  return success(
    rows.map((row) => ({
      id: row.id,
      userId: row.user_id,
      userName: row.user_name || "未填写姓名",
      studentId: row.student_id || "",
      orgId: row.org_id,
      orgName: row.org_name || "全部组织",
      exportType: row.export_type,
      totalMinutes: Number(row.total_minutes || 0),
      verifyCode: row.verify_code,
      fileKey: row.file_key || "",
      status: row.status,
      createdAt: row.created_at,
    }))
  );
}

export async function handleAdminRequest(request, env, pathname) {
  const parts = pathname.split("/").filter(Boolean);
  const [, resource, id, subResource] = parts;

  try {
    if (pathname === "/admin/auth/login" && request.method === "POST") {
      return handleLogin(request, env);
    }
    if (pathname === "/admin/auth/logout" && request.method === "POST") {
      return handleLogout(request, env);
    }
    if (pathname === "/admin/system/status" && request.method === "GET") {
      return handleSystemStatus(request, env);
    }
    if (pathname === "/admin/system/bootstrap" && request.method === "POST") {
      return handleBootstrap(request, env);
    }
    if (pathname === "/admin/system/overview" && request.method === "GET") {
      return handleOverview(request, env);
    }
    if (pathname === "/admin/organizations" && request.method === "GET") {
      return handleOrganizations(request, env);
    }
    if (resource === "organizations" && id && request.method === "GET") {
      return handleOrganizationDetail(request, env, id);
    }
    if (resource === "members" && id && subResource === "role" && request.method === "PATCH") {
      return handleUpdateMemberRole(request, env, id);
    }
    if (pathname === "/admin/clock-records" && request.method === "GET") {
      return handleClockRecords(request, env);
    }
    if (resource === "audits" && id && request.method === "POST") {
      return handleAuditRecord(request, env, id);
    }
    if (pathname === "/admin/feedback" && request.method === "GET") {
      return handleFeedbackList(request, env);
    }
    if (resource === "feedback" && id && subResource === "reply" && request.method === "POST") {
      return handleReplyFeedback(request, env, id);
    }
    if (pathname === "/admin/notifications" && request.method === "GET") {
      return handleNotificationList(request, env);
    }
    if (pathname === "/admin/notifications" && request.method === "POST") {
      return handleNotificationCreate(request, env);
    }
    if (pathname === "/admin/exports" && request.method === "GET") {
      return handleExportList(request, env);
    }

    return failure(`未找到接口: ${pathname}`, 404, 404);
  } catch (error) {
    return failure(error.message || "服务器内部错误", 500, 500, {
      pathname,
    });
  }
}
