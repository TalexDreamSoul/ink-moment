<template>
  <view class="page">
    <view class="page-content">
      <view class="header">
        <text class="app-name">溯间砚时</text>
        <text class="app-desc">志愿时长记录管理系统</text>
      </view>
      
      <view class="login-section">
        <button 
          class="login-btn" 
          @tap="wxLogin"
          :disabled="logging"
        >
          {{ logging ? '登录中...' : '微信授权登录' }}
        </button>
        <text class="login-tip">点击授权以使用完整功能</text>
      </view>
    </view>
  </view>
</template>

<script>
import auth from '@/utils/auth.js'
import { authAPI } from '@/utils/request.js'

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
        
        // 先获取用户信息（必须在用户点击时同步调用）
        let userInfo = null
        try {
          userInfo = await this.getWxUserInfo()
        } catch (error) {
          console.warn('[Login] 获取用户信息失败，继续登录流程:', error)
        }
        
        // 获取微信登录凭证
        const loginRes = await this.getWxLogin()
        if (!loginRes.code) {
          throw new Error(loginRes.errMsg || '微信登录失败')
        }
        
        // 调用云函数进行登录验证
        const result = await authAPI.wxLogin(loginRes.code)
        
        const { uid, token, tokenExpired, needProfileCompletion, isFirstUser } = result
        
        // 保存登录状态
        auth.saveLoginInfo({ uid, token, tokenExpired })
        
        // 如果获取到了用户信息，保存到云端
        if (userInfo) {
          try {
            await this.saveWxUserInfo(userInfo)
          } catch (error) {
            console.warn('[Login] 保存用户信息失败:', error)
          }
        }
        
        // 根据信息完善状态跳转
        if (needProfileCompletion) {
          uni.reLaunch({
            url: '/pages/auth/profile-edit' + (isFirstUser ? '?firstUser=true' : '')
          })
        } else {
          uni.switchTab({
            url: '/pages/welcome/welcome'
          })
        }
        
      } catch (error) {
        console.error('[Login] 微信登录失败:', error)
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
        // #ifdef MP-WEIXIN
        uni.getUserProfile({
          desc: '用于完善用户资料',
          success: (res) => {
            resolve(res.userInfo)
          },
          fail: reject
        })
        // #endif
        
        // #ifndef MP-WEIXIN
        uni.getUserInfo({
          success: (res) => {
            resolve(res.userInfo)
          },
          fail: reject
        })
        // #endif
      })
    },
    
    async saveWxUserInfo(userInfo) {
      try {
        await authAPI.updateProfile({
          avatar_url: userInfo.avatarUrl,
          nickname: userInfo.nickName
        })
      } catch (error) {
        console.error('[Login] 保存用户信息失败:', error)
        throw error
      }
    }
  }
}
</script>

<style scoped>
.page {
  background: #FFFFFF;
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60rpx 40rpx;
}

.page-content {
  width: 100%;
  max-width: 500rpx;
  text-align: center;
}

.header {
  margin-bottom: 120rpx;
}

.app-name {
  display: block;
  font-size: 56rpx;
  font-weight: 600;
  color: #000000;
  margin-bottom: 16rpx;
  letter-spacing: 2rpx;
}

.app-desc {
  display: block;
  font-size: 28rpx;
  color: #999999;
}

.login-section {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.login-btn {
  width: 100%;
  height: 96rpx;
  background: #000000;
  color: #FFFFFF;
  border: none;
  border-radius: 8rpx;
  font-size: 32rpx;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 24rpx;
}

.login-btn:active {
  opacity: 0.8;
}

.login-btn:disabled {
  opacity: 0.4;
}

.login-tip {
  font-size: 24rpx;
  color: #CCCCCC;
}
</style>
