<script>
  import checkUpdate from '@/uni_modules/uni-upgrade-center-app/utils/check-update';
  import { systemStartupCheck } from '@/utils/system-check.js';
  
  export default {
    onLaunch: async function() {
      console.log('App Launch')
		// #ifdef MP-WEIXIN
		uniCloud.initSecureNetworkByWeixin()
		// #endif
      checkUpdate() //更新升级
      
      // 系统启动检查
      try {
        const checkResult = await systemStartupCheck()
        if (checkResult.needInit) {
          // 需要初始化超级管理员
          uni.reLaunch({
            url: '/pages/admin/init-super-admin'
          })
        }
      } catch (error) {
        console.error('App launch system check error:', error)
      }
    },
    mounted() {
      // #ifdef H5
      //const VConsole = require('@/common/js/vconsole.min.js')
      //new VConsole()
      // #endif
    },
    onShow: function() {
      console.log('App Show')
    },
    onHide: function() {
      console.log('App Hide')
    }
  }
</script>

<style>
  /*每个页面公共css */
  /* #ifndef APP-NVUE */
  view {
    box-sizing: border-box;
  }

  @font-face {
    font-family: "iconfont";
    src: url('https://at.alicdn.com/t/font_2354462_s00xh8caffp.ttf');
  }

  .ico {
    font-family: iconfont;
  }

  /* #endif */
</style>
