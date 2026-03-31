import { failure, optionsResponse, stripApiPrefix, success } from "./lib/http.js";
import { handleAdminRequest } from "./routes/admin.js";
import { handleMiniappRequest } from "./routes/miniapp.js";

async function handleFileRequest(env, key) {
  const object = await env.FILES.get(key);
  if (!object) {
    return failure("文件不存在", 404, 404);
  }

  const headers = new Headers();
  object.writeHttpMetadata(headers);
  headers.set("etag", object.httpEtag);
  headers.set("cache-control", "public, max-age=3600");

  return new Response(object.body, {
    status: 200,
    headers,
  });
}

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);
      const pathname = url.pathname;
      const routePathname = stripApiPrefix(pathname);

      if (request.method === "OPTIONS") {
        return optionsResponse();
      }

      if (pathname === "/api" || pathname === "/api/") {
        return success({
          status: "ok",
          app: env.APP_NAME || "suyanjinshi-api",
          apiBase: `${url.protocol}//${url.host}/api`,
          timestamp: Date.now(),
        });
      }

      if (routePathname === "/health") {
        return success({
          status: "ok",
          app: env.APP_NAME || "suyanjinshi-api",
          timestamp: Date.now(),
        });
      }

      if (routePathname.startsWith("/files/")) {
        const key = decodeURIComponent(routePathname.slice("/files/".length));
        return handleFileRequest(env, key);
      }

      if (routePathname.startsWith("/miniapp/")) {
        return handleMiniappRequest(request, env, routePathname);
      }

      if (routePathname.startsWith("/admin/")) {
        return handleAdminRequest(request, env, routePathname);
      }

      if (env.ASSETS) {
        return env.ASSETS.fetch(request);
      }

      return failure(`未找到接口: ${pathname}`, 404, 404);
    } catch (error) {
      return failure(error.message || "服务器内部错误", 500, 500);
    }
  },
};
