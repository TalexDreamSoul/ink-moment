
<template>
  <view class="page">
    <!-- 未登录状态 -->
    <view v-if="!isLoggedIn" class="page-content">
      <view class="empty-state">
        <text class="empty-icon">🔐</text>
        <text class="empty-title">欢迎使用溯间砚时</text>
        <text class="empty-desc">点击下方按钮开始授权登录</text>
        <button class="btn btn-primary btn-large" @click="goToLogin">开始登录</button>
      </view>
    </view>
    
    <!-- 已登录但信息不完整 -->
    <view v-else-if="!userProfile || !userProfile.is_completed" class="page-content">
      <view class="empty-state">
        <text class="empty-icon">📝</text>
        <text class="empty-title">完善个人信息</text>
        <text class="empty-desc">首次使用需要填写基本信息</text>
        <button class="btn btn-primary btn-large" @click="goToProfile">填写信息</button>
      </view>
    </view>
    
    <!-- 已登录且信息完整 -->
    <view v-else class="page-content">
      <!-- 欢迎信息 -->
      <view class="card">
        <view class="card-header">
          <text class="card-title">欢迎回来，{{ userProfile.name }}</text>
          <text class="card-desc">今天也要加油哦！</text>
        </view>
      </view>
      
      <!-- 打卡状态区域 -->
      <view class="card">
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
          class="btn btn-large" 
          :class="clockStatus.class === 'clock-in' ? 'btn-primary' : 'btn-error'"
          @click="handleClock"
          :disabled="clocking"
        >
          {{ clockStatus.buttonText }}
        </button>
      </view>
      
      <!-- 今日统计 -->
      <view class="stats-card">
        <view class="stats-grid">
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
      </view>
      
      <!-- 快捷功能 -->
      <view class="action-grid">
        <view class="action-item" @click="goToRecords">
          <text class="action-icon">📊</text>
          <text class="action-title">打卡记录</text>
          <text class="action-desc">查看历史记录</text>
        </view>
        <view class="action-item" @click="goToStatistics">
          <text class="action-icon">📈</text>
          <text class="action-title">时长统计</text>
          <text class="action-desc">数据分析</text>
        </view>
        <view class="action-item" @click="goToOrganizations">
          <text class="action-icon">🏢</text>
          <text class="action-title">我的组织</text>
          <text class="action-desc">组织管理</text>
        </view>
        <view class="action-item" @click="goToProfile">
          <text class="action-icon">👤</text>
          <text class="action-title">个人中心</text>
          <text class="action-desc">个人信息</text>
        </view>
      </view>
      
      <!-- 管理员入口 -->
      <view v-if="isAdmin" class="card">
        <button class="btn btn-secondary btn-large" @click="goToAdmin">
          🔧 管理员入口
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
    // 直接检查登录状态，不进行系统检查
    this.checkLoginStatus()
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
      } catch (error) {
        console.error('checkSystemStatus error:', error)
        // 系统检查失败，继续正常流程
      }
    },
    
    async checkLoginStatus() {
      try {
        const uid = uni.getStorageSync('uid')
        const token = uni.getStorageSync('token')
        const isLoggedIn = uni.getStorageSync('isLoggedIn')
        
        if (uid && token && isLoggedIn) {
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
        // 简化版本，先检查本地存储
        const userProfile = uni.getStorageSync('userProfile')
        
        if (userProfile && userProfile.meta && userProfile.meta.init) {
          this.userProfile = {
            name: userProfile.name || '用户',
            avatar: userProfile.meta?.avatar || '/static/logo.png',
            is_completed: userProfile.is_completed || false
          }
        } else {
          // 需要初始化用户信息，跳转到信息填写页面
          uni.reLaunch({
            url: '/pages/auth/profile-edit'
          })
          return
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
        // 出错时跳转到信息填写页面
        uni.reLaunch({
          url: '/pages/auth/profile-edit'
        })
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
@import url('@/common/styles/common.css');

/* 打卡状态样式 */
.clock-status {
  text-align: center;
  margin-bottom: 32rpx;
}

.status-text {
  display: block;
  font-size: 32rpx;
  font-weight: 600;
  color: var(--text-primary);
  margin-bottom: 8rpx;
}

.status-time {
  display: block;
  font-size: 28rpx;
  color: var(--text-secondary);
}

.work-duration {
  margin-bottom: 32rpx;
  padding: 24rpx;
  background: var(--bg-secondary);
  border-radius: 12rpx;
  text-align: center;
}

.duration-label {
  display: block;
  font-size: 24rpx;
  color: var(--text-secondary);
  margin-bottom: 8rpx;
}

.duration-time {
  display: block;
  font-size: 48rpx;
  font-weight: 600;
  color: var(--primary-color);
}
</style>
