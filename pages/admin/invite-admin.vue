<template>
  <view class="page">
    <!-- 头部区域 -->
    <view class="header-section">
      <text class="page-title">组织邀请</text>
      <text class="page-desc">分享二维码或链接，邀请成员加入组织</text>
    </view>
    
    <!-- 组织选择 -->
    <view class="cell-group" v-if="organizations.length > 0">
      <view class="cell" @click="showOrgSelector">
        <view class="cell-icon" style="background-color: #2782d7;">🏢</view>
        <view class="cell-content">
          <text class="cell-text">选择组织</text>
          <text class="cell-desc">{{ selectedOrg ? selectedOrg.name : '请选择' }}</text>
        </view>
        <icon-arrow :size="16" />
      </view>
    </view>
    
    <!-- 空状态 -->
    <view v-if="!selectedOrg && organizations.length === 0" class="empty-state">
      <text class="empty-icon">🏢</text>
      <text class="empty-text">您还没有可管理的组织</text>
      <text class="empty-desc">只有组织的管理员才能邀请成员</text>
    </view>
    
    <!-- 二维码区域 -->
    <view v-if="selectedOrg" class="qrcode-section">
      <view class="qrcode-card">
        <view class="qrcode-container">
          <canvas 
            v-if="qrcodeUrl"
            canvas-id="qrcode"
            :style="{ width: qrcodeSize + 'px', height: qrcodeSize + 'px' }"
            class="qrcode-canvas"
          />
          <text v-else class="qrcode-placeholder">生成二维码中...</text>
        </view>
        <view class="qrcode-info">
          <text class="org-name">{{ selectedOrg.name }}</text>
          <text class="qrcode-tip">扫描二维码加入组织</text>
        </view>
      </view>
    </view>
    
    <!-- 邀请链接 -->
    <view v-if="selectedOrg" class="cell-group">
      <view class="cell">
        <view class="cell-icon" style="background-color: #10aeff;">🔗</view>
        <view class="cell-content">
          <text class="cell-text">邀请链接</text>
          <text class="cell-link">{{ inviteUrl }}</text>
        </view>
      </view>
      <view class="cell" @click="copyInviteUrl">
        <view class="cell-icon" style="background-color: #07c160;">📋</view>
        <text class="cell-text">复制邀请链接</text>
        <icon-arrow :size="16" />
      </view>
    </view>
    
    <!-- 邀请记录 -->
    <view v-if="selectedOrg" class="section-header">
      <text class="section-title">最近邀请</text>
    </view>
    <view v-if="selectedOrg && inviteRecords.length > 0" class="cell-group">
      <view class="cell" v-for="record in inviteRecords" :key="record._id">
        <view class="record-content">
          <view class="record-main">
            <text class="record-name">{{ record.userName || '未填写姓名' }}</text>
            <text class="record-time">{{ formatTime(record.join_time) }}</text>
          </view>
          <view :class="['record-status', record.status]">
            {{ formatStatus(record.status) }}
          </view>
        </view>
      </view>
    </view>
    <view v-else-if="selectedOrg" class="empty-state-small">
      <text class="empty-text-small">暂无邀请记录</text>
    </view>
  </view>
</template>

<script>
import IconArrow from '@/components/icon-arrow/icon-arrow.vue'
import auth from '@/utils/auth.js'

export default {
  name: 'InviteAdmin',
  components: {
    IconArrow
  },
  data() {
    return {
      organizations: [],
      selectedOrg: null,
      qrcodeUrl: '',
      qrcodeSize: 420,
      inviteRecords: []
    }
  },
  
  computed: {
    inviteUrl() {
      if (!this.selectedOrg) return ''
      // TODO: 替换为实际的小程序页面路径
      return `pages/organization/join?orgId=${this.selectedOrg._id}&inviteCode=${this.selectedOrg.invite_code || ''}`
    }
  },
  
  onLoad() {
    if (!auth.requireLogin()) {
      return
    }
    this.loadAdminOrganizations()
  },
  
  onShow() {
    if (this.selectedOrg) {
      this.generateQRCode()
      this.loadInviteRecords()
    }
  },
  
  methods: {
    async loadAdminOrganizations() {
      try {
        uni.showLoading({ title: '加载中...' })
        const token = auth.getToken()
        
        const result = await uniCloud.callFunction({
          name: 'organization-manage',
          data: {
            action: 'getAdminOrganizations',
            token
          }
        })
        
        if (result.result && result.result.code === 0) {
          this.organizations = result.result.data || []
          if (this.organizations.length > 0) {
            this.selectedOrg = this.organizations[0]
            await this.generateQRCode()
            await this.loadInviteRecords()
          }
        } else {
          uni.showToast({
            title: result.result?.message || '加载失败',
            icon: 'none'
          })
        }
      } catch (error) {
        console.error('loadAdminOrganizations error:', error)
        uni.showToast({
          title: '加载失败',
          icon: 'none'
        })
      } finally {
        uni.hideLoading()
      }
    },
    
    showOrgSelector() {
      if (this.organizations.length <= 1) return
      
      const itemList = this.organizations.map(org => org.name)
      uni.showActionSheet({
        title: '选择组织',
        itemList,
        success: async (res) => {
          this.selectedOrg = this.organizations[res.tapIndex]
          await this.generateQRCode()
          await this.loadInviteRecords()
        }
      })
    },
    
    async generateQRCode() {
      try {
        // TODO: 使用 uniCloud 云函数生成小程序码
        // 暂时使用 canvas 生成二维码
        const qr = require('@/utils/qrcode.js')
        const ctx = uni.createCanvasContext('qrcode', this)
        
        qr.api.draw(this.inviteUrl, ctx, 0, 0, this.qrcodeSize, this.qrcodeSize)
        ctx.draw(false, () => {
          this.qrcodeUrl = 'generated'
        })
      } catch (error) {
        console.error('generateQRCode error:', error)
      }
    },
    
    async loadInviteRecords() {
      if (!this.selectedOrg) return
      
      try {
        const token = auth.getToken()
        const result = await uniCloud.callFunction({
          name: 'organization-manage',
          data: {
            action: 'getInviteRecords',
            orgId: this.selectedOrg._id,
            token
          }
        })
        
        if (result.result && result.result.code === 0) {
          this.inviteRecords = (result.result.data || []).slice(0, 10)
        }
      } catch (error) {
        console.error('loadInviteRecords error:', error)
      }
    },
    
    copyInviteUrl() {
      uni.setClipboardData({
        data: this.inviteUrl,
        success: () => {
          uni.showToast({
            title: '链接已复制',
            icon: 'success'
          })
        }
      })
    },
    
    formatTime(timestamp) {
      if (!timestamp) return ''
      const date = new Date(timestamp)
      const month = date.getMonth() + 1
      const day = date.getDate()
      const hours = date.getHours().toString().padStart(2, '0')
      const minutes = date.getMinutes().toString().padStart(2, '0')
      return `${month}月${day}日 ${hours}:${minutes}`
    },
    
    formatStatus(status) {
      const statusMap = {
        'pending': '待加入',
        'accepted': '已加入',
        'rejected': '已拒绝'
      }
      return statusMap[status] || status
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

/* 头部 */
.header-section {
  background-color: #ffffff;
  padding: 48rpx 40rpx;
  margin-bottom: 20rpx;
  text-align: center;
}

.page-title {
  display: block;
  font-size: 40rpx;
  font-weight: 700;
  color: #111;
  margin-bottom: 16rpx;
}

.page-desc {
  display: block;
  font-size: 28rpx;
  color: #7f7f7f;
}

/* 二维码区域 */
.qrcode-section {
  padding: 0 40rpx;
  margin-bottom: 20rpx;
}

.qrcode-card {
  background-color: #ffffff;
  border-radius: 16rpx;
  padding: 60rpx 40rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: 0 4rpx 16rpx rgba(0, 0, 0, 0.06);
}

.qrcode-container {
  width: 420rpx;
  height: 420rpx;
  background-color: #f8f8f8;
  border-radius: 12rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 40rpx;
  overflow: hidden;
}

.qrcode-canvas {
  width: 100%;
  height: 100%;
}

.qrcode-placeholder {
  font-size: 28rpx;
  color: #999;
}

.qrcode-info {
  text-align: center;
}

.org-name {
  display: block;
  font-size: 36rpx;
  font-weight: 600;
  color: #111;
  margin-bottom: 12rpx;
}

.qrcode-tip {
  display: block;
  font-size: 26rpx;
  color: #7f7f7f;
}

/* Cell Group */
.cell-group {
  background-color: #ffffff;
  margin-bottom: 20rpx;
}

.cell {
  display: flex;
  align-items: center;
  padding: 32rpx 40rpx;
  position: relative;
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
  font-size: 26rpx;
  color: #7f7f7f;
}

.cell-link {
  font-size: 24rpx;
  color: #576b95;
  line-height: 1.6;
  word-break: break-all;
}

/* 区块标题 */
.section-header {
  padding: 32rpx 40rpx 16rpx;
}

.section-title {
  font-size: 28rpx;
  color: #7f7f7f;
  font-weight: 600;
}

/* 邀请记录 */
.record-content {
  flex: 1;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.record-main {
  flex: 1;
  display: flex;
  flex-direction: column;
}

.record-name {
  font-size: 32rpx;
  color: #111;
  margin-bottom: 8rpx;
}

.record-time {
  font-size: 24rpx;
  color: #7f7f7f;
}

.record-status {
  font-size: 26rpx;
  padding: 6rpx 16rpx;
  border-radius: 6rpx;
}

.record-status.pending {
  background-color: #fff3e0;
  color: #fa9d3b;
}

.record-status.accepted {
  background-color: #e8f5e9;
  color: #07c160;
}

.record-status.rejected {
  background-color: #ffebee;
  color: #fa5151;
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
  font-size: 32rpx;
  color: #666;
  margin-bottom: 12rpx;
  font-weight: 500;
}

.empty-desc {
  display: block;
  font-size: 26rpx;
  color: #999;
}

.empty-state-small {
  background-color: #ffffff;
  padding: 80rpx 40rpx;
  text-align: center;
  margin-bottom: 20rpx;
}

.empty-text-small {
  font-size: 28rpx;
  color: #999;
}
</style>
