<template>
  <view class="notification-list-page">
    <view class="header">
      <text class="title">通知中心</text>
    </view>
    
    <view class="content">
      <text class="placeholder">通知中心功能开发中...</text>
    </view>
  </view>
</template>

<script>
export default {
  name: 'NotificationList',
  data() {
    return {
      
    }
  }
}
</script>

<style scoped>
.notification-list-page {
  padding: 20rpx;
}

.header {
  text-align: center;
  margin-bottom: 40rpx;
}

.title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.content {
  text-align: center;
  padding: 100rpx 0;
}

.placeholder {
  font-size: 28rpx;
  color: #666;
}
</style>
