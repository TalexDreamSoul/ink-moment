"use strict";
const common_vendor = require("../../common/vendor.js");
const _sfc_main = {
  data() {
    return {};
  },
  methods: {
    goHome() {
      common_vendor.index.reLaunch({
        url: "/pages/home/home"
      });
    },
    add() {
      common_vendor.index.showLoading({
        title: "处理中..."
      });
      common_vendor.tr.callFunction({
        name: "add",
        data: {
          product: "uniCloud",
          create_time: Date.now()
        }
      }).then((res) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: `成功添加一条数据，文档id为：${res.result.id}`,
          showCancel: false
        });
        common_vendor.index.__f__("log", "at pages/cloudFunction/cloudFunction.vue:60", res);
      }).catch((err) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: `添加数据失败，错误信息为：${err.message}`,
          showCancel: false
        });
        common_vendor.index.__f__("error", "at pages/cloudFunction/cloudFunction.vue:67", err);
      });
    },
    remove() {
      common_vendor.index.showLoading({
        title: "处理中..."
      });
      common_vendor.tr.callFunction({
        name: "remove"
      }).then((res) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: res.result.msg,
          showCancel: false
        });
        common_vendor.index.__f__("log", "at pages/cloudFunction/cloudFunction.vue:82", res);
      }).catch((err) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: `删除失败，错误信息为：${err.message}`,
          showCancel: false
        });
        common_vendor.index.__f__("error", "at pages/cloudFunction/cloudFunction.vue:89", err);
      });
    },
    update() {
      common_vendor.index.showLoading({
        title: "处理中..."
      });
      common_vendor.tr.callFunction({
        name: "update",
        data: {
          product: "uni-app",
          create_time: Date.now()
        }
      }).then((res) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: res.result.msg,
          showCancel: false
        });
        common_vendor.index.__f__("log", "at pages/cloudFunction/cloudFunction.vue:108", res);
      }).catch((err) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: `更新操作执行失败，错误信息为：${err.message}`,
          showCancel: false
        });
        common_vendor.index.__f__("error", "at pages/cloudFunction/cloudFunction.vue:115", err);
      });
    },
    get() {
      common_vendor.index.showLoading({
        title: "处理中..."
      });
      common_vendor.tr.callFunction({
        name: "get"
      }).then((res) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: `查询成功，获取数据列表为：${JSON.stringify(res.result.data)}`,
          showCancel: false
        });
        common_vendor.index.__f__("log", "at pages/cloudFunction/cloudFunction.vue:130", res);
      }).catch((err) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: `查询失败，错误信息为：${err.message}`,
          showCancel: false
        });
        common_vendor.index.__f__("error", "at pages/cloudFunction/cloudFunction.vue:137", err);
      });
    },
    useCommon() {
      common_vendor.index.__f__("log", "at pages/cloudFunction/cloudFunction.vue:141", "请确保自己已经阅读并按照公用模块文档操作 https://uniapp.dcloud.io/uniCloud/cf-common");
      common_vendor.tr.callFunction({
        name: "use-common"
      }).then((res) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: "云函数use-common返回结果：" + JSON.stringify(res.result),
          showCancel: false
        });
        common_vendor.index.__f__("log", "at pages/cloudFunction/cloudFunction.vue:150", res);
      }).catch((err) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: `云函数use-common执行失败，错误信息为：${err.message}`,
          showCancel: false
        });
        common_vendor.index.__f__("error", "at pages/cloudFunction/cloudFunction.vue:157", err);
      });
    },
    toRedisPage() {
      common_vendor.index.navigateTo({
        url: "/pages/cloudFunction/redis/redis"
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_vendor.o((...args) => $options.goHome && $options.goHome(...args)),
    b: common_vendor.o((...args) => $options.add && $options.add(...args)),
    c: common_vendor.o((...args) => $options.remove && $options.remove(...args)),
    d: common_vendor.o((...args) => $options.update && $options.update(...args)),
    e: common_vendor.o((...args) => $options.get && $options.get(...args)),
    f: common_vendor.o((...args) => $options.useCommon && $options.useCommon(...args)),
    g: common_vendor.o((...args) => $options.toRedisPage && $options.toRedisPage(...args))
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/cloudFunction/cloudFunction.js.map
