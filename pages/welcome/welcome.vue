<template>
  <view class="modern-page">
    <!-- 顶部背景区域 -->
    <view class="header-section">
      
      <!-- 今日概览卡片 -->
      <view class="overview-card" v-if="isLoggedIn">
        <view class="date-section">
          <text class="date-main">{{ todayDate }}</text>
          <text class="date-greeting">{{ greetingMessage }}</text>
        </view>
        
        <view class="stats-grid">
          <view class="stat-item">
            <view class="stat-icon-wrapper stat-icon-1">
              <text class="stat-icon">⏱</text>
            </view>
            <text class="stat-value">{{ formatMinutes(todayStats.totalMinutes) }}</text>
            <text class="stat-label">志愿时长</text>
          </view>
          
          <view class="stat-item">
            <view class="stat-icon-wrapper stat-icon-2">
              <text class="stat-icon">✓</text>
            </view>
            <text class="stat-value">{{ todayStats.recordCount }}</text>
            <text class="stat-label">打卡次数</text>
          </view>
          
          <view class="stat-item">
            <view class="stat-icon-wrapper stat-icon-3">
              <text class="stat-icon">★</text>
            </view>
            <text class="stat-value">{{ todayStats.orgCount }}</text>
            <text class="stat-label">参与组织</text>
          </view>
        </view>
      </view>
    </view>

    <!-- 功能区域 -->
    <view class="content-section">
      <!-- 未登录提示 -->
      <view class="action-card login-card" v-if="!isLoggedIn" @click="goToLogin">
        <view class="login-content">
          <view class="login-icon">🔐</view>
          <view class="login-text-wrapper">
            <text class="login-title">开始你的志愿之旅</text>
            <text class="login-subtitle">登录以记录每一刻美好时光</text>
          </view>
        </view>
        <text class="action-arrow">›</text>
      </view>

      <!-- 快捷功能卡片 -->
      <view class="quick-actions">
        <view class="action-card" @click="goToStatistics">
          <view class="action-left">
            <view class="action-icon gradient-1">
              <text class="icon-text">📊</text>
            </view>
            <view class="action-text">
              <text class="action-title">时长统计</text>
              <text class="action-desc" v-if="isLoggedIn && totalStats.totalMinutes > 0">累计 {{ formatTotalDuration() }} · {{ totalStats.totalDays }} 天</text>
              <text class="action-desc" v-else>查看你的志愿历程</text>
            </view>
          </view>
          <text class="action-arrow">›</text>
        </view>

        <view class="action-card" @click="goToOrganizations">
          <view class="action-left">
            <view class="action-icon gradient-2">
              <text class="icon-text">🏢</text>
            </view>
            <view class="action-text">
              <text class="action-title">我的组织</text>
              <text class="action-desc" v-if="isLoggedIn && totalStats.orgCount > 0">已加入 {{ totalStats.orgCount }} 个组织</text>
              <text class="action-desc" v-else>管理组织信息</text>
            </view>
          </view>
          <text class="action-arrow">›</text>
        </view>

        <view class="action-card" @click="goToNotifications">
          <view class="action-left">
            <view class="action-icon gradient-3">
              <text class="icon-text">🔔</text>
            </view>
            <view class="action-text">
              <text class="action-title">通知中心</text>
              <text class="action-desc" v-if="isLoggedIn && unreadCount > 0">{{ unreadCount }} 条未读消息</text>
              <text class="action-desc" v-else>查看最新动态</text>
            </view>
          </view>
          <text class="action-arrow">›</text>
        </view>

        <!-- 管理员入口 -->
        <view class="action-card" v-if="isAdmin" @click="goToAdmin">
          <view class="action-left">
            <view class="action-icon gradient-4">
              <text class="icon-text">⚙️</text>
            </view>
            <view class="action-text">
              <text class="action-title">管理员入口</text>
              <text class="action-desc">系统管理与配置</text>
            </view>
          </view>
          <text class="action-arrow">›</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import auth from '@/utils/auth.js'
import { authAPI } from '@/utils/request.js'

export default {
  data() {
    return {
      isLoggedIn: false,
      userProfile: null,
      todayStats: {
        totalMinutes: 0,
        recordCount: 0,
        orgCount: 0
      },
      isAdmin: false,
      isSupervisor: false,
      todayDate: '',
      greetingMessage: '',
      totalStats: {
        totalDays: 0,
        totalMinutes: 0,
        totalHours: 0,
        orgCount: 0
      },
      unreadCount: 0
    }
  },
  
  onLoad() {
    this.checkLoginStatus()
    this.updateTodayDate()
    this.updateGreeting()
  },
  
  onShow() {
    if (this.isLoggedIn) {
      this.loadUserData()
    }
  },
  
  methods: {
    formatMinutes(minutes) {
      if (minutes < 60) {
        return `${minutes}分钟`
      }
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      return mins > 0 ? `${hours}h ${mins}m` : `${hours}小时`
    },
    
    formatTotalDuration() {
      const minutes = this.totalStats.totalMinutes
      if (minutes === 0) return ''
      
      if (minutes < 60) {
        return `${minutes}分钟`
      }
      
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      
      if (mins === 0) {
        return `${hours}小时`
      }
      
      return `${hours}h${mins}分`
    },
    
    updateGreeting() {
      const hour = new Date().getHours()
      if (hour < 6) {
        this.greetingMessage = '夜深了，注意休息'
      } else if (hour < 9) {
        this.greetingMessage = '早安，新的一天加油'
      } else if (hour < 12) {
        this.greetingMessage = '上午好，保持活力'
      } else if (hour < 14) {
        this.greetingMessage = '中午好，记得休息'
      } else if (hour < 18) {
        this.greetingMessage = '下午好，继续加油'
      } else if (hour < 22) {
        this.greetingMessage = '晚上好，辛苦了'
      } else {
        this.greetingMessage = '夜深了，早点休息'
      }
    },
    
    async checkProfileCompletion() {
      try {
        const result = await authAPI.getUserInfo()
        if (result && result.profile) {
          if (!result.profile.is_completed) {
            uni.reLaunch({ url: '/pages/auth/profile-edit' })
          }
        } else {
          uni.reLaunch({ url: '/pages/auth/profile-edit' })
        }
      } catch (error) {
        console.error('[Welcome] 检查资料完成状态失败:', error)
      }
    },
    
    updateTodayDate() {
      const today = new Date()
      const month = today.getMonth() + 1
      const date = today.getDate()
      const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
      const weekday = weekdays[today.getDay()]
      this.todayDate = `${month}月${date}日 ${weekday}`
    },
    
    async checkLoginStatus() {
      try {
        this.isLoggedIn = auth.isLoggedIn()
        if (this.isLoggedIn) {
          await this.loadUserData()
        }
      } catch (error) {
        console.error('[Welcome] 检查登录状态失败:', error)
        this.isLoggedIn = false
      }
    },
    
    async loadUserData() {
      try {
        const result = await authAPI.getUserFullInfo()
        console.log('[Welcome] 用户完整信息:', result)
        
        if (result && result.profile) {
          this.userProfile = result.profile
          this.isAdmin = result.roles?.isAdmin || false
          this.isSupervisor = result.roles?.isSupervisor || false
          
          if (result.todayStats) {
            this.todayStats.totalMinutes = result.todayStats.totalMinutes || 0
            this.todayStats.recordCount = result.todayStats.recordCount || 0
            this.todayStats.orgCount = result.todayStats.orgCount || 0
            console.log('[Welcome] 今日统计:', this.todayStats)
          }
          
          if (result.stats) {
            this.totalStats.totalDays = result.stats.totalDays || 0
            this.totalStats.totalMinutes = result.stats.totalMinutes || 0
            this.totalStats.totalHours = result.stats.totalHours || 0
            this.totalStats.orgCount = result.stats.orgCount || 0
            console.log('[Welcome] 总体统计:', this.totalStats)
          }
          
          this.unreadCount = result.unreadCount || 0
        }
      } catch (error) {
        console.error('[Welcome] 加载用户数据失败:', error)
      }
    },
    
    goToLogin() {
      auth.toLogin()
    },
    
    goToProfile() {
      uni.navigateTo({ url: '/pages/auth/profile-edit?edit=true' })
    },
    
    goToStatistics() {
      uni.navigateTo({ url: '/pages/volunteer/statistics' })
    },
    
    goToOrganizations() {
      uni.navigateTo({ url: '/pages/organization/list' })
    },
    
    goToNotifications() {
      uni.navigateTo({ url: '/pages/notification/list' })
    },
    
    goToAdmin() {
      uni.navigateTo({ url: '/pages/admin/home' })
    }
  }
}
</script>

<style scoped>
page {
  background: #f5f7fa;
}

.modern-page {
  min-height: 100vh;
  background: #f5f7fa;
}

/* 头部区域 */
.header-section {
  padding: 30rpx 30rpx 20rpx;
}

/* 概览卡片 */
.overview-card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.04);
}

.date-section {
  padding-bottom: 20rpx;
  border-bottom: 1rpx solid #f0f0f0;
  margin-bottom: 20rpx;
}

.date-main {
  display: block;
  font-size: 36rpx;
  font-weight: 700;
  color: #1a1a1a;
  margin-bottom: 8rpx;
  letter-spacing: 0.5rpx;
}

.date-greeting {
  font-size: 24rpx;
  color: #999;
  font-weight: 400;
}

/* 统计数据网格 */
.stats-grid {
  display: flex;
  justify-content: space-between;
  gap: 16rpx;
}

.stat-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.stat-icon-wrapper {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 4rpx;
}

.stat-icon-1 {
  background: #fa9d3b;
}

.stat-icon-2 {
  background: #4facfe;
}

.stat-icon-3 {
  background: #f093fb;
}

.stat-icon {
  font-size: 32rpx;
  filter: brightness(0) invert(1);
}

.stat-value {
  font-size: 36rpx;
  font-weight: 700;
  color: #1a1a1a;
  line-height: 1;
}

.stat-label {
  font-size: 20rpx;
  color: #999;
  font-weight: 400;
}

/* 内容区域 */
.content-section {
  padding: 0 30rpx 40rpx;
}

/* 登录卡片 */
.login-card {
  background: #667eea;
  margin-bottom: 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.login-content {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.login-icon {
  font-size: 56rpx;
}

.login-text-wrapper {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.login-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #ffffff;
}

.login-subtitle {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
}

.login-card .action-arrow {
  color: rgba(255, 255, 255, 0.9);
}

/* 快捷操作 */
.quick-actions {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.action-card {
  background: #ffffff;
  border-radius: 16rpx;
  padding: 24rpx 28rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
  transition: all 0.3s ease;
}

.action-card:active {
  transform: scale(0.98);
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.08);
}

.action-left {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.action-icon {
  width: 72rpx;
  height: 72rpx;
  border-radius: 16rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 36rpx;
}

.gradient-1 {
  background: #fa9d3b;
}

.gradient-2 {
  background: #4facfe;
}

.gradient-3 {
  background: #f093fb;
}

.gradient-4 {
  background: #7bb32e;
}

.icon-text {
  filter: brightness(0) invert(1);
}

.action-text {
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}

.action-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.action-desc {
  font-size: 22rpx;
  color: #999;
}

.action-arrow {
  font-size: 48rpx;
  color: #d0d0d0;
  font-weight: 300;
}
</style>
