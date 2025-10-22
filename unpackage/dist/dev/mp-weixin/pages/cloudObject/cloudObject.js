"use strict";
const common_vendor = require("../../common/vendor.js");
let canUse = true, cloudObjectDemo;
if (common_vendor.tr.importObject) {
  cloudObjectDemo = common_vendor.tr.importObject("cloud-object-demo");
} else {
  canUse = false;
}
const _sfc_main = {
  data() {
    return {
      canUse
    };
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
      cloudObjectDemo.add({
        product: "uniCloud",
        create_time: Date.now()
      }).then((res) => {
        common_vendor.index.__f__("log", "at pages/cloudObject/cloudObject.vue:67", res);
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: `成功添加一条数据，文档id为：${res.id}`,
          showCancel: false
        });
      }).catch((err) => {
        common_vendor.index.__f__("error", "at pages/cloudObject/cloudObject.vue:74", err);
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: `添加数据失败，错误信息为：${err.message}`,
          showCancel: false
        });
      });
    },
    remove() {
      common_vendor.index.showLoading({
        title: "处理中..."
      });
      cloudObjectDemo.remove().then((res) => {
        common_vendor.index.__f__("log", "at pages/cloudObject/cloudObject.vue:87", res);
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: res.msg,
          showCancel: false
        });
      }).catch((err) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: `删除失败，错误信息为：${err.message}`,
          showCancel: false
        });
        common_vendor.index.__f__("error", "at pages/cloudObject/cloudObject.vue:99", err);
      });
    },
    update() {
      common_vendor.index.showLoading({
        title: "处理中..."
      });
      cloudObjectDemo.update({
        product: "uni-app",
        create_time: Date.now()
      }).then((res) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: res.msg,
          showCancel: false
        });
        common_vendor.index.__f__("log", "at pages/cloudObject/cloudObject.vue:115", res);
      }).catch((err) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: `更新操作执行失败，错误信息为：${err.message}`,
          showCancel: false
        });
        common_vendor.index.__f__("error", "at pages/cloudObject/cloudObject.vue:122", err);
      });
    },
    get() {
      common_vendor.index.showLoading({
        title: "处理中..."
      });
      cloudObjectDemo.get().then((res) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: `查询成功，获取数据列表为：${JSON.stringify(res)}`,
          showCancel: false
        });
        common_vendor.index.__f__("log", "at pages/cloudObject/cloudObject.vue:135", res);
      }).catch((err) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: `查询失败，错误信息为：${err.message}`,
          showCancel: false
        });
        common_vendor.index.__f__("error", "at pages/cloudObject/cloudObject.vue:142", err);
      });
    },
    useCommon() {
      cloudObjectDemo.useCommon().then((res) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: "云对象使用公共模块返回结果：" + JSON.stringify(res),
          showCancel: false
        });
        common_vendor.index.__f__("log", "at pages/cloudObject/cloudObject.vue:152", res);
      }).catch((err) => {
        common_vendor.index.hideLoading();
        common_vendor.index.showModal({
          content: `云对象使用公共模块执行失败，错误信息为：${err.message}`,
          showCancel: false
        });
        common_vendor.index.__f__("error", "at pages/cloudObject/cloudObject.vue:159", err);
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
  return common_vendor.e({
    a: common_vendor.o((...args) => $options.goHome && $options.goHome(...args)),
    b: $data.canUse
  }, $data.canUse ? {
    c: common_vendor.o((...args) => $options.add && $options.add(...args)),
    d: common_vendor.o((...args) => $options.remove && $options.remove(...args)),
    e: common_vendor.o((...args) => $options.update && $options.update(...args)),
    f: common_vendor.o((...args) => $options.get && $options.get(...args)),
    g: common_vendor.o((...args) => $options.useCommon && $options.useCommon(...args))
  } : {});
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/cloudObject/cloudObject.js.map
