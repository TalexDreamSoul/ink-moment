<template>
  <view class="home-container">
    <!-- 头部区域 -->
    <view class="header">
      <view class="app-title">溯间砚时</view>
      <view class="app-subtitle">工作时长记录小程序</view>
    </view>
    
    <!-- 功能按钮区域 -->
    <view class="function-grid">
      <view class="function-item" @click="navigateTo('/pages/cloudFunction/cloudFunction')">
        <view class="function-icon">
          <image src="/static/tabbar/fn1.png" mode="aspectFit"></image>
        </view>
        <view class="function-title">云函数</view>
        <view class="function-desc">云端函数调用</view>
      </view>
      
      <view class="function-item" @click="navigateTo('/pages/cloudObject/cloudObject')">
        <view class="function-icon">
          <image src="/static/tabbar/obj1.png" mode="aspectFit"></image>
        </view>
        <view class="function-title">云对象</view>
        <view class="function-desc">云对象服务</view>
      </view>
      
      <view class="function-item" @click="navigateTo('/pages/storage/storage')">
        <view class="function-icon">
          <image src="/static/tabbar/storage1.png" mode="aspectFit"></image>
        </view>
        <view class="function-title">云存储</view>
        <view class="function-desc">文件存储管理</view>
      </view>
      
      <view class="function-item" @click="navigateTo('/pages/clientDB/clientDB')">
        <view class="function-icon">
          <image src="/static/tabbar/yun1.png" mode="aspectFit"></image>
        </view>
        <view class="function-title">ClientDB</view>
        <view class="function-desc">前端数据库操作</view>
      </view>
      
      <view class="function-item" @click="navigateTo('/pages/schema2code/schema2code')">
        <view class="function-icon">
          <image src="/static/tabbar/st-code1.png" mode="aspectFit"></image>
        </view>
        <view class="function-title">Schema2Code</view>
        <view class="function-desc">代码生成工具</view>
      </view>
      
      <view class="function-item" @click="navigateTo('/pages/test/test')">
        <view class="function-icon">
          <text class="icon-text">🧪</text>
        </view>
        <view class="function-title">测试页面</view>
        <view class="function-desc">功能测试</view>
      </view>
    </view>
    
    <!-- 底部信息 -->
    <view class="footer">
      <view class="version-info">版本 1.0.0</view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'Home',
  data() {
    return {
      
    }
  },
  methods: {
    navigateTo(url) {
      uni.navigateTo({
        url: url
      })
    }
  }
}
</script>

<style scoped>
.home-container {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40rpx 30rpx;
  box-sizing: border-box;
}

.header {
  text-align: center;
  margin-bottom: 80rpx;
  padding-top: 60rpx;
}

.app-title {
  font-size: 48rpx;
  font-weight: bold;
  color: #ffffff;
  margin-bottom: 20rpx;
  text-shadow: 0 2rpx 4rpx rgba(0,0,0,0.3);
}

.app-subtitle {
  font-size: 28rpx;
  color: rgba(255,255,255,0.8);
  font-weight: 300;
}

.function-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 30rpx;
  margin-bottom: 80rpx;
}

.function-item {
  background: rgba(255,255,255,0.95);
  border-radius: 20rpx;
  padding: 40rpx 30rpx;
  text-align: center;
  box-shadow: 0 8rpx 32rpx rgba(0,0,0,0.1);
  transition: all 0.3s ease;
  position: relative;
  overflow: hidden;
}

.function-item::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 4rpx;
  background: linear-gradient(90deg, #667eea, #764ba2);
}

.function-item:active {
  transform: scale(0.95);
  box-shadow: 0 4rpx 16rpx rgba(0,0,0,0.2);
}

.function-icon {
  width: 80rpx;
  height: 80rpx;
  margin: 0 auto 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.function-icon image {
  width: 100%;
  height: 100%;
}

.icon-text {
  font-size: 60rpx;
}

.function-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 10rpx;
}

.function-desc {
  font-size: 24rpx;
  color: #666;
  line-height: 1.4;
}

.footer {
  text-align: center;
  padding: 40rpx 0;
}

.version-info {
  font-size: 24rpx;
  color: rgba(255,255,255,0.6);
}

/* 响应式设计 */
@media screen and (max-width: 750rpx) {
  .function-grid {
    grid-template-columns: 1fr;
    gap: 20rpx;
  }
  
  .function-item {
    padding: 30rpx 20rpx;
  }
}
</style>
