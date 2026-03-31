const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
};

export function corsHeaders(origin = "*") {
  return {
    "access-control-allow-origin": origin,
    "access-control-allow-headers":
      "authorization, content-type, x-token, uni-id-token",
    "access-control-allow-methods": "GET,POST,PUT,PATCH,DELETE,OPTIONS",
  };
}

export function json(data, status = 200, extraHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      ...JSON_HEADERS,
      ...corsHeaders(),
      ...extraHeaders,
    },
  });
}

export function success(data = null, message = "ok") {
  return json({
    code: 0,
    message,
    data,
  });
}

export function failure(message, status = 400, code = status, data = null) {
  return json(
    {
      code,
      message,
      data,
    },
    status
  );
}

export function noContent() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export function optionsResponse() {
  return new Response(null, {
    status: 204,
    headers: corsHeaders(),
  });
}

export async function readJson(request) {
  const contentType = request.headers.get("content-type") || "";
  if (!contentType.includes("application/json")) {
    return {};
  }

  try {
    return await request.json();
  } catch (_error) {
    return {};
  }
}

export function getBearerToken(request) {
  const authHeader = request.headers.get("authorization") || "";
  if (authHeader.startsWith("Bearer ")) {
    return authHeader.slice(7).trim();
  }

  const xToken = request.headers.get("x-token");
  if (xToken) {
    return xToken.trim();
  }

  const uniIdToken = request.headers.get("uni-id-token");
  if (uniIdToken) {
    return uniIdToken.trim();
  }

  return "";
}

export function getBaseUrl(request) {
  const url = new URL(request.url);
  return `${url.protocol}//${url.host}`;
}

export function withQuery(url, query = {}) {
  for (const [key, value] of Object.entries(query)) {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  }
  return url;
}
