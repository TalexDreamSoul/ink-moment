<template>
  <view class="page">
    <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
    
    <!-- Sticky Header -->
    <view class="sticky-header">
      <view class="org-header">
        <text class="org-icon-large">🏢</text>
        <text class="org-name">{{ organization.name }}</text>
        <text class="org-desc" v-if="organization.description">{{ organization.description }}</text>
      </view>
      
      <view class="info-section">
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
    </view>
    
    <!-- Scrollable Content -->
    <scroll-view class="scroll-content" scroll-y :style="{ height: scrollHeight + 'px' }">
      <!-- Invite Code Section (Only for admin/owner) -->
      <view class="invite-section" v-if="canManage()">
        <view class="section-header">
          <text class="section-title">邀请码</text>
        </view>
        <view class="invite-code-box">
          <view class="invite-code">{{ organization.qrcode_key || 'N/A' }}</view>
          <button class="btn-copy" @tap="copyInviteCode">复制</button>
        </view>
        <text class="invite-hint">分享邀请码让新成员加入组织</text>
      </view>
      
      <!-- Members List -->
      <view class="members-section">
        <view class="section-header">
          <text class="section-title">成员列表</text>
          <text class="member-count">{{ (organization.members || []).length }} 人</text>
        </view>
        
        <view v-if="loading" class="loading-state">
          <text class="loading-text">加载中...</text>
        </view>
        
        <view v-else-if="!organization.members || organization.members.length === 0" class="empty-state">
          <text class="empty-icon">👥</text>
          <text class="empty-text">暂无成员信息</text>
        </view>
        
        <view v-else class="members-list">
          <view 
            class="member-item" 
            v-for="member in organization.members" 
            :key="member.user_id"
          >
            <view class="member-avatar">
              <image 
                v-if="member.avatar" 
                :src="member.avatar" 
                class="avatar-img"
                mode="aspectFill"
              />
              <text v-else class="avatar-placeholder">{{ getAvatarText(member.name) }}</text>
            </view>
            
            <view class="member-info">
              <view class="member-name-row">
                <text class="member-name">{{ member.name }}</text>
                <view :class="['role-badge', 'role-' + member.role]">
                  {{ getRoleText(member.role) }}
                </view>
              </view>
              <text class="member-meta">学号: {{ member.student_id || '未填写' }}</text>
              <text class="member-meta">加入时间: {{ formatTime(member.joined_at) }}</text>
            </view>
          </view>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script>
import authUtil from '@/utils/auth.js'

export default {
  name: 'OrganizationDetail',
  data() {
    return {
      statusBarHeight: 0,
      scrollHeight: 0,
      orgId: '',
      organization: {},
      loading: true
    }
  },
  
  onLoad(options) {
    this.getStatusBarHeight()
    this.calculateScrollHeight()
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
    
    calculateScrollHeight() {
      const systemInfo = uni.getSystemInfoSync()
      // Total height - status bar - sticky header (approx 400rpx = 200px)
      this.scrollHeight = systemInfo.windowHeight - 200
    },
    
    canManage() {
      const role = this.organization.userRole
      return role === 'owner' || role === 'admin'
    },
    
    async loadDetail() {
      try {
        if (!authUtil.requireLogin()) {
          return
        }
        
        this.loading = true
        
        const token = authUtil.getToken()
        const result = await uniCloud.callFunction({
          name: 'organization-manage',
          data: {
            action: 'getOrganizationDetail',
            token,
            orgId: this.orgId
          }
        })
        
        this.loading = false
        
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
        this.loading = false
        uni.showToast({
          title: '加载失败',
          icon: 'none'
        })
      }
    },
    
    copyInviteCode() {
      if (!this.organization.qrcode_key) {
        uni.showToast({
          title: '邀请码不存在',
          icon: 'none'
        })
        return
      }
      
      uni.setClipboardData({
        data: this.organization.qrcode_key,
        success: () => {
          uni.showToast({
            title: '已复制邀请码',
            icon: 'success'
          })
        }
      })
    },
    
    getAvatarText(name) {
      if (!name) return '?'
      return name.substring(0, 1).toUpperCase()
    },
    
    getRoleText(role) {
      const roleMap = {
        'owner': '创建者',
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
  display: flex;
  flex-direction: column;
}

.status-bar {
  background: transparent;
}

/* Sticky Header */
.sticky-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: #ffffff;
  border-radius: 0 0 24rpx 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.org-header {
  padding: 48rpx 32rpx 32rpx;
  text-align: center;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 0 0 24rpx 24rpx;
}

.org-icon-large {
  display: block;
  font-size: 80rpx;
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
  line-height: 1.4;
}

.info-section {
  padding: 24rpx 32rpx;
  background: #ffffff;
}

.info-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}

.info-item:last-child {
  border-bottom: none;
}

.info-label {
  font-size: 26rpx;
  color: #666666;
}

.info-value {
  font-size: 26rpx;
  color: #1a1a1a;
  font-weight: 500;
}

/* Scrollable Content */
.scroll-content {
  flex: 1;
  padding: 24rpx;
}

/* Invite Code Section */
.invite-section {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #1a1a1a;
}

.member-count {
  font-size: 24rpx;
  color: #999999;
}

.invite-code-box {
  display: flex;
  align-items: center;
  gap: 16rpx;
  padding: 24rpx;
  background: linear-gradient(135deg, #f5f7fa 0%, #e8edf3 100%);
  border-radius: 12rpx;
  margin-bottom: 16rpx;
}

.invite-code {
  flex: 1;
  font-size: 48rpx;
  font-weight: 700;
  color: #667eea;
  letter-spacing: 8rpx;
  font-family: 'Courier New', monospace;
}

.btn-copy {
  padding: 16rpx 32rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
  border-radius: 8rpx;
  font-size: 28rpx;
  font-weight: 600;
  border: none;
  line-height: 1;
}

.btn-copy::after {
  border: none;
}

.invite-hint {
  display: block;
  font-size: 24rpx;
  color: #999999;
  line-height: 1.5;
}

/* Members Section */
.members-section {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 32rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

/* Loading State */
.loading-state {
  padding: 80rpx 0;
  text-align: center;
}

.loading-text {
  font-size: 28rpx;
  color: #999999;
}

/* Empty State */
.empty-state {
  padding: 80rpx 0;
  text-align: center;
}

.empty-icon {
  display: block;
  font-size: 96rpx;
  margin-bottom: 16rpx;
  opacity: 0.3;
}

.empty-text {
  display: block;
  font-size: 28rpx;
  color: #999999;
}

/* Members List */
.members-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.member-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background: #fafbfc;
  border-radius: 12rpx;
  transition: all 0.3s ease;
}

.member-item:active {
  background: #f0f2f5;
  transform: scale(0.98);
}

.member-avatar {
  width: 96rpx;
  height: 96rpx;
  margin-right: 24rpx;
  flex-shrink: 0;
}

.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: #e8edf3;
}

.avatar-placeholder {
  width: 100%;
  height: 100%;
  border-radius: 50%;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 40rpx;
  font-weight: 700;
}

.member-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;
  min-width: 0;
}

.member-name-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16rpx;
}

.member-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #1a1a1a;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member-meta {
  font-size: 24rpx;
  color: #999999;
  line-height: 1.4;
}

/* Role Badges */
.role-badge {
  padding: 8rpx 16rpx;
  border-radius: 24rpx;
  font-size: 22rpx;
  font-weight: 600;
  white-space: nowrap;
  flex-shrink: 0;
}

.role-owner {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
  box-shadow: 0 2rpx 8rpx rgba(102, 126, 234, 0.3);
}

.role-admin {
  background: #3b82f6;
  color: #ffffff;
}

.role-supervisor {
  background: #f59e0b;
  color: #ffffff;
}

.role-user {
  background: #e5e7eb;
  color: #6b7280;
}
</style>

