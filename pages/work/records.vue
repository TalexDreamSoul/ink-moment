<template>
  <view class="page">
    <view class="header">
      <text class="title">打卡记录</text>
    </view>
    
    <view class="content">
      <view class="empty-state">
        <text class="empty-text">暂无打卡记录</text>
        <button class="btn" @click="handleClick">刷新</button>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'WorkRecords',
  data() {
    return {
      
    }
  },
  methods: {
    handleClick() {
      uni.showToast({
        title: '功能开发中',
        icon: 'none'
      })
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #fff;
  padding-top: var(--status-bar-height);
}

.header {
  padding: 32rpx 24rpx;
  border-bottom: 1rpx solid #e5e5e5;
}

.title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.content {
  padding: 40rpx 24rpx;
}

.empty-state {
  text-align: center;
  padding: 80rpx 0;
}

.empty-text {
  display: block;
  font-size: 28rpx;
  color: #666;
  margin-bottom: 32rpx;
}

.btn {
  width: 160rpx;
  height: 64rpx;
  background: #007aff;
  color: #fff;
  border: none;
  border-radius: 8rpx;
  font-size: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}
</style>
