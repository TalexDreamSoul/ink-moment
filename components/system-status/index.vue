<template>
  <view class="system-status">
    <view class="status-header">
      <text class="status-title">系统状态</text>
      <button class="refresh-btn" @click="refreshStatus" :loading="loading">
        <text class="refresh-icon">🔄</text>
      </button>
    </view>
    
    <view class="status-content">
      <view class="status-item">
        <text class="status-label">超级管理员</text>
        <text class="status-value" :class="systemStatus.hasSuperAdmin ? 'success' : 'error'">
          {{ systemStatus.hasSuperAdmin ? '已设置' : '未设置' }}
        </text>
      </view>
      
      <view class="status-item">
        <text class="status-label">管理员数量</text>
        <text class="status-value">{{ systemStatus.adminCount }}</text>
      </view>
      
      <view class="status-item">
        <text class="status-label">组织数量</text>
        <text class="status-value">{{ systemStatus.orgCount }}</text>
      </view>
      
      <view class="status-item">
        <text class="status-label">用户数量</text>
        <text class="status-value">{{ systemStatus.userCount }}</text>
      </view>
      
      <view class="status-item">
        <text class="status-label">系统状态</text>
        <text class="status-value" :class="systemStatus.systemReady ? 'success' : 'warning'">
          {{ systemStatus.systemReady ? '正常运行' : '需要配置' }}
        </text>
      </view>
    </view>
    
    <view class="status-footer">
      <text class="last-update">最后更新: {{ lastUpdateTime }}</text>
    </view>
  </view>
</template>

<script>
import { getSystemStatus } from '@/utils/system-check.js'

export default {
  name: 'SystemStatus',
  data() {
    return {
      loading: false,
      systemStatus: {
        hasSuperAdmin: false,
        superAdminCount: 0,
        adminCount: 0,
        orgCount: 0,
        userCount: 0,
        systemReady: false
      },
      lastUpdateTime: ''
    }
  },
  
  mounted() {
    this.loadSystemStatus()
  },
  
  methods: {
    async loadSystemStatus() {
      try {
        this.loading = true
        const status = await getSystemStatus()
        this.systemStatus = status
        this.lastUpdateTime = this.formatTime(new Date())
      } catch (error) {
        console.error('loadSystemStatus error:', error)
        uni.showToast({
          title: '获取系统状态失败',
          icon: 'none'
        })
      } finally {
        this.loading = false
      }
    },
    
    async refreshStatus() {
      await this.loadSystemStatus()
    },
    
    formatTime(date) {
      const year = date.getFullYear()
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const day = date.getDate().toString().padStart(2, '0')
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      const seconds = date.getSeconds().toString().padStart(2, '0')
      
      return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`
    }
  }
}
</script>

<style scoped>
.system-status {
  background: #fff;
  border-radius: 20rpx;
  padding: 30rpx;
  margin: 20rpx;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.1);
}

.status-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 30rpx;
}

.status-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
}

.refresh-btn {
  width: 60rpx;
  height: 60rpx;
  background: #f8f9fa;
  border: none;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
}

.refresh-icon {
  font-size: 24rpx;
}

.status-content {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.status-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.status-item:last-child {
  border-bottom: none;
}

.status-label {
  font-size: 28rpx;
  color: #666;
}

.status-value {
  font-size: 28rpx;
  font-weight: bold;
}

.status-value.success {
  color: #52c41a;
}

.status-value.error {
  color: #ff4d4f;
}

.status-value.warning {
  color: #faad14;
}

.status-footer {
  margin-top: 20rpx;
  text-align: center;
}

.last-update {
  font-size: 24rpx;
  color: #999;
}
</style>
