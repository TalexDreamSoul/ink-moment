<template>
  <view class="page">
    <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
    
    <view class="page-content">
      <view class="join-container">
        <view class="join-method">
          <text class="method-title">输入邀请码</text>
          <view class="invite-code-input">
            <input 
              class="code-input" 
              v-model="inviteCode" 
              placeholder="请输入6位邀请码"
              maxlength="6"
            />
          </view>
          <button class="btn btn-primary btn-block" @click="joinByCode" :disabled="joining">
            {{ joining ? '加入中...' : '加入组织' }}
          </button>
        </view>
        
        <view class="divider">
          <view class="divider-line"></view>
          <text class="divider-text">或</text>
          <view class="divider-line"></view>
        </view>
        
        <view class="join-method">
          <text class="method-title">扫描二维码</text>
          <button class="btn btn-outline btn-block" @click="scanQRCode">
            📷 扫描二维码加入
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import authUtil from '@/utils/auth.js'

export default {
  name: 'OrganizationJoin',
  data() {
    return {
      statusBarHeight: 0,
      inviteCode: '',
      joining: false
    }
  },
  
  onLoad() {
    this.getStatusBarHeight()
  },
  
  methods: {
    getStatusBarHeight() {
      const systemInfo = uni.getSystemInfoSync()
      this.statusBarHeight = systemInfo.statusBarHeight || 0
    },
    
    async joinByCode() {
      try {
        if (!this.inviteCode || this.inviteCode.trim().length !== 6) {
          uni.showToast({
            title: '请输入6位邀请码',
            icon: 'none'
          })
          return
        }
        
        if (!authUtil.requireLogin()) {
          return
        }
        
        // 检查资料是否完整
        const token = authUtil.getToken()
        const checkResult = await uniCloud.callFunction({
          name: 'user-auth',
          data: {
            action: 'checkProfileComplete',
            token
          }
        })
        
        if (checkResult.result.code === 0 && !checkResult.result.data.isComplete) {
          uni.showModal({
            title: '需要完善资料',
            content: '加入组织前需要完善个人信息，是否前往填写？',
            success: (res) => {
              if (res.confirm) {
                const redirectUrl = `/pages/organization/join?code=${this.inviteCode}`
                uni.navigateTo({
                  url: `/pages/auth/profile-complete?redirect=${encodeURIComponent(redirectUrl)}`
                })
              }
            }
          })
          return
        }
        
        this.joining = true
        uni.showLoading({ title: '加入中...' })
        
        const result = await uniCloud.callFunction({
          name: 'organization-manage',
          data: {
            action: 'joinOrganization',
            token,
            qrcodeKey: this.inviteCode.toUpperCase()
          }
        })
        
        uni.hideLoading()
        
        if (result.result.code === 0) {
          uni.showToast({
            title: '加入成功',
            icon: 'success'
          })
          setTimeout(() => {
            uni.navigateBack()
          }, 1500)
        } else {
          uni.showToast({
            title: result.result.message || '加入失败',
            icon: 'none'
          })
        }
      } catch (error) {
        console.error('joinByCode error:', error)
        uni.hideLoading()
        uni.showToast({
          title: '加入失败',
          icon: 'none'
        })
      } finally {
        this.joining = false
      }
    },
    
    scanQRCode() {
      // #ifdef APP-PLUS || MP-WEIXIN
      uni.scanCode({
        success: async (res) => {
          console.log('扫码结果:', res.result)
          // 假设二维码内容是邀请码
          this.inviteCode = res.result
          await this.joinByCode()
        },
        fail: (error) => {
          console.error('扫码失败:', error)
          uni.showToast({
            title: '扫码失败',
            icon: 'none'
          })
        }
      })
      // #endif
      
      // #ifndef APP-PLUS || MP-WEIXIN
      uni.showToast({
        title: '当前环境不支持扫码',
        icon: 'none'
      })
      // #endif
    }
  }
}
</script>

<style scoped>
/* #ifndef MP-WEIXIN */
@import url('@/common/styles/common.css');
/* #endif */

.page {
  min-height: 100vh;
  background: #f5f5f5;
}

.status-bar {
  background: #ffffff;
}

.page-content {
  padding: 40rpx 32rpx;
}

.join-container {
  background: #ffffff;
  border-radius: 24rpx;
  padding: 48rpx 32rpx;
}

.join-method {
  margin-bottom: 48rpx;
}

.join-method:last-child {
  margin-bottom: 0;
}

.method-title {
  display: block;
  font-size: 28rpx;
  font-weight: 600;
  color: #1a1a1a;
  margin-bottom: 24rpx;
}

.invite-code-input {
  margin-bottom: 32rpx;
}

.code-input {
  width: 100%;
  height: 96rpx;
  padding: 0 24rpx;
  background: #f8f8f8;
  border-radius: 12rpx;
  border: 2rpx solid #e5e5e5;
  font-size: 48rpx;
  font-weight: 600;
  text-align: center;
  letter-spacing: 8rpx;
  color: #1a1a1a;
}

.divider {
  display: flex;
  align-items: center;
  margin: 48rpx 0;
}

.divider-line {
  flex: 1;
  height: 1rpx;
  background: #e5e5e5;
}

.divider-text {
  padding: 0 24rpx;
  font-size: 24rpx;
  color: #999999;
}

.btn {
  border: none;
  border-radius: 12rpx;
  font-size: 32rpx;
  font-weight: 600;
  display: flex;
  align-items: center;
  justify-content: center;
}

.btn-block {
  width: 100%;
  height: 96rpx;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #ffffff;
}

.btn-outline {
  background: transparent;
  color: #667eea;
  border: 2rpx solid #667eea;
}

.btn-primary[disabled] {
  opacity: 0.6;
}
</style>
