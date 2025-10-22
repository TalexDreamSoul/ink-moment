<template>
  <view class="invitation-scan-page">
    <view class="header">
      <text class="title">扫描邀请</text>
    </view>
    
    <view class="content">
      <text class="placeholder">扫描邀请功能开发中...</text>
    </view>
  </view>
</template>

<script>
export default {
  name: 'InvitationScan',
  data() {
    return {
      
    }
  }
}
</script>

<style scoped>
.invitation-scan-page {
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
