PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  wechat_openid TEXT UNIQUE,
  name TEXT,
  student_id TEXT,
  college TEXT,
  grade_major TEXT,
  phone TEXT,
  counselor TEXT,
  gender TEXT DEFAULT 'other',
  avatar_url TEXT,
  nickname TEXT,
  meta_json TEXT DEFAULT '{}',
  notification_prefs_json TEXT DEFAULT '{"system":true,"audit":true,"exports":true}',
  is_completed INTEGER DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS miniapp_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS admin_accounts (
  id TEXT PRIMARY KEY,
  username TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  display_name TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'platform_admin',
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE TABLE IF NOT EXISTS admin_sessions (
  id TEXT PRIMARY KEY,
  admin_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  last_used_at INTEGER NOT NULL,
  FOREIGN KEY (admin_id) REFERENCES admin_accounts(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS organizations (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT DEFAULT '',
  owner_user_id TEXT NOT NULL,
  location_json TEXT,
  status TEXT NOT NULL DEFAULT 'active',
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (owner_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS organization_members (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'member',
  status TEXT NOT NULL DEFAULT 'active',
  joined_at INTEGER NOT NULL,
  UNIQUE (org_id, user_id),
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS invitation_codes (
  id TEXT PRIMARY KEY,
  org_id TEXT NOT NULL,
  code TEXT NOT NULL UNIQUE,
  status TEXT NOT NULL DEFAULT 'active',
  created_by_user_id TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by_user_id) REFERENCES users(id)
);

CREATE TABLE IF NOT EXISTS work_records (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  clock_in_time INTEGER NOT NULL,
  clock_in_location_json TEXT NOT NULL,
  clock_out_time INTEGER,
  clock_out_location_json TEXT,
  duration_minutes INTEGER DEFAULT 0,
  status TEXT NOT NULL DEFAULT 'ongoing',
  audit_status TEXT NOT NULL DEFAULT 'pending',
  audited_by_type TEXT,
  audited_by_id TEXT,
  audit_reason TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS attendance_daily_stats (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  stat_date INTEGER NOT NULL,
  total_minutes INTEGER NOT NULL DEFAULT 0,
  record_count INTEGER NOT NULL DEFAULT 0,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  UNIQUE (user_id, org_id, stat_date),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS feedback_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  images_json TEXT DEFAULT '[]',
  contact TEXT DEFAULT '',
  status TEXT NOT NULL DEFAULT 'pending',
  reply_content TEXT,
  replied_by_admin_id TEXT,
  replied_at INTEGER,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (replied_by_admin_id) REFERENCES admin_accounts(id)
);

CREATE TABLE IF NOT EXISTS notifications (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  related_type TEXT,
  related_id TEXT,
  status TEXT NOT NULL DEFAULT 'unread',
  created_at INTEGER NOT NULL,
  read_at INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS duration_adjustments (
  id TEXT PRIMARY KEY,
  record_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  org_id TEXT NOT NULL,
  original_minutes INTEGER NOT NULL,
  adjusted_minutes INTEGER NOT NULL,
  reason TEXT NOT NULL,
  adjusted_by_admin_id TEXT NOT NULL,
  adjusted_at INTEGER NOT NULL,
  FOREIGN KEY (record_id) REFERENCES work_records(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (org_id) REFERENCES organizations(id) ON DELETE CASCADE,
  FOREIGN KEY (adjusted_by_admin_id) REFERENCES admin_accounts(id)
);

CREATE TABLE IF NOT EXISTS export_jobs (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  org_id TEXT,
  export_type TEXT NOT NULL DEFAULT 'csv',
  filter_year INTEGER,
  filter_month INTEGER,
  total_minutes INTEGER NOT NULL DEFAULT 0,
  verify_code TEXT NOT NULL UNIQUE,
  file_key TEXT,
  status TEXT NOT NULL DEFAULT 'ready',
  created_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (org_id) REFERENCES organizations(id)
);

CREATE TABLE IF NOT EXISTS system_settings (
  setting_key TEXT PRIMARY KEY,
  value_text TEXT NOT NULL,
  updated_at INTEGER NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_miniapp_sessions_user_id ON miniapp_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_admin_sessions_admin_id ON admin_sessions(admin_id);
CREATE INDEX IF NOT EXISTS idx_org_members_org_id ON organization_members(org_id);
CREATE INDEX IF NOT EXISTS idx_org_members_user_id ON organization_members(user_id);
CREATE INDEX IF NOT EXISTS idx_work_records_user_time ON work_records(user_id, clock_in_time DESC);
CREATE INDEX IF NOT EXISTS idx_work_records_org_time ON work_records(org_id, clock_in_time DESC);
CREATE INDEX IF NOT EXISTS idx_daily_stats_user_date ON attendance_daily_stats(user_id, stat_date DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_user_status ON notifications(user_id, status, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON feedback_items(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_export_jobs_user_id ON export_jobs(user_id, created_at DESC);
