<template>
  <view class="page">
    <view class="filter-card">
      <text class="card-title">导出筛选</text>

      <view class="form-row">
        <text class="label">组织</text>
        <view class="selector" @click="selectOrganization">
          <text class="selector-text">{{ selectedOrg ? selectedOrg.name : '全部组织' }}</text>
          <text class="selector-arrow">›</text>
        </view>
      </view>

      <view class="form-row">
        <text class="label">年份</text>
        <input
          v-model="filters.year"
          class="input"
          type="number"
          maxlength="4"
          placeholder="留空表示全部年份"
        />
      </view>

      <view class="form-row">
        <text class="label">月份</text>
        <input
          v-model="filters.month"
          class="input"
          type="number"
          maxlength="2"
          placeholder="留空表示全年"
        />
      </view>

      <view class="action-row">
        <button class="btn btn-secondary" @click="resetFilters" :disabled="submitting">重置筛选</button>
        <button class="btn btn-primary" @click="createExport" :disabled="submitting">
          {{ submitting ? '导出中...' : '创建导出任务' }}
        </button>
      </view>
    </view>

    <view class="list-header">
      <text class="card-title">导出记录</text>
      <text class="link-text" @click="goToVerify">验证码查询</text>
    </view>

    <view v-if="loading" class="state-card">
      <text class="state-text">加载中...</text>
    </view>

    <view v-else-if="records.length === 0" class="state-card">
      <text class="state-title">暂无导出记录</text>
      <text class="state-text">创建导出任务后，可以在这里查看验证码和文件链接</text>
    </view>

    <view v-else class="record-list">
      <view v-for="item in records" :key="item._id" class="record-item">
        <view class="record-head">
          <text class="record-org">{{ item.org_name }}</text>
          <text class="record-status">{{ formatStatus(item.status) }}</text>
        </view>
        <text class="record-meta">导出类型：{{ item.export_type || 'csv' }}</text>
        <text class="record-meta">累计时长：{{ formatMinutes(item.total_minutes) }}</text>
        <text class="record-meta">验证码：{{ item.verify_code }}</text>
        <text class="record-meta">创建时间：{{ formatTime(item.created_at) }}</text>
        <view class="record-actions">
          <button class="mini-btn" @click="copyText(item.verify_code)">复制验证码</button>
          <button class="mini-btn" @click="copyText(item.file_url || '')" :disabled="!item.file_url">复制文件链接</button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import auth from '@/utils/auth.js'

function getCurrentYear() {
  return `${new Date().getFullYear()}`
}

function getCurrentMonth() {
  return `${new Date().getMonth() + 1}`
}

export default {
  name: 'StatisticsExport',
  data() {
    return {
      loading: false,
      submitting: false,
      organizations: [],
      selectedOrg: null,
      records: [],
      filters: {
        year: getCurrentYear(),
        month: getCurrentMonth()
      }
    }
  },

  onLoad() {
    if (!auth.requireLogin()) {
      return
    }
    this.initPage()
  },

  onPullDownRefresh() {
    this.initPage(true)
  },

  methods: {
    async initPage(isPullRefresh = false) {
      try {
        if (!isPullRefresh) {
          this.loading = true
        }
        await Promise.all([this.loadOrganizations(), this.loadRecords()])
      } catch (error) {
        console.error('initPage error:', error)
        uni.showToast({
          title: error.message || '导出页面初始化失败',
          icon: 'none'
        })
      } finally {
        this.loading = false
        if (isPullRefresh) {
          uni.stopPullDownRefresh()
        }
      }
    },

    async loadOrganizations() {
      const result = await uniCloud.callFunction({
        name: 'organization-manage',
        data: {
          action: 'getUserOrganizations',
          token: auth.getToken()
        }
      })

      if (result.result.code === 0) {
        this.organizations = result.result.data || []
        if (this.selectedOrg) {
          const matched = this.organizations.find(item => item._id === this.selectedOrg._id)
          this.selectedOrg = matched || null
        }
      } else {
        throw new Error(result.result.message || '组织列表加载失败')
      }
    },

    async loadRecords() {
      try {
        const result = await uniCloud.callFunction({
          name: 'export-manage',
          data: {
            action: 'list',
            token: auth.getToken()
          }
        })

        if (result.result.code === 0) {
          this.records = result.result.data || []
        } else {
          uni.showToast({
            title: result.result.message || '导出记录加载失败',
            icon: 'none'
          })
        }
      } catch (error) {
        console.error('loadRecords error:', error)
        uni.showToast({
          title: error.message || '导出记录加载失败',
          icon: 'none'
        })
      }
    },

    selectOrganization() {
      const itemList = ['全部组织', ...this.organizations.map(item => item.name)]
      uni.showActionSheet({
        itemList,
        success: ({ tapIndex }) => {
          this.selectedOrg = tapIndex === 0 ? null : this.organizations[tapIndex - 1]
        }
      })
    },

    resetFilters() {
      this.selectedOrg = null
      this.filters.year = getCurrentYear()
      this.filters.month = getCurrentMonth()
    },

    async createExport() {
      try {
        this.submitting = true
        const result = await uniCloud.callFunction({
          name: 'export-manage',
          data: {
            action: 'create',
            token: auth.getToken(),
            orgId: this.selectedOrg ? this.selectedOrg._id : '',
            year: this.filters.year.trim(),
            month: this.filters.month.trim(),
            exportType: 'csv'
          }
        })

        if (result.result.code === 0) {
          uni.showToast({
            title: '导出任务已创建',
            icon: 'success'
          })
          this.loadRecords()
        } else {
          uni.showToast({
            title: result.result.message || '创建导出任务失败',
            icon: 'none'
          })
        }
      } catch (error) {
        console.error('createExport error:', error)
        uni.showToast({
          title: error.message || '创建导出任务失败',
          icon: 'none'
        })
      } finally {
        this.submitting = false
      }
    },

    goToVerify() {
      uni.navigateTo({
        url: '/pages/verify/check'
      })
    },

    copyText(value) {
      if (!value) {
        uni.showToast({
          title: '暂无可复制内容',
          icon: 'none'
        })
        return
      }

      uni.setClipboardData({
        data: value,
        success: () => {
          uni.showToast({
            title: '已复制',
            icon: 'success'
          })
        }
      })
    },

    formatStatus(status) {
      const labelMap = {
        ready: '已生成',
        pending: '处理中',
        failed: '失败'
      }
      return labelMap[status] || status || '未知'
    },

    formatMinutes(minutes) {
      const total = Number(minutes || 0)
      const hour = Math.floor(total / 60)
      const minute = total % 60
      return `${hour}小时${minute}分钟`
    },

    formatTime(timestamp) {
      if (!timestamp) {
        return ''
      }

      const date = new Date(timestamp)
      const year = date.getFullYear()
      const month = `${date.getMonth() + 1}`.padStart(2, '0')
      const day = `${date.getDate()}`.padStart(2, '0')
      const hour = `${date.getHours()}`.padStart(2, '0')
      const minute = `${date.getMinutes()}`.padStart(2, '0')
      return `${year}-${month}-${day} ${hour}:${minute}`
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f5f7fa;
  padding: 24rpx;
}

.filter-card,
.state-card,
.record-item {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 28rpx;
}

.filter-card,
.state-card {
  margin-bottom: 24rpx;
}

.card-title {
  font-size: 32rpx;
  font-weight: 700;
  color: #111111;
}

.form-row {
  margin-top: 24rpx;
}

.label {
  display: block;
  font-size: 26rpx;
  color: #666666;
  margin-bottom: 12rpx;
}

.selector,
.input {
  height: 88rpx;
  background: #f8fafc;
  border-radius: 14rpx;
  padding: 0 24rpx;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 28rpx;
  color: #111111;
}

.selector-text {
  font-size: 28rpx;
  color: #111111;
}

.selector-arrow {
  font-size: 36rpx;
  color: #c0c4cc;
}

.action-row {
  display: flex;
  gap: 20rpx;
  margin-top: 32rpx;
}

.btn {
  flex: 1;
  height: 88rpx;
  border-radius: 14rpx;
  font-size: 28rpx;
  font-weight: 600;
  border: none;
}

.btn-primary {
  background: #2563eb;
  color: #ffffff;
}

.btn-secondary {
  background: #edf2f7;
  color: #334155;
}

.list-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}

.link-text {
  font-size: 24rpx;
  color: #2563eb;
}

.state-card {
  text-align: center;
  padding: 90rpx 40rpx;
}

.state-title {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #111111;
  margin-bottom: 12rpx;
}

.state-text {
  font-size: 26rpx;
  color: #6b7280;
  line-height: 1.7;
}

.record-list {
  display: flex;
  flex-direction: column;
  gap: 20rpx;
}

.record-head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 16rpx;
  margin-bottom: 12rpx;
}

.record-org {
  font-size: 30rpx;
  font-weight: 600;
  color: #111111;
}

.record-status {
  font-size: 24rpx;
  color: #2563eb;
}

.record-meta {
  display: block;
  font-size: 24rpx;
  color: #64748b;
  line-height: 1.7;
}

.record-actions {
  display: flex;
  gap: 16rpx;
  margin-top: 20rpx;
}

.mini-btn {
  flex: 1;
  height: 72rpx;
  border-radius: 12rpx;
  border: none;
  background: #eff6ff;
  color: #2563eb;
  font-size: 24rpx;
}
</style>
