<template>
  <view class="page">
    <view class="header">
      <text class="title">通知中心</text>
      <text class="subtitle">审核结果、反馈回复、导出提醒都会在这里汇总</text>
    </view>

    <view v-if="loading" class="state-card">
      <text class="state-text">加载中...</text>
    </view>

    <view v-else-if="notifications.length === 0" class="state-card">
      <text class="state-icon">🔔</text>
      <text class="state-title">暂无通知</text>
      <text class="state-text">有新的审核、反馈或导出结果时会显示在这里</text>
    </view>

    <view v-else class="notification-list">
      <view
        v-for="item in notifications"
        :key="item._id"
        class="notification-item"
        @click="openDetail(item)"
      >
        <view class="item-main">
          <view class="item-head">
            <text class="item-title">{{ item.title }}</text>
            <view v-if="item.status === 'unread'" class="unread-dot"></view>
          </view>
          <text class="item-content">{{ item.content }}</text>
          <view class="item-meta">
            <text class="item-type">{{ formatType(item.type) }}</text>
            <text class="item-time">{{ formatTime(item.create_time) }}</text>
          </view>
        </view>
        <text class="item-arrow">›</text>
      </view>
    </view>
  </view>
</template>

<script>
import auth from '@/utils/auth.js'

export default {
  name: 'NotificationList',
  data() {
    return {
      loading: false,
      notifications: []
    }
  },

  onLoad() {
    if (!auth.requireLogin()) {
      return
    }
    this.loadNotifications()
  },

  onShow() {
    if (auth.isLoggedIn()) {
      this.loadNotifications()
    }
  },

  onPullDownRefresh() {
    this.loadNotifications(true)
  },

  methods: {
    async loadNotifications(isPullRefresh = false) {
      try {
        if (!isPullRefresh) {
          this.loading = true
        }

        const result = await uniCloud.callFunction({
          name: 'notification-manage',
          data: {
            action: 'list',
            token: auth.getToken()
          }
        })

        if (result.result.code === 0) {
          this.notifications = result.result.data || []
        } else {
          uni.showToast({
            title: result.result.message || '通知加载失败',
            icon: 'none'
          })
        }
      } catch (error) {
        console.error('loadNotifications error:', error)
        uni.showToast({
          title: error.message || '通知加载失败',
          icon: 'none'
        })
      } finally {
        this.loading = false
        if (isPullRefresh) {
          uni.stopPullDownRefresh()
        }
      }
    },

    openDetail(item) {
      uni.navigateTo({
        url: `/pages/notification/detail?id=${item._id}`
      })
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
      const now = new Date()
      const diff = now.getTime() - date.getTime()

      if (diff < 60000) {
        return '刚刚'
      }
      if (diff < 3600000) {
        return `${Math.floor(diff / 60000)}分钟前`
      }
      if (diff < 86400000) {
        return `${Math.floor(diff / 3600000)}小时前`
      }

      const month = `${date.getMonth() + 1}`.padStart(2, '0')
      const day = `${date.getDate()}`.padStart(2, '0')
      const hour = `${date.getHours()}`.padStart(2, '0')
      const minute = `${date.getMinutes()}`.padStart(2, '0')
      return `${month}-${day} ${hour}:${minute}`
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

.header {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
}

.title {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: #111111;
  margin-bottom: 12rpx;
}

.subtitle {
  display: block;
  font-size: 26rpx;
  color: #666666;
  line-height: 1.6;
}

.state-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 80rpx 40rpx;
  text-align: center;
}

.state-icon {
  display: block;
  font-size: 96rpx;
  margin-bottom: 16rpx;
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
  color: #7a7a7a;
  line-height: 1.7;
}

.notification-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.notification-item {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 28rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.item-main {
  flex: 1;
  min-width: 0;
}

.item-head {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 12rpx;
}

.item-title {
  flex: 1;
  font-size: 30rpx;
  font-weight: 600;
  color: #111111;
}

.unread-dot {
  width: 16rpx;
  height: 16rpx;
  border-radius: 50%;
  background: #ff5a5f;
  flex-shrink: 0;
}

.item-content {
  display: block;
  font-size: 26rpx;
  color: #666666;
  line-height: 1.6;
  margin-bottom: 16rpx;
}

.item-meta {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16rpx;
}

.item-type,
.item-time {
  font-size: 24rpx;
  color: #999999;
}

.item-arrow {
  font-size: 40rpx;
  color: #c0c4cc;
}
</style>
