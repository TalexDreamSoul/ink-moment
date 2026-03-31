const STORAGE_KEYS = {
  apiBaseUrl: "app_api_base_url",
  adminBaseUrl: "app_admin_base_url",
};

const DEFAULT_API_BASE_URL = "https://ink-moment.tagzxia.com/api";
const DEFAULT_ADMIN_BASE_URL = "https://ink-moment.tagzxia.com";

function safeGetStorage(key) {
  try {
    return uni.getStorageSync(key) || "";
  } catch (_error) {
    return "";
  }
}

function safeSetStorage(key, value) {
  try {
    uni.setStorageSync(key, value);
  } catch (_error) {
    // 忽略运行时不支持存储的场景
  }
}

function normalizeBaseUrl(value, fallback) {
  const nextValue = String(value || fallback || "").trim();
  return nextValue.replace(/\/+$/, "");
}

export function getApiBaseUrl() {
  return normalizeBaseUrl(safeGetStorage(STORAGE_KEYS.apiBaseUrl), DEFAULT_API_BASE_URL);
}

export function setApiBaseUrl(value) {
  safeSetStorage(STORAGE_KEYS.apiBaseUrl, normalizeBaseUrl(value, DEFAULT_API_BASE_URL));
}

export function getAdminBaseUrl() {
  return normalizeBaseUrl(
    safeGetStorage(STORAGE_KEYS.adminBaseUrl),
    DEFAULT_ADMIN_BASE_URL
  );
}

export function setAdminBaseUrl(value) {
  safeSetStorage(
    STORAGE_KEYS.adminBaseUrl,
    normalizeBaseUrl(value, DEFAULT_ADMIN_BASE_URL)
  );
}

export function getJoinPagePath(orgId = "", inviteCode = "") {
  const params = [];
  if (orgId) {
    params.push(`orgId=${encodeURIComponent(orgId)}`);
  }
  if (inviteCode) {
    params.push(`inviteCode=${encodeURIComponent(inviteCode)}`);
    params.push(`code=${encodeURIComponent(inviteCode)}`);
  }

  return `/pages/organization/join${params.length ? `?${params.join("&")}` : ""}`;
}
