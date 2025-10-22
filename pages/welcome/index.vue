<template>
  <view class="welcome-page">
    <view class="welcome-container">
      <!-- Logo和标题 -->
      <view class="logo-section">
        <image src="/static/logo.png" class="logo" mode="aspectFit" />
        <text class="app-name">溯间砚时</text>
        <text class="app-desc">志愿时长记录管理系统</text>
      </view>
      
      <!-- 功能介绍 -->
      <view class="features-section">
        <view class="feature-item">
          <text class="feature-icon">⏰</text>
          <text class="feature-title">智能打卡</text>
          <text class="feature-desc">自动记录工作时长，精确到分钟</text>
        </view>
        
        <view class="feature-item">
          <text class="feature-icon">📊</text>
          <text class="feature-title">数据统计</text>
          <text class="feature-desc">实时查看志愿时长统计</text>
        </view>
        
        <view class="feature-item">
          <text class="feature-icon">👥</text>
          <text class="feature-title">组织管理</text>
          <text class="feature-desc">支持多组织加入和管理</text>
        </view>
      </view>
      
      <!-- 开始按钮 -->
      <view class="start-section">
        <button class="start-btn" @click="goToLogin">
          <text class="btn-text">开始使用</text>
        </button>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'Welcome',
  methods: {
    goToLogin() {
      uni.navigateTo({
        url: '/pages/auth/login'
      })
    }
  }
}
</script>

<style scoped>
.welcome-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
}

.welcome-container {
  width: 100%;
  max-width: 600rpx;
  background: rgba(255, 255, 255, 0.95);
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

.features-section {
  margin-bottom: 80rpx;
}

.feature-item {
  display: flex;
  align-items: center;
  margin-bottom: 40rpx;
  padding: 20rpx;
  background: #f8f9fa;
  border-radius: 15rpx;
}

.feature-icon {
  font-size: 40rpx;
  margin-right: 20rpx;
}

.feature-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 8rpx;
}

.feature-desc {
  font-size: 26rpx;
  color: #666;
  flex: 1;
}

.start-section {
  text-align: center;
}

.start-btn {
  width: 100%;
  height: 88rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 44rpx;
  font-size: 32rpx;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 20rpx rgba(102, 126, 234, 0.3);
}

.btn-text {
  color: #fff;
}
</style>
