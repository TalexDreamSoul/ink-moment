"use strict";
const common_vendor = require("../../common/vendor.js");
const common_assets = require("../../common/assets.js");
const _sfc_main = {
  name: "Home",
  data() {
    return {};
  },
  methods: {
    navigateTo(url) {
      common_vendor.index.navigateTo({
        url
      });
    }
  }
};
function _sfc_render(_ctx, _cache, $props, $setup, $data, $options) {
  return {
    a: common_assets._imports_0,
    b: common_vendor.o(($event) => $options.navigateTo("/pages/cloudFunction/cloudFunction")),
    c: common_assets._imports_1,
    d: common_vendor.o(($event) => $options.navigateTo("/pages/cloudObject/cloudObject")),
    e: common_assets._imports_2,
    f: common_vendor.o(($event) => $options.navigateTo("/pages/storage/storage")),
    g: common_assets._imports_3,
    h: common_vendor.o(($event) => $options.navigateTo("/pages/clientDB/clientDB")),
    i: common_assets._imports_4,
    j: common_vendor.o(($event) => $options.navigateTo("/pages/schema2code/schema2code")),
    k: common_vendor.o(($event) => $options.navigateTo("/pages/test/test"))
  };
}
const MiniProgramPage = /* @__PURE__ */ common_vendor._export_sfc(_sfc_main, [["render", _sfc_render], ["__scopeId", "data-v-07e72d3c"]]);
wx.createPage(MiniProgramPage);
//# sourceMappingURL=../../../.sourcemap/mp-weixin/pages/home/home.js.map
