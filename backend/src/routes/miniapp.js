import { createMiniappSession, requireMiniappSession } from "../lib/auth.js";
import {
  all,
  first,
  mapFeedback,
  mapOrganization,
  mapUserProfile,
  mapWorkRecord,
  run,
  startOfDay,
} from "../lib/db.js";
import {
  buildStatsRange,
  computeIsCompleted,
  createNotification,
  ensureInvitationCode,
  generateVerifyCode,
  getMissingFields,
  getRoleFlags,
  legacyFeedbackStatus,
  sortMembersByRole,
} from "../lib/domain.js";
import { generateId } from "../lib/crypto.js";
import { failure, getApiBaseUrl, readJson, success } from "../lib/http.js";
import { createUploadTicket, verifyUploadTicket } from "../lib/uploads.js";
import { NOTIFICATION_TYPE } from "../lib/constants.js";

async function exchangeWechatCode(env, code) {
  if (!code) {
    throw new Error("微信登录 code 无效");
  }

  if (!env.WECHAT_APP_ID || !env.WECHAT_APP_SECRET) {
    return `mock_openid_${code}`;
  }

  const url = new URL("https://api.weixin.qq.com/sns/jscode2session");
  url.searchParams.set("appid", env.WECHAT_APP_ID);
  url.searchParams.set("secret", env.WECHAT_APP_SECRET);
  url.searchParams.set("js_code", code);
  url.searchParams.set("grant_type", "authorization_code");

  const response = await fetch(url);
  const payload = await response.json();
  if (!response.ok || !payload.openid) {
    throw new Error(payload.errmsg || "微信登录失败");
  }

  return payload.openid;
}

function getFileUrl(request, key) {
  return `${getApiBaseUrl(request)}/files/${encodeURIComponent(key)}`;
}

function toLegacyRole(role) {
  return role === "member" ? "user" : role;
}

function normalizeProfileInput(input, existing = {}) {
  const meta = {
    ...(existing.meta || {}),
    ...(input.meta || {}),
  };

  if (input.avatar_url) {
    meta.avatar = input.avatar_url;
  }

  return {
    name: input.name ?? existing.name ?? "",
    student_id: input.student_id ?? existing.student_id ?? "",
    college: input.college ?? existing.college ?? "",
    grade_major: input.grade_major ?? existing.grade_major ?? "",
    phone: input.phone ?? existing.phone ?? "",
    counselor: input.counselor ?? existing.counselor ?? "",
    gender: input.gender ?? existing.gender ?? "other",
    avatar_url: input.avatar_url ?? existing.avatar_url ?? "",
    nickname: input.nickname ?? existing.nickname ?? "",
    meta,
  };
}

function calculateDistanceMeters(locationA, locationB) {
  if (!locationA || !locationB) {
    return 0;
  }

  const toRad = (value) => (value * Math.PI) / 180;
  const earthRadius = 6371000;
  const lat1 = toRad(Number(locationA.latitude));
  const lat2 = toRad(Number(locationB.latitude));
  const deltaLat = toRad(Number(locationB.latitude) - Number(locationA.latitude));
  const deltaLng = toRad(
    Number(locationB.longitude) - Number(locationA.longitude)
  );

  const a =
    Math.sin(deltaLat / 2) * Math.sin(deltaLat / 2) +
    Math.cos(lat1) *
      Math.cos(lat2) *
      Math.sin(deltaLng / 2) *
      Math.sin(deltaLng / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return earthRadius * c;
}

function roundDurationMinutes(startTimestamp, endTimestamp) {
  const diffSeconds = Math.max(0, Math.floor((endTimestamp - startTimestamp) / 1000));
  const minutes = Math.floor(diffSeconds / 60);
  const seconds = diffSeconds % 60;
  return seconds >= 30 ? minutes + 1 : minutes;
}

async function rebuildDailyStat(env, userId, orgId, timestamp) {
  const statDate = startOfDay(timestamp);
  const nextDay = statDate + 24 * 60 * 60 * 1000;
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
    nextDay
  );

  const totalMinutes = rows.reduce(
    (sum, row) => sum + Number(row.duration_minutes || 0),
    0
  );
  const recordCount = rows.length;
  const existing = await first(
    env.DB,
    `SELECT id
     FROM attendance_daily_stats
     WHERE user_id = ? AND org_id = ? AND stat_date = ?`,
    userId,
    orgId,
    statDate
  );
  const now = Date.now();

  if (recordCount === 0) {
    if (existing) {
      await run(
        env.DB,
        "DELETE FROM attendance_daily_stats WHERE id = ?",
        existing.id
      );
    }
    return;
  }

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

async function getTodayStats(env, userId) {
  const today = startOfDay(Date.now());
  const rows = await all(
    env.DB,
    `SELECT total_minutes, record_count
     FROM attendance_daily_stats
     WHERE user_id = ? AND stat_date = ?`,
    userId,
    today
  );
  const memberships = await all(
    env.DB,
    "SELECT COUNT(*) AS count FROM organization_members WHERE user_id = ? AND status = 'active'",
    userId
  );

  const totalMinutes = rows.reduce(
    (sum, row) => sum + Number(row.total_minutes || 0),
    0
  );
  const recordCount = rows.reduce(
    (sum, row) => sum + Number(row.record_count || 0),
    0
  );

  return {
    totalMinutes,
    recordCount,
    orgCount: Number(memberships[0]?.count || 0),
  };
}

async function getStatsPayload(env, userId, year, month) {
  const range = buildStatsRange(year, month);
  const conditions = ["user_id = ?"];
  const bindings = [userId];

  if (range) {
    conditions.push("stat_date >= ?", "stat_date < ?");
    bindings.push(range.start, range.end);
  }

  const statsRows = await all(
    env.DB,
    `SELECT stat_date, total_minutes, record_count
     FROM attendance_daily_stats
     WHERE ${conditions.join(" AND ")}`,
    ...bindings
  );
  const totalMinutes = statsRows.reduce(
    (sum, row) => sum + Number(row.total_minutes || 0),
    0
  );
  const totalDays = new Set(statsRows.map((row) => row.stat_date)).size;

  const orgCountRow = await first(
    env.DB,
    "SELECT COUNT(*) AS count FROM organization_members WHERE user_id = ? AND status = 'active'",
    userId
  );

  const orgStatsConditions = ["stats.user_id = ?"];
  const orgStatsBindings = [userId];
  if (range) {
    orgStatsConditions.push("stats.stat_date >= ?", "stats.stat_date < ?");
    orgStatsBindings.push(range.start, range.end);
  }
  const organizations = await all(
    env.DB,
    `SELECT stats.org_id, organizations.name AS org_name,
            SUM(stats.total_minutes) AS total_minutes,
            SUM(stats.record_count) AS record_count
     FROM attendance_daily_stats stats
     JOIN organizations ON organizations.id = stats.org_id
     WHERE ${orgStatsConditions.join(" AND ")}
     GROUP BY stats.org_id, organizations.name
     ORDER BY total_minutes DESC`,
    ...orgStatsBindings
  );

  const recentConditions = ["work_records.user_id = ?", "work_records.clock_out_time IS NOT NULL"];
  const recentBindings = [userId];
  if (range) {
    recentConditions.push("work_records.clock_in_time >= ?", "work_records.clock_in_time < ?");
    recentBindings.push(range.start, range.end);
  }
  const recentRecords = await all(
    env.DB,
    `SELECT work_records.id, work_records.clock_in_time, work_records.clock_out_time,
            work_records.duration_minutes, organizations.name AS org_name
     FROM work_records
     JOIN organizations ON organizations.id = work_records.org_id
     WHERE ${recentConditions.join(" AND ")}
       AND work_records.status != 'rejected'
     ORDER BY work_records.clock_in_time DESC
     LIMIT 10`,
    ...recentBindings
  );

  return {
    totalHours: totalMinutes,
    totalMinutes,
    totalDays,
    thisMonthHours: totalMinutes,
    orgCount: Number(orgCountRow?.count || 0),
    organizations,
    recentRecords,
  };
}

async function getUnreadCount(env, userId) {
  const row = await first(
    env.DB,
    `SELECT COUNT(*) AS count
     FROM notifications
     WHERE user_id = ? AND status = 'unread'`,
    userId
  );
  return Number(row?.count || 0);
}

async function listUserOrganizations(env, userId, manageableOnly = false) {
  const conditions = ["members.user_id = ?", "members.status = 'active'", "org.status = 'active'"];
  const bindings = [userId];
  if (manageableOnly) {
    conditions.push("members.role IN ('owner', 'admin')");
  }

  const rows = await all(
    env.DB,
    `SELECT org.*, members.role, members.joined_at, invite.code AS invite_code
     FROM organization_members members
     JOIN organizations org ON org.id = members.org_id
     LEFT JOIN invitation_codes invite
       ON invite.org_id = org.id AND invite.status = 'active'
     WHERE ${conditions.join(" AND ")}
     ORDER BY org.created_at DESC`,
    ...bindings
  );

  return rows.map((row) => ({
    ...mapOrganization(row),
    role: toLegacyRole(row.role),
    joined_at: row.joined_at,
  }));
}

async function handleWechatLogin(request, env) {
  const body = await readJson(request);
  const openid = await exchangeWechatCode(env, body.code);
  const existingUser = await first(
    env.DB,
    "SELECT * FROM users WHERE wechat_openid = ?",
    openid
  );
  const totalUsersRow = await first(
    env.DB,
    "SELECT COUNT(*) AS count FROM users"
  );

  let user = existingUser;
  if (!user) {
    const userId = generateId("user");
    const now = Date.now();
    await run(
      env.DB,
      `INSERT INTO users
        (id, wechat_openid, created_at, updated_at, meta_json, notification_prefs_json)
       VALUES (?, ?, ?, ?, '{}', '{"system":true,"audit":true,"exports":true}')`,
      userId,
      openid,
      now,
      now
    );
    user = await first(env.DB, "SELECT * FROM users WHERE id = ?", userId);
  }

  const session = await createMiniappSession(env, user.id);
  const profile = mapUserProfile(user);

  return success(
    {
      uid: user.id,
      token: session.token,
      tokenExpired: session.expiresAt,
      needProfileCompletion: !profile.is_completed,
      isFirstUser: Number(totalUsersRow?.count || 0) === 0,
      profile,
    },
    "登录成功"
  );
}

async function handleGetMe(request, env) {
  const auth = await requireMiniappSession(request, env);
  if (!auth) {
    return failure("未登录", 401, 401);
  }

  return success({ profile: auth.profile }, "获取成功");
}

async function handleUpdateMe(request, env) {
  const auth = await requireMiniappSession(request, env);
  if (!auth) {
    return failure("未登录", 401, 401);
  }

  const body = await readJson(request);
  const input = body.profile || body;
  const profile = normalizeProfileInput(input, auth.profile);
  const isCompleted = computeIsCompleted(profile);
  const now = Date.now();

  await run(
    env.DB,
    `UPDATE users
     SET name = ?, student_id = ?, college = ?, grade_major = ?, phone = ?, counselor = ?,
         gender = ?, avatar_url = ?, nickname = ?, meta_json = ?, is_completed = ?, updated_at = ?
     WHERE id = ?`,
    profile.name,
    profile.student_id,
    profile.college,
    profile.grade_major,
    profile.phone,
    profile.counselor,
    profile.gender || "other",
    profile.avatar_url || "",
    profile.nickname || "",
    JSON.stringify(profile.meta || {}),
    isCompleted ? 1 : 0,
    now,
    auth.owner.id
  );

  const saved = await first(env.DB, "SELECT * FROM users WHERE id = ?", auth.owner.id);
  return success(
    {
      profile: mapUserProfile(saved),
      isFirstUser: false,
    },
    "保存成功"
  );
}

async function handleProfileCompletion(request, env) {
  const auth = await requireMiniappSession(request, env);
  if (!auth) {
    return failure("未登录", 401, 401);
  }

  return success({
    isComplete: auth.profile.is_completed,
    missingFields: getMissingFields(auth.profile),
  });
}

async function handleGetRoles(request, env) {
  const auth = await requireMiniappSession(request, env);
  if (!auth) {
    return failure("未登录", 401, 401);
  }

  return success(await getRoleFlags(env, auth.owner.id));
}

async function handleDashboard(request, env) {
  const auth = await requireMiniappSession(request, env);
  if (!auth) {
    return failure("未登录", 401, 401);
  }

  const roles = await getRoleFlags(env, auth.owner.id);
  const stats = await getStatsPayload(env, auth.owner.id);
  const todayStats = await getTodayStats(env, auth.owner.id);
  const unreadCount = await getUnreadCount(env, auth.owner.id);

  return success({
    profile: auth.profile,
    roles,
    stats,
    todayStats,
    unreadCount,
  });
}

async function handleListOrganizations(request, env, manageableOnly = false) {
  const auth = await requireMiniappSession(request, env);
  if (!auth) {
    return failure("请先登录", 401, 401);
  }

  return success(
    await listUserOrganizations(env, auth.owner.id, manageableOnly),
    "获取成功"
  );
}

async function handleCreateOrganization(request, env) {
  const auth = await requireMiniappSession(request, env);
  if (!auth) {
    return failure("请先登录", 401, 401);
  }

  const body = await readJson(request);
  if (!body.name || !body.name.trim()) {
    return failure("组织名称不能为空");
  }

  const now = Date.now();
  const organizationId = generateId("org");
  await run(
    env.DB,
    `INSERT INTO organizations
      (id, name, description, owner_user_id, location_json, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`,
    organizationId,
    body.name.trim(),
    (body.description || "").trim(),
    auth.owner.id,
    body.location ? JSON.stringify(body.location) : null,
    now,
    now
  );
  await run(
    env.DB,
    `INSERT INTO organization_members
      (id, org_id, user_id, role, status, joined_at)
     VALUES (?, ?, ?, 'owner', 'active', ?)`,
    generateId("member"),
    organizationId,
    auth.owner.id,
    now
  );
  const inviteCode = await ensureInvitationCode(env, organizationId, auth.owner.id);

  return success(
    {
      orgId: organizationId,
      qrcodeKey: inviteCode.code,
    },
    "创建组织成功"
  );
}

async function getOrganizationMembership(env, orgId, userId) {
  return first(
    env.DB,
    `SELECT * FROM organization_members
     WHERE org_id = ? AND user_id = ? AND status = 'active'`,
    orgId,
    userId
  );
}

async function handleOrganizationDetail(request, env, orgId) {
  const auth = await requireMiniappSession(request, env);
  if (!auth) {
    return failure("请先登录", 401, 401);
  }

  const membership = await getOrganizationMembership(env, orgId, auth.owner.id);
  if (!membership) {
    return failure("您不是该组织成员", 403, 403);
  }

  const organization = await first(
    env.DB,
    `SELECT org.*, invite.code AS invite_code
     FROM organizations org
     LEFT JOIN invitation_codes invite
       ON invite.org_id = org.id AND invite.status = 'active'
     WHERE org.id = ? AND org.status = 'active'`,
    orgId
  );

  if (!organization) {
    return failure("组织不存在", 404, 404);
  }

  const members = await all(
    env.DB,
    `SELECT members.user_id, members.role, members.joined_at,
            users.name, users.student_id, users.avatar_url,
            COALESCE(SUM(records.duration_minutes), 0) AS total_work_minutes
     FROM organization_members members
     JOIN users ON users.id = members.user_id
     LEFT JOIN work_records records
       ON records.user_id = members.user_id
      AND records.org_id = members.org_id
      AND records.clock_out_time IS NOT NULL
      AND records.status != 'rejected'
     WHERE members.org_id = ? AND members.status = 'active'
     GROUP BY members.user_id, members.role, members.joined_at, users.name, users.student_id, users.avatar_url`,
    orgId
  );

  const visibleMembers =
    ["owner", "admin", "supervisor"].includes(membership.role)
      ? sortMembersByRole(
          members.map((row) => ({
            user_id: row.user_id,
            role: toLegacyRole(row.role),
            joined_at: row.joined_at,
            name: row.name || "未知",
            student_id: row.student_id || "",
            avatar: row.avatar_url || "",
            total_work_minutes: Number(row.total_work_minutes || 0),
          }))
        )
      : sortMembersByRole(
          members
            .filter((item) => item.user_id === auth.owner.id)
            .map((row) => ({
              user_id: row.user_id,
              role: toLegacyRole(row.role),
              joined_at: row.joined_at,
              name: row.name || "未知",
              student_id: row.student_id || "",
              avatar: row.avatar_url || "",
              total_work_minutes: Number(row.total_work_minutes || 0),
            }))
        );

  return success({
    ...mapOrganization(organization),
    qrcode_key: organization.invite_code || "",
    userRole: toLegacyRole(membership.role),
    members: visibleMembers,
    memberCount: members.length,
  });
}

async function handleJoinOrganization(request, env) {
  const auth = await requireMiniappSession(request, env);
  if (!auth) {
    return failure("请先登录", 401, 401);
  }

  if (!auth.profile.is_completed) {
    return failure("请先完善个人信息后再加入组织", 403, 403);
  }

  const body = await readJson(request);
  const code = (body.qrcodeKey || body.code || "").trim().toUpperCase();

  let organization = null;
  if (code) {
    organization = await first(
      env.DB,
      `SELECT org.*, invite.code AS invite_code
       FROM invitation_codes invite
       JOIN organizations org ON org.id = invite.org_id
       WHERE invite.code = ? AND invite.status = 'active' AND org.status = 'active'`,
      code
    );
  } else if (body.orgId) {
    organization = await first(
      env.DB,
      `SELECT * FROM organizations WHERE id = ? AND status = 'active'`,
      body.orgId
    );
  }

  if (!organization) {
    return failure("无效的邀请码", 404, 404);
  }

  const existing = await first(
    env.DB,
    `SELECT * FROM organization_members
     WHERE org_id = ? AND user_id = ?`,
    organization.id,
    auth.owner.id
  );
  if (existing && existing.status === "active") {
    return failure("您已经是该组织成员");
  }

  if (existing && existing.status !== "active") {
    await run(
      env.DB,
      `UPDATE organization_members
       SET role = 'member', status = 'active', joined_at = ?
       WHERE id = ?`,
      Date.now(),
      existing.id
    );

    return success(
      {
        orgId: organization.id,
        orgName: organization.name,
      },
      "重新加入组织成功"
    );
  }

  await run(
    env.DB,
    `INSERT INTO organization_members
      (id, org_id, user_id, role, status, joined_at)
     VALUES (?, ?, ?, 'member', 'active', ?)`,
    generateId("member"),
    organization.id,
    auth.owner.id,
    Date.now()
  );

  return success(
    {
      orgId: organization.id,
      orgName: organization.name,
    },
    "加入组织成功"
  );
}

async function handleLeaveOrganization(request, env, orgId) {
  const auth = await requireMiniappSession(request, env);
  if (!auth) {
    return failure("请先登录", 401, 401);
  }

  const organization = await first(
    env.DB,
    "SELECT * FROM organizations WHERE id = ?",
    orgId
  );
  if (!organization) {
    return failure("组织不存在", 404, 404);
  }
  if (organization.owner_user_id === auth.owner.id) {
    return failure("创建者不能退出组织", 403, 403);
  }

  const membership = await getOrganizationMembership(env, orgId, auth.owner.id);
  if (!membership) {
    return failure("您不是该组织成员");
  }

  await run(
    env.DB,
    `UPDATE organization_members
     SET status = 'inactive'
     WHERE id = ?`,
    membership.id
  );

  return success(null, "退出组织成功");
}

async function handleUpdateOrganization(request, env, orgId) {
  const auth = await requireMiniappSession(request, env);
  if (!auth) {
    return failure("请先登录", 401, 401);
  }

  const organization = await first(
    env.DB,
    "SELECT * FROM organizations WHERE id = ?",
    orgId
  );
  if (!organization) {
    return failure("组织不存在", 404, 404);
  }
  if (organization.owner_user_id !== auth.owner.id) {
    return failure("只有创建者可以修改组织信息", 403, 403);
  }

  const body = await readJson(request);
  await run(
    env.DB,
    `UPDATE organizations
     SET name = ?, description = ?, location_json = ?, updated_at = ?
     WHERE id = ?`,
    (body.data?.name || body.name || organization.name).trim(),
    (body.data?.description || body.description || organization.description || "").trim(),
    JSON.stringify(body.data?.location || body.location || JSON.parse(organization.location_json || "null")),
    Date.now(),
    orgId
  );

  return success(null, "更新成功");
}

async function handleDeleteOrganization(request, env, orgId) {
  const auth = await requireMiniappSession(request, env);
  if (!auth) {
    return failure("请先登录", 401, 401);
  }

  const organization = await first(
    env.DB,
    "SELECT * FROM organizations WHERE id = ?",
    orgId
  );
  if (!organization) {
    return failure("组织不存在", 404, 404);
  }
  if (organization.owner_user_id !== auth.owner.id) {
    return failure("只有创建者可以删除组织", 403, 403);
  }

  await run(
    env.DB,
    "UPDATE organizations SET status = 'inactive', updated_at = ? WHERE id = ?",
    Date.now(),
    orgId
  );
  await run(
    env.DB,
    "UPDATE organization_members SET status = 'inactive' WHERE org_id = ?",
    orgId
  );
  await run(
    env.DB,
    "UPDATE invitation_codes SET status = 'inactive', updated_at = ? WHERE org_id = ?",
    Date.now(),
    orgId
  );

  return success(null, "删除成功");
}

async function handleGetInviteCode(request, env, orgId) {
  const auth = await requireMiniappSession(request, env);
  if (!auth) {
    return failure("请先登录", 401, 401);
  }

  const membership = await getOrganizationMembership(env, orgId, auth.owner.id);
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return failure("只有创建者和管理员可以查看邀请码", 403, 403);
  }

  const inviteCode = await ensureInvitationCode(env, orgId, auth.owner.id);
  const organization = await first(
    env.DB,
    "SELECT name FROM organizations WHERE id = ?",
    orgId
  );

  return success({
    qrcodeKey: inviteCode.code,
    orgName: organization?.name || "",
    orgId,
  });
}

async function handleSetMemberRole(request, env, orgId, memberUserId) {
  const auth = await requireMiniappSession(request, env);
  if (!auth) {
    return failure("请先登录", 401, 401);
  }

  const organization = await first(
    env.DB,
    "SELECT * FROM organizations WHERE id = ?",
    orgId
  );
  if (!organization) {
    return failure("组织不存在", 404, 404);
  }
  if (organization.owner_user_id !== auth.owner.id) {
    return failure("只有创建者可以设置成员角色", 403, 403);
  }
  if (memberUserId === auth.owner.id) {
    return failure("不能修改自己的角色");
  }

  const body = await readJson(request);
  const role = body.role;
  if (!["admin", "supervisor", "member"].includes(role)) {
    return failure("无效的角色类型");
  }

  const membership = await getOrganizationMembership(env, orgId, memberUserId);
  if (!membership) {
    return failure("目标成员不存在", 404, 404);
  }

  await run(
    env.DB,
    "UPDATE organization_members SET role = ? WHERE id = ?",
    role,
    membership.id
  );

  return success(null, "角色设置成功");
}

async function handleOrganizationMembers(request, env, orgId) {
  const auth = await requireMiniappSession(request, env);
  if (!auth) {
    return failure("请先登录", 401, 401);
  }

  const membership = await getOrganizationMembership(env, orgId, auth.owner.id);
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return failure("只有创建者和管理员可以查看成员列表", 403, 403);
  }

  const rows = await all(
    env.DB,
    `SELECT members.id, members.user_id, members.role, members.joined_at,
            users.name, users.student_id, users.avatar_url
     FROM organization_members members
     JOIN users ON users.id = members.user_id
     WHERE members.org_id = ? AND members.status = 'active'`,
    orgId
  );

  const members = sortMembersByRole(
    rows.map((row) => ({
      _id: row.id,
      user_id: row.user_id,
      role: toLegacyRole(row.role),
      joined_at: row.joined_at,
      name: row.name || "未知",
      student_id: row.student_id || "",
      avatar: row.avatar_url || "",
    }))
  );

  return success(members);
}

async function handleInviteRecords(request, env, orgId) {
  const auth = await requireMiniappSession(request, env);
  if (!auth) {
    return failure("请先登录", 401, 401);
  }

  const membership = await getOrganizationMembership(env, orgId, auth.owner.id);
  if (!membership || !["owner", "admin"].includes(membership.role)) {
    return failure("只有创建者和管理员可以查看邀请记录", 403, 403);
  }

  const rows = await all(
    env.DB,
    `SELECT members.user_id, members.joined_at, users.name
     FROM organization_members members
     JOIN users ON users.id = members.user_id
     WHERE members.org_id = ? AND members.status = 'active'
     ORDER BY members.joined_at DESC
     LIMIT 10`,
    orgId
  );

  return success(
    rows.map((row) => ({
      _id: `${orgId}_${row.user_id}`,
      userName: row.name || "未填写姓名",
      join_time: row.joined_at,
      status: "accepted",
    }))
  );
}

async function handleClockStatus(request, env) {
  const auth = await requireMiniappSession(request, env);
  if (!auth) {
    return failure("请先登录", 401, 401);
  }

  const active = await first(
    env.DB,
    `SELECT *
     FROM work_records
     WHERE user_id = ? AND clock_out_time IS NULL
     ORDER BY clock_in_time DESC
     LIMIT 1`,
    auth.owner.id
  );

  if (active) {
    return success(mapWorkRecord(active));
  }

  const today = startOfDay(Date.now());
  const latestToday = await first(
    env.DB,
    `SELECT *
     FROM work_records
     WHERE user_id = ? AND clock_in_time >= ?
     ORDER BY clock_in_time DESC
     LIMIT 1`,
    auth.owner.id,
    today
  );

  return success(latestToday ? mapWorkRecord(latestToday) : null);
}

async function handleClockRecent(request, env) {
  const auth = await requireMiniappSession(request, env);
  if (!auth) {
    return failure("请先登录", 401, 401);
  }

  const rows = await all(
    env.DB,
    `SELECT *
     FROM work_records
     WHERE user_id = ?
     ORDER BY clock_in_time DESC
     LIMIT 5`,
    auth.owner.id
  );

  return success(rows.map(mapWorkRecord));
}

async function handleClockToday(request, env) {
  const auth = await requireMiniappSession(request, env);
  if (!auth) {
    return failure("请先登录", 401, 401);
  }

  const today = startOfDay(Date.now());
  const rows = await all(
    env.DB,
    `SELECT *
     FROM work_records
     WHERE user_id = ? AND clock_in_time >= ?
     ORDER BY clock_in_time DESC`,
    auth.owner.id,
    today
  );

  return success(rows.map(mapWorkRecord));
}

async function handleClockDuration(request, env) {
  const auth = await requireMiniappSession(request, env);
  if (!auth) {
    return failure("请先登录", 401, 401);
  }

  const today = startOfDay(Date.now());
  const rows = await all(
    env.DB,
    `SELECT *
     FROM work_records
     WHERE user_id = ? AND clock_in_time >= ?`,
    auth.owner.id,
    today
  );

  let totalMinutes = 0;
  let currentRecord = null;
  rows.forEach((row) => {
    if (!row.clock_out_time) {
      currentRecord = mapWorkRecord(row);
      totalMinutes += roundDurationMinutes(row.clock_in_time, Date.now());
    } else if (row.status !== "rejected") {
      totalMinutes += Number(row.duration_minutes || 0);
    }
  });

  return success({
    totalMinutes,
    currentRecord,
    recordCount: rows.length,
  });
}

async function handleClockIn(request, env) {
  const auth = await requireMiniappSession(request, env);
  if (!auth) {
    return failure("请先登录", 401, 401);
  }
  if (!auth.profile.is_completed) {
    return failure("请先完善个人信息", 403, 403);
  }

  const body = await readJson(request);
  if (!body.orgId) {
    return failure("请选择要打卡的组织");
  }

  const membership = await getOrganizationMembership(env, body.orgId, auth.owner.id);
  if (!membership) {
    return failure("您不是该组织的成员，无法打卡", 403, 403);
  }

  const activeRecord = await first(
    env.DB,
    `SELECT *
     FROM work_records
     WHERE user_id = ? AND clock_out_time IS NULL
     ORDER BY clock_in_time DESC
     LIMIT 1`,
    auth.owner.id
  );
  if (activeRecord) {
    return failure("您有未结束的打卡记录，请先下班");
  }

  const organization = await first(
    env.DB,
    "SELECT location_json FROM organizations WHERE id = ?",
    body.orgId
  );
  const orgLocation = organization?.location_json
    ? JSON.parse(organization.location_json)
    : null;
  if (orgLocation && body.location) {
    const distance = calculateDistanceMeters(orgLocation, body.location);
    if (distance > Number(orgLocation.radius || 1000)) {
      return failure("当前位置不在组织允许的打卡范围内");
    }
  }

  const recordId = generateId("record");
  const now = Date.now();
  await run(
    env.DB,
    `INSERT INTO work_records
      (id, user_id, org_id, clock_in_time, clock_in_location_json, status, audit_status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, 'ongoing', 'pending', ?, ?)`,
    recordId,
    auth.owner.id,
    body.orgId,
    now,
    JSON.stringify(body.location || {}),
    now,
    now
  );

  return success(
    {
      recordId,
      clockInTime: now,
    },
    "上班打卡成功"
  );
}

async function handleClockOut(request, env) {
  const auth = await requireMiniappSession(request, env);
  if (!auth) {
    return failure("请先登录", 401, 401);
  }

  const body = await readJson(request);
  const record = await first(
    env.DB,
    "SELECT * FROM work_records WHERE id = ?",
    body.recordId
  );
  if (!record) {
    return failure("打卡记录不存在", 404, 404);
  }
  if (record.user_id !== auth.owner.id) {
    return failure("无权操作该打卡记录", 403, 403);
  }
  if (record.clock_out_time) {
    return failure("当前记录已完成");
  }

  const organization = await first(
    env.DB,
    "SELECT location_json FROM organizations WHERE id = ?",
    record.org_id
  );
  const orgLocation = organization?.location_json
    ? JSON.parse(organization.location_json)
    : null;
  if (orgLocation && body.location) {
    const distance = calculateDistanceMeters(orgLocation, body.location);
    if (distance > Number(orgLocation.radius || 1000)) {
      return failure("当前位置不在组织允许的打卡范围内");
    }
  }

  const now = Date.now();
  const durationMinutes = roundDurationMinutes(record.clock_in_time, now);
  await run(
    env.DB,
    `UPDATE work_records
     SET clock_out_time = ?, clock_out_location_json = ?, duration_minutes = ?,
         status = 'completed', audit_status = 'pending', updated_at = ?
     WHERE id = ?`,
    now,
    JSON.stringify(body.location || {}),
    durationMinutes,
    now,
    record.id
  );
  await rebuildDailyStat(env, record.user_id, record.org_id, record.clock_in_time);

  return success(
    {
      clockOutTime: now,
      durationMinutes,
    },
    "下班打卡成功"
  );
}

async function handleStats(request, env) {
  const auth = await requireMiniappSession(request, env);
  if (!auth) {
    return failure("未登录", 401, 401);
  }

  const url = new URL(request.url);
  if (url.searchParams.get("type") === "today") {
    return success(await getTodayStats(env, auth.owner.id));
  }

  const payload = await getStatsPayload(
    env,
    auth.owner.id,
    url.searchParams.get("year"),
    url.searchParams.get("month")
  );
  return success(payload);
}

async function handleFeedbackList(request, env) {
  const auth = await requireMiniappSession(request, env);
  if (!auth) {
    return failure("未登录", 401, 401);
  }

  const rows = await all(
    env.DB,
    `SELECT *
     FROM feedback_items
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    auth.owner.id
  );
  return success(rows.map((row) => ({ ...mapFeedback(row), status: legacyFeedbackStatus(row.status) })));
}

async function handleFeedbackCreate(request, env) {
  const auth = await requireMiniappSession(request, env);
  if (!auth) {
    return failure("未登录", 401, 401);
  }

  const body = await readJson(request);
  if (!body.title || !body.content) {
    return failure("反馈标题和内容不能为空");
  }

  const feedbackId = generateId("feedback");
  const now = Date.now();
  await run(
    env.DB,
    `INSERT INTO feedback_items
      (id, user_id, type, title, content, images_json, contact, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, 'pending', ?, ?)`,
    feedbackId,
    auth.owner.id,
    body.type || "other",
    body.title.trim(),
    body.content.trim(),
    JSON.stringify(body.images || []),
    (body.contact || "").trim(),
    now,
    now
  );

  return success({ feedbackId }, "提交成功");
}

async function handleFeedbackDetail(request, env, feedbackId) {
  const auth = await requireMiniappSession(request, env);
  if (!auth) {
    return failure("未登录", 401, 401);
  }

  const row = await first(
    env.DB,
    `SELECT *
     FROM feedback_items
     WHERE id = ? AND user_id = ?`,
    feedbackId,
    auth.owner.id
  );
  if (!row) {
    return failure("反馈不存在", 404, 404);
  }

  return success({
    ...mapFeedback(row),
    status: legacyFeedbackStatus(row.status),
  });
}

async function handleNotifications(request, env) {
  const auth = await requireMiniappSession(request, env);
  if (!auth) {
    return failure("未登录", 401, 401);
  }

  const rows = await all(
    env.DB,
    `SELECT *
     FROM notifications
     WHERE user_id = ?
     ORDER BY created_at DESC`,
    auth.owner.id
  );
  return success(rows);
}

async function handleNotificationDetail(request, env, notificationId) {
  const auth = await requireMiniappSession(request, env);
  if (!auth) {
    return failure("未登录", 401, 401);
  }

  const notification = await first(
    env.DB,
    "SELECT * FROM notifications WHERE id = ? AND user_id = ?",
    notificationId,
    auth.owner.id
  );
  if (!notification) {
    return failure("通知不存在", 404, 404);
  }

  if (notification.status === "unread") {
    await run(
      env.DB,
      "UPDATE notifications SET status = 'read', read_at = ? WHERE id = ?",
      Date.now(),
      notificationId
    );
    notification.status = "read";
    notification.read_at = Date.now();
  }

  return success(notification);
}

async function handleNotificationRead(request, env, notificationId) {
  const auth = await requireMiniappSession(request, env);
  if (!auth) {
    return failure("未登录", 401, 401);
  }

  await run(
    env.DB,
    "UPDATE notifications SET status = 'read', read_at = ? WHERE id = ? AND user_id = ?",
    Date.now(),
    notificationId,
    auth.owner.id
  );
  return success(null, "已标记为已读");
}

function buildCsv(rows) {
  const header = [
    "组织名称",
    "上班时间",
    "下班时间",
    "时长(分钟)",
    "状态",
  ];
  const lines = rows.map((row) =>
    [
      row.org_name,
      new Date(row.clock_in_time).toISOString(),
      row.clock_out_time ? new Date(row.clock_out_time).toISOString() : "",
      row.duration_minutes || 0,
      row.status,
    ]
      .map((value) => `"${String(value ?? "").replace(/"/g, '""')}"`)
      .join(",")
  );

  return [header.join(","), ...lines].join("\n");
}

async function handleExportList(request, env) {
  const auth = await requireMiniappSession(request, env);
  if (!auth) {
    return failure("未登录", 401, 401);
  }

  const rows = await all(
    env.DB,
    `SELECT export_jobs.*, organizations.name AS org_name
     FROM export_jobs
     LEFT JOIN organizations ON organizations.id = export_jobs.org_id
     WHERE export_jobs.user_id = ?
     ORDER BY export_jobs.created_at DESC`,
    auth.owner.id
  );

  return success(
    rows.map((row) => ({
      _id: row.id,
      export_type: row.export_type,
      org_name: row.org_name || "全部组织",
      total_minutes: row.total_minutes || 0,
      verify_code: row.verify_code,
      status: row.status,
      created_at: row.created_at,
      file_url: row.file_key ? getFileUrl(request, row.file_key) : "",
    }))
  );
}

async function handleExportCreate(request, env) {
  const auth = await requireMiniappSession(request, env);
  if (!auth) {
    return failure("未登录", 401, 401);
  }

  const body = await readJson(request);
  const range = buildStatsRange(body.year, body.month);
  const conditions = ["work_records.user_id = ?", "work_records.clock_out_time IS NOT NULL", "work_records.status != 'rejected'"];
  const bindings = [auth.owner.id];
  if (body.orgId) {
    conditions.push("work_records.org_id = ?");
    bindings.push(body.orgId);
  }
  if (range) {
    conditions.push("work_records.clock_in_time >= ?", "work_records.clock_in_time < ?");
    bindings.push(range.start, range.end);
  }
  const rows = await all(
    env.DB,
    `SELECT work_records.*, organizations.name AS org_name
     FROM work_records
     JOIN organizations ON organizations.id = work_records.org_id
     WHERE ${conditions.join(" AND ")}
     ORDER BY work_records.clock_in_time DESC`,
    ...bindings
  );

  const totalMinutes = rows.reduce(
    (sum, row) => sum + Number(row.duration_minutes || 0),
    0
  );
  const exportId = generateId("export");
  let verifyCode = generateVerifyCode();
  while (
    await first(env.DB, "SELECT id FROM export_jobs WHERE verify_code = ?", verifyCode)
  ) {
    verifyCode = generateVerifyCode();
  }
  const fileKey = `exports/${exportId}.csv`;
  const csv = buildCsv(rows);
  await env.FILES.put(fileKey, csv, {
    httpMetadata: {
      contentType: "text/csv; charset=utf-8",
    },
  });
  await run(
    env.DB,
    `INSERT INTO export_jobs
      (id, user_id, org_id, export_type, filter_year, filter_month, total_minutes, verify_code, file_key, status, created_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'ready', ?)`,
    exportId,
    auth.owner.id,
    body.orgId || null,
    body.exportType || "csv",
    body.year || null,
    body.month || null,
    totalMinutes,
    verifyCode,
    fileKey,
    Date.now()
  );

  await createNotification(
    env,
    auth.owner.id,
    NOTIFICATION_TYPE.export_ready,
    "导出任务已生成",
    `您的导出文件已生成，验证码为 ${verifyCode}`,
    "export",
    exportId
  );

  return success(
    {
      _id: exportId,
      total_minutes: totalMinutes,
      verify_code: verifyCode,
      file_url: getFileUrl(request, fileKey),
    },
    "导出成功"
  );
}

async function handleVerifyExport(request, env) {
  const url = new URL(request.url);
  const code = (url.searchParams.get("code") || "").trim();
  if (!code) {
    return failure("验证码不能为空");
  }

  const row = await first(
    env.DB,
    `SELECT export_jobs.*, users.name AS user_name, organizations.name AS org_name
     FROM export_jobs
     JOIN users ON users.id = export_jobs.user_id
     LEFT JOIN organizations ON organizations.id = export_jobs.org_id
     WHERE export_jobs.verify_code = ?`,
    code
  );
  if (!row) {
    return failure("未找到对应的导出记录", 404, 404);
  }

  return success({
    _id: row.id,
    user_name: row.user_name || "未知用户",
    org_name: row.org_name || "全部组织",
    total_minutes: row.total_minutes || 0,
    created_at: row.created_at,
    file_url: row.file_key ? getFileUrl(request, row.file_key) : "",
    verify_code: row.verify_code,
  });
}

async function handleCreateUploadTicket(request, env) {
  const auth = await requireMiniappSession(request, env);
  if (!auth) {
    return failure("未登录", 401, 401);
  }

  const body = await readJson(request);
  const ticket = await createUploadTicket(
    env,
    auth.owner.id,
    body.namespace || "feedback",
    body.filename || "upload.bin"
  );

  return success({
    ticket: ticket.ticket,
    fileKey: ticket.key,
    uploadUrl: `${getApiBaseUrl(request)}/miniapp/uploads/${encodeURIComponent(
      ticket.ticket
    )}`,
  });
}

async function handleUploadFile(request, env, ticketValue) {
  const payload = await verifyUploadTicket(env, ticketValue);
  if (!payload) {
    return failure("上传凭证无效或已过期", 401, 401);
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return failure("未找到上传文件");
  }

  await env.FILES.put(payload.key, file.stream(), {
    httpMetadata: {
      contentType: file.type || "application/octet-stream",
    },
  });

  return success({
    fileKey: payload.key,
    fileUrl: getFileUrl(request, payload.key),
  });
}

export async function handleMiniappRequest(request, env, pathname) {
  const url = new URL(request.url);
  const parts = pathname.split("/").filter(Boolean);
  const [, resource, id, subResource, extra] = parts;

  try {
    if (request.method === "POST" && pathname === "/miniapp/auth/wechat/login") {
      return handleWechatLogin(request, env);
    }
    if (pathname === "/miniapp/me" && request.method === "GET") {
      return handleGetMe(request, env);
    }
    if (pathname === "/miniapp/me" && request.method === "PUT") {
      return handleUpdateMe(request, env);
    }
    if (pathname === "/miniapp/me/profile-completion") {
      return handleProfileCompletion(request, env);
    }
    if (pathname === "/miniapp/me/roles") {
      return handleGetRoles(request, env);
    }
    if (pathname === "/miniapp/dashboard") {
      return handleDashboard(request, env);
    }
    if (pathname === "/miniapp/organizations" && request.method === "GET") {
      return handleListOrganizations(request, env);
    }
    if (pathname === "/miniapp/organizations/manageable" && request.method === "GET") {
      return handleListOrganizations(request, env, true);
    }
    if (pathname === "/miniapp/organizations" && request.method === "POST") {
      return handleCreateOrganization(request, env);
    }
    if (resource === "organizations" && id && !subResource && request.method === "GET") {
      return handleOrganizationDetail(request, env, id);
    }
    if (pathname === "/miniapp/organizations/join" && request.method === "POST") {
      return handleJoinOrganization(request, env);
    }
    if (resource === "organizations" && id && subResource === "leave") {
      return handleLeaveOrganization(request, env, id);
    }
    if (resource === "organizations" && id && !subResource && request.method === "PATCH") {
      return handleUpdateOrganization(request, env, id);
    }
    if (resource === "organizations" && id && !subResource && request.method === "DELETE") {
      return handleDeleteOrganization(request, env, id);
    }
    if (resource === "organizations" && id && subResource === "invite-code") {
      return handleGetInviteCode(request, env, id);
    }
    if (resource === "organizations" && id && subResource === "members" && request.method === "GET") {
      return handleOrganizationMembers(request, env, id);
    }
    if (
      resource === "organizations" &&
      id &&
      subResource === "members" &&
      extra &&
      request.method === "PATCH"
    ) {
      return handleSetMemberRole(request, env, id, extra);
    }
    if (resource === "organizations" && id && subResource === "invite-records") {
      return handleInviteRecords(request, env, id);
    }
    if (pathname === "/miniapp/clock/status") {
      return handleClockStatus(request, env);
    }
    if (pathname === "/miniapp/clock/recent") {
      return handleClockRecent(request, env);
    }
    if (pathname === "/miniapp/clock/today") {
      return handleClockToday(request, env);
    }
    if (pathname === "/miniapp/clock/duration") {
      return handleClockDuration(request, env);
    }
    if (pathname === "/miniapp/clock/in" && request.method === "POST") {
      return handleClockIn(request, env);
    }
    if (pathname === "/miniapp/clock/out" && request.method === "POST") {
      return handleClockOut(request, env);
    }
    if (pathname === "/miniapp/stats") {
      return handleStats(request, env);
    }
    if (pathname === "/miniapp/feedback" && request.method === "GET") {
      return handleFeedbackList(request, env);
    }
    if (pathname === "/miniapp/feedback" && request.method === "POST") {
      return handleFeedbackCreate(request, env);
    }
    if (resource === "feedback" && id && request.method === "GET") {
      return handleFeedbackDetail(request, env, id);
    }
    if (pathname === "/miniapp/notifications" && request.method === "GET") {
      return handleNotifications(request, env);
    }
    if (resource === "notifications" && id && request.method === "GET") {
      return handleNotificationDetail(request, env, id);
    }
    if (resource === "notifications" && id && subResource === "read" && request.method === "POST") {
      return handleNotificationRead(request, env, id);
    }
    if (pathname === "/miniapp/exports" && request.method === "GET") {
      return handleExportList(request, env);
    }
    if (pathname === "/miniapp/exports" && request.method === "POST") {
      return handleExportCreate(request, env);
    }
    if (pathname === "/miniapp/verify" && request.method === "GET") {
      return handleVerifyExport(request, env);
    }
    if (pathname === "/miniapp/uploads/ticket" && request.method === "POST") {
      return handleCreateUploadTicket(request, env);
    }
    if (resource === "uploads" && id && request.method === "POST") {
      return handleUploadFile(request, env, decodeURIComponent(id));
    }

    return failure(`未找到接口: ${pathname}`, 404, 404);
  } catch (error) {
    return failure(error.message || "服务器内部错误", 500, 500, {
      pathname: url.pathname,
    });
  }
}
