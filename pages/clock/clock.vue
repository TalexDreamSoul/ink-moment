<template>
  <view class="wechat-page">
    <!-- 背景图片 -->
    <image class="page-bg" src="/static/background/image.png" mode="aspectFill" />
    
    <view class="content-wrapper">
      <!-- 状态栏占位 -->
      <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
      
      <!-- 未登录状态 -->
      <view v-if="!isLoggedIn" class="wechat-cell-group glass-effect">
        <view class="wechat-cell" @click="goToLogin">
          <view class="wechat-cell-icon" style="background-color: #667eea;">🔐</view>
          <text class="wechat-cell-text">登录以使用打卡</text>
          <view class="wechat-cell-right">
            <text class="wechat-arrow">></text>
          </view>
        </view>
      </view>
      
      <!-- 已登录但信息不完整 -->
      <view v-else-if="!userProfile || !userProfile.is_completed" class="wechat-cell-group glass-effect">
        <view class="wechat-cell" @click="goToProfile">
          <view class="wechat-cell-icon" style="background-color: #fa9d3b;">📝</view>
          <text class="wechat-cell-text">完善个人信息</text>
          <view class="wechat-cell-right">
            <text class="wechat-arrow">></text>
          </view>
        </view>
      </view>
      
      <!-- 已登录且信息完整 -->
      <view v-else>
        <!-- 打卡区域 -->
        <view class="clock-section glass-effect">
          <view class="clock-circle" :class="clockStatus.class" @click="handleClock">
            <text class="clock-time">{{ currentTime }}</text>
            <text class="clock-action">{{ clockStatus.buttonText }}</text>
          </view>
          <view class="clock-tips" v-if="currentRecord && !currentRecord.clock_out_time">
            <text>已工作: {{ formatDuration(workDuration) }}</text>
          </view>
          <view class="clock-tips" v-else>
            <text>{{ todayDate }}</text>
          </view>
        </view>
        
        <!-- 最近记录 -->
        <view class="wechat-cell-group glass-effect">
          <view class="wechat-cell">
            <text class="wechat-cell-text" style="font-weight: 600;">最近记录</text>
          </view>
          <view class="wechat-cell" v-for="record in recentRecords" :key="record._id">
            <view class="record-content">
              <view class="record-main">
                <text class="record-date">{{ formatRecordDate(record.clock_in_time) }}</text>
                <text class="record-time">
                  {{ formatTime(record.clock_in_time) }} - {{ record.clock_out_time ? formatTime(record.clock_out_time) : '进行中' }}
                </text>
              </view>
              <text class="record-duration">
                {{ record.clock_out_time ? formatDuration(record.duration_minutes) : '计算中...' }}
              </text>
            </view>
          </view>
          <view class="wechat-cell" v-if="!recentRecords || recentRecords.length === 0">
            <text class="wechat-cell-text" style="color: #999; text-align: center;">暂无记录</text>
          </view>
        </view>
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
      recentRecords: [],
      durationTimer: null,
      currentTimeTimer: null,
      todayDate: '',
      currentTime: '',
      statusBarHeight: 0,
      organizations: [],
      selectedOrg: null
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
    this.getStatusBarHeight()
    this.checkLoginStatus()
    this.updateTodayDate()
    this.startClockTimer()
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
    if (this.currentTimeTimer) {
      clearInterval(this.currentTimeTimer)
    }
  },
  
  methods: {
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
    
    startClockTimer() {
      this.updateCurrentTime()
      this.currentTimeTimer = setInterval(() => {
        this.updateCurrentTime()
      }, 1000)
    },
    
    updateCurrentTime() {
      const now = new Date()
      this.currentTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}:${now.getSeconds().toString().padStart(2, '0')}`
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
        const localProfile = uni.getStorageSync('userProfile')
        if (localProfile && localProfile.meta && localProfile.meta.init && localProfile.is_completed) {
          this.userProfile = localProfile
        } else {
          const token = uni.getStorageSync('token')
          const result = await uniCloud.callFunction({
            name: 'user-auth',
            data: { action: 'getUserInfo', token },
            header: { 'x-token': token }
          })
          if (result.result && result.result.code === 0) {
            const profile = result.result.data.profile || {}
            this.userProfile = profile
            uni.setStorageSync('userProfile', profile)
          } else {
            uni.reLaunch({ url: '/pages/auth/profile-edit' })
            return
          }
        }
        
        await this.loadUserOrganizations()
        await this.loadCurrentStatus()
        await this.loadRecentRecords()
        this.startDurationTimer()
      } catch (error) {
        console.error('loadUserData error:', error)
        uni.reLaunch({ url: '/pages/auth/profile-edit' })
      }
    },
    
    async loadUserOrganizations() {
      try {
        const token = uni.getStorageSync('token')
        const result = await uniCloud.callFunction({
          name: 'organization-manage',
          data: {
            action: 'getUserOrganizations',
            token
          }
        })
        
        if (result.result && result.result.code === 0) {
          this.organizations = result.result.data || []
          if (this.organizations.length > 0 && !this.selectedOrg) {
            this.selectedOrg = this.organizations[0]
          }
        }
      } catch (error) {
        console.error('loadUserOrganizations error:', error)
      }
    },
    
    async loadCurrentStatus() {
      try {
        const token = uni.getStorageSync('token')
        const result = await uniCloud.callFunction({
          name: 'work-clock',
          data: {
            action: 'getCurrentStatus',
            token
          }
        })
        
        if (result.result && result.result.code === 0) {
          this.currentRecord = result.result.data
          if (this.currentRecord && !this.currentRecord.clock_out_time) {
            this.calculateWorkDuration()
          }
        }
      } catch (error) {
        console.error('loadCurrentStatus error:', error)
      }
    },
    
    async loadRecentRecords() {
      try {
        const token = uni.getStorageSync('token')
        const result = await uniCloud.callFunction({
          name: 'work-clock',
          data: {
            action: 'getRecentRecords',
            token
          }
        })
        
        if (result.result && result.result.code === 0) {
          this.recentRecords = result.result.data || []
        }
      } catch (error) {
        console.error('loadRecentRecords error:', error)
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
        if (!this.organizations || this.organizations.length === 0) {
          uni.showModal({
            title: '提示',
            content: '您还未加入任何组织，需要先创建或加入组织才能打卡',
            confirmText: '去创建',
            cancelText: '去加入',
            success: (res) => {
              if (res.confirm) {
                uni.navigateTo({ url: '/pages/organization/create' })
              } else if (res.cancel) {
                uni.navigateTo({ url: '/pages/organization/join' })
              }
            }
          })
          return
        }
        
        this.clocking = true
        
        if (this.organizations.length > 1 || (!this.selectedOrg && this.organizations.length > 0)) {
          if (!this.currentRecord || this.currentRecord.clock_out_time) {
            const selected = await this.selectOrganization()
            if (!selected) {
              this.clocking = false
              return
            }
          }
        }
        
        if (!this.selectedOrg && this.organizations.length > 0) {
          this.selectedOrg = this.organizations[0]
        }
        
        if (!this.selectedOrg) {
          this.clocking = false
          uni.showToast({
            title: '请先选择组织',
            icon: 'none'
          })
          return
        }
        
        if (!this.currentRecord || this.currentRecord.clock_out_time) {
          await this.clockIn()
        } else {
          await this.clockOut()
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
    
    selectOrganization() {
      return new Promise((resolve) => {
        if (!this.organizations || this.organizations.length === 0) {
          resolve(false)
          return
        }
        
        if (this.organizations.length === 1) {
          this.selectedOrg = this.organizations[0]
          resolve(true)
          return
        }
        
        const itemList = this.organizations.map(org => {
          const role = org.role === 'admin' ? '[管理员]' : org.role === 'supervisor' ? '[督导]' : ''
          return `${role} ${org.name}`
        })
        
        uni.showActionSheet({
          title: '选择要打卡的组织',
          itemList,
          success: (res) => {
            this.selectedOrg = this.organizations[res.tapIndex]
            uni.showToast({
              title: `已选择: ${this.selectedOrg.name}`,
              icon: 'none',
              duration: 1500
            })
            resolve(true)
          },
          fail: () => {
            resolve(false)
          }
        })
      })
    },
    
    async clockIn() {
      try {
        if (!this.selectedOrg || !this.selectedOrg._id) {
          throw new Error('未选择组织，请先选择组织')
        }
        
        uni.showLoading({ title: '获取位置中...' })
        const location = await this.getCurrentLocation()
        
        uni.showLoading({ title: '打卡中...' })
        const token = uni.getStorageSync('token')
        
        const result = await uniCloud.callFunction({
          name: 'work-clock',
          data: {
            action: 'clockIn',
            location: location,
            orgId: this.selectedOrg._id,
            token: token
          }
        })
        
        uni.hideLoading()
        
        if (result.result && result.result.code === 0) {
          uni.showToast({
            title: '上班打卡成功',
            icon: 'success'
          })
          
          await this.loadCurrentStatus()
          await this.loadRecentRecords()
          this.startDurationTimer()
        } else {
          const errorMsg = result.result ? result.result.message : '打卡失败，请重试'
          throw new Error(errorMsg)
        }
      } catch (error) {
        uni.hideLoading()
        throw error
      }
    },
    
    async clockOut() {
      try {
        uni.showLoading({ title: '获取位置中...' })
        const location = await this.getCurrentLocation()
        
        uni.showLoading({ title: '打卡中...' })
        const result = await uniCloud.callFunction({
          name: 'work-clock',
          data: {
            action: 'clockOut',
            recordId: this.currentRecord._id,
            location: location,
            token: uni.getStorageSync('token')
          }
        })
        
        uni.hideLoading()
        
        if (result.result.code === 0) {
          uni.showToast({
            title: '下班打卡成功',
            icon: 'success'
          })
          
          await this.loadCurrentStatus()
          await this.loadRecentRecords()
          if (this.durationTimer) {
            clearInterval(this.durationTimer)
            this.durationTimer = null
          }
        } else {
          throw new Error(result.result.message)
        }
      } catch (error) {
        uni.hideLoading()
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
    
    formatRecordDate(timestamp) {
      const date = new Date(timestamp)
      const month = date.getMonth() + 1
      const day = date.getDate()
      return `${month}月${day}日`
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
    }
  }
}
</script>

<style scoped>
/* #ifndef MP-WEIXIN */
@import url('@/common/styles/common.css');
/* #endif */

.status-bar {
  background-color: transparent;
}

.page-bg {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  z-index: -1;
}

.content-wrapper {
  position: relative;
  z-index: 1;
  padding-bottom: 40rpx;
}

.glass-effect {
  background-color: rgba(255, 255, 255, 0.85) !important;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.clock-section {
  background-color: rgba(255, 255, 255, 0.85);
  padding: 60rpx 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  margin-bottom: 20rpx;
  border-radius: 24rpx;
  margin: 20rpx 32rpx;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.clock-circle {
  width: 300rpx;
  height: 300rpx;
  border-radius: 50%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.15);
  transition: all 0.3s ease;
}

.clock-circle:active {
  transform: scale(0.95);
}

.clock-in {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
}

.clock-out {
  background: linear-gradient(135deg, #ff9a9e 0%, #fecfef 99%, #fecfef 100%);
  color: #ffffff;
}

.clock-time {
  font-size: 48rpx;
  font-weight: 600;
  margin-bottom: 16rpx;
}

.clock-action {
  font-size: 32rpx;
}

.clock-tips {
  margin-top: 40rpx;
  font-size: 28rpx;
  color: #666;
}

.record-content {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.record-main {
  display: flex;
  flex-direction: column;
}

.record-date {
  font-size: 30rpx;
  color: #111;
  margin-bottom: 8rpx;
}

.record-time {
  font-size: 24rpx;
  color: #999;
}

.record-duration {
  font-size: 28rpx;
  color: #667eea;
  font-weight: 500;
}
</style>
