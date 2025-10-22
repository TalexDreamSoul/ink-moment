<template>
  <view class="feedback-list-page">
    <view class="header">
      <text class="title">反馈列表</text>
    </view>
    
    <view class="content">
      <text class="placeholder">反馈列表功能开发中...</text>
    </view>
  </view>
</template>

<script>
export default {
  name: 'FeedbackList',
  data() {
    return {
      
    }
  }
}
</script>

<style scoped>
.feedback-list-page {
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
