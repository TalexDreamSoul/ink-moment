<template>
  <view class="page">
    <!-- 状态栏占位 -->
    <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
    
    <!-- 头部统计卡片 -->
    <view class="stats-header">
      <view class="total-hours">
        <text class="hours-num">{{ minutesToHours(totalStats.totalHours) }}</text>
        <text class="hours-label">累计时长(小时)</text>
      </view>
      <view class="stats-grid">
        <view class="stat-item">
          <text class="stat-num">{{ totalStats.totalDays || 0 }}</text>
          <text class="stat-label">打卡天数</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item">
          <text class="stat-num">{{ minutesToHours(totalStats.thisMonth) }}</text>
          <text class="stat-label">本月时长(h)</text>
        </view>
        <view class="stat-divider"></view>
        <view class="stat-item">
          <text class="stat-num">{{ totalStats.orgCount || 0 }}</text>
          <text class="stat-label">参与组织</text>
        </view>
      </view>
    </view>

    <!-- 组织时长 -->
    <view class="section-title">组织时长</view>
    <view class="cell-group" v-if="organizations.length > 0">
      <view class="cell" v-for="org in organizations" :key="org._id">
        <view class="cell-icon" style="background-color: #2782d7;">🏢</view>
        <view class="cell-content">
          <text class="cell-text">{{ org.name }}</text>
          <text class="cell-desc">{{ org.recordCount }}次打卡</text>
        </view>
        <text class="cell-value">{{ minutesToHours(org.totalMinutes) }}h</text>
      </view>
    </view>
    <view v-else class="empty-state">
      <text class="empty-icon">📊</text>
      <text class="empty-text">暂无组织数据</text>
    </view>

    <!-- 最近打卡记录 -->
    <view class="section-title">
      <text>最近打卡</text>
      <view class="section-action" @click="goToClockRecords">
        <text>查看全部</text>
        <icon-arrow :size="18" color="#576b95" /></view>
    </view>
    <view class="cell-group" v-if="recentRecords.length > 0">
      <view class="cell" v-for="record in recentRecords" :key="record._id">
        <view class="record-info">
          <view class="record-header">
            <text class="record-org">{{ record.orgName }}</text>
            <text class="record-duration">{{ formatDurationCompact(record.duration) }}</text>
          </view>
          <text class="record-time">{{ formatRecordTime(record) }}</text>
        </view>
      </view>
    </view>
    <view v-else class="empty-state">
      <text class="empty-icon">📝</text>
      <text class="empty-text">暂无打卡记录</text>
    </view>

    <!-- 数据导出 -->
    <view class="cell-group">
      <view class="cell" @click="goToExport">
        <view class="cell-icon" style="background-color: #10aeff;">📥</view>
        <text class="cell-text">数据导出</text>
        <view class="cell-right">
          <icon-arrow :size="16" />
        </view>
      </view>
    </view>

  </view>
</template>

<script>
import auth from '@/utils/auth.js'
import { formatHours, formatDurationCompact, minutesToHours } from '@/utils/duration.js'
import IconArrow from '@/components/icon-arrow/icon-arrow.vue'

export default {
  name: 'VolunteerStatistics',
  components: {
    IconArrow
  },
  data() {
    return {
      loading: false,
      statusBarHeight: 0,
      totalStats: {
        totalHours: 0,
        totalDays: 0,
        thisMonth: 0,
        orgCount: 0
      },
      organizations: [],
      recentRecords: []
    }
  },
  
  onLoad() {
    this.getStatusBarHeight()
    if (!auth.requireLogin()) {
      return
    }
    this.loadStatistics()
  },
  
  onPullDownRefresh() {
    this.loadStatistics(true)
  },
  
  methods: {
    getStatusBarHeight() {
      const systemInfo = uni.getSystemInfoSync()
      this.statusBarHeight = systemInfo.statusBarHeight || 0
    },
    
    async loadStatistics(isPullRefresh = false) {
      try {
        if (!isPullRefresh) {
          this.loading = true
        }
        
        const token = auth.getToken()
        
        // 获取统计数据
        const result = await uniCloud.callFunction({
          name: 'user-auth',
          data: {
            action: 'getUserStats',
            token
          }
        })
        
        if (result.result.code === 0) {
          const data = result.result.data || {}
          
          // 总体统计
          this.totalStats = {
            totalHours: data.totalHours || 0,
            totalDays: data.totalDays || 0,
            thisMonth: data.thisMonthHours || 0,
            orgCount: data.orgCount || 0
          }
          
          // 组织数据
          this.organizations = (data.organizations || []).map(org => ({
            _id: org.org_id,
            name: org.org_name,
            totalMinutes: org.total_minutes || 0,
            recordCount: org.record_count || 0
          }))
          
          // 最近记录
          this.recentRecords = (data.recentRecords || []).slice(0, 10).map(record => ({
            _id: record._id,
            orgName: record.org_name,
            duration: record.duration_minutes || 0,
            clockInTime: record.clock_in_time,
            clockOutTime: record.clock_out_time
          }))
        } else {
          uni.showToast({
            title: result.result.message || '加载失败',
            icon: 'none'
          })
        }
      } catch (error) {
        console.error('loadStatistics error:', error)
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
    
    formatRecordTime(record) {
      if (!record.clockInTime) return ''
      
      const date = new Date(record.clockInTime)
      const month = date.getMonth() + 1
      const day = date.getDate()
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      
      return `${month}月${day}日 ${hours}:${minutes}`
    },
    
    goToClockRecords() {
      uni.navigateTo({
        url: '/pages/clock/clock'
      })
    },
    
    goToExport() {
      uni.navigateTo({
        url: '/pages/statistics/export'
      })
    },
    
    // 时长格式化工具方法
    formatHours(minutes) {
      return formatHours(minutes)
    },
    
    formatDurationCompact(minutes) {
      return formatDurationCompact(minutes)
    },
    
    minutesToHours(minutes) {
      return minutesToHours(minutes)
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

.status-bar {
  background-color: #ffffff;
}

/* 头部统计卡片 */
.stats-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  padding: 48rpx 40rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 8rpx 24rpx rgba(102, 126, 234, 0.15);
}

.total-hours {
  text-align: center;
  margin-bottom: 48rpx;
}

.hours-num {
  display: block;
  font-size: 96rpx;
  font-weight: 700;
  color: #ffffff;
  line-height: 1;
  margin-bottom: 16rpx;
  text-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.1);
}

.hours-label {
  display: block;
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.9);
}

.stats-grid {
  display: flex;
  align-items: center;
  justify-content: space-around;
}

.stat-item {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.stat-num {
  font-size: 48rpx;
  font-weight: 600;
  color: #ffffff;
  margin-bottom: 8rpx;
}

.stat-label {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
}

.stat-divider {
  width: 1rpx;
  height: 48rpx;
  background-color: rgba(255, 255, 255, 0.3);
}

/* 区块标题 */
.section-title {
  padding: 32rpx 40rpx 16rpx;
  font-size: 28rpx;
  color: #7f7f7f;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-action {
  color: #576b95;
  font-size: 26rpx;
}

/* Cell 列表 */
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
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 32rpx;
  font-size: 28rpx;
  color: #ffffff;
  flex-shrink: 0;
}

.cell-content {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.cell-text {
  font-size: 32rpx;
  color: #111;
  margin-bottom: 4rpx;
}

.cell-desc {
  font-size: 24rpx;
  color: #7f7f7f;
}

.cell-value {
  font-size: 32rpx;
  font-weight: 600;
  color: #07c160;
  margin-right: 16rpx;
}

.cell-right {
  display: flex;
  align-items: center;
}

.arrow {
  font-size: 28rpx;
  color: #b2b2b2;
  font-family: monospace;
}

/* 打卡记录 */
.record-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.record-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8rpx;
}

.record-org {
  font-size: 32rpx;
  color: #111;
}

.record-duration {
  font-size: 28rpx;
  font-weight: 600;
  color: #07c160;
}

.record-time {
  font-size: 24rpx;
  color: #7f7f7f;
}

/* 空状态 */
.empty-state {
  background-color: #ffffff;
  padding: 120rpx 40rpx;
  text-align: center;
  margin-bottom: 20rpx;
}

.empty-icon {
  display: block;
  font-size: 96rpx;
  margin-bottom: 24rpx;
  opacity: 0.5;
}

.empty-text {
  display: block;
  font-size: 28rpx;
  color: #999999;
}
</style>
