<template>
  <view class="wechat-page">
    <!-- 状态栏占位 -->
    <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
    
    <!-- 今日概览 (类似微信朋友圈顶部的封面图区域，但这里做成简单的白色面板) -->
    <view class="status-card" v-if="isLoggedIn">
      <view class="date-row">
        <text class="date-text">{{ todayDate }}</text>
        <text class="greeting-text">今天也要加油哦</text>
      </view>
      <view class="stats-row">
        <view class="stat-box">
          <text class="stat-num">{{ todayStats.totalMinutes }}</text>
          <text class="stat-label">今日时长(分)</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-box">
          <text class="stat-num">{{ todayStats.recordCount }}</text>
          <text class="stat-label">打卡次数</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-box">
          <text class="stat-num">{{ todayStats.orgCount }}</text>
          <text class="stat-label">参与组织</text>
        </view>
      </view>
    </view>

    <!-- 未登录提示 -->
    <view class="wechat-cell-group" v-if="!isLoggedIn">
      <view class="wechat-cell" @click="goToLogin">
        <view class="wechat-cell-icon" style="background-color: #667eea;">🔐</view>
        <text class="wechat-cell-text">登录以开始使用</text>
        <view class="wechat-cell-right">
          <text class="wechat-arrow">></text>
        </view>
      </view>
    </view>

    <!-- 快捷功能列表 -->
    <view class="wechat-cell-group">
      <view class="wechat-cell" @click="goToStatistics">
        <view class="wechat-cell-icon" style="background-color: #fa9d3b;">📈</view>
        <text class="wechat-cell-text">时长统计</text>
        <view class="wechat-cell-right">
          <text class="wechat-arrow">></text>
        </view>
      </view>
      <view class="wechat-cell" @click="goToOrganizations">
        <view class="wechat-cell-icon" style="background-color: #2782d7;">🏢</view>
        <text class="wechat-cell-text">我的组织</text>
        <view class="wechat-cell-right">
          <text class="wechat-arrow">></text>
        </view>
      </view>
    </view>

    <view class="wechat-cell-group">
      <view class="wechat-cell" @click="goToNotifications">
        <view class="wechat-cell-icon" style="background-color: #fa5151;">🔔</view>
        <text class="wechat-cell-text">通知中心</text>
        <view class="wechat-cell-right">
          <text class="wechat-arrow">></text>
        </view>
      </view>
    </view>

    <!-- 管理员入口 -->
    <view class="wechat-cell-group" v-if="isAdmin">
      <view class="wechat-cell" @click="goToAdmin">
        <view class="wechat-cell-icon" style="background-color: #7bb32e;">🔧</view>
        <text class="wechat-cell-text">管理员入口</text>
        <view class="wechat-cell-right">
          <text class="wechat-arrow">></text>
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
      statusBarHeight: 0
    }
  },
  
  onLoad() {
    this.getStatusBarHeight()
    this.checkLoginStatus()
    this.updateTodayDate()
  },
  
  onShow() {
    if (this.isLoggedIn) {
      this.checkProfileCompletion()
      this.loadUserData()
    }
  },
  
  methods: {
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
    getStatusBarHeight() {
      const systemInfo = uni.getSystemInfoSync()
      this.statusBarHeight = systemInfo.statusBarHeight || 0
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
        if (result && result.profile) {
          this.userProfile = result.profile
          this.isAdmin = result.roles?.isAdmin || false
          this.isSupervisor = result.roles?.isSupervisor || false
          
          if (result.todayStats) {
            this.todayStats.totalMinutes = result.todayStats.totalMinutes || 0
            this.todayStats.recordCount = result.todayStats.recordCount || 0
            this.todayStats.orgCount = result.todayStats.orgCount || 0
          }
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
/* #ifndef MP-WEIXIN */
@import url('@/common/styles/common.css');
/* #endif */

.status-bar {
  background-color: #ffffff;
}

/* Status Card */
.status-card {
  background-color: #ffffff;
  padding: 40rpx;
  margin-bottom: 20rpx;
}

.date-row {
  margin-bottom: 40rpx;
}

.date-text {
  font-size: 48rpx;
  font-weight: 600;
  color: #111;
  margin-right: 20rpx;
}

.greeting-text {
  font-size: 28rpx;
  color: #7f7f7f;
}

.stats-row {
  display: flex;
  align-items: center;
  justify-content: space-around;
}

.stat-box {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-num {
  font-size: 40rpx;
  font-weight: 600;
  color: #111;
  margin-bottom: 8rpx;
}

.stat-label {
  font-size: 24rpx;
  color: #7f7f7f;
}

.stat-divider {
  width: 1rpx;
  height: 40rpx;
  background-color: #f0f0f0;
}
</style>
