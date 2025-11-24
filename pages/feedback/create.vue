<template>
  <view class="page">
    <!-- 状态栏占位 -->
    <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
    
    <!-- 表单内容 -->
    <view class="form-section">
      <!-- 反馈类型 -->
      <view class="form-group">
        <view class="form-label">反馈类型</view>
        <view class="type-picker">
          <view 
            class="type-item" 
            :class="{ active: formData.type === item.value }"
            v-for="item in feedbackTypes" 
            :key="item.value"
            @click="selectType(item.value)"
          >
            <text class="type-icon">{{ item.icon }}</text>
            <text class="type-text">{{ item.label }}</text>
          </view>
        </view>
      </view>

      <!-- 标题 -->
      <view class="form-group">
        <view class="form-label">标题 <text class="required">*</text></view>
        <input 
          class="form-input" 
          v-model="formData.title"
          placeholder="请简要描述您的问题或建议"
          maxlength="50"
        />
      </view>

      <!-- 详细描述 -->
      <view class="form-group">
        <view class="form-label">详细描述 <text class="required">*</text></view>
        <textarea 
          class="form-textarea" 
          v-model="formData.content"
          placeholder="请详细描述您遇到的问题或想法，我们会认真查看"
          maxlength="500"
          :show-count="true"
        />
      </view>

      <!-- 图片上传 -->
      <view class="form-group">
        <view class="form-label">相关图片(可选)</view>
        <view class="image-upload">
          <view class="image-item" v-for="(img, index) in formData.images" :key="index">
            <image :src="img" mode="aspectFill" class="uploaded-img" />
            <view class="delete-btn" @click="deleteImage(index)">✕</view>
          </view>
          <view 
            class="upload-btn" 
            v-if="formData.images.length < 3"
            @click="chooseImage"
          >
            <text class="upload-icon">+</text>
            <text class="upload-text">添加图片</text>
          </view>
        </view>
        <text class="form-hint">最多上传3张图片</text>
      </view>

      <!-- 联系方式 -->
      <view class="form-group">
        <view class="form-label">联系方式(可选)</view>
        <input 
          class="form-input" 
          v-model="formData.contact"
          placeholder="方便我们与您联系"
          maxlength="50"
        />
      </view>
    </view>

    <!-- 提交按钮 -->
    <view class="submit-section">
      <button class="submit-btn" @click="handleSubmit" :disabled="submitting">
        {{ submitting ? '提交中...' : '提交反馈' }}
      </button>
    </view>

  </view>
</template>

<script>
import auth from '@/utils/auth.js'

export default {
  name: 'FeedbackCreate',
  data() {
    return {
      statusBarHeight: 0,
      submitting: false,
      feedbackTypes: [
        { value: 'bug', label: 'Bug反馈', icon: '🐛' },
        { value: 'feature', label: '功能建议', icon: '💡' },
        { value: 'other', label: '其他', icon: '📝' }
      ],
      formData: {
        type: 'feature',
        title: '',
        content: '',
        images: [],
        contact: ''
      }
    }
  },
  
  onLoad() {
    this.getStatusBarHeight()
    if (!auth.requireLogin()) {
      return
    }
    this.loadUserContact()
  },
  
  methods: {
    getStatusBarHeight() {
      const systemInfo = uni.getSystemInfoSync()
      this.statusBarHeight = systemInfo.statusBarHeight || 0
    },
    
    async loadUserContact() {
      try {
        const token = auth.getToken()
        const result = await uniCloud.callFunction({
          name: 'user-auth',
          data: {
            action: 'getUserInfo',
            token
          }
        })
        
        if (result.result.code === 0 && result.result.data) {
          const profile = result.result.data.profile
          this.formData.contact = profile.phone || profile.wechat_id || ''
        }
      } catch (error) {
        console.error('loadUserContact error:', error)
      }
    },
    
    selectType(type) {
      this.formData.type = type
    },
    
    chooseImage() {
      uni.chooseImage({
        count: 3 - this.formData.images.length,
        sizeType: ['compressed'],
        sourceType: ['album', 'camera'],
        success: (res) => {
          this.formData.images.push(...res.tempFilePaths)
        }
      })
    },
    
    deleteImage(index) {
      this.formData.images.splice(index, 1)
    },
    
    async handleSubmit() {
      // 验证
      if (!this.formData.title.trim()) {
        uni.showToast({ title: '请填写标题', icon: 'none' })
        return
      }
      if (!this.formData.content.trim()) {
        uni.showToast({ title: '请填写详细描述', icon: 'none' })
        return
      }
      
      try {
        this.submitting = true
        const token = auth.getToken()
        
        // 上传图片
        const imageUrls = []
        for (const imgPath of this.formData.images) {
          const uploadResult = await uniCloud.uploadFile({
            filePath: imgPath,
            cloudPath: `feedback/${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`
          })
          imageUrls.push(uploadResult.fileID)
        }
        
        // 提交反馈
        const result = await uniCloud.callFunction({
          name: 'feedback-manage',
          data: {
            action: 'create',
            token,
            type: this.formData.type,
            title: this.formData.title.trim(),
            content: this.formData.content.trim(),
            images: imageUrls,
            contact: this.formData.contact.trim()
          }
        })
        
        if (result.result.code === 0) {
          uni.showToast({
            title: '提交成功',
            icon: 'success'
          })
          setTimeout(() => {
            uni.navigateBack()
          }, 1500)
        } else {
          uni.showToast({
            title: result.result.message || '提交失败',
            icon: 'none'
          })
        }
      } catch (error) {
        console.error('handleSubmit error:', error)
        uni.showToast({
          title: '提交失败',
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
.page {
  min-height: 100vh;
  background-color: #EDEDED;
  padding-bottom: 120rpx;
}

.status-bar {
  background-color: #ffffff;
}

/* 表单区域 */
.form-section {
  background-color: #ffffff;
  padding: 40rpx;
}

.form-group {
  margin-bottom: 48rpx;
}

.form-group:last-child {
  margin-bottom: 0;
}

.form-label {
  font-size: 28rpx;
  color: #111;
  margin-bottom: 24rpx;
  font-weight: 500;
}

.required {
  color: #fa5151;
}

/* 类型选择 */
.type-picker {
  display: flex;
  gap: 24rpx;
}

.type-item {
  flex: 1;
  background-color: #f7f7f7;
  border-radius: 12rpx;
  padding: 24rpx 16rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  border: 2rpx solid transparent;
  transition: all 0.3s;
}

.type-item.active {
  background-color: #e8f4ea;
  border-color: #07c160;
}

.type-icon {
  font-size: 48rpx;
  margin-bottom: 12rpx;
}

.type-text {
  font-size: 24rpx;
  color: #7f7f7f;
}

.type-item.active .type-text {
  color: #07c160;
  font-weight: 500;
}

/* 输入框 */
.form-input {
  width: 100%;
  height: 88rpx;
  background-color: #f7f7f7;
  border-radius: 8rpx;
  padding: 0 24rpx;
  font-size: 28rpx;
  color: #111;
}

.form-textarea {
  width: 100%;
  min-height: 240rpx;
  background-color: #f7f7f7;
  border-radius: 8rpx;
  padding: 24rpx;
  font-size: 28rpx;
  color: #111;
  box-sizing: border-box;
}

.form-hint {
  display: block;
  font-size: 24rpx;
  color: #999999;
  margin-top: 16rpx;
}

/* 图片上传 */
.image-upload {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
}

.image-item {
  width: 200rpx;
  height: 200rpx;
  position: relative;
}

.uploaded-img {
  width: 100%;
  height: 100%;
  border-radius: 8rpx;
}

.delete-btn {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  width: 48rpx;
  height: 48rpx;
  background-color: rgba(0, 0, 0, 0.6);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  color: #ffffff;
  font-size: 32rpx;
}

.upload-btn {
  width: 200rpx;
  height: 200rpx;
  background-color: #f7f7f7;
  border-radius: 8rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  border: 2rpx dashed #d9d9d9;
}

.upload-icon {
  font-size: 64rpx;
  color: #cccccc;
  margin-bottom: 8rpx;
}

.upload-text {
  font-size: 24rpx;
  color: #999999;
}

/* 提交按钮 */
.submit-section {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background-color: #ffffff;
  padding: 24rpx 40rpx;
  padding-bottom: calc(24rpx + env(safe-area-inset-bottom));
  box-shadow: 0 -4rpx 16rpx rgba(0, 0, 0, 0.05);
}

.submit-btn {
  width: 100%;
  height: 88rpx;
  background-color: #07c160;
  color: #ffffff;
  border: none;
  border-radius: 8rpx;
  font-size: 32rpx;
  font-weight: 500;
  display: flex;
  align-items: center;
  justify-content: center;
}

.submit-btn[disabled] {
  background-color: #cccccc;
}
</style>
