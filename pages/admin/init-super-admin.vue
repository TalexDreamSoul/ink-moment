<template>
  <view class="page">
    <view class="form-card">
      <text class="title">系统初始化</text>
      <text class="subtitle">为新后台创建首个超级管理员账号。初始化完成后，请在 Web 管理后台继续后续运营。</text>

      <view class="form-item">
        <text class="label">显示名称</text>
        <input v-model="form.displayName" class="input" maxlength="20" placeholder="例如：系统管理员" />
      </view>

      <view class="form-item">
        <text class="label">登录账号</text>
        <input v-model="form.username" class="input" maxlength="32" placeholder="例如：superadmin" />
      </view>

      <view class="form-item">
        <text class="label">登录密码</text>
        <input v-model="form.password" class="input" password maxlength="64" placeholder="至少 8 位" />
      </view>

      <view class="form-item">
        <text class="label">确认密码</text>
        <input v-model="form.confirmPassword" class="input" password maxlength="64" placeholder="请再次输入密码" />
      </view>

      <view class="form-item">
        <text class="label">初始化密钥</text>
        <input v-model="form.initKey" class="input" password maxlength="128" placeholder="来自 Cloudflare Secret，可选但推荐配置" />
      </view>

      <button class="primary-btn" @click="handleSubmit" :disabled="submitting || systemReady">
        {{ systemReady ? '系统已初始化' : (submitting ? '初始化中...' : '确认创建超级管理员') }}
      </button>

      <button class="ghost-btn" @click="copyAdminUrl">复制 Web 后台地址</button>
    </view>
  </view>
</template>

<script>
import { getAdminBaseUrl } from '@/utils/app-config.js'
import { getSystemStatus } from '@/utils/system-check.js'

export default {
  name: 'InitSuperAdmin',
  data() {
    return {
      submitting: false,
      systemReady: false,
      adminUrl: getAdminBaseUrl(),
      form: {
        displayName: '超级管理员',
        username: 'superadmin',
        password: '',
        confirmPassword: '',
        initKey: ''
      }
    }
  },

  async onLoad() {
    const status = await getSystemStatus()
    this.systemReady = !!status.systemReady
  },

  methods: {
    async handleSubmit() {
      if (this.systemReady) {
        uni.showToast({
          title: '系统已初始化',
          icon: 'none'
        })
        return
      }

      if (!this.form.displayName.trim() || !this.form.username.trim()) {
        uni.showToast({
          title: '请填写管理员名称和账号',
          icon: 'none'
        })
        return
      }

      if (this.form.password.length < 8) {
        uni.showToast({
          title: '密码至少 8 位',
          icon: 'none'
        })
        return
      }

      if (this.form.password !== this.form.confirmPassword) {
        uni.showToast({
          title: '两次输入的密码不一致',
          icon: 'none'
        })
        return
      }

      try {
        this.submitting = true
        const result = await uniCloud.callFunction({
          name: 'system-init',
          data: {
            action: 'initSuperAdmin',
            displayName: this.form.displayName.trim(),
            username: this.form.username.trim(),
            password: this.form.password,
            initKey: this.form.initKey.trim()
          }
        })

        if (result.result.code === 0) {
          this.systemReady = true
          uni.setClipboardData({
            data: this.adminUrl
          })
          uni.showModal({
            title: '初始化成功',
            content: `超级管理员已创建。\nWeb 后台地址已复制。\n账号：${this.form.username.trim()}`,
            showCancel: false,
            success: () => {
              uni.navigateBack({
                fail: () => {
                  uni.reLaunch({
                    url: '/pages/admin/home'
                  })
                }
              })
            }
          })
        } else {
          uni.showToast({
            title: result.result.message || '初始化失败',
            icon: 'none',
            duration: 3000
          })
        }
      } catch (error) {
        console.error('handleSubmit error:', error)
        uni.showToast({
          title: error.message || '初始化失败',
          icon: 'none',
          duration: 3000
        })
      } finally {
        this.submitting = false
      }
    },

    copyAdminUrl() {
      uni.setClipboardData({
        data: this.adminUrl,
        success: () => {
          uni.showToast({
            title: '后台地址已复制',
            icon: 'success'
          })
        }
      })
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

.form-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 32rpx;
}

.title {
  display: block;
  font-size: 40rpx;
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

.form-item {
  margin-bottom: 24rpx;
}

.label {
  display: block;
  font-size: 26rpx;
  color: #334155;
  margin-bottom: 12rpx;
}

.input {
  height: 88rpx;
  background: #f8fafc;
  border-radius: 14rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: #111111;
}

.primary-btn,
.ghost-btn {
  height: 88rpx;
  border-radius: 14rpx;
  border: none;
  font-size: 28rpx;
  font-weight: 600;
}

.primary-btn {
  background: #2563eb;
  color: #ffffff;
  margin-top: 12rpx;
}

.ghost-btn {
  margin-top: 20rpx;
  background: #eff6ff;
  color: #2563eb;
}
</style>
