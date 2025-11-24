<template>
  <view class="profile-complete">
    <view class="header">
      <text class="title">完善个人信息</text>
      <text class="subtitle">加入组织前需要完成所有必填信息</text>
    </view>
    
    <view class="form-container">
      <uni-forms ref="form" :model="formData" :rules="rules" label-width="120px">
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
            <label class="radio-item"><radio value="other" :checked="formData.gender === 'other'" />其他</label>
          </radio-group>
        </uni-forms-item>
        
        <!-- 扩展信息 -->
        <view class="section-title">扩展信息（至少填写一项）</view>
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
    </view>
    
    <view class="submit-container">
      <button class="submit-btn" @click="submitForm" :loading="submitting" :disabled="submitting">
        {{ submitting ? '提交中...' : '完成' }}
      </button>
    </view>
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
        gender: 'other',
        meta: {
          qq: '',
          wechat: '',
          email: ''
        }
      },
      submitting: false,
      redirectUrl: '',
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
  
  onLoad(options) {
    this.redirectUrl = options.redirect || ''
    this.loadProfile()
  },
  
  methods: {
    async loadProfile() {
      try {
        const result = await authAPI.getUserInfo()
        if (result.code === 0 && result.data.profile) {
          const profile = result.data.profile
          this.formData = {
            name: profile.name || '',
            student_id: profile.student_id || '',
            college: profile.college || '',
            grade_major: profile.grade_major || '',
            phone: profile.phone || '',
            counselor: profile.counselor || '',
            gender: profile.gender || 'other',
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
    
    onGenderChange(e) {
      this.formData.gender = e.detail.value
    },
    
    async submitForm() {
      try {
        await this.$refs.form.validate()
        
        // 验证至少填写一项扩展信息
        if (!this.formData.meta.qq && !this.formData.meta.wechat && !this.formData.meta.email) {
          uni.showToast({
            title: 'QQ、微信、邮箱至少填写一项',
            icon: 'none'
          })
          return
        }
        
        this.submitting = true
        
        const result = await authAPI.updateProfile(this.formData)
        
        if (result.code === 0) {
          uni.showToast({
            title: '信息完善成功',
            icon: 'success'
          })
          
          setTimeout(() => {
            if (this.redirectUrl) {
              uni.redirectTo({ url: decodeURIComponent(this.redirectUrl) })
            } else {
              uni.switchTab({ url: '/pages/welcome/welcome' })
            }
          }, 1500)
        } else {
          throw new Error(result.message || '提交失败')
        }
      } catch (error) {
        console.error('提交失败:', error)
        uni.showToast({
          title: error.message || '提交失败',
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
.profile-complete {
  min-height: 100vh;
  padding: 40rpx 20rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

.header {
  text-align: center;
  padding: 60rpx 0 40rpx;
  background-color: #fff;
  border-radius: 20rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.1);
}

.title {
  display: block;
  font-size: 40rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 16rpx;
}

.subtitle {
  display: block;
  font-size: 28rpx;
  color: #666;
}

.form-container {
  background-color: #fff;
  border-radius: 20rpx;
  padding: 40rpx 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.1);
}

.section-title {
  font-size: 30rpx;
  font-weight: bold;
  color: #333;
  margin: 30rpx 0 20rpx;
  padding-left: 20rpx;
  border-left: 6rpx solid #667eea;
}

.section-title:first-child {
  margin-top: 0;
}

.radio-item {
  margin-right: 40rpx;
  display: inline-flex;
  align-items: center;
}

.submit-container {
  padding: 0 30rpx;
}

.submit-btn {
  width: 100%;
  height: 88rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: #fff;
  border: none;
  border-radius: 44rpx;
  font-size: 32rpx;
  font-weight: bold;
  box-shadow: 0 4rpx 20rpx rgba(102, 126, 234, 0.4);
}

.submit-btn:active {
  transform: translateY(2rpx);
  box-shadow: 0 2rpx 10rpx rgba(102, 126, 234, 0.3);
}

.submit-btn:disabled {
  opacity: 0.6;
}
</style>
