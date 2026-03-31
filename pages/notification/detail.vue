<template>
  <view class="page">
    <view v-if="loading" class="state-card">
      <text class="state-text">加载中...</text>
    </view>

    <view v-else-if="notification" class="content-card">
      <text class="title">{{ notification.title }}</text>
      <view class="meta-row">
        <text class="meta-text">{{ formatType(notification.type) }}</text>
        <text class="meta-text">{{ formatTime(notification.create_time) }}</text>
      </view>

      <view class="status-row">
        <text class="status-label">状态</text>
        <text class="status-value">{{ notification.status === 'read' ? '已读' : '未读' }}</text>
      </view>

      <view class="body-card">
        <text class="body-title">通知内容</text>
        <text class="body-text">{{ notification.content }}</text>
      </view>

      <view v-if="notification.related_type || notification.related_id" class="body-card">
        <text class="body-title">关联信息</text>
        <text class="body-text">类型：{{ notification.related_type || '无' }}</text>
        <text class="body-text">ID：{{ notification.related_id || '无' }}</text>
      </view>
    </view>

    <view v-else class="state-card">
      <text class="state-title">通知不存在</text>
      <text class="state-text">请返回列表后重试</text>
    </view>
  </view>
</template>

<script>
import auth from '@/utils/auth.js'

export default {
  name: 'NotificationDetail',
  data() {
    return {
      loading: false,
      notificationId: '',
      notification: null
    }
  },

  onLoad(options) {
    if (!auth.requireLogin()) {
      return
    }

    this.notificationId = options.id || ''
    if (!this.notificationId) {
      uni.showToast({
        title: '通知参数缺失',
        icon: 'none'
      })
      return
    }

    this.loadDetail()
  },

  methods: {
    async loadDetail() {
      try {
        this.loading = true

        const result = await uniCloud.callFunction({
          name: 'notification-manage',
          data: {
            action: 'detail',
            notificationId: this.notificationId,
            token: auth.getToken()
          }
        })

        if (result.result.code === 0) {
          this.notification = result.result.data || null
        } else {
          uni.showToast({
            title: result.result.message || '通知详情加载失败',
            icon: 'none'
          })
        }
      } catch (error) {
        console.error('loadDetail error:', error)
        uni.showToast({
          title: error.message || '通知详情加载失败',
          icon: 'none'
        })
      } finally {
        this.loading = false
      }
    },

    formatType(type) {
      const labelMap = {
        system: '系统通知',
        audit_result: '审核结果',
        feedback_reply: '反馈回复',
        export_ready: '导出提醒',
        invitation: '邀请通知'
      }
      return labelMap[type] || '消息'
    },

    formatTime(timestamp) {
      if (!timestamp) {
        return ''
      }

      const date = new Date(timestamp)
      const year = date.getFullYear()
      const month = `${date.getMonth() + 1}`.padStart(2, '0')
      const day = `${date.getDate()}`.padStart(2, '0')
      const hour = `${date.getHours()}`.padStart(2, '0')
      const minute = `${date.getMinutes()}`.padStart(2, '0')
      return `${year}-${month}-${day} ${hour}:${minute}`
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 24rpx;
}

.state-card,
.content-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 32rpx;
}

.state-card {
  text-align: center;
  padding: 100rpx 40rpx;
}

.state-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #111111;
  margin-bottom: 12rpx;
}

.state-text {
  font-size: 26rpx;
  color: #777777;
}

.title {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: #111111;
  line-height: 1.4;
  margin-bottom: 24rpx;
}

.meta-row,
.status-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 20rpx;
}

.meta-text,
.status-label,
.status-value {
  font-size: 24rpx;
  color: #888888;
}

.body-card {
  background: #f8fafc;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-top: 24rpx;
}

.body-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #111111;
  margin-bottom: 16rpx;
}

.body-text {
  display: block;
  font-size: 28rpx;
  color: #333333;
  line-height: 1.8;
  margin-bottom: 12rpx;
}

.body-text:last-child {
  margin-bottom: 0;
}
</style>
