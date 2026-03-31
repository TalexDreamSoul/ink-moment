<template>
  <view class="page">
    <view class="search-card">
      <text class="title">验证码查询</text>
      <text class="subtitle">输入导出任务验证码，核验记录真实性并查看文件地址</text>
      <input
        v-model="code"
        class="code-input"
        maxlength="6"
        placeholder="请输入 6 位验证码"
      />
      <button class="search-btn" @click="handleSearch" :disabled="loading">
        {{ loading ? '查询中...' : '立即查询' }}
      </button>
    </view>

    <view v-if="result" class="result-card">
      <text class="result-title">核验成功</text>
      <text class="result-item">验证码：{{ result.verify_code }}</text>
      <text class="result-item">用户：{{ result.user_name }}</text>
      <text class="result-item">组织：{{ result.org_name }}</text>
      <text class="result-item">累计时长：{{ formatMinutes(result.total_minutes) }}</text>
      <text class="result-item">创建时间：{{ formatTime(result.created_at) }}</text>
      <view class="action-row">
        <button class="mini-btn" @click="copyText(result.verify_code)">复制验证码</button>
        <button class="mini-btn" @click="copyText(result.file_url || '')" :disabled="!result.file_url">复制文件链接</button>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'VerifyCheck',
  data() {
    return {
      code: '',
      loading: false,
      result: null
    }
  },

  onLoad(options) {
    if (options.code) {
      this.code = String(options.code)
      this.handleSearch()
    }
  },

  methods: {
    async handleSearch() {
      if (!this.code || this.code.trim().length !== 6) {
        uni.showToast({
          title: '请输入 6 位验证码',
          icon: 'none'
        })
        return
      }

      try {
        this.loading = true
        const result = await uniCloud.callFunction({
          name: 'export-manage',
          data: {
            action: 'verify',
            code: this.code.trim()
          }
        })

        if (result.result.code === 0) {
          this.result = result.result.data || null
        } else {
          this.result = null
          uni.showToast({
            title: result.result.message || '查询失败',
            icon: 'none'
          })
        }
      } catch (error) {
        console.error('handleSearch error:', error)
        this.result = null
        uni.showToast({
          title: error.message || '查询失败',
          icon: 'none'
        })
      } finally {
        this.loading = false
      }
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

.search-card,
.result-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
}

.title {
  display: block;
  font-size: 38rpx;
  font-weight: 700;
  color: #111111;
  margin-bottom: 12rpx;
}

.subtitle {
  display: block;
  font-size: 26rpx;
  color: #64748b;
  line-height: 1.7;
  margin-bottom: 28rpx;
}

.code-input {
  height: 96rpx;
  background: #f8fafc;
  border-radius: 14rpx;
  padding: 0 24rpx;
  text-align: center;
  font-size: 44rpx;
  letter-spacing: 12rpx;
  color: #111111;
  margin-bottom: 24rpx;
}

.search-btn {
  height: 88rpx;
  border-radius: 14rpx;
  border: none;
  background: #2563eb;
  color: #ffffff;
  font-size: 28rpx;
  font-weight: 600;
}

.result-title {
  display: block;
  font-size: 32rpx;
  font-weight: 700;
  color: #16a34a;
  margin-bottom: 20rpx;
}

.result-item {
  display: block;
  font-size: 26rpx;
  color: #334155;
  line-height: 1.8;
}

.action-row {
  display: flex;
  gap: 16rpx;
  margin-top: 24rpx;
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
