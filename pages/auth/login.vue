<template>
  <view class="login-page">
    <view class="login-container">
      <view class="logo-section">
        <image src="/static/logo.png" class="logo" mode="aspectFit" />
        <text class="app-name">溯间砚时</text>
        <text class="app-desc">志愿时长记录管理系统</text>
      </view>
      
      <view class="login-section">
        <button 
          class="wx-login-btn" 
          @click="wxLogin"
          :loading="logging"
          :disabled="logging"
        >
          <image src="/static/wx-icon.png" class="wx-icon" />
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
        
        // 获取用户信息
        const userInfoRes = await this.getWxUserInfo()
        if (!userInfoRes.userInfo) {
          throw new Error('获取用户信息失败')
        }
        
        // 调用云函数进行登录
        const result = await uniCloud.callFunction({
          name: 'user-auth-simple',
          data: {
            action: 'wxLogin',
            userInfo: userInfoRes.userInfo
          }
        })
        
        if (result.result.code === 0) {
          const { uid, token, hasProfile, isCompleted } = result.result.data
          
          // 保存登录状态
          uni.setStorageSync('uid', uid)
          uni.setStorageSync('token', token)
          
          // 根据用户状态跳转
          if (!hasProfile) {
            // 首次登录，跳转到信息填写页面
            uni.reLaunch({
              url: '/pages/auth/profile-edit'
            })
          } else if (!isCompleted) {
            // 信息不完整，跳转到信息填写页面
            uni.reLaunch({
              url: '/pages/auth/profile-edit?edit=true'
            })
          } else {
            // 信息完整，跳转到主页
            uni.reLaunch({
              url: '/pages/home/index'
            })
          }
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
    
    getWxUserInfo() {
      return new Promise((resolve, reject) => {
        uni.getUserProfile({
          desc: '用于完善用户资料',
          success: resolve,
          fail: reject
        })
      })
    }
  }
}
</script>

<style scoped>
.login-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
}

.login-container {
  width: 100%;
  max-width: 600rpx;
  background-color: #fff;
  border-radius: 30rpx;
  padding: 60rpx 40rpx;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.1);
}

.logo-section {
  text-align: center;
  margin-bottom: 80rpx;
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
  color: #333;
  margin-bottom: 20rpx;
}

.app-desc {
  display: block;
  font-size: 28rpx;
  color: #666;
}

.login-section {
  margin-bottom: 60rpx;
}

.wx-login-btn {
  width: 100%;
  height: 88rpx;
  background-color: #07c160;
  color: #fff;
  border: none;
  border-radius: 44rpx;
  font-size: 32rpx;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 20rpx rgba(7, 193, 96, 0.3);
}

.wx-login-btn:disabled {
  background-color: #ccc;
  box-shadow: none;
}

.wx-icon {
  width: 40rpx;
  height: 40rpx;
  margin-right: 20rpx;
}

.tips-section {
  background-color: #f8f9fa;
  border-radius: 20rpx;
  padding: 30rpx;
}

.tips-title {
  display: block;
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
}

.tips-list {
  display: flex;
  flex-direction: column;
}

.tip-item {
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
  margin-bottom: 10rpx;
}
</style>
