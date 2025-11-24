<template>
  <view class="page">
    <!-- 状态栏占位 -->
    <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
    
    <view class="page-content">
      <!-- 头部 -->
      <view class="header">
        <text class="title">我的组织</text>
        <view class="header-actions">
          <button class="btn btn-small btn-outline" @click="goToJoin">加入组织</button>
          <button class="btn btn-small btn-primary" @click="goToCreate">创建组织</button>
        </view>
      </view>
      
      <!-- 组织列表 -->
      <view class="content">
        <view v-if="loading" class="loading-state">
          <text class="loading-text">加载中...</text>
        </view>
        
        <view v-else-if="organizations.length === 0" class="empty-state">
          <text class="empty-icon">🏢</text>
          <text class="empty-title">还没有加入任何组织</text>
          <text class="empty-desc">创建或加入组织后即可开始打卡</text>
          <view class="empty-actions">
            <button class="btn btn-primary btn-large" @click="goToCreate">创建组织</button>
            <button class="btn btn-outline btn-large" @click="goToJoin">加入组织</button>
          </view>
        </view>
        
        <view v-else class="org-list">
          <view 
            class="org-item" 
            v-for="org in organizations" 
            :key="org._id"
            @click="goToDetail(org._id)"
          >
            <view class="org-icon">🏢</view>
            <view class="org-info">
              <view class="org-name-row">
                <text class="org-name">{{ org.name }}</text>
                <view class="role-badge" :class="'role-' + org.role">
                  {{ getRoleText(org.role) }}
                </view>
              </view>
              <text class="org-desc" v-if="org.description">{{ org.description }}</text>
              <text class="org-time">加入时间: {{ formatTime(org.joined_at) }}</text>
            </view>
            <text class="arrow">›</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import authUtil from '@/utils/auth.js'

export default {
  name: 'OrganizationList',
  data() {
    return {
      loading: false,
      organizations: [],
      statusBarHeight: 0
    }
  },
  
  onLoad() {
    this.getStatusBarHeight()
    this.loadOrganizations()
  },
  
  onShow() {
    // 从其他页面返回时刷新列表
    this.loadOrganizations()
  },
  
  onPullDownRefresh() {
    this.loadOrganizations(true)
  },
  
  methods: {
    getStatusBarHeight() {
      const systemInfo = uni.getSystemInfoSync()
      this.statusBarHeight = systemInfo.statusBarHeight || 0
    },
    
    async loadOrganizations(isPullRefresh = false) {
      try {
        if (!authUtil.requireLogin()) {
          return
        }
        
        if (!isPullRefresh) {
          this.loading = true
        }
        
        const token = authUtil.getToken()
        const result = await uniCloud.callFunction({
          name: 'organization-manage',
          data: {
            action: 'getUserOrganizations',
            token
          }
        })
        
        if (result.result.code === 0) {
          this.organizations = result.result.data || []
        } else {
          uni.showToast({
            title: result.result.message || '获取组织列表失败',
            icon: 'none'
          })
        }
      } catch (error) {
        console.error('loadOrganizations error:', error)
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
    },
    
    goToCreate() {
      uni.navigateTo({
        url: '/pages/organization/create'
      })
    },
    
    goToJoin() {
      uni.navigateTo({
        url: '/pages/organization/join'
      })
    },
    
    goToDetail(orgId) {
      uni.navigateTo({
        url: `/pages/organization/detail?id=${orgId}`
      })
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
  padding-bottom: 40rpx;
}

.header {
  background: #ffffff;
  padding: 32rpx 24rpx;
  border-bottom: 1rpx solid #e5e5e5;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.title {
  font-size: 36rpx;
  font-weight: 700;
  color: #1a1a1a;
}

.header-actions {
  display: flex;
  gap: 16rpx;
}

.content {
  padding: 24rpx;
}

.loading-state {
  text-align: center;
  padding: 120rpx 0;
}

.loading-text {
  font-size: 28rpx;
  color: #999999;
}

.empty-state {
  text-align: center;
  padding: 120rpx 40rpx;
}

.empty-icon {
  display: block;
  font-size: 120rpx;
  margin-bottom: 24rpx;
}

.empty-title {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 16rpx;
}

.empty-desc {
  display: block;
  font-size: 28rpx;
  color: #666666;
  margin-bottom: 48rpx;
}

.empty-actions {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
  max-width: 400rpx;
  margin: 0 auto;
}

.org-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.org-item {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  display: flex;
  align-items: center;
  gap: 20rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.org-icon {
  font-size: 48rpx;
  width: 80rpx;
  height: 80rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 12rpx;
}

.org-info {
  flex: 1;
  min-width: 0;
}

.org-name-row {
  display: flex;
  align-items: center;
  gap: 12rpx;
  margin-bottom: 8rpx;
}

.org-name {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.role-badge {
  padding: 4rpx 12rpx;
  border-radius: 8rpx;
  font-size: 20rpx;
  font-weight: 500;
  flex-shrink: 0;
}

.role-admin {
  background: #fff3e0;
  color: #ff9800;
}

.role-supervisor {
  background: #e3f2fd;
  color: #2196f3;
}

.role-user {
  background: #f5f5f5;
  color: #666666;
}

.org-desc {
  display: block;
  font-size: 24rpx;
  color: #666666;
  margin-bottom: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.org-time {
  font-size: 22rpx;
  color: #999999;
}

.arrow {
  font-size: 48rpx;
  color: #cccccc;
  font-weight: 300;
}

/* 按钮样式 */
.btn {
  border: none;
  border-radius: 8rpx;
  font-size: 24rpx;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}

.btn-small {
  height: 56rpx;
  padding: 0 20rpx;
}

.btn-large {
  height: 88rpx;
  padding: 0 48rpx;
  font-size: 28rpx;
  width: 100%;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
}

.btn-outline {
  background: transparent;
  color: #667eea;
  border: 1rpx solid #667eea;
}
</style>
