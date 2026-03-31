import auth from "./auth.js";
import { getApiBaseUrl } from "./app-config.js";

function buildAuthHeaders(token = "", extraHeaders = {}) {
  const headers = { ...extraHeaders };

  if (token) {
    headers.authorization = `Bearer ${token}`;
    headers["x-token"] = token;
    headers["uni-id-token"] = token;
  }

  return headers;
}

function extractToken(data = {}, header = {}) {
  return (
    data.token ||
    data.uniIdToken ||
    header.authorization?.replace(/^Bearer\s+/i, "") ||
    header["x-token"] ||
    header["uni-id-token"] ||
    auth.getToken() ||
    ""
  );
}

function sanitizeData(data = {}) {
  const nextData = { ...data };
  delete nextData.action;
  delete nextData.token;
  delete nextData.uniIdToken;
  return nextData;
}

function buildUrl(pathname, query = {}) {
  const url = `${getApiBaseUrl()}${pathname.startsWith("/") ? pathname : `/${pathname}`}`;
  const queryItems = Object.entries(query)
    .filter(([, value]) => value !== undefined && value !== null && value !== "")
    .map(
      ([key, value]) =>
        `${encodeURIComponent(key)}=${encodeURIComponent(String(value))}`
    );

  return queryItems.length > 0 ? `${url}?${queryItems.join("&")}` : url;
}

function normalizeNotification(item = {}) {
  return {
    ...item,
    _id: item._id || item.id || "",
    create_time: item.create_time || item.created_at || item.createdAt || 0,
    update_time: item.update_time || item.updated_at || item.updatedAt || 0,
    is_read:
      item.is_read !== undefined
        ? item.is_read
        : item.status === "read" || item.status === "已读",
  };
}

function toUniCloudResult(payload) {
  return {
    result: payload,
  };
}

function resolveCallbacks(promise, options) {
  return promise
    .then((result) => {
      if (typeof options.success === "function") {
        options.success(result);
      }
      if (typeof options.complete === "function") {
        options.complete(result);
      }
      return result;
    })
    .catch((error) => {
      const failureResult = {
        errMsg: error.message || "请求失败",
        error,
      };
      if (typeof options.fail === "function") {
        options.fail(failureResult);
      }
      if (typeof options.complete === "function") {
        options.complete(failureResult);
      }
      throw error;
    });
}

function requestApi({ path, method = "GET", query = {}, data = null, token = "" }) {
  return new Promise((resolve, reject) => {
    const isJsonBody = method !== "GET" && method !== "HEAD";

    uni.request({
      url: buildUrl(path, query),
      method,
      data,
      header: {
        ...buildAuthHeaders(token),
        ...(isJsonBody ? { "content-type": "application/json" } : {}),
      },
      success: (response) => {
        const payload = response.data;
        if (!payload || typeof payload !== "object") {
          reject(new Error("服务器返回了无效数据"));
          return;
        }
        resolve(payload);
      },
      fail: (error) => {
        reject(new Error(error.errMsg || "网络请求失败"));
      },
    });
  });
}

async function invokeUserAuth(action, payload, token) {
  switch (action) {
    case "wxLogin":
      return requestApi({
        path: "/miniapp/auth/wechat/login",
        method: "POST",
        data: {
          code: payload.code,
        },
      });
    case "getUserInfo":
      return requestApi({
        path: "/miniapp/me",
        token,
      });
    case "updateProfile":
      return requestApi({
        path: "/miniapp/me",
        method: "PUT",
        data: {
          profile: payload.profile || payload,
        },
        token,
      });
    case "getUserFullInfo":
      return requestApi({
        path: "/miniapp/dashboard",
        token,
      });
    case "getUserStats":
      return requestApi({
        path: "/miniapp/stats",
        query: {
          type: payload.type === "today" ? "today" : "",
          year: payload.year,
          month: payload.month,
        },
        token,
      });
    case "checkUserRoles":
      return requestApi({
        path: "/miniapp/me/roles",
        token,
      });
    case "checkProfileComplete":
      return requestApi({
        path: "/miniapp/me/profile-completion",
        token,
      });
    default:
      throw new Error(`暂不支持的 user-auth 动作: ${action}`);
  }
}

async function invokeOrganizations(action, payload, token) {
  switch (action) {
    case "createOrganization":
      return requestApi({
        path: "/miniapp/organizations",
        method: "POST",
        data: payload,
        token,
      });
    case "getUserOrganizations":
      return requestApi({
        path: "/miniapp/organizations",
        token,
      });
    case "getAdminOrganizations":
      return requestApi({
        path: "/miniapp/organizations/manageable",
        token,
      });
    case "getOrganizationDetail":
      return requestApi({
        path: `/miniapp/organizations/${encodeURIComponent(payload.orgId)}`,
        token,
      });
    case "updateOrganization":
      return requestApi({
        path: `/miniapp/organizations/${encodeURIComponent(payload.orgId)}`,
        method: "PATCH",
        data: payload.data || payload,
        token,
      });
    case "deleteOrganization":
      return requestApi({
        path: `/miniapp/organizations/${encodeURIComponent(payload.orgId)}`,
        method: "DELETE",
        token,
      });
    case "joinOrganization":
      return requestApi({
        path: "/miniapp/organizations/join",
        method: "POST",
        data: payload,
        token,
      });
    case "leaveOrganization":
      return requestApi({
        path: `/miniapp/organizations/${encodeURIComponent(payload.orgId)}/leave`,
        method: "POST",
        token,
      });
    case "getOrganizationQRCode":
      return requestApi({
        path: `/miniapp/organizations/${encodeURIComponent(payload.orgId)}/invite-code`,
        token,
      });
    case "getOrganizationMembers":
      return requestApi({
        path: `/miniapp/organizations/${encodeURIComponent(payload.orgId)}/members`,
        token,
      });
    case "setMemberRole":
      return requestApi({
        path: `/miniapp/organizations/${encodeURIComponent(
          payload.orgId
        )}/members/${encodeURIComponent(payload.memberId)}`,
        method: "PATCH",
        data: {
          role: payload.role,
        },
        token,
      });
    case "getInviteRecords":
      return requestApi({
        path: `/miniapp/organizations/${encodeURIComponent(payload.orgId)}/invite-records`,
        token,
      });
    default:
      throw new Error(`暂不支持的 organization-manage 动作: ${action}`);
  }
}

async function invokeClock(action, payload, token) {
  if (action === "clock") {
    const nextAction =
      payload.clockType === "out" || payload.type === "out" || payload.recordId
        ? "clockOut"
        : "clockIn";
    return invokeClock(nextAction, payload, token);
  }

  switch (action) {
    case "getCurrentStatus":
      return requestApi({
        path: "/miniapp/clock/status",
        token,
      });
    case "getTodayRecords":
      return requestApi({
        path: "/miniapp/clock/today",
        token,
      });
    case "getWorkDuration":
      return requestApi({
        path: "/miniapp/clock/duration",
        token,
      });
    case "getRecentRecords":
    case "getRecords":
      return requestApi({
        path:
          payload.type === "today" || payload.scope === "today"
            ? "/miniapp/clock/today"
            : "/miniapp/clock/recent",
        token,
      });
    case "clockIn":
      return requestApi({
        path: "/miniapp/clock/in",
        method: "POST",
        data: {
          orgId: payload.orgId,
          location: payload.location,
        },
        token,
      });
    case "clockOut":
      return requestApi({
        path: "/miniapp/clock/out",
        method: "POST",
        data: {
          recordId: payload.recordId,
          location: payload.location,
        },
        token,
      });
    default:
      throw new Error(`暂不支持的 work-clock 动作: ${action}`);
  }
}

async function invokeFeedback(action, payload, token) {
  switch (action) {
    case "create":
      return requestApi({
        path: "/miniapp/feedback",
        method: "POST",
        data: payload,
        token,
      });
    case "getUserFeedbackList":
      return requestApi({
        path: "/miniapp/feedback",
        token,
      });
    case "getFeedbackDetail":
      return requestApi({
        path: `/miniapp/feedback/${encodeURIComponent(payload.feedbackId)}`,
        token,
      });
    default:
      throw new Error(`暂不支持的 feedback-manage 动作: ${action}`);
  }
}

async function invokeNotifications(action, payload, token) {
  switch (action) {
    case "list":
    case "getList":
    case "getNotificationList":
    case "getUserNotifications": {
      const response = await requestApi({
        path: "/miniapp/notifications",
        token,
      });
      return {
        ...response,
        data: Array.isArray(response.data)
          ? response.data.map(normalizeNotification)
          : [],
      };
    }
    case "detail":
    case "getNotificationDetail": {
      const response = await requestApi({
        path: `/miniapp/notifications/${encodeURIComponent(payload.notificationId)}`,
        token,
      });
      return {
        ...response,
        data: normalizeNotification(response.data || {}),
      };
    }
    case "read":
    case "markAsRead":
    case "readNotification":
      return requestApi({
        path: `/miniapp/notifications/${encodeURIComponent(payload.notificationId)}/read`,
        method: "POST",
        token,
      });
    default:
      throw new Error(`暂不支持的 notification-manage 动作: ${action}`);
  }
}

async function invokeExports(action, payload, token) {
  switch (action) {
    case "list":
    case "getList":
    case "getExportList":
    case "getExportRecords":
      return requestApi({
        path: "/miniapp/exports",
        token,
      });
    case "create":
    case "createExport":
      return requestApi({
        path: "/miniapp/exports",
        method: "POST",
        data: payload,
        token,
      });
    case "verify":
    case "verifyCode":
    case "checkVerify":
      return requestApi({
        path: "/miniapp/verify",
        query: {
          code: payload.code,
        },
      });
    default:
      throw new Error(`暂不支持的 export-manage 动作: ${action}`);
  }
}

async function invokeSystemInit(action, payload) {
  switch (action) {
    case "checkSuperAdmin":
    case "getSystemStatus":
      return requestApi({
        path: "/admin/system/status",
      });
    case "initSuperAdmin":
      return requestApi({
        path: "/admin/system/bootstrap",
        method: "POST",
        data: {
          username: payload.username || payload.userInfo?.username,
          password: payload.password || payload.userInfo?.password,
          displayName:
            payload.displayName ||
            payload.userInfo?.displayName ||
            payload.userInfo?.nickName,
          initKey: payload.initKey || payload.userInfo?.initKey,
        },
      });
    default:
      throw new Error(`暂不支持的 system-init 动作: ${action}`);
  }
}

async function dispatchCallFunction(name, action, payload, token) {
  switch (name) {
    case "user-auth":
      return invokeUserAuth(action, payload, token);
    case "organization-manage":
      return invokeOrganizations(action, payload, token);
    case "work-clock":
      return invokeClock(action, payload, token);
    case "feedback-manage":
      return invokeFeedback(action, payload, token);
    case "notification-manage":
      return invokeNotifications(action, payload, token);
    case "export-manage":
      return invokeExports(action, payload, token);
    case "system-init":
      return invokeSystemInit(action, payload, token);
    default:
      if (
        originalUniCloud &&
        typeof originalUniCloud.callFunction === "function"
      ) {
        const fallbackResult = await originalUniCloud.callFunction({
          name,
          data: {
            action,
            ...payload,
          },
          header: buildAuthHeaders(token),
        });
        return fallbackResult?.result || fallbackResult;
      }

      throw new Error(`暂不支持的云函数: ${name}`);
  }
}

export function callFunction(options = {}) {
  const promise = (async () => {
    const data = options.data || {};
    const token = extractToken(data, options.header || {});
    const action = data.action || "";
    const payload = sanitizeData(data);
    const response = await dispatchCallFunction(options.name, action, payload, token);
    return toUniCloudResult(response);
  })();

  return resolveCallbacks(promise, options);
}

export function uploadFile(options = {}) {
  const promise = (async () => {
    if (!options.filePath) {
      throw new Error("上传文件路径不能为空");
    }

    const token = extractToken({}, options.header || {});
    const cloudPath = String(options.cloudPath || "");
    const parts = cloudPath.split("/").filter(Boolean);
    const filename = parts.length > 0 ? parts[parts.length - 1] : "upload.bin";
    const namespace = parts.length > 1 ? parts.slice(0, -1).join("/") : "feedback";

    const ticketResponse = await requestApi({
      path: "/miniapp/uploads/ticket",
      method: "POST",
      data: {
        namespace,
        filename,
      },
      token,
    });

    if (ticketResponse.code !== 0) {
      throw new Error(ticketResponse.message || "创建上传凭证失败");
    }

    const uploadMeta = ticketResponse.data || {};
    const uploadResult = await new Promise((resolve, reject) => {
      uni.uploadFile({
        url: uploadMeta.uploadUrl,
        filePath: options.filePath,
        name: "file",
        header: buildAuthHeaders(token),
        success: (response) => {
          try {
            const payload =
              typeof response.data === "string"
                ? JSON.parse(response.data)
                : response.data;
            if (!payload || payload.code !== 0) {
              reject(new Error(payload?.message || "文件上传失败"));
              return;
            }
            resolve(payload.data || {});
          } catch (error) {
            reject(new Error(error.message || "文件上传返回解析失败"));
          }
        },
        fail: (error) => {
          reject(new Error(error.errMsg || "文件上传失败"));
        },
      });
    });

    return {
      fileID: uploadResult.fileUrl || uploadResult.fileKey || "",
      fileUrl: uploadResult.fileUrl || "",
      fileKey: uploadResult.fileKey || "",
    };
  })();

  return resolveCallbacks(promise, options);
}

export function initSecureNetworkByWeixin(options = {}) {
  const promise = Promise.resolve({
    code: 0,
    message: "Cloudflare HTTP 模式下无需初始化 secure network",
  });

  return resolveCallbacks(promise, options);
}

const originalUniCloud = globalThis.uniCloud || {};
const shimmedUniCloud = {
  ...originalUniCloud,
  callFunction,
  uploadFile,
  initSecureNetworkByWeixin,
};

globalThis.uniCloud = shimmedUniCloud;

export default shimmedUniCloud;
