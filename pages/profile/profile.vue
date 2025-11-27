<template>
  <view class="page">
    <!-- 未登录状态 -->
    <view v-if="!isLoggedIn" class="header-section" @click="goToLogin">
      <view class="user-info-row">
        <view class="avatar-box">
          <text class="avatar-icon">👤</text>
        </view>
        <view class="info-box">
          <text class="user-name">点击登录</text>
          <text class="user-desc">登录后使用更多功能</text>
        </view>
        <icon-arrow :size="16" />
      </view>
    </view>
    
    <!-- 已登录状态 -->
    <view v-else class="header-section" @click="goToProfileEdit">
      <view class="user-info-row">
        <view class="avatar-box">
          <!-- 优先显示微信头像 -->
          <image 
            v-if="userProfile.avatar_url" 
            :src="userProfile.avatar_url" 
            mode="aspectFill"
            class="avatar-img"
          />
          <!-- 备选方案：显示昵称首字母 -->
          <text class="avatar-text" v-else-if="userProfile.name">{{ userProfile.name.charAt(0) }}</text>
          <!-- 兜底显示默认图标 -->
          <text class="avatar-icon" v-else>👤</text>
        </view>
        <view class="info-box">
          <view class="name-row">
            <text class="user-name">{{ userProfile.name || '未设置昵称' }}</text>
            <text v-if="isAdmin" class="role-tag admin">管理员</text>
            <text v-if="isSupervisor" class="role-tag supervisor">督导</text>
          </view>
          <text class="user-desc">工号/学号: {{ userProfile.student_id || '未填写' }}</text>
        </view>
        <view class="qr-code">
          <text class="qr-icon">🏁</text>
          <icon-arrow :size="16" />
        </view>
      </view>
    </view>
    
    <!-- 统计数据 (类似微信支付入口那样的单独一行) -->
    <view class="cell-group" v-if="isLoggedIn">
      <view class="cell" @click="goToStatistics">
        <view class="cell-icon" style="background-color: #fa9d3b;">📊</view>
        <text class="cell-text">数据统计</text>
        <view class="cell-right">
          <text class="cell-desc">{{ formatHours(userStats.totalHours) }}</text>
          <icon-arrow :size="16" />
        </view>
      </view>
    </view>

    <!-- 功能菜单 -->
    <view class="cell-group">
      <view class="cell" @click="goToOrganizations">
        <view class="cell-icon" style="background-color: #2782d7;">🏢</view>
        <text class="cell-text">我的组织</text>
        <view class="cell-right">
          <text class="cell-desc" v-if="userStats.orgCount > 0">{{ userStats.orgCount }}个</text>
          <icon-arrow :size="16" />
        </view>
      </view>
      <view class="cell" @click="goToNotifications">
        <view class="cell-icon" style="background-color: #fa5151;">🔔</view>
        <text class="cell-text">通知中心</text>
        <view class="cell-right">
          <view class="badge" v-if="unreadCount > 0">{{ unreadCount }}</view>
          <icon-arrow :size="16" />
        </view>
      </view>
    </view>
    
    <view class="cell-group">
      <view class="cell" @click="goToFeedback">
        <view class="cell-icon" style="background-color: #10aeff;">💬</view>
        <text class="cell-text">意见反馈</text>
        <view class="cell-right">
          <text class="arrow">></text>
        </view>
      </view>
    </view>
    
    <!-- 管理员功能 -->
    <view v-if="isAdmin" class="cell-group">
      <view class="cell" @click="goToAdmin">
        <view class="cell-icon" style="background-color: #7bb32e;">🔧</view>
        <text class="cell-text">管理后台</text>
        <view class="cell-right">
          <text class="arrow">></text>
        </view>
      </view>
      <view class="cell" @click="goToSupervisorAudit">
        <view class="cell-icon" style="background-color: #ebcd2d;">👥</view>
        <text class="cell-text">督导审核</text>
        <view class="cell-right">
          <text class="arrow">></text>
        </view>
      </view>
    </view>
    
    <!-- 设置 -->
    <view class="cell-group">
      <view class="cell" @click="handleLogout">
        <view class="cell-icon" style="background-color: #ffffff; color: #333;">⚙️</view>
        <text class="cell-text">设置与退出</text>
        <view class="cell-right">
          <text class="arrow">></text>
        </view>
      </view>
    </view>

  </view>
</template>

<script>
import auth from '@/utils/auth.js'
import { authAPI } from '@/utils/request.js'
import { formatHours, minutesToHours } from '@/utils/duration.js'
import IconArrow from '@/components/icon-arrow/icon-arrow.vue'

export default {
  components: {
    IconArrow
  },
  data() {
    return {
      isLoggedIn: false,
      userProfile: {},
      isAdmin: false,
      isSupervisor: false,
      userStats: {
        totalDays: 0,
        totalHours: 0,
        orgCount: 0
      },
      unreadCount: 0
    }
  },
  
  onLoad() {
    this.checkLoginStatus()
  },
  
  onShow() {
    this.checkLoginStatus()
  },
  
  async onPullDownRefresh() {
    try {
      // 重新加载用户信息
      await this.checkLoginStatus()
      
      uni.showToast({
        title: '刷新成功',
        icon: 'success',
        duration: 1500
      })
    } catch (error) {
      console.error('[Profile] 刷新失败:', error)
      uni.showToast({
        title: '刷新失败',
        icon: 'none'
      })
    } finally {
      // 停止下拉刷新动画
      uni.stopPullDownRefresh()
    }
  },
  
  methods: {
    async checkLoginStatus() {
      try {
        this.isLoggedIn = auth.isLoggedIn()
        if (this.isLoggedIn) {
          await this.loadUserData()
        } else {
          // Reset data
          this.userProfile = {}
          this.isAdmin = false
          this.isSupervisor = false
          this.userStats = { totalDays: 0, totalHours: 0, orgCount: 0 }
          this.unreadCount = 0
        }
      } catch (error) {
        console.error('[Profile] 检查登录状态失败:', error)
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
          
          if (result.stats) {
            this.userStats.totalDays = result.stats.totalDays || 0
            this.userStats.totalHours = result.stats.totalMinutes || 0  // 使用totalMinutes，前端格式化
            this.userStats.orgCount = result.stats.orgCount || 0
          }
          
          this.unreadCount = result.unreadCount || 0
        }
      } catch (error) {
        console.error('[Profile] 加载用户数据失败:', error)
      }
    },
    
    goToLogin() {
      uni.navigateTo({ url: '/pages/auth/login' })
    },
    
    goToProfileEdit() {
      uni.navigateTo({ url: '/pages/auth/profile-edit?edit=true' })
    },
    
    goToOrganizations() {
      uni.navigateTo({ url: '/pages/organization/list' })
    },
    
    goToStatistics() {
      uni.navigateTo({ url: '/pages/volunteer/statistics' })
    },
    
    goToNotifications() {
      uni.navigateTo({ url: '/pages/notification/list' })
    },
    
    goToFeedback() {
      uni.navigateTo({ url: '/pages/feedback/create' })
    },
    
    goToAdmin() {
      uni.navigateTo({ url: '/pages/admin/home' })
    },
    
    goToSupervisorAudit() {
      uni.navigateTo({ url: '/pages/supervisor/audit-list' })
    },
    
    handleLogout() {
      uni.showActionSheet({
        itemList: ['退出登录'],
        itemColor: '#fa5151',
        success: (res) => {
          if (res.tapIndex === 0) {
            auth.logout(true).catch(console.error)
          }
        }
      })
    },
    
    formatHours(minutes) {
      return formatHours(minutes)
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

/* Header Section */
.header-section {
  background: #FFFFFF;
  border-bottom: 2rpx solid #EEEEEE;
  padding: 60rpx 40rpx 80rpx;
  margin-bottom: 20rpx;
  display: flex;
  align-items: center;
}

.user-info-row {
  display: flex;
  align-items: center;
  width: 100%;
}

.avatar-box {
  width: 128rpx;
  height: 128rpx;
  border-radius: 50%;
  background-color: #F5F5F5;
  border: 2rpx solid #DDDDDD;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 32rpx;
  overflow: hidden;
}

.avatar-text {
  font-size: 48rpx;
  font-weight: 600;
  color: #333333;
}

.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}


.avatar-icon {
  font-size: 64rpx;
  color: #999999;
}

.info-box {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
}

.name-row {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
}

.user-name {
  font-size: 40rpx;
  font-weight: 600;
  color: #000000;
  margin-right: 16rpx;
}

.role-tag {
  font-size: 20rpx;
  padding: 4rpx 10rpx;
  border-radius: 4rpx;
  margin-right: 8rpx;
  border: 1rpx solid;
}

.role-tag.admin {
  background-color: #FFFFFF;
  color: #000000;
  border-color: #000000;
}

.role-tag.supervisor {
  background-color: #FFFFFF;
  color: #333333;
  border-color: #333333;
}

.user-desc {
  font-size: 28rpx;
  color: #666666;
}

.qr-code {
  display: flex;
  align-items: center;
}

.qr-icon {
  font-size: 32rpx;
  color: #333333;
  margin-right: 20rpx;
}

/* Cell Group */
.cell-group {
  background-color: #ffffff;
  margin-bottom: 20rpx;
  border-radius: 12rpx;
  overflow: hidden;
  box-shadow: 0 2rpx 12rpx rgba(0, 0, 0, 0.04);
}

.cell {
  display: flex;
  align-items: center;
  padding: 32rpx 40rpx;
  position: relative;
  transition: background-color 0.2s ease;
}

.cell:active {
  background-color: #f2f2f2;
}

.cell:not(:last-child)::after {
  content: '';
  position: absolute;
  left: 112rpx;
  bottom: 0;
  right: 0;
  height: 1rpx;
  background-color: #f0f0f0;
}

.cell-icon {
  width: 48rpx;
  height: 48rpx;
  border-radius: 10rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 32rpx;
  font-size: 28rpx;
  color: #ffffff;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.1);
}

.cell-text {
  flex: 1;
  font-size: 32rpx;
  color: #111;
}

.cell-right {
  display: flex;
  align-items: center;
}

.cell-desc {
  font-size: 28rpx;
  color: #7f7f7f;
  margin-right: 12rpx;
}

.badge {
  background-color: #fa5151;
  color: #ffffff;
  font-size: 24rpx;
  padding: 0 12rpx;
  border-radius: 18rpx;
  line-height: 36rpx;
  margin-right: 12rpx;
}

.arrow {
  font-size: 28rpx;
  color: #b2b2b2;
  font-family: monospace;
}
</style>
