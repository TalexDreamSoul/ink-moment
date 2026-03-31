<template>
  <view class="page">
    <view class="hero-card">
      <text class="title">管理入口</text>
      <text class="subtitle">系统初始化、组织邀请和独立 Web 管理后台都从这里进入</text>
      <view class="url-box">
        <text class="url-label">Web 后台地址</text>
        <text class="url-value">{{ adminUrl }}</text>
      </view>
      <button class="primary-btn" @click="copyAdminUrl">复制后台地址</button>
    </view>

    <view class="status-card">
      <view class="section-head">
        <text class="section-title">系统状态</text>
        <text class="refresh-text" @click="loadSystemStatus">刷新</text>
      </view>
      <view class="status-grid">
        <view class="metric-item">
          <text class="metric-value">{{ status.superAdminCount }}</text>
          <text class="metric-label">超级管理员</text>
        </view>
        <view class="metric-item">
          <text class="metric-value">{{ status.adminCount }}</text>
          <text class="metric-label">平台管理员</text>
        </view>
        <view class="metric-item">
          <text class="metric-value">{{ status.orgCount }}</text>
          <text class="metric-label">组织数</text>
        </view>
        <view class="metric-item">
          <text class="metric-value">{{ status.userCount }}</text>
          <text class="metric-label">用户数</text>
        </view>
      </view>
      <text class="status-tip">
        {{ status.systemReady ? '系统已完成初始化，可直接使用 Web 后台管理。' : '系统尚未初始化，请先创建超级管理员账号。' }}
      </text>
    </view>

    <view class="menu-card">
      <text class="section-title">快捷操作</text>
      <view class="menu-list">
        <view class="menu-item" @click="goToInit">
          <view>
            <text class="menu-title">系统初始化</text>
            <text class="menu-desc">创建首个超级管理员账号</text>
          </view>
          <text class="menu-arrow">›</text>
        </view>
        <view class="menu-item" @click="goToInvite">
          <view>
            <text class="menu-title">组织邀请</text>
            <text class="menu-desc">查看邀请码并复制加入路径</text>
          </view>
          <text class="menu-arrow">›</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import auth from '@/utils/auth.js'
import { getAdminBaseUrl } from '@/utils/app-config.js'
import { getSystemStatus } from '@/utils/system-check.js'

export default {
  name: 'AdminHome',
  data() {
    return {
      adminUrl: getAdminBaseUrl(),
      status: {
        hasSuperAdmin: false,
        superAdminCount: 0,
        adminCount: 0,
        orgCount: 0,
        userCount: 0,
        systemReady: false
      }
    }
  },

  onLoad() {
    this.loadSystemStatus()
  },

  onShow() {
    this.loadSystemStatus()
  },

  methods: {
    async loadSystemStatus() {
      try {
        this.status = await getSystemStatus()
      } catch (error) {
        console.error('loadSystemStatus error:', error)
      }
    },

    copyAdminUrl() {
      uni.setClipboardData({
        data: this.adminUrl,
        success: () => {
          uni.showToast({
            title: '后台地址已复制',
            icon: 'success'
          })
        }
      })
    },

    goToInit() {
      uni.navigateTo({
        url: '/pages/admin/init-super-admin'
      })
    },

    goToInvite() {
      if (!auth.requireLogin()) {
        return
      }

      uni.navigateTo({
        url: '/pages/admin/invite-admin'
      })
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

.hero-card,
.status-card,
.menu-card {
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
  color: #64748b;
  line-height: 1.7;
  margin-bottom: 24rpx;
}

.url-box {
  background: #f8fafc;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 24rpx;
}

.url-label {
  display: block;
  font-size: 24rpx;
  color: #64748b;
  margin-bottom: 8rpx;
}

.url-value {
  display: block;
  font-size: 24rpx;
  color: #111111;
  line-height: 1.7;
  word-break: break-all;
}

.primary-btn {
  height: 88rpx;
  border-radius: 14rpx;
  border: none;
  background: #2563eb;
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 600;
}

.section-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #111111;
}

.refresh-text {
  font-size: 24rpx;
  color: #2563eb;
}

.status-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 20rpx;
}

.metric-item {
  background: #f8fafc;
  border-radius: 16rpx;
  padding: 24rpx;
}

.metric-value {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: #0f172a;
  margin-bottom: 8rpx;
}

.metric-label {
  font-size: 24rpx;
  color: #64748b;
}

.status-tip {
  display: block;
  margin-top: 24rpx;
  font-size: 26rpx;
  color: #475569;
  line-height: 1.7;
}

.menu-list {
  margin-top: 20rpx;
}

.menu-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #eef2f7;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #111111;
  margin-bottom: 8rpx;
}

.menu-desc {
  display: block;
  font-size: 24rpx;
  color: #64748b;
}

.menu-arrow {
  font-size: 40rpx;
  color: #cbd5e1;
}
</style>
