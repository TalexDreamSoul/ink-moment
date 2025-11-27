<template>
  <view class="page">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-state">
      <text class="loading-text">加载中...</text>
    </view>
    
    <!-- 空状态 -->
    <view v-else-if="feedbackList.length === 0" class="empty-state">
      <text class="empty-icon">💬</text>
      <text class="empty-title">还没有反馈记录</text>
      <text class="empty-desc">您的意见对我们很重要</text>
      <button class="create-btn" @click="goToCreate">立即反馈</button>
    </view>
    
    <!-- 反馈列表 -->
    <view v-else class="feedback-list">
      <view 
        class="feedback-item" 
        v-for="item in feedbackList" 
        :key="item._id"
        @click="goToDetail(item._id)"
      >
        <view class="item-header">
          <text class="item-title">{{ item.title }}</text>
          <view class="status-badge" :class="'status-' + item.status">
            {{ getStatusText(item.status) }}
          </view>
        </view>
        <text class="item-content">{{ item.content }}</text>
        <view class="item-footer">
          <text class="item-type">{{ getTypeText(item.type) }}</text>
          <text class="item-time">{{ formatTime(item.create_time) }}</text>
        </view>
      </view>
    </view>
    
    <!-- 创建按钮 - 固定在底部 -->
    <view class="create-fab" @click="goToCreate" v-if="feedbackList.length > 0">
      <text class="fab-icon">+</text>
    </view>

  </view>
</template>

<script>
import auth from '@/utils/auth.js'

export default {
  name: 'FeedbackList',
  data() {
    return {
      loading: false,
      feedbackList: []
    }
  },
  
  onLoad() {
    if (!auth.requireLogin()) {
      return
    }
    this.loadFeedbackList()
  },
  
  onPullDownRefresh() {
    this.loadFeedbackList(true)
  },
  
  onShow() {
    // 从详情页返回时刷新列表
    if (this.feedbackList.length > 0) {
      this.loadFeedbackList()
    }
  },
  
  methods: {
    async loadFeedbackList(isPullRefresh = false) {
      try {
        if (!isPullRefresh) {
          this.loading = true
        }
        
        const token = auth.getToken()
        const result = await uniCloud.callFunction({
          name: 'feedback-manage',
          data: {
            action: 'getUserFeedbackList',
            token
          }
        })
        
        if (result.result.code === 0) {
          this.feedbackList = result.result.data || []
        } else {
          uni.showToast({
            title: result.result.message || '加载失败',
            icon: 'none'
          })
        }
      } catch (error) {
        console.error('loadFeedbackList error:', error)
        uni.showToast({
          title: '加载失败',
          icon: 'none'
        })
      } finally {
        this.loading = false
        if (isPullRefresh) {
          uni.stopPullDownRefresh()
        }
      }
    },
    
    getStatusText(status) {
      const statusMap = {
        'pending': '待处理',
        'replied': '已回复',
        'closed': '已关闭'
      }
      return statusMap[status] || '未知'
    },
    
    getTypeText(type) {
      const typeMap = {
        'bug': 'Bug反馈',
        'feature': '功能建议',
        'other': '其他'
      }
      return typeMap[type] || ''
    },
    
    formatTime(timestamp) {
      if (!timestamp) return ''
      const date = new Date(timestamp)
      const now = new Date()
      const diff = now.getTime() - date.getTime()
      
      // 小于1分钟
      if (diff < 60000) {
        return '刚刚'
      }
      // 小于1小时
      if (diff < 3600000) {
        return `${Math.floor(diff / 60000)}分钟前`
      }
      // 小于1天
      if (diff < 86400000) {
        return `${Math.floor(diff / 3600000)}小时前`
      }
      // 小于7天
      if (diff < 604800000) {
        return `${Math.floor(diff / 86400000)}天前`
      }
      
      // 超过7天显示具体日期
      const month = date.getMonth() + 1
      const day = date.getDate()
      return `${month}月${day}日`
    },
    
    goToCreate() {
      uni.navigateTo({
        url: '/pages/feedback/create'
      })
    },
    
    goToDetail(id) {
      uni.navigateTo({
        url: `/pages/feedback/detail?id=${id}`
      })
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background-color: #EDEDED;
  padding-bottom: 40rpx;
}

/* 加载状态 */
.loading-state {
  padding: 120rpx 0;
  text-align: center;
}

.loading-text {
  font-size: 28rpx;
  color: #999999;
}

/* 空状态 */
.empty-state {
  background-color: #ffffff;
  padding: 120rpx 40rpx;
  text-align: center;
  margin: 20rpx;
  border-radius: 16rpx;
}

.empty-icon {
  display: block;
  font-size: 120rpx;
  margin-bottom: 24rpx;
  opacity: 0.5;
}

.empty-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #111;
  margin-bottom: 16rpx;
}

.empty-desc {
  display: block;
  font-size: 28rpx;
  color: #7f7f7f;
  margin-bottom: 48rpx;
}

.create-btn {
  width: 240rpx;
  height: 80rpx;
  background-color: #07c160;
  color: #ffffff;
  border: none;
  border-radius: 8rpx;
  font-size: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}

/* 反馈列表 */
.feedback-list {
  padding: 20rpx;
}

.feedback-item {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 20rpx;
}

.item-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16rpx;
}

.item-title {
  flex: 1;
  font-size: 32rpx;
  font-weight: 600;
  color: #111;
  margin-right: 16rpx;
}

.status-badge {
  padding: 4rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
  font-weight: 500;
  flex-shrink: 0;
}

.status-pending {
  background-color: #fff3e0;
  color: #ff9800;
}

.status-replied {
  background-color: #e8f4ea;
  color: #07c160;
}

.status-closed {
  background-color: #f5f5f5;
  color: #999999;
}

.item-content {
  display: block;
  font-size: 28rpx;
  color: #7f7f7f;
  line-height: 1.6;
  margin-bottom: 16rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}

.item-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.item-type {
  font-size: 24rpx;
  color: #576b95;
  background-color: #f0f0f0;
  padding: 4rpx 12rpx;
  border-radius: 6rpx;
}

.item-time {
  font-size: 24rpx;
  color: #999999;
}

/* 创建按钮 - 悬浮 */
.create-fab {
  position: fixed;
  bottom: 80rpx;
  right: 40rpx;
  width: 112rpx;
  height: 112rpx;
  background-color: #07c160;
  border-radius: 56rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 24rpx rgba(7, 193, 96, 0.3);
}

.fab-icon {
  font-size: 64rpx;
  color: #ffffff;
  font-weight: 300;
}
</style>
