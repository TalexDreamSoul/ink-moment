<template>
  <view class="profile-edit">
    <view class="header">
      <text class="title">{{ isFirstUser ? '欢迎使用 溯间砚时' : '完善个人信息' }}</text>
      <text class="subtitle">{{ isFirstUser ? '您是第一位用户，将自动获得管理员权限' : '请填写您的基本信息' }}</text>
    </view>
    
    <view class="form-container">
      <uni-forms ref="form" :model="formData" :rules="rules" label-width="100px">
        <uni-forms-item label="姓名" name="name" required>
          <uni-easyinput 
            v-model="formData.name" 
            placeholder="请输入姓名"
            :clearable="false"
          />
        </uni-forms-item>
        
        <uni-forms-item label="学号/工号" name="student_id" required>
          <uni-easyinput 
            v-model="formData.student_id" 
            placeholder="请输入学号或工号"
            :clearable="false"
          />
        </uni-forms-item>
      </uni-forms>
    </view>
    
    <view class="submit-container">
      <button 
        class="submit-btn" 
        @click="submitForm"
        :loading="submitting"
        :disabled="submitting"
      >
        {{ submitting ? '提交中...' : '完成' }}
      </button>
    </view>
    
    <view class="tips">
      <text class="tips-title">温馨提示：</text>
      <text class="tips-content">• 只需填写姓名和学号/工号即可开始使用</text>
      <text class="tips-content">• 如需加入组织，可在个人中心完善其他信息</text>
      <text class="tips-content">• 信息提交后可随时在个人中心修改</text>
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
        student_id: ''
      },
      submitting: false,
      isFirstUser: false,
      rules: {
        name: {
          rules: [
            { required: true, errorMessage: '请输入姓名' },
            { minLength: 1, maxLength: 20, errorMessage: '姓名长度为1-20个字符' }
          ]
        },
        student_id: {
          rules: [
            { required: true, errorMessage: '请输入学号/工号' },
            { minLength: 1, maxLength: 20, errorMessage: '学号/工号长度为1-20个字符' }
          ]
        }
      }
    }
  },
  
  onLoad(options) {
    this.isFirstUser = options.firstUser === 'true'
  },
  
  methods: {
    async submitForm() {
      try {
        // 表单验证
        await this.$refs.form.validate()
        
        this.submitting = true
        
        // 通过云函数保存用户信息
        const result = await authAPI.updateProfile({
          ...this.formData,
          is_completed: true
        })
        
        // 检查是否是第一个用户（管理员）
        const isFirstUser = result && result.isFirstUser
        
        const successMsg = isFirstUser 
          ? '🎉 欢迎！您已成为系统管理员' 
          : '✅ 信息提交成功'

        uni.showToast({
          title: successMsg,
          icon: 'success',
          duration: isFirstUser ? 3000 : 2000
        })
        
        // 延迟跳转到主页
        setTimeout(() => {
          uni.switchTab({
            url: '/pages/welcome/welcome'
          })
        }, isFirstUser ? 3000 : 1500)
      } catch (error) {
        console.error('[ProfileEdit] 提交失败:', error)
        if (error.message) {
          uni.showToast({
            title: error.message,
            icon: 'none'
          })
        }
      } finally {
        this.submitting = false
      }
    }
  }
}
</script>

<style scoped>
.profile-edit {
  min-height: 100vh;
  height: 100%;
  padding: 40rpx 20rpx;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  flex-direction: column;
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
  line-height: 1.5;
}

.form-container {
  background-color: #fff;
  border-radius: 20rpx;
  padding: 40rpx 30rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.1);
}

.submit-container {
  padding: 0 30rpx;
  margin-bottom: 20rpx;
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
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4rpx 20rpx rgba(102, 126, 234, 0.4);
  transition: all 0.3s ease;
}

.submit-btn:active {
  transform: translateY(2rpx);
  box-shadow: 0 2rpx 10rpx rgba(102, 126, 234, 0.3);
}

.submit-btn:disabled {
  background: #ccc;
  box-shadow: none;
}

.tips {
  background-color: rgba(255, 255, 255, 0.95);
  border-radius: 20rpx;
  padding: 30rpx;
  box-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.1);
}

.tips-title {
  display: block;
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 20rpx;
}

.tips-content {
  display: block;
  font-size: 26rpx;
  color: #666;
  line-height: 1.8;
  margin-bottom: 10rpx;
}

/* 微信小程序兼容 */
/* #ifdef MP-WEIXIN */
.profile-edit { 
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
}
.submit-btn { 
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
  color: #ffffff;
}
/* #endif */
</style>
