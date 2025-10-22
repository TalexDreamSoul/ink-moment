<template>
  <view class="home-page">
    <!-- 未登录状态 -->
    <view v-if="!isLoggedIn" class="login-prompt" @click="goToLogin">
      <view class="prompt-content">
        <text class="prompt-icon">👋</text>
        <text class="prompt-title">欢迎使用溯间砚时</text>
        <text class="prompt-desc">点击任意位置开始授权登录</text>
        <text class="prompt-tip">首次使用需要完善个人信息</text>
      </view>
    </view>
    
    <!-- 已登录但信息不完整 -->
    <view v-else-if="!userProfile || !userProfile.is_completed" class="profile-prompt" @click="goToProfile">
      <view class="prompt-content">
        <text class="prompt-icon">📝</text>
        <text class="prompt-title">完善个人信息</text>
        <text class="prompt-desc">请完善您的个人信息以开始使用</text>
        <text class="prompt-tip">点击任意位置进入信息填写</text>
      </view>
    </view>
    
    <!-- 已登录且信息完整 -->
    <view v-else class="main-content">
      <!-- 用户信息区域 -->
      <view class="user-info">
        <view class="welcome-text">
          <text class="welcome-title">欢迎回来</text>
          <text class="user-name">{{ userProfile.name }}</text>
        </view>
        <view class="user-avatar" @click="goToProfile">
          <image 
            :src="userProfile.meta?.avatar || '/static/userImg/user.png'" 
            class="avatar-img"
            mode="aspectFill"
          />
        </view>
      </view>
      
      <!-- 打卡状态区域 -->
      <view class="clock-section">
        <view class="clock-status">
          <text class="status-text">{{ clockStatus.text }}</text>
          <text class="status-time" v-if="currentRecord">{{ formatTime(currentRecord.clock_in_time) }}</text>
        </view>
        
        <!-- 工作时长显示 -->
        <view class="work-duration" v-if="currentRecord">
          <text class="duration-label">已工作时长</text>
          <text class="duration-time">{{ formatDuration(workDuration) }}</text>
        </view>
        
        <!-- 打卡按钮 -->
        <button 
          class="clock-btn" 
          :class="clockStatus.class"
          @click="handleClock"
          :disabled="clocking"
        >
          <text class="btn-text">{{ clockStatus.buttonText }}</text>
        </button>
      </view>
      
      <!-- 今日统计 -->
      <view class="today-stats">
        <view class="stat-item">
          <text class="stat-value">{{ todayStats.totalMinutes }}</text>
          <text class="stat-label">分钟</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ todayStats.recordCount }}</text>
          <text class="stat-label">次打卡</text>
        </view>
        <view class="stat-item">
          <text class="stat-value">{{ todayStats.orgCount }}</text>
          <text class="stat-label">个组织</text>
        </view>
      </view>
      
      <!-- 快捷功能 -->
      <view class="quick-actions">
        <view class="action-item" @click="goToRecords">
          <text class="action-icon">📊</text>
          <text class="action-text">打卡记录</text>
        </view>
        <view class="action-item" @click="goToStatistics">
          <text class="action-icon">📈</text>
          <text class="action-text">时长统计</text>
        </view>
        <view class="action-item" @click="goToOrganizations">
          <text class="action-icon">🏢</text>
          <text class="action-text">我的组织</text>
        </view>
        <view class="action-item" @click="goToProfile">
          <text class="action-icon">👤</text>
          <text class="action-text">个人中心</text>
        </view>
      </view>
      
      <!-- 管理员入口 -->
      <view v-if="isAdmin" class="admin-section">
        <button class="admin-btn" @click="goToAdmin">
          <text class="admin-text">🔧 管理员入口</text>
        </button>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  data() {
    return {
      isLoggedIn: false,
      userProfile: null,
      currentRecord: null,
      workDuration: 0,
      clocking: false,
      todayStats: {
        totalMinutes: 0,
        recordCount: 0,
        orgCount: 0
      },
      isAdmin: false,
      durationTimer: null
    }
  },
  
  computed: {
    clockStatus() {
      if (!this.currentRecord) {
        return {
          text: '今日未打卡',
          buttonText: '上班打卡',
          class: 'clock-in'
        }
      } else if (this.currentRecord.clock_out_time) {
        return {
          text: '今日已下班',
          buttonText: '上班打卡',
          class: 'clock-in'
        }
      } else {
        return {
          text: '工作中',
          buttonText: '下班打卡',
          class: 'clock-out'
        }
      }
    }
  },
  
  onLoad() {
    this.checkSystemStatus()
  },
  
  onShow() {
    if (this.isLoggedIn) {
      this.loadUserData()
    }
  },
  
  onUnload() {
    if (this.durationTimer) {
      clearInterval(this.durationTimer)
    }
  },
  
  methods: {
    async checkSystemStatus() {
      try {
        // 检查系统是否有超级管理员
        const systemResult = await uniCloud.callFunction({
          name: 'system-init',
          data: {
            action: 'checkSuperAdmin'
          }
        })
        
        if (systemResult.result.code === 0 && !systemResult.result.data.hasSuperAdmin) {
          // 没有超级管理员，跳转到初始化页面
          uni.reLaunch({
            url: '/pages/admin/init-super-admin'
          })
          return
        }
        
        // 有超级管理员，继续检查登录状态
        await this.checkLoginStatus()
      } catch (error) {
        console.error('checkSystemStatus error:', error)
        // 系统检查失败，继续检查登录状态
        await this.checkLoginStatus()
      }
    },
    
    async checkLoginStatus() {
      try {
        const uid = uni.getStorageSync('uid')
        const token = uni.getStorageSync('token')
        
        if (uid && token) {
          this.isLoggedIn = true
          await this.loadUserData()
        } else {
          this.isLoggedIn = false
        }
      } catch (error) {
        console.error('checkLoginStatus error:', error)
        this.isLoggedIn = false
      }
    },
    
    async loadUserData() {
      try {
        // 加载用户信息
        const profileResult = await uniCloud.callFunction({
          name: 'user-auth-simple',
          data: {
            action: 'getUserProfile'
          }
        })
        
        if (profileResult.result.code === 0) {
          this.userProfile = profileResult.result.data
        }
        
        // 检查管理员权限
        await this.checkAdminStatus()
        
        // 加载今日打卡记录
        await this.loadTodayRecords()
        
        // 加载今日统计
        await this.loadTodayStats()
        
        // 开始工作时长计时
        this.startDurationTimer()
      } catch (error) {
        console.error('loadUserData error:', error)
      }
    },
    
    async checkAdminStatus() {
      try {
        const db = uniCloud.database()
        const result = await db.collection('system_roles')
          .where({
            user_id: uni.getStorageSync('uid')
          })
          .get()
        
        this.isAdmin = result.data.length > 0
      } catch (error) {
        console.error('checkAdminStatus error:', error)
      }
    },
    
    async loadTodayRecords() {
      try {
        const db = uniCloud.database()
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        const tomorrow = new Date(today)
        tomorrow.setDate(tomorrow.getDate() + 1)
        
        const result = await db.collection('work_records')
          .where({
            user_id: uni.getStorageSync('uid'),
            clock_in_time: db.command.gte(today).and(db.command.lt(tomorrow))
          })
          .orderBy('clock_in_time', 'desc')
          .get()
        
        if (result.data.length > 0) {
          this.currentRecord = result.data[0]
          if (!this.currentRecord.clock_out_time) {
            this.calculateWorkDuration()
          }
        }
      } catch (error) {
        console.error('loadTodayRecords error:', error)
      }
    },
    
    async loadTodayStats() {
      try {
        const db = uniCloud.database()
        const today = new Date()
        today.setHours(0, 0, 0, 0)
        
        // 加载今日统计
        const statsResult = await db.collection('attendance_statistics')
          .where({
            user_id: uni.getStorageSync('uid'),
            date: today
          })
          .get()
        
        if (statsResult.data.length > 0) {
          this.todayStats.totalMinutes = statsResult.data[0].total_minutes || 0
          this.todayStats.recordCount = statsResult.data[0].record_count || 0
        }
        
        // 加载组织数量
        const orgResult = await db.collection('organization_members')
          .where({
            user_id: uni.getStorageSync('uid'),
            status: 'active'
          })
          .get()
        
        this.todayStats.orgCount = orgResult.data.length
      } catch (error) {
        console.error('loadTodayStats error:', error)
      }
    },
    
    startDurationTimer() {
      if (this.durationTimer) {
        clearInterval(this.durationTimer)
      }
      
      if (this.currentRecord && !this.currentRecord.clock_out_time) {
        this.durationTimer = setInterval(() => {
          this.calculateWorkDuration()
        }, 1000)
      }
    },
    
    calculateWorkDuration() {
      if (this.currentRecord && !this.currentRecord.clock_out_time) {
        const now = new Date().getTime()
        const startTime = new Date(this.currentRecord.clock_in_time).getTime()
        const diffSeconds = Math.floor((now - startTime) / 1000)
        const minutes = Math.floor(diffSeconds / 60)
        const seconds = diffSeconds % 60
        this.workDuration = seconds >= 30 ? minutes + 1 : minutes
      }
    },
    
    async handleClock() {
      try {
        this.clocking = true
        
        if (!this.currentRecord) {
          // 上班打卡
          await this.clockIn()
        } else if (!this.currentRecord.clock_out_time) {
          // 下班打卡
          await this.clockOut()
        } else {
          // 重新上班打卡
          await this.clockIn()
        }
      } catch (error) {
        console.error('handleClock error:', error)
        uni.showToast({
          title: error.message || '打卡失败',
          icon: 'none'
        })
      } finally {
        this.clocking = false
      }
    },
    
    async clockIn() {
      try {
        // 获取当前位置
        const location = await this.getCurrentLocation()
        
        const result = await uniCloud.callFunction({
          name: 'work-clock',
          data: {
            action: 'clockIn',
            location: location
          }
        })
        
        if (result.result.code === 0) {
          uni.showToast({
            title: '上班打卡成功',
            icon: 'success'
          })
          
          // 重新加载数据
          await this.loadTodayRecords()
          this.startDurationTimer()
        } else {
          throw new Error(result.result.message)
        }
      } catch (error) {
        throw error
      }
    },
    
    async clockOut() {
      try {
        // 获取当前位置
        const location = await this.getCurrentLocation()
        
        const result = await uniCloud.callFunction({
          name: 'work-clock',
          data: {
            action: 'clockOut',
            recordId: this.currentRecord._id,
            location: location
          }
        })
        
        if (result.result.code === 0) {
          uni.showToast({
            title: '下班打卡成功',
            icon: 'success'
          })
          
          // 重新加载数据
          await this.loadTodayRecords()
          await this.loadTodayStats()
          if (this.durationTimer) {
            clearInterval(this.durationTimer)
            this.durationTimer = null
          }
        } else {
          throw new Error(result.result.message)
        }
      } catch (error) {
        throw error
      }
    },
    
    getCurrentLocation() {
      return new Promise((resolve, reject) => {
        uni.getLocation({
          type: 'gcj02',
          geocode: true,
          success: (res) => {
            resolve({
              latitude: res.latitude,
              longitude: res.longitude,
              address: res.address
            })
          },
          fail: reject
        })
      })
    },
    
    formatTime(timestamp) {
      const date = new Date(timestamp)
      return `${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}`
    },
    
    formatDuration(minutes) {
      const hours = Math.floor(minutes / 60)
      const mins = minutes % 60
      return `${hours}小时${mins}分钟`
    },
    
    goToLogin() {
      uni.navigateTo({
        url: '/pages/auth/login'
      })
    },
    
    goToProfile() {
      uni.navigateTo({
        url: '/pages/auth/profile-edit?edit=true'
      })
    },
    
    goToRecords() {
      uni.navigateTo({
        url: '/pages/work/records'
      })
    },
    
    goToStatistics() {
      uni.navigateTo({
        url: '/pages/volunteer/statistics'
      })
    },
    
    goToOrganizations() {
      uni.navigateTo({
        url: '/pages/organization/list'
      })
    },
    
    goToAdmin() {
      uni.navigateTo({
        url: '/pages/admin/home'
      })
    }
  }
}
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 40rpx 30rpx;
}

.login-prompt, .profile-prompt {
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40rpx;
}

.prompt-content {
  text-align: center;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 30rpx;
  padding: 80rpx 60rpx;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.1);
}

.prompt-icon {
  display: block;
  font-size: 120rpx;
  margin-bottom: 40rpx;
}

.prompt-title {
  display: block;
  font-size: 48rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
}

.prompt-desc {
  display: block;
  font-size: 32rpx;
  color: #666;
  margin-bottom: 20rpx;
}

.prompt-tip {
  display: block;
  font-size: 26rpx;
  color: #999;
}

.main-content {
  min-height: 100vh;
}

.user-info {
  display: flex;
  justify-content: space-between;
  align-items: center;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20rpx;
  padding: 40rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.1);
}

.welcome-text {
  flex: 1;
}

.welcome-title {
  display: block;
  font-size: 28rpx;
  color: #666;
  margin-bottom: 10rpx;
}

.user-name {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
}

.user-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  overflow: hidden;
  border: 4rpx solid #fff;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.1);
}

.avatar-img {
  width: 100%;
  height: 100%;
}

.clock-section {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20rpx;
  padding: 40rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.1);
  text-align: center;
}

.clock-status {
  margin-bottom: 30rpx;
}

.status-text {
  display: block;
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 10rpx;
}

.status-time {
  display: block;
  font-size: 28rpx;
  color: #666;
}

.work-duration {
  margin-bottom: 40rpx;
  padding: 20rpx;
  background: #f8f9fa;
  border-radius: 15rpx;
}

.duration-label {
  display: block;
  font-size: 24rpx;
  color: #666;
  margin-bottom: 10rpx;
}

.duration-time {
  display: block;
  font-size: 48rpx;
  font-weight: bold;
  color: #667eea;
}

.clock-btn {
  width: 100%;
  height: 88rpx;
  border: none;
  border-radius: 44rpx;
  font-size: 32rpx;
  font-weight: bold;
  color: #fff;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.2);
}

.clock-btn.clock-in {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.clock-btn.clock-out {
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
}

.clock-btn:disabled {
  background: #ccc;
  box-shadow: none;
}

.today-stats {
  display: flex;
  background: rgba(255, 255, 255, 0.95);
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.1);
}

.stat-item {
  flex: 1;
  text-align: center;
}

.stat-value {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #667eea;
  margin-bottom: 10rpx;
}

.stat-label {
  display: block;
  font-size: 24rpx;
  color: #666;
}

.quick-actions {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 20rpx;
  margin-bottom: 30rpx;
}

.action-item {
  background: rgba(255, 255, 255, 0.95);
  border-radius: 15rpx;
  padding: 30rpx 20rpx;
  text-align: center;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.1);
}

.action-icon {
  display: block;
  font-size: 40rpx;
  margin-bottom: 15rpx;
}

.action-text {
  display: block;
  font-size: 26rpx;
  color: #333;
}

.admin-section {
  margin-top: 30rpx;
}

.admin-btn {
  width: 100%;
  height: 80rpx;
  background: rgba(255, 255, 255, 0.95);
  border: 2rpx solid #667eea;
  border-radius: 40rpx;
  color: #667eea;
  font-size: 28rpx;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
}
</style>
