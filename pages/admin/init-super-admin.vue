<template>
  <view class="page">
    <view class="header">
      <text class="title">系统初始化</text>
    </view>
    
    <view class="content">
      <view class="init-card">
        <text class="card-title">超级管理员权限</text>
        <view class="permission-list">
          <text class="permission-item">• 系统最高权限</text>
          <text class="permission-item">• 可指定管理员</text>
          <text class="permission-item">• 可管理所有组织</text>
          <text class="permission-item">• 可查看所有数据</text>
          <text class="permission-item">• 可进行系统设置</text>
        </view>
      </view>
      
      <view class="warning-card">
        <text class="warning-text">请确保您有权限成为超级管理员，此操作不可撤销</text>
      </view>
      
      <view class="user-info">
        <image :src="userInfo.avatarUrl" class="avatar" mode="aspectFill" />
        <view class="user-details">
          <text class="user-name">{{ userInfo.nickName }}</text>
          <text class="user-desc">将获得超级管理员权限</text>
        </view>
      </view>
      
      <view class="actions">
        <button 
          class="init-btn" 
          @click="initSuperAdmin"
          :disabled="initializing"
        >
          {{ initializing ? '初始化中...' : '确认成为超级管理员' }}
        </button>
        
        <button 
          class="cancel-btn" 
          @click="cancelInit"
          :disabled="initializing"
        >
          取消
        </button>
      </view>
      
      <view class="tips">
        <text class="tips-title">重要提示：</text>
        <text class="tips-content">• 超级管理员拥有系统最高权限</text>
        <text class="tips-content">• 请妥善保管您的账号信息</text>
        <text class="tips-content">• 建议定期备份系统数据</text>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      initializing: false,
      userInfo: {}
    }
  },
  
  onLoad() {
    // 不在页面加载时自动获取用户信息
    // 等待用户点击按钮时再获取
  },
  
  methods: {
    async getUserInfo() {
      try {
        // 获取微信用户信息
        const userInfoRes = await this.getWxUserInfo()
        this.userInfo = userInfoRes.userInfo || {}
      } catch (error) {
        console.error('getUserInfo error:', error)
        uni.showToast({
          title: '获取用户信息失败',
          icon: 'none'
        })
      }
    },
    
    getWxUserInfo() {
      return new Promise((resolve, reject) => {
        uni.getUserProfile({
          desc: '用于设置超级管理员',
          success: resolve,
          fail: reject
        })
      })
    },
    
    async initSuperAdmin() {
      try {
        this.initializing = true
        
        // 先进行微信登录
        const loginRes = await this.getWxLogin()
        if (!loginRes.code) {
          throw new Error(loginRes.errMsg || '微信登录失败')
        }
        
        // 获取用户信息（在用户点击时调用）
        const userInfoRes = await this.getWxUserInfo()
        if (!userInfoRes.userInfo) {
          throw new Error('获取用户信息失败')
        }
        
        // 更新用户信息显示
        this.userInfo = userInfoRes.userInfo
        
        // 先进行简化登录
        const loginResult = await uniCloud.callFunction({
          name: 'user-auth-simple',
          data: {
            action: 'wxLogin',
            userInfo: userInfoRes.userInfo
          }
        })
        
        if (loginResult.result.code !== 0) {
          throw new Error(loginResult.result.message || '登录失败')
        }
        
        // 保存登录状态
        uni.setStorageSync('uid', loginResult.result.data.uid)
        uni.setStorageSync('token', loginResult.result.data.token)
        
        // 调用云函数初始化超级管理员
        const result = await uniCloud.callFunction({
          name: 'system-init',
          data: {
            action: 'initSuperAdmin',
            userInfo: userInfoRes.userInfo
          }
        })
        
        if (result.result.code === 0) {
          uni.showModal({
            title: '初始化成功',
            content: '您已成为系统超级管理员，请妥善保管您的账号信息',
            showCancel: false,
            success: () => {
              // 跳转到主页
              uni.reLaunch({
                url: '/pages/home/index'
              })
            }
          })
        } else {
          throw new Error(result.result.message || '初始化失败')
        }
      } catch (error) {
        console.error('initSuperAdmin error:', error)
        uni.showToast({
          title: error.message || '初始化失败',
          icon: 'none',
          duration: 3000
        })
      } finally {
        this.initializing = false
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
    
    cancelInit() {
      uni.showModal({
        title: '确认取消',
        content: '取消后将无法使用系统，确定要退出吗？',
        success: (res) => {
          if (res.confirm) {
            uni.exitMiniProgram()
          }
        }
      })
    }
  }
}
</script>

<style scoped>
.init-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40rpx 30rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.init-container {
  width: 100%;
  max-width: 600rpx;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 30rpx;
  padding: 60rpx 40rpx;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.1);
}

.header {
  text-align: center;
  margin-bottom: 60rpx;
}

.title {
  display: block;
  font-size: 48rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
}

.subtitle {
  display: block;
  font-size: 28rpx;
  color: #666;
}

.content {
  margin-bottom: 60rpx;
}

.info-card {
  background: #f8f9fa;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
}

.card-title {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
}

.permission-list {
  display: flex;
  flex-direction: column;
}

.permission-item {
  font-size: 26rpx;
  color: #666;
  line-height: 1.6;
  margin-bottom: 10rpx;
}

.warning-card {
  background: #fff3cd;
  border: 2rpx solid #ffeaa7;
  border-radius: 15rpx;
  padding: 20rpx;
  margin-bottom: 30rpx;
  display: flex;
  align-items: center;
}

.warning-icon {
  font-size: 32rpx;
  margin-right: 15rpx;
}

.warning-text {
  flex: 1;
  font-size: 26rpx;
  color: #856404;
  line-height: 1.4;
}

.user-info {
  display: flex;
  align-items: center;
  background: #f8f9fa;
  border-radius: 15rpx;
  padding: 20rpx;
}

.avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  margin-right: 20rpx;
}

.user-details {
  flex: 1;
}

.user-name {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 10rpx;
}

.user-desc {
  display: block;
  font-size: 26rpx;
  color: #666;
}

.actions {
  margin-bottom: 40rpx;
}

.init-btn {
  width: 100%;
  height: 88rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 44rpx;
  font-size: 32rpx;
  font-weight: bold;
  margin-bottom: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 20rpx rgba(102, 126, 234, 0.3);
}

.init-btn:disabled {
  background: #ccc;
  box-shadow: none;
}

.cancel-btn {
  width: 100%;
  height: 80rpx;
  background: transparent;
  color: #666;
  border: 2rpx solid #ddd;
  border-radius: 40rpx;
  font-size: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.cancel-btn:disabled {
  opacity: 0.5;
}

.tips {
  background: #f8f9fa;
  border-radius: 15rpx;
  padding: 30rpx;
}

.tips-title {
  display: block;
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
}

.tips-content {
  display: block;
  font-size: 24rpx;
  color: #666;
  line-height: 1.6;
  margin-bottom: 10rpx;
}
</style>
