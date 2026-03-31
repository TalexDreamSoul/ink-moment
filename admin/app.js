const STORAGE_KEYS = {
  apiBaseUrl: "suyanjinshi_admin_api_base_url",
  token: "suyanjinshi_admin_token",
};

const state = {
  apiBaseUrl:
    localStorage.getItem(STORAGE_KEYS.apiBaseUrl) ||
    "https://suyanjinshi-api.talexdreamsoul.workers.dev",
  token: localStorage.getItem(STORAGE_KEYS.token) || "",
  systemStatus: null,
  currentAdmin: null,
  organizations: [],
  organizationDetail: null,
  clockRecords: [],
  feedbackItems: [],
  notifications: [],
  exportJobs: [],
};

const $ = (selector) => document.querySelector(selector);

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => {
    const map = {
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      '"': "&quot;",
      "'": "&#39;",
    };
    return map[char] || char;
  });
}

function showToast(message, tone = "normal") {
  const toast = $("#toast");
  toast.textContent = message;
  toast.classList.remove("hidden");
  toast.style.background = tone === "error" ? "rgba(127, 29, 29, 0.95)" : "rgba(15, 23, 42, 0.92)";
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.classList.add("hidden");
  }, 2800);
}

function formatTime(value) {
  if (!value) {
    return "-";
  }

  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const hour = String(date.getHours()).padStart(2, "0");
  const minute = String(date.getMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function formatMinutes(value) {
  const minutes = Number(value || 0);
  const hours = Math.floor(minutes / 60);
  const remain = minutes % 60;
  return `${hours}小时${remain}分钟`;
}

async function copyText(value) {
  const text = String(value ?? "");
  if (!text) {
    throw new Error("没有可复制的内容");
  }

  if (navigator.clipboard?.writeText) {
    await navigator.clipboard.writeText(text);
    return;
  }

  window.prompt("请手动复制以下内容", text);
}

function buildUrl(path, query = {}) {
  const url = new URL(path, `${state.apiBaseUrl.replace(/\/+$/, "")}/`);
  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, value);
    }
  });
  return url.toString();
}

async function api(path, { method = "GET", data, query, auth = true } = {}) {
  const response = await fetch(buildUrl(path, query), {
    method,
    headers: {
      "content-type": "application/json",
      ...(auth && state.token ? { authorization: `Bearer ${state.token}` } : {}),
    },
    body: data ? JSON.stringify(data) : undefined,
  });

  const payload = await response.json().catch(() => null);
  if (!payload || typeof payload !== "object") {
    throw new Error("服务器返回了无效响应");
  }
  if (payload.code !== 0) {
    if (payload.code === 401) {
      state.token = "";
      localStorage.removeItem(STORAGE_KEYS.token);
      renderAuthState();
    }
    throw new Error(payload.message || "请求失败");
  }
  return payload.data;
}

function renderMetrics(container, items) {
  container.innerHTML = items
    .map(
      (item) => `
        <div class="metric">
          <span class="metric-value">${escapeHtml(item.value)}</span>
          <span class="metric-label">${escapeHtml(item.label)}</span>
        </div>
      `
    )
    .join("");
}

function renderList(container, items, formatter) {
  if (!items || items.length === 0) {
    container.innerHTML = `<div class="list-item muted">暂无数据</div>`;
    return;
  }

  container.innerHTML = items.map(formatter).join("");
}

function renderSystemStatus() {
  const status = state.systemStatus || {
    hasSuperAdmin: false,
    superAdminCount: 0,
    adminCount: 0,
    orgCount: 0,
    userCount: 0,
    systemReady: false,
  };

  renderMetrics($("#systemMetrics"), [
    { label: "超级管理员", value: status.superAdminCount },
    { label: "平台管理员", value: status.adminCount },
    { label: "组织数", value: status.orgCount },
    { label: "用户数", value: status.userCount },
  ]);
}

function renderAuthState() {
  const ready = !!state.systemStatus?.systemReady;
  const loggedIn = !!state.token;

  $("#bootstrapPanel").classList.toggle("hidden", ready);
  $("#loginPanel").classList.toggle("hidden", !ready || loggedIn);
  $("#dashboard").classList.toggle("hidden", !loggedIn);
  $("#logoutBtn").classList.toggle("hidden", !loggedIn);
  $("#refreshAllBtn").classList.toggle("hidden", !loggedIn);
}

function renderOverview(overview) {
  state.currentAdmin = overview.currentAdmin || null;
  $("#currentAdmin").textContent = state.currentAdmin
    ? `${state.currentAdmin.displayName} · ${state.currentAdmin.role}`
    : "未登录";

  renderMetrics($("#overviewMetrics"), [
    { label: "组织数", value: overview.system.orgCount },
    { label: "用户数", value: overview.system.userCount },
    { label: "活跃成员", value: overview.metrics.activeMemberCount },
    { label: "待审核打卡", value: overview.metrics.pendingClockCount },
    { label: "待处理反馈", value: overview.metrics.pendingFeedbackCount },
    { label: "导出任务", value: overview.metrics.exportCount },
  ]);

  renderList($("#recentFeedback"), overview.recent.feedback, (item) => `
    <div class="list-item">
      <strong>${escapeHtml(item.title)}</strong>
      <div class="muted">${escapeHtml(item.user_name)} · ${escapeHtml(item.status)}</div>
      <div class="muted">${escapeHtml(formatTime(item.created_at))}</div>
    </div>
  `);

  renderList($("#recentExports"), overview.recent.exports, (item) => `
    <div class="list-item">
      <strong>${escapeHtml(item.user_name)}</strong>
      <div class="muted">${escapeHtml(item.org_name || "全部组织")} · 验证码 ${escapeHtml(item.verify_code)}</div>
      <div class="muted">${escapeHtml(formatTime(item.created_at))}</div>
    </div>
  `);
}

function renderOrganizations() {
  const table = $("#organizationTable");
  table.innerHTML = state.organizations
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.name)}</td>
          <td>${escapeHtml(item.ownerName)}</td>
          <td>${escapeHtml(item.memberCount)}</td>
          <td>${escapeHtml(item.inviteCode || "-")}</td>
          <td>
            <div class="actions">
              <button class="secondary" data-action="view-org" data-id="${escapeHtml(item.id)}">查看详情</button>
              <button class="secondary" data-action="copy" data-value="${escapeHtml(item.inviteCode || "")}">复制邀请码</button>
            </div>
          </td>
        </tr>
      `
    )
    .join("");
}

function renderOrganizationDetail() {
  const panel = $("#organizationDetailPanel");
  const detail = state.organizationDetail;
  if (!detail) {
    panel.classList.add("hidden");
    return;
  }

  panel.classList.remove("hidden");
  $("#organizationDetailTitle").textContent = detail.organization.name;
  $("#organizationDetailMeta").textContent = `负责人：${detail.organization.ownerName} · 邀请码：${detail.organization.inviteCode || "-"} · 创建时间：${formatTime(detail.organization.createdAt)}`;

  $("#organizationMemberTable").innerHTML = detail.members
    .map(
      (item) => `
        <tr>
          <td>
            <strong>${escapeHtml(item.name)}</strong>
            <div class="muted">${escapeHtml(item.studentId || "-")}</div>
          </td>
          <td>
            <select data-member-role="${escapeHtml(item.id)}" ${item.userId === detail.organization.ownerUserId ? "disabled" : ""}>
              ${["member", "supervisor", "admin"]
                .map(
                  (role) =>
                    `<option value="${role}" ${item.role === role ? "selected" : ""}>${role}</option>`
                )
                .join("")}
            </select>
          </td>
          <td>${escapeHtml(formatMinutes(item.totalMinutes))}</td>
          <td>${escapeHtml(item.status)}</td>
          <td>
            <button class="secondary" data-action="save-member-role" data-id="${escapeHtml(item.id)}" ${item.userId === detail.organization.ownerUserId ? "disabled" : ""}>保存角色</button>
          </td>
        </tr>
      `
    )
    .join("");
}

function renderClockRecords() {
  $("#clockRecordTable").innerHTML = state.clockRecords
    .map(
      (item) => `
        <tr>
          <td>
            <strong>${escapeHtml(item.userName)}</strong>
            <div class="muted">${escapeHtml(item.studentId || "-")}</div>
          </td>
          <td>${escapeHtml(item.orgName)}</td>
          <td>${escapeHtml(formatTime(item.clockInTime))}</td>
          <td>${escapeHtml(formatTime(item.clockOutTime))}</td>
          <td>${escapeHtml(formatMinutes(item.durationMinutes))}</td>
          <td>${escapeHtml(item.auditStatus)}</td>
          <td>
            <div class="actions">
              <button class="secondary" data-action="approve-record" data-id="${escapeHtml(item.id)}">通过</button>
              <button class="danger" data-action="reject-record" data-id="${escapeHtml(item.id)}">驳回</button>
            </div>
          </td>
        </tr>
      `
    )
    .join("");
}

function renderFeedback() {
  $("#feedbackTable").innerHTML = state.feedbackItems
    .map(
      (item) => `
        <tr>
          <td>
            <strong>${escapeHtml(item.userName)}</strong>
            <div class="muted">${escapeHtml(item.studentId || "-")}</div>
          </td>
          <td>
            <strong>${escapeHtml(item.title)}</strong>
            <div class="muted">${escapeHtml(item.content)}</div>
          </td>
          <td>${escapeHtml(item.type)}</td>
          <td>${escapeHtml(item.status)}</td>
          <td>${escapeHtml(formatTime(item.createdAt))}</td>
          <td>
            <button class="secondary" data-action="reply-feedback" data-id="${escapeHtml(item.id)}">回复</button>
          </td>
        </tr>
      `
    )
    .join("");
}

function renderNotifications() {
  $("#notificationTable").innerHTML = state.notifications
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.userName)}</td>
          <td>${escapeHtml(item.title)}</td>
          <td>${escapeHtml(item.type)}</td>
          <td>${escapeHtml(item.status)}</td>
          <td>${escapeHtml(formatTime(item.createdAt))}</td>
        </tr>
      `
    )
    .join("");
}

function renderExports() {
  $("#exportTable").innerHTML = state.exportJobs
    .map(
      (item) => `
        <tr>
          <td>${escapeHtml(item.userName)}</td>
          <td>${escapeHtml(item.orgName)}</td>
          <td>${escapeHtml(item.verifyCode)}</td>
          <td>${escapeHtml(formatMinutes(item.totalMinutes))}</td>
          <td>${escapeHtml(formatTime(item.createdAt))}</td>
        </tr>
      `
    )
    .join("");
}

async function loadSystemStatus() {
  state.systemStatus = await api("/admin/system/status", { auth: false });
  renderSystemStatus();
  renderAuthState();
}

async function loadOverview() {
  const overview = await api("/admin/system/overview");
  renderOverview(overview);
}

async function loadOrganizations() {
  state.organizations = await api("/admin/organizations");
  renderOrganizations();
}

async function loadOrganizationDetail(id) {
  state.organizationDetail = await api(`/admin/organizations/${id}`);
  renderOrganizationDetail();
}

async function loadClockRecords(filters = {}) {
  state.clockRecords = await api("/admin/clock-records", { query: { limit: 100, ...filters } });
  renderClockRecords();
}

async function loadFeedback() {
  state.feedbackItems = await api("/admin/feedback");
  renderFeedback();
}

async function loadNotifications() {
  state.notifications = await api("/admin/notifications");
  renderNotifications();
}

async function loadExports() {
  state.exportJobs = await api("/admin/exports");
  renderExports();
}

async function loadDashboard() {
  await Promise.all([
    loadOverview(),
    loadOrganizations(),
    loadClockRecords(),
    loadFeedback(),
    loadNotifications(),
    loadExports(),
  ]);
}

async function handleBootstrap(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const payload = Object.fromEntries(formData.entries());

  if (!payload.password || payload.password.length < 8) {
    showToast("初始化密码至少 8 位", "error");
    return;
  }

  const data = await api("/admin/system/bootstrap", {
    method: "POST",
    data: payload,
    auth: false,
  });
  state.token = data.token;
  localStorage.setItem(STORAGE_KEYS.token, data.token);
  showToast("系统初始化成功");
  await loadSystemStatus();
  await loadDashboard();
}

async function handleLogin(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const payload = Object.fromEntries(formData.entries());
  const data = await api("/admin/auth/login", {
    method: "POST",
    data: payload,
    auth: false,
  });
  state.token = data.token;
  localStorage.setItem(STORAGE_KEYS.token, data.token);
  showToast("登录成功");
  renderAuthState();
  await loadDashboard();
}

async function handleLogout() {
  try {
    if (state.token) {
      await api("/admin/auth/logout", { method: "POST" });
    }
  } finally {
    state.token = "";
    localStorage.removeItem(STORAGE_KEYS.token);
    state.organizationDetail = null;
    renderOrganizationDetail();
    renderAuthState();
    showToast("已退出登录");
  }
}

async function handleSaveMemberRole(memberId) {
  const selector = document.querySelector(`[data-member-role="${memberId}"]`);
  const role = selector?.value;
  if (!role) {
    return;
  }

  await api(`/admin/members/${memberId}/role`, {
    method: "PATCH",
    data: { role },
  });
  showToast("成员角色已更新");
  if (state.organizationDetail) {
    await loadOrganizationDetail(state.organizationDetail.organization.id);
  }
}

async function handleAudit(recordId, auditStatus) {
  const reason = window.prompt(auditStatus === "approved" ? "审核备注（可选）" : "驳回原因（可选）", "") || "";
  let adjustedMinutes;

  if (auditStatus === "approved") {
    const rawMinutes = window.prompt("如果要调整时长，请输入新的分钟数；留空则保持原值", "");
    if (rawMinutes !== null && rawMinutes.trim() !== "") {
      adjustedMinutes = Number(rawMinutes);
      if (!Number.isFinite(adjustedMinutes) || adjustedMinutes < 0) {
        showToast("调整后的时长必须是非负数字", "error");
        return;
      }
    }
  }

  await api(`/admin/audits/${recordId}`, {
    method: "POST",
    data: {
      auditStatus,
      reason,
      adjustedMinutes,
    },
  });
  showToast("打卡审核已提交");
  await loadClockRecords(getClockFilters());
  await loadOverview();
}

async function handleReplyFeedback(feedbackId) {
  const replyContent = window.prompt("请输入回复内容");
  if (!replyContent) {
    return;
  }

  await api(`/admin/feedback/${feedbackId}/reply`, {
    method: "POST",
    data: { replyContent },
  });
  showToast("反馈回复已发送");
  await loadFeedback();
  await loadOverview();
}

async function handleSendNotification(event) {
  event.preventDefault();
  const formData = new FormData(event.currentTarget);
  const payload = Object.fromEntries(formData.entries());
  await api("/admin/notifications", {
    method: "POST",
    data: payload,
  });
  showToast("通知发送成功");
  event.currentTarget.reset();
  await loadNotifications();
}

function getClockFilters() {
  const form = $("#clockFilterForm");
  const formData = new FormData(form);
  return Object.fromEntries(formData.entries());
}

function bindEvents() {
  $("#apiBaseUrl").value = state.apiBaseUrl;

  $("#saveApiBaseBtn").addEventListener("click", () => {
    state.apiBaseUrl = $("#apiBaseUrl").value.trim() || state.apiBaseUrl;
    localStorage.setItem(STORAGE_KEYS.apiBaseUrl, state.apiBaseUrl);
    showToast("API 地址已保存");
  });

  $("#reloadStatusBtn").addEventListener("click", async () => {
    try {
      await loadSystemStatus();
      showToast("系统状态已刷新");
    } catch (error) {
      showToast(error.message, "error");
    }
  });

  $("#refreshAllBtn").addEventListener("click", async () => {
    try {
      await loadDashboard();
      showToast("后台数据已刷新");
    } catch (error) {
      showToast(error.message, "error");
    }
  });

  $("#logoutBtn").addEventListener("click", handleLogout);
  $("#bootstrapForm").addEventListener("submit", (event) => {
    handleBootstrap(event).catch((error) => showToast(error.message, "error"));
  });
  $("#loginForm").addEventListener("submit", (event) => {
    handleLogin(event).catch((error) => showToast(error.message, "error"));
  });
  $("#notificationForm").addEventListener("submit", (event) => {
    handleSendNotification(event).catch((error) => showToast(error.message, "error"));
  });
  $("#clockFilterForm").addEventListener("submit", (event) => {
    event.preventDefault();
    loadClockRecords(getClockFilters()).catch((error) => showToast(error.message, "error"));
  });

  document.body.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-action]");
    if (!button) {
      return;
    }

    const { action, id, value } = button.dataset;
    const actions = {
      "view-org": () => loadOrganizationDetail(id),
      "copy": async () => {
        await copyText(value || "");
        showToast("内容已复制");
      },
      "save-member-role": () => handleSaveMemberRole(id),
      "approve-record": () => handleAudit(id, "approved"),
      "reject-record": () => handleAudit(id, "rejected"),
      "reply-feedback": () => handleReplyFeedback(id),
    };

    const handler = actions[action];
    if (handler) {
      Promise.resolve(handler()).catch((error) => showToast(error.message, "error"));
    }
  });
}

async function init() {
  bindEvents();
  await loadSystemStatus();
  if (state.token) {
    try {
      renderAuthState();
      await loadDashboard();
    } catch (error) {
      state.token = "";
      localStorage.removeItem(STORAGE_KEYS.token);
      renderAuthState();
      showToast(error.message, "error");
    }
  }
}

init().catch((error) => {
  showToast(error.message, "error");
});
