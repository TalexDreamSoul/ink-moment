<template>
  <view class="page">
    <view class="header-card">
      <text class="title">组织邀请</text>
      <text class="subtitle">选择您可管理的组织，查看邀请码并复制加入路径。扫码加入可直接复用当前用户端扫码逻辑。</text>
    </view>

    <view v-if="organizations.length > 0" class="selector-card" @click="selectOrganization">
      <view>
        <text class="selector-label">当前组织</text>
        <text class="selector-value">{{ selectedOrg ? selectedOrg.name : '请选择组织' }}</text>
      </view>
      <text class="selector-arrow">›</text>
    </view>

    <view v-else class="empty-card">
      <text class="empty-title">暂无可管理的组织</text>
      <text class="empty-text">请先创建组织或加入一个拥有管理权限的组织。</text>
    </view>

    <view v-if="selectedOrg" class="invite-card">
      <text class="section-title">邀请码</text>
      <view class="code-box">
        <text class="code-text">{{ inviteCode }}</text>
      </view>
      <text class="helper-text">用户端可以直接输入或扫码这个邀请码加入组织</text>

      <view class="link-box">
        <text class="link-label">加入页面路径</text>
        <text class="link-value">{{ joinPath }}</text>
      </view>

      <view class="action-row">
        <button class="mini-btn" @click="copyText(inviteCode)">复制邀请码</button>
        <button class="mini-btn" @click="copyText(joinPath)">复制路径</button>
      </view>
    </view>

    <view v-if="selectedOrg" class="record-card">
      <text class="section-title">最近加入记录</text>

      <view v-if="inviteRecords.length === 0" class="record-empty">
        <text class="empty-text">最近还没有新的加入记录</text>
      </view>

      <view v-else class="record-list">
        <view v-for="item in inviteRecords" :key="item._id" class="record-item">
          <view>
            <text class="record-name">{{ item.userName || '未填写姓名' }}</text>
            <text class="record-time">{{ formatTime(item.join_time) }}</text>
          </view>
          <text class="record-status">{{ formatStatus(item.status) }}</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import auth from '@/utils/auth.js'
import { getJoinPagePath } from '@/utils/app-config.js'

export default {
  name: 'InviteAdmin',
  data() {
    return {
      organizations: [],
      selectedOrg: null,
      inviteCode: '',
      inviteRecords: []
    }
  },

  computed: {
    joinPath() {
      return this.selectedOrg
        ? getJoinPagePath(this.selectedOrg._id, this.inviteCode)
        : ''
    }
  },

  onLoad() {
    if (!auth.requireLogin()) {
      return
    }
    this.loadOrganizations()
  },

  methods: {
    async loadOrganizations() {
      try {
        const result = await uniCloud.callFunction({
          name: 'organization-manage',
          data: {
            action: 'getAdminOrganizations',
            token: auth.getToken()
          }
        })

        if (result.result.code === 0) {
          this.organizations = result.result.data || []
          if (this.organizations.length > 0) {
            this.selectedOrg = this.organizations[0]
            await this.refreshInviteCode()
            await this.loadInviteRecords()
          }
        } else {
          uni.showToast({
            title: result.result.message || '组织列表加载失败',
            icon: 'none'
          })
        }
      } catch (error) {
        console.error('loadOrganizations error:', error)
        uni.showToast({
          title: error.message || '组织列表加载失败',
          icon: 'none'
        })
      }
    },

    selectOrganization() {
      if (this.organizations.length === 0) {
        return
      }

      uni.showActionSheet({
        itemList: this.organizations.map(item => item.name),
        success: async ({ tapIndex }) => {
          try {
            this.selectedOrg = this.organizations[tapIndex]
            await this.refreshInviteCode()
            await this.loadInviteRecords()
          } catch (error) {
            console.error('selectOrganization error:', error)
            uni.showToast({
              title: error.message || '切换组织失败',
              icon: 'none'
            })
          }
        }
      })
    },

    async refreshInviteCode() {
      if (!this.selectedOrg) {
        return
      }

      const result = await uniCloud.callFunction({
        name: 'organization-manage',
        data: {
          action: 'getOrganizationQRCode',
          orgId: this.selectedOrg._id,
          token: auth.getToken()
        }
      })

      if (result.result.code === 0) {
        this.inviteCode = result.result.data.qrcodeKey || this.selectedOrg.invite_code || ''
      } else {
        throw new Error(result.result.message || '邀请码获取失败')
      }
    },

    async loadInviteRecords() {
      if (!this.selectedOrg) {
        return
      }

      try {
        const result = await uniCloud.callFunction({
          name: 'organization-manage',
          data: {
            action: 'getInviteRecords',
            orgId: this.selectedOrg._id,
            token: auth.getToken()
          }
        })

        if (result.result.code === 0) {
          this.inviteRecords = result.result.data || []
        }
      } catch (error) {
        console.error('loadInviteRecords error:', error)
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

    formatTime(timestamp) {
      if (!timestamp) {
        return ''
      }

      const date = new Date(timestamp)
      const month = `${date.getMonth() + 1}`.padStart(2, '0')
      const day = `${date.getDate()}`.padStart(2, '0')
      const hour = `${date.getHours()}`.padStart(2, '0')
      const minute = `${date.getMinutes()}`.padStart(2, '0')
      return `${month}-${day} ${hour}:${minute}`
    },

    formatStatus(status) {
      const labelMap = {
        accepted: '已加入',
        pending: '待处理',
        rejected: '已拒绝'
      }
      return labelMap[status] || status || '未知'
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

.header-card,
.selector-card,
.empty-card,
.invite-card,
.record-card {
  background: #ffffff;
  border-radius: 20rpx;
  padding: 32rpx;
  margin-bottom: 24rpx;
}

.title {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: #111111;
  margin-bottom: 12rpx;
}

.subtitle,
.empty-text,
.helper-text {
  display: block;
  font-size: 26rpx;
  color: #64748b;
  line-height: 1.7;
}

.selector-card {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.selector-label,
.link-label {
  display: block;
  font-size: 24rpx;
  color: #64748b;
  margin-bottom: 8rpx;
}

.selector-value,
.empty-title,
.section-title,
.record-name {
  display: block;
  font-size: 30rpx;
  font-weight: 600;
  color: #111111;
}

.selector-arrow {
  font-size: 40rpx;
  color: #cbd5e1;
}

.code-box {
  background: #eff6ff;
  border-radius: 18rpx;
  padding: 36rpx 24rpx;
  text-align: center;
  margin: 24rpx 0 16rpx;
}

.code-text {
  font-size: 52rpx;
  font-weight: 700;
  color: #2563eb;
  letter-spacing: 8rpx;
}

.link-box {
  background: #f8fafc;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-top: 24rpx;
}

.link-value {
  display: block;
  font-size: 24rpx;
  color: #111111;
  line-height: 1.7;
  word-break: break-all;
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

.record-empty {
  margin-top: 24rpx;
}

.record-list {
  margin-top: 20rpx;
}

.record-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx 0;
  border-bottom: 1rpx solid #eef2f7;
}

.record-item:last-child {
  border-bottom: none;
}

.record-time,
.record-status {
  display: block;
  font-size: 24rpx;
  color: #64748b;
  margin-top: 8rpx;
}
</style>
