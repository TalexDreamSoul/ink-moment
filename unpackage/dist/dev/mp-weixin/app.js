"use strict";
Object.defineProperty(exports, Symbol.toStringTag, { value: "Module" });
const common_vendor = require("./common/vendor.js");
if (!Math) {
  "./pages/home/index.js";
  "./pages/welcome/index.js";
  "./pages/auth/login.js";
  "./pages/auth/profile-edit.js";
  "./pages/work/records.js";
  "./pages/work/detail.js";
  "./pages/volunteer/statistics.js";
  "./pages/volunteer/export.js";
  "./pages/organization/list.js";
  "./pages/organization/join.js";
  "./pages/organization/detail.js";
  "./pages/organization/create.js";
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
  "./pages/profile/index.js";
  "./pages/home/home.js";
  "./pages/cloudFunction/cloudFunction.js";
  "./pages/cloudObject/cloudObject.js";
  "./pages/secure-network/cloud-function.js";
  "./pages/secure-network/cloud-object.js";
  "./pages/test/test.js";
  "./pages/clientDB/unicloud-db-demo/unicloud-db-demo.js";
  "./pages/clientDB/demo/demo.js";
  "./pages/clientDB/permission-table-simple/permission-table-simple.js";
  "./pages/clientDB/permission-table-compound/permission-table-compound.js";
  "./pages/clientDB/clientDB.js";
  "./pages/user-info/add.js";
  "./pages/user-info/edit.js";
  "./pages/user-info/list.js";
  "./pages/user-info/detail.js";
  "./pages/storage/storage.js";
  "./pages/storage/space-storage.js";
  "./pages/storage/ext-storage-qiniu.js";
  "./pages/schema2code/schema2code.js";
  "./pages/clientDB/permission/permission.js";
  "./pages/clientDB/permission-demo/permission-demo.js";
  "./pages/clientDB/permission-demo/readme.js";
  "./pages/clientDB/permission-field-simple/permission-field-simple.js";
  "./pages/clientDB/clientDB-api/clientDB-api.js";
  "./pages/clientDB/validate/validate.js";
  "./pages/validate-demo/add.js";
  "./pages/validate-demo/edit.js";
  "./pages/validate-demo/list.js";
  "./pages/validate-demo/detail.js";
  "./pages/webview/webview.js";
  "./uni_modules/uni-upgrade-center-app/pages/upgrade-popup.js";
  "./pages/cloudFunction/redis/redis.js";
  "./uni_modules/uni-upgrade-center/pages/version/list.js";
  "./uni_modules/uni-upgrade-center/pages/version/add.js";
  "./uni_modules/uni-upgrade-center/pages/version/detail.js";
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
