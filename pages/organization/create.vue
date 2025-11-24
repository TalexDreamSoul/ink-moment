<template>
  <view class="page">
    <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
    
    <view class="page-content">
      <view class="form-container">
        <view class="form-group">
          <text class="form-label">组织名称 <text class="required">*</text></text>
          <input 
            class="form-input" 
            v-model="formData.name" 
            placeholder="请输入组织名称（1-50字）"
            maxlength="50"
          />
        </view>
        
        <view class="form-group">
          <text class="form-label">组织描述</text>
          <textarea 
            class="form-textarea" 
            v-model="formData.description" 
            placeholder="请输入组织描述（选填，最多200字）"
            maxlength="200"
          />
        </view>
        
        <view class="form-group">
          <view class="form-label-row">
            <text class="form-label">打卡位置（选填）</text>
            <button class="btn-text" @click="getLocation">获取当前位置</button>
          </view>
          <view v-if="formData.location" class="location-info">
            <text class="location-text">📍 {{ formData.location.address ||  '已获取位置' }}</text>
          </view>
        </view>
        
        <view class="form-group" v-if="formData.location">
          <text class="form-label">打卡范围（米）</text>
          <input 
            class="form-input" 
            v-model.number="formData.location.radius" 
            type="number"
            placeholder="默认1000米"
          />
        </view>
        
        <view class="form-actions">
          <button class="btn btn-primary btn-block" @click="handleSubmit" :disabled="submitting">
            {{ submitting ? '创建中...' : '创建组织' }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script>
import authUtil from '@/utils/auth.js'
import locationUtil from '@/utils/location.js'

export default {
  name: 'OrganizationCreate',
  data() {
    return {
      statusBarHeight: 0,
      submitting: false,
      formData: {
        name: '',
        description: '',
        location: null
      }
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
    
    async getLocation() {
      try {
        uni.showLoading({ title: '获取位置中...' })
        const location = await locationUtil.getLocationWithPermission()
        this.formData.location = {
          latitude: location.latitude,
          longitude: location.longitude,
          address: location.address,
          radius: 1000
        }
        uni.hideLoading()
        uni.showToast({
          title: '获取位置成功',
          icon: 'success'
        })
      } catch (error) {
        uni.hideLoading()
        uni.showToast({
          title: error.message || '获取位置失败',
          icon: 'none'
        })
      }
    },
    
    async handleSubmit() {
      try {
        // 验证表单
        if (!this.formData.name || this.formData.name.trim().length === 0) {
          uni.showToast({
            title: '请输入组织名称',
            icon: 'none'
          })
          return
        }
        
        if (this.formData.name.length > 50) {
          uni.showToast({
            title: '组织名称不能超过50个字符',
            icon: 'none'
          })
          return
        }
        
        if (!authUtil.requireLogin()) {
          return
        }
        
        this.submitting = true
        uni.showLoading({ title: '创建中...' })
        
        const token = authUtil.getToken()
        const result = await uniCloud.callFunction({
          name: 'organization-manage',
          data: {
            action: 'createOrganization',
            token,
            name: this.formData.name.trim(),
            description: this.formData.description.trim(),
            location: this.formData.location
          }
        })
        
        uni.hideLoading()
        
        if (result.result.code === 0) {
          uni.showToast({
            title: '创建成功',
            icon: 'success'
          })
          setTimeout(() => {
            uni.navigateBack()
          }, 1500)
        } else {
          uni.showToast({
            title: result.result.message || '创建失败',
            icon: 'none'
          })
        }
      } catch (error) {
        console.error('handleSubmit error:', error)
        uni.hideLoading()
        uni.showToast({
          title: '创建失败',
          icon: 'none'
        })
      } finally {
        this.submitting = false
      }
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
  padding: 0;
}

.form-container {
  background: #ffffff;
  padding: 40rpx 32rpx;
}

.form-group {
  margin-bottom: 40rpx;
}

.form-label {
  display: block;
  font-size: 28rpx;
  font-weight: 500;
  color: #1a1a1a;
  margin-bottom: 16rpx;
}

.required {
  color: #ff4444;
}

.form-label-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}

.btn-text {
  background: transparent;
  border: none;
  color: #667eea;
  font-size: 24rpx;
  padding: 0;
  height: auto;
}

.form-input,
.form-textarea {
  width: 100%;
  padding: 24rpx;
  background: #f8f8f8;
  border-radius: 12rpx;
  border: 1rpx solid #e5e5e5;
  font-size: 28rpx;
  color: #1a1a1a;
}

.form-textarea {
  min-height: 160rpx;
}

.location-info {
  padding: 20rpx 24rpx;
  background: #f0f4ff;
  border-radius: 12rpx;
  border: 1rpx solid #e6edff;
}

.location-text {
  font-size: 26rpx;
  color: #667eea;
}

.form-actions {
  margin-top: 80rpx;
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

.btn-primary[disabled] {
  opacity: 0.6;
}
</style>
