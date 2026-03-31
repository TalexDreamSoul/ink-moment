function parseJson(value, fallback) {
  if (!value) {
    return fallback;
  }

  try {
    return JSON.parse(value);
  } catch (_error) {
    return fallback;
  }
}

export async function first(db, sql, ...bindings) {
  return db.prepare(sql).bind(...bindings).first();
}

export async function all(db, sql, ...bindings) {
  const result = await db.prepare(sql).bind(...bindings).all();
  return result.results || [];
}

export async function run(db, sql, ...bindings) {
  return db.prepare(sql).bind(...bindings).run();
}

export async function batch(db, statements) {
  const prepared = statements.map(({ sql, bindings = [] }) =>
    db.prepare(sql).bind(...bindings)
  );
  return db.batch(prepared);
}

export function startOfDay(timestamp) {
  const date = new Date(timestamp);
  date.setHours(0, 0, 0, 0);
  return date.getTime();
}

export function mapUserProfile(row) {
  if (!row) {
    return null;
  }

  return {
    _id: row.id,
    user_id: row.id,
    name: row.name || "",
    student_id: row.student_id || "",
    college: row.college || "",
    grade_major: row.grade_major || "",
    phone: row.phone || "",
    counselor: row.counselor || "",
    gender: row.gender || "other",
    avatar_url: row.avatar_url || "",
    nickname: row.nickname || "",
    meta: parseJson(row.meta_json, {}),
    notification_prefs: parseJson(row.notification_prefs_json, {
      system: true,
      audit: true,
      exports: true,
    }),
    is_completed: Boolean(row.is_completed),
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapOrganization(row) {
  if (!row) {
    return null;
  }

  return {
    _id: row.id,
    name: row.name,
    description: row.description || "",
    owner_id: row.owner_user_id,
    status: row.status,
    created_at: row.created_at,
    updated_at: row.updated_at,
    location: parseJson(row.location_json, null),
    invite_code: row.invite_code || row.code || "",
  };
}

export function mapWorkRecord(row) {
  if (!row) {
    return null;
  }

  return {
    _id: row.id,
    user_id: row.user_id,
    org_id: row.org_id,
    clock_in_time: row.clock_in_time,
    clock_in_location: parseJson(row.clock_in_location_json, null),
    clock_out_time: row.clock_out_time,
    clock_out_location: parseJson(row.clock_out_location_json, null),
    duration_minutes: row.duration_minutes || 0,
    status: row.status,
    audit_status: row.audit_status,
    audit_reason: row.audit_reason || "",
    created_at: row.created_at,
    updated_at: row.updated_at,
  };
}

export function mapFeedback(row) {
  if (!row) {
    return null;
  }

  return {
    _id: row.id,
    user_id: row.user_id,
    type: row.type,
    title: row.title,
    content: row.content,
    images: parseJson(row.images_json, []),
    contact: row.contact || "",
    status: row.status,
    reply: row.reply_content || "",
    reply_time: row.replied_at,
    create_time: row.created_at,
    update_time: row.updated_at,
  };
}
