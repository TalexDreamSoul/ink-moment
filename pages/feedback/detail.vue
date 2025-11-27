<template>
  <view class="page">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-state">
      <text class="loading-text">加载中...</text>
    </view>
    
    <!-- 详情内容 -->
    <view v-else-if="feedback" class="content">
      <!-- 基本信息 -->
      <view class="info-section">
        <view class="header-row">
          <text class="title">{{ feedback.title }}</text>
          <view class="status-badge" :class="'status-' + feedback.status">
            {{ getStatusText(feedback.status) }}
          </view>
        </view>
        <view class="meta-row">
          <text class="type-tag">{{ getTypeText(feedback.type) }}</text>
          <text class="time-text">{{ formatTime(feedback.create_time) }}</text>
        </view>
      </view>

      <!-- 详细描述 -->
      <view class="detail-section">
        <view class="section-title">详细描述</view>
        <text class="detail-content">{{ feedback.content }}</text>
      </view>

      <!-- 图片 -->
      <view class="image-section" v-if="feedback.images && feedback.images.length > 0">
        <view class="section-title">相关图片</view>
        <view class="image-grid">
          <image 
            v-for="(img, index) in feedback.images" 
            :key="index"
            :src="img" 
            mode="aspectFill"
            class="feedback-img"
            @click="previewImage(index)"
          />
        </view>
      </view>

      <!-- 联系方式 -->
      <view class="contact-section" v-if="feedback.contact">
        <view class="section-title">联系方式</view>
        <text class="contact-text">{{ feedback.contact }}</text>
      </view>

      <!-- 管理员回复 -->
      <view class="reply-section" v-if="feedback.reply">
        <view class="section-title">管理员回复</view>
        <view class="reply-box">
          <view class="reply-header">
            <text class="reply-admin">管理员</text>
            <text class="reply-time">{{ formatTime(feedback.reply_time) }}</text>
          </view>
          <text class="reply-content">{{ feedback.reply }}</text>
        </view>
      </view>

    </view>

  </view>
</template>

<script>
import auth from '@/utils/auth.js'

export default {
  name: 'FeedbackDetail',
  data() {
    return {
      loading: false,
      feedbackId: '',
      feedback: null
    }
  },
  
  onLoad(options) {
    if (!auth.requireLogin()) {
      return
    }
    
    if (options.id) {
      this.feedbackId = options.id
      this.loadDetail()
    } else {
      uni.showToast({
        title: '参数错误',
        icon: 'none'
      })
      setTimeout(() => {
        uni.navigateBack()
      }, 1500)
    }
  },
  
  methods: {
    async loadDetail() {
      try {
        this.loading = true
        const token = auth.getToken()
        
        const result = await uniCloud.callFunction({
          name: 'feedback-manage',
          data: {
            action: 'getFeedbackDetail',
            token,
            feedbackId: this.feedbackId
          }
        })
        
        if (result.result.code === 0) {
          this.feedback = result.result.data
        } else {
          uni.showToast({
            title: result.result.message || '加载失败',
            icon: 'none'
          })
        }
      } catch (error) {
        console.error('loadDetail error:', error)
        uni.showToast({
          title: '加载失败',
          icon: 'none'
        })
      } finally {
        this.loading = false
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
      const year = date.getFullYear()
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const day = date.getDate().toString().padStart(2, '0')
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      return `${year}-${month}-${day} ${hours}:${minutes}`
    },
    
    previewImage(index) {
      uni.previewImage({
        urls: this.feedback.images,
        current: index
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

.loading-state {
  padding: 120rpx 0;
  text-align: center;
}

.loading-text {
  font-size: 28rpx;
  color: #999999;
}

.content {
  padding: 20rpx;
}

/* 基本信息 */
.info-section {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 20rpx;
}

.header-row {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 16rpx;
}

.title {
  flex: 1;
  font-size: 36rpx;
  font-weight: 600;
  color: #111;
  margin-right: 16rpx;
  line-height: 1.4;
}

.status-badge {
  padding: 6rpx 20rpx;
  border-radius: 8rpx;
  font-size: 24rpx;
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

.meta-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.type-tag {
  font-size: 24rpx;
  color: #576b95;
  background-color: #f0f0f0;
  padding: 6rpx 16rpx;
  border-radius: 6rpx;
}

.time-text {
  font-size: 24rpx;
  color: #999999;
}

/* 详细描述 */
.detail-section,
.image-section,
.contact-section,
.reply-section {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #111;
  margin-bottom: 24rpx;
}

.detail-content {
  display: block;
  font-size: 28rpx;
  color: #333;
  line-height: 1.8;
  white-space: pre-wrap;
}

/* 图片 */
.image-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.feedback-img {
  width: 200rpx;
  height: 200rpx;
  border-radius: 8rpx;
}

/* 联系方式 */
.contact-text {
  display: block;
  font-size: 28rpx;
  color: #333;
}

/* 管理员回复 */
.reply-box {
  background-color: #f7f7f7;
  border-radius: 12rpx;
  padding: 24rpx;
}

.reply-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.reply-admin {
  font-size: 26rpx;
  font-weight: 600;
  color: #07c160;
}

.reply-time {
  font-size: 22rpx;
  color: #999999;
}

.reply-content {
  display: block;
  font-size: 28rpx;
  color: #333;
  line-height: 1.8;
  white-space: pre-wrap;
}
</style>
