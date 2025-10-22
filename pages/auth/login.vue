<template>
  <view class="page">
    <view class="page-content">
      <view class="card">
        <view class="logo-section">
          <image src="/static/logo.png" class="logo" mode="aspectFit" />
          <text class="app-name">溯间砚时</text>
          <text class="app-desc">志愿时长记录管理系统</text>
        </view>
        
        <view class="login-section">
          <button 
            class="btn btn-primary btn-large" 
            @tap="wxLogin"
            :disabled="logging"
          >
            <text>微信授权登录</text>
          </button>
        </view>
        
        <view class="tips-section">
          <text class="tips-title">使用说明</text>
          <view class="tips-list">
            <text class="tip-item">• 首次使用需要微信授权登录</text>
            <text class="tip-item">• 登录后需要完善个人信息</text>
            <text class="tip-item">• 支持多组织加入和管理</text>
            <text class="tip-item">• 数据安全，隐私保护</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      logging: false
    }
  },
  
  methods: {
    async wxLogin() {
      try {
        this.logging = true
        
        // 获取微信授权
        const loginRes = await this.getWxLogin()
        if (!loginRes.code) {
          throw new Error(loginRes.errMsg || '微信登录失败')
        }
        
        // 调用云函数进行登录验证
        const result = await uniCloud.callFunction({
          name: 'user-auth',
          data: {
            action: 'wxLogin',
            code: loginRes.code
          }
        })
        
        if (result.result.code === 0) {
          const { uid, token } = result.result.data
          
          // 保存登录状态
          uni.setStorageSync('uid', uid)
          uni.setStorageSync('token', token)
          uni.setStorageSync('isLoggedIn', true)
          
          // 跳转到主页面
          uni.reLaunch({
            url: '/pages/home/index'
          })
        } else {
          throw new Error(result.result.message || '登录失败')
        }
        
      } catch (error) {
        console.error('wxLogin error:', error)
        uni.showToast({
          title: error.message || '登录失败',
          icon: 'none',
          duration: 2000
        })
      } finally {
        this.logging = false
      }
    },
    
    getWxLogin() {
      return new Promise((resolve, reject) => {
        uni.login({
          provider: 'weixin',
          success: resolve,
          fail: reject
        })
      })
    },
    
  }
}
</script>

<style scoped>
/* #ifndef MP-WEIXIN */
@import url('@/common/styles/common.css');
/* #endif */

/* 登录页面特殊样式 */
.page {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
}

.page-content {
  width: 100%;
  max-width: 600rpx;
}

.logo-section {
  text-align: center;
  margin-bottom: 60rpx;
}

.logo {
  width: 120rpx;
  height: 120rpx;
  margin-bottom: 30rpx;
}

.app-name {
  display: block;
  font-size: 48rpx;
  font-weight: bold;
  color: var(--text-primary);
  margin-bottom: 20rpx;
}

.app-desc {
  display: block;
  font-size: 28rpx;
  color: var(--text-secondary);
}

.login-section {
  margin-bottom: 40rpx;
}

.tips-section {
  background: var(--bg-secondary);
  border-radius: 16rpx;
  padding: 32rpx;
}

.tips-title {
  display: block;
  font-size: 28rpx;
  font-weight: bold;
  color: var(--text-primary);
  margin-bottom: 20rpx;
}

.tips-list {
  display: flex;
  flex-direction: column;
}

.tip-item {
  font-size: 26rpx;
  color: var(--text-secondary);
  line-height: 1.6;
  margin-bottom: 10rpx;
}

/* #ifdef MP-WEIXIN */
/* WXSS 安全样式（不使用 * 通配选择器与 CSS 变量） */
.page { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); min-height: 100vh; display: flex; align-items: center; justify-content: center; padding: 40rpx; }
.page-content { width: 100%; max-width: 600rpx; }
.btn { display: flex; align-items: center; justify-content: center; border: none; border-radius: 12rpx; font-size: 28rpx; }
.btn-large { height: 88rpx; font-size: 32rpx; border-radius: 44rpx; }
.btn-primary { background: #007aff; color: #ffffff; }
.logo-section { text-align: center; margin-bottom: 60rpx; }
.logo { width: 120rpx; height: 120rpx; margin-bottom: 30rpx; }
.app-name { color: #1a1a1a; }
.app-desc { color: #666666; }
.tips-section { background: #f8f9fa; border-radius: 16rpx; padding: 32rpx; }
.tips-title { color: #1a1a1a; }
.tip-item { color: #666666; }
/* #endif */

</style>
