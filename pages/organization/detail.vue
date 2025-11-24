<template>
  <view class="page">
    <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
    
    <view class="page-content">
      <view class="detail-container">
        <view class="org-header">
          <text class="org-icon-large">🏢</text>
          <text class="org-name">{{ organization.name }}</text>
          <text class="org-desc" v-if="organization.description">{{ organization.description }}</text>
        </view>
        
        <view class="info-section">
          <text class="section-title">组织信息</text>
          <view class="info-item">
            <text class="info-label">成员数量</text>
            <text class="info-value">{{ organization.memberCount || 0 }} 人</text>
          </view>
          <view class="info-item">
            <text class="info-label">我的角色</text>
            <text class="info-value">{{ getRoleText(organization.userRole) }}</text>
          </view>
          <view class="info-item">
            <text class="info-label">创建时间</text>
            <text class="info-value">{{ formatTime(organization.created_at) }}</text>
          </view>
        </view>
        
        <view class="actions" v-if="organization.userRole === 'admin'">
          <button class="btn btn-outline btn-block">管理成员</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import authUtil from '@/utils/auth.js'

export default {
  name: 'OrganizationDetail',
  data() {
    return {
      statusBarHeight: 0,
      orgId: '',
      organization: {}
    }
  },
  
  onLoad(options) {
    this.getStatusBarHeight()
    if (options.id) {
      this.orgId = options.id
      this.loadDetail()
    }
  },
  
  methods: {
    getStatusBarHeight() {
      const systemInfo = uni.getSystemInfoSync()
      this.statusBarHeight = systemInfo.statusBarHeight || 0
    },
    
    async loadDetail() {
      try {
        if (!authUtil.requireLogin()) {
          return
        }
        
        uni.showLoading({ title: '加载中...' })
        
        const token = authUtil.getToken()
        const result = await uniCloud.callFunction({
          name: 'organization-manage',
          data: {
            action: 'getOrganizationDetail',
            token,
            orgId: this.orgId
          }
        })
        
        uni.hideLoading()
        
        if (result.result.code === 0) {
          this.organization = result.result.data
        } else {
          uni.showToast({
            title: result.result.message || '加载失败',
            icon: 'none'
          })
        }
      } catch (error) {
        console.error('loadDetail error:', error)
        uni.hideLoading()
        uni.showToast({
          title: '加载失败',
          icon: 'none'
        })
      }
    },
    
    getRoleText(role) {
      const roleMap = {
        'admin': '管理员',
        'supervisor': '督导',
        'user': '成员'
      }
      return roleMap[role] || '成员'
    },
    
    formatTime(timestamp) {
      if (!timestamp) return ''
      const date = new Date(timestamp)
      const year = date.getFullYear()
      const month = (date.getMonth() + 1).toString().padStart(2, '0')
      const day = date.getDate().toString().padStart(2, '0')
      return `${year}-${month}-${day}`
    }
  }
}
</script>

<style scoped>
/* #ifndef MP-WEIXIN */
@import url('@/common/styles/common.css');
/* #endif */

.page {
  min-height: 100vh;
  background: #f5f5f5;
}

.status-bar {
  background: #ffffff;
}

.page-content {
  padding: 24rpx;
}

.detail-container {
  background: #ffffff;
  border-radius: 24rpx;
  overflow: hidden;
}

.org-header {
  padding: 48rpx 32rpx;
  text-align: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.org-icon-large {
  display: block;
  font-size: 96rpx;
  margin-bottom: 16rpx;
}

.org-name {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #ffffff;
  margin-bottom: 12rpx;
}

.org-desc {
  display: block;
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.9);
}

.info-section {
  padding: 32rpx;
}

.section-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 24rpx;
}

.info-item {
  display: flex;
  justify-content: space-between;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 28rpx;
  color: #666666;
}

.info-value {
  font-size: 28rpx;
  color: #1a1a1a;
  font-weight: 500;
}

.actions {
  padding: 32rpx;
  padding-top: 0;
}

.btn {
  border: none;
  border-radius: 12rpx;
  font-size: 32rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-block {
  width: 100%;
  height: 88rpx;
}

.btn-outline {
  background: transparent;
  color: #667eea;
  border: 2rpx solid #667eea;
}
</style>
