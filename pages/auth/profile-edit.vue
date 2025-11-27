<template>
  <view class="page">
    <view class="header">
      <text class="title">编辑资料</text>
      <text class="subtitle">完善您的个人信息</text>
    </view>
    
    <!-- 头像选择 -->
    <view class="avatar-section">
      <view class="avatar-container" @click="chooseAvatar">
        <image 
          v-if="formData.avatar_url" 
          :src="formData.avatar_url" 
          class="avatar-img"
          mode="aspectFill"
        />
        <text v-else-if="formData.name" class="avatar-text">{{ formData.name.charAt(0) }}</text>
        <text v-else class="avatar-icon">👤</text>
        <view class="avatar-overlay">
          <text class="avatar-tip">{{ uploadingAvatar ? '上传中...' : '点击更换头像' }}</text>
        </view>
      </view>
    </view>
    
    <uni-forms ref="form" :model="formData" :rules="rules" class="form">
      <!-- 基本信息 -->
      <view class="section-title">基本信息</view>
      
      <uni-forms-item label="姓名" name="name" required>
        <uni-easyinput v-model="formData.name" placeholder="请输入姓名" />
      </uni-forms-item>
      
      <uni-forms-item label="学号/工号" name="student_id" required>
        <uni-easyinput v-model="formData.student_id" placeholder="请输入学号或工号" />
      </uni-forms-item>
      
      <uni-forms-item label="学院" name="college" required>
        <uni-easyinput v-model="formData.college" placeholder="请输入学院" />
      </uni-forms-item>
      
      <uni-forms-item label="年级专业" name="grade_major" required>
        <uni-easyinput v-model="formData.grade_major" placeholder="例如：2023级计算机科学与技术" />
      </uni-forms-item>
      
      <uni-forms-item label="联系方式" name="phone" required>
        <uni-easyinput v-model="formData.phone" placeholder="请输入手机号" type="number" />
      </uni-forms-item>
      
      <uni-forms-item label="辅导员" name="counselor" required>
        <uni-easyinput v-model="formData.counselor" placeholder="请输入辅导员姓名" />
      </uni-forms-item>
      
      <uni-forms-item label="性别" name="gender" required>
        <radio-group @change="onGenderChange">
          <label class="radio-item"><radio value="male" :checked="formData.gender === 'male'" />男</label>
          <label class="radio-item"><radio value="female" :checked="formData.gender === 'female'" />女</label>
        </radio-group>
      </uni-forms-item>
      
      <!-- 扩展信息 -->
      <view class="section-title">扩展信息</view>
      
      <uni-forms-item label="QQ号" name="qq">
        <uni-easyinput v-model="formData.meta.qq" placeholder="请输入QQ号" type="number" />
      </uni-forms-item>
      
      <uni-forms-item label="微信号" name="wechat">
        <uni-easyinput v-model="formData.meta.wechat" placeholder="请输入微信号" />
      </uni-forms-item>
      
      <uni-forms-item label="邮箱" name="email">
        <uni-easyinput v-model="formData.meta.email" placeholder="请输入邮箱" type="email" />
      </uni-forms-item>
    </uni-forms>
    
    <button class="submit-btn" @click="submitForm" :loading="submitting" :disabled="submitting">
      {{ submitting ? '保存中...' : '保存' }}
    </button>
  </view>
</template>

<script>
import auth from '@/utils/auth.js'
import { authAPI } from '@/utils/request.js'

export default {
  data() {
    return {
      formData: {
        name: '',
        student_id: '',
        college: '',
        grade_major: '',
        phone: '',
        counselor: '',
        gender: 'male',
        avatar_url: '',
        meta: {
          qq: '',
          wechat: '',
          email: ''
        }
      },
      submitting: false,
      uploadingAvatar: false,
      rules: {
        name: { rules: [{ required: true, errorMessage: '请输入姓名' }] },
        student_id: { rules: [{ required: true, errorMessage: '请输入学号/工号' }] },
        college: { rules: [{ required: true, errorMessage: '请输入学院' }] },
        grade_major: { rules: [{ required: true, errorMessage: '请输入年级专业' }] },
        phone: { rules: [
          { required: true, errorMessage: '请输入联系方式' },
          { pattern: /^1[3-9]\d{9}$/, errorMessage: '请输入有效的手机号' }
        ]},
        counselor: { rules: [{ required: true, errorMessage: '请输入辅导员' }] },
        gender: { rules: [{ required: true, errorMessage: '请选择性别' }] }
      }
    }
  },
  
  onLoad() {
    this.loadProfile()
  },
  
  methods: {
    async loadProfile() {
      try {
        const result = await authAPI.getUserInfo()
        if (result && result.profile) {
          const profile = result.profile
          this.formData = {
            name: profile.name || '',
            student_id: profile.student_id || '',
            college: profile.college || '',
            grade_major: profile.grade_major || '',
            phone: profile.phone || '',
            counselor: profile.counselor || '',
            gender: profile.gender || 'male',
            avatar_url: profile.avatar_url || '',
            meta: {
              qq: profile.meta?.qq || '',
              wechat: profile.meta?.wechat || '',
              email: profile.meta?.email || ''
            }
          }
        }
      } catch (error) {
        console.error('加载资料失败:', error)
      }
    },
    
    async chooseAvatar() {
      uni.showActionSheet({
        itemList: ['从微信获取头像', '从相册选择'],
        success: async (res) => {
          if (res.tapIndex === 0) {
            // 从微信获取头像
            await this.getWxAvatar()
          } else if (res.tapIndex === 1) {
            // 从相册选择
            await this.chooseImage()
          }
        }
      })
    },
    
    async getWxAvatar() {
      try {
        this.uploadingAvatar = true
        const userInfo = await this.getWxUserInfo()
        this.formData.avatar_url = userInfo.avatarUrl
        uni.showToast({
          title: '头像已更新',
          icon: 'success'
        })
      } catch (error) {
        console.error('[ProfileEdit] 获取微信头像失败:', error)
        uni.showToast({
          title: '获取头像失败',
          icon: 'none'
        })
      } finally {
        this.uploadingAvatar = false
      }
    },
    
    getWxUserInfo() {
      return new Promise((resolve, reject) => {
        // #ifdef MP-WEIXIN
        uni.getUserProfile({
          desc: '用于更新头像',
          success: (res) => {
            resolve(res.userInfo)
          },
          fail: reject
        })
        // #endif
        
        // #ifndef MP-WEIXIN
        uni.getUserInfo({
          success: (res) => {
            resolve(res.userInfo)
          },
          fail: reject
        })
        // #endif
      })
    },
    
    async chooseImage() {
      try {
        this.uploadingAvatar = true
        const res = await new Promise((resolve, reject) => {
          uni.chooseImage({
            count: 1,
            sizeType: ['compressed'],
            sourceType: ['album', 'camera'],
            success: resolve,
            fail: reject
          })
        })
        
        if (res.tempFilePaths && res.tempFilePaths.length > 0) {
          // 这里简化处理，直接使用临时路径
          // 实际项目中应该上传到云存储
          this.formData.avatar_url = res.tempFilePaths[0]
          uni.showToast({
            title: '头像已更新',
            icon: 'success'
          })
        }
      } catch (error) {
        console.error('[ProfileEdit] 选择图片失败:', error)
        if (error.errMsg && !error.errMsg.includes('cancel')) {
          uni.showToast({
            title: '选择图片失败',
            icon: 'none'
          })
        }
      } finally {
        this.uploadingAvatar = false
      }
    },
    
    onGenderChange(e) {
      this.formData.gender = e.detail.value
    },
    
    async submitForm() {
      try {
        await this.$refs.form.validate()
        
        this.submitting = true
        
        await authAPI.updateProfile(this.formData)
        
        uni.showToast({
          title: '✅ 保存成功',
          icon: 'success',
          duration: 1500
        })
        
        setTimeout(() => {
          uni.navigateBack()
        }, 1500)
      } catch (error) {
        console.error('[ProfileEdit] 提交失败:', error)
        
        let errorMsg = '保存失败，请重试'
        if (error.message) {
          errorMsg = error.message
        } else if (error.errMsg) {
          errorMsg = error.errMsg
        }
        
        if (errorMsg.includes('验证') || errorMsg.includes('rules')) {
          errorMsg = '请检查表单信息是否填写正确'
        }
        
        uni.showToast({
          title: errorMsg,
          icon: 'none',
          duration: 2500
        })
      } finally {
        this.submitting = false
      }
    }
  }
}
</script>

<style scoped>
page {
  background: #fff;
}

.page {
  min-height: 100vh;
  padding: 0 32rpx;
  background: #fff;
}

.header {
  text-align: center;
  padding: 80rpx 0 60rpx;
}

.title {
  display: block;
  font-size: 44rpx;
  font-weight: 500;
  color: #000;
  margin-bottom: 12rpx;
}

.subtitle {
  display: block;
  font-size: 26rpx;
  color: #999;
}

.avatar-section {
  display: flex;
  justify-content: center;
  padding: 40rpx 0 20rpx;
}

.avatar-container {
  position: relative;
  width: 160rpx;
  height: 160rpx;
  border-radius: 50%;
  overflow: hidden;
  background: #F5F5F5;
  border: 3rpx solid #E0E0E0;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.avatar-img {
  width: 100%;
  height: 100%;
}

.avatar-text {
  font-size: 64rpx;
  font-weight: 600;
  color: #666;
}

.avatar-icon {
  font-size: 80rpx;
  color: #CCCCCC;
}

.avatar-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.6);
  padding: 8rpx 0;
  text-align: center;
}

.avatar-tip {
  font-size: 20rpx;
  color: #FFFFFF;
}

.form {
  margin-bottom: 60rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #000;
  margin: 48rpx 0 24rpx;
}

.section-title:first-child {
  margin-top: 0;
}

.radio-item {
  margin-right: 48rpx;
  display: inline-flex;
  align-items: center;
  font-size: 28rpx;
  color: #000;
}

.submit-btn {
  width: 100%;
  height: 88rpx;
  background: #000;
  color: #fff;
  border: none;
  border-radius: 8rpx;
  font-size: 32rpx;
  font-weight: 400;
  margin-bottom: 40rpx;
}

.submit-btn:active {
  opacity: 0.7;
}

.submit-btn:disabled {
  opacity: 0.3;
}
</style>
