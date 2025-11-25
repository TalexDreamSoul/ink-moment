"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const common_vendor = require("./common/vendor.js");
if (!Math) {
  "./pages/welcome/welcome.js";
  "./pages/clock/clock.js";
  "./pages/profile/profile.js";
  "./pages/auth/login.js";
  "./pages/auth/profile-edit.js";
  "./pages/auth/profile-complete.js";
  "./pages/organization/list.js";
  "./pages/organization/detail.js";
  "./pages/organization/create.js";
  "./pages/organization/join.js";
  "./pages/supervisor/audit-list.js";
  "./pages/supervisor/audit-detail.js";
  "./pages/supervisor/statistics.js";
  "./pages/admin/home.js";
  "./pages/admin/org-manage.js";
  "./pages/admin/member-manage.js";
  "./pages/admin/supervisor-assign.js";
  "./pages/admin/invite-admin.js";
  "./pages/admin/init-super-admin.js";
  "./pages/invitation/create.js";
  "./pages/invitation/scan.js";
  "./pages/invitation/detail.js";
  "./pages/invitation/list.js";
  "./pages/notification/list.js";
  "./pages/notification/detail.js";
  "./pages/notification/settings.js";
  "./pages/feedback/create.js";
  "./pages/feedback/list.js";
  "./pages/feedback/detail.js";
  "./pages/statistics/charts.js";
  "./pages/statistics/export.js";
  "./pages/statistics/settings.js";
  "./pages/reminder/settings.js";
  "./pages/reminder/history.js";
  "./pages/verify/check.js";
  "./pages/volunteer/statistics.js";
  "./pages/volunteer/export.js";
  "./uni_modules/uni-upgrade-center-app/pages/upgrade-popup.js";
}
const _sfc_main = {
  onLaunch: async function() {
    common_vendor.index.__f__("log", "at App.vue:6", "App Launch");
    common_vendor.tr.initSecureNetworkByWeixin();
  },
  mounted() {
  },
  onShow: function() {
    common_vendor.index.__f__("log", "at App.vue:20", "App Show");
  },
  onHide: function() {
    common_vendor.index.__f__("log", "at App.vue:23", "App Hide");
  }
};
function createApp() {
  const app = common_vendor.createSSRApp(_sfc_main);
  return {
    app
  };
}
createApp().app.mount("#app");
exports.createApp = createApp;
//# sourceMappingURL=../.sourcemap/mp-weixin/app.js.map
