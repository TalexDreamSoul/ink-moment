<template>
  <view class="join-page">
    <view class="header">
      <text class="title">加入组织</text>
    </view>
    
    <view class="content">
      <text class="placeholder">加入组织功能开发中...</text>
    </view>
  </view>
</template>

<script>
export default {
  name: 'OrganizationJoin',
  data() {
    return {
      
    }
  }
}
</script>

<style scoped>
.join-page {
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
