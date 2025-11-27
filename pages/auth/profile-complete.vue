<template>
  <view class="page">
    <view class="header">
      <text class="title">完善个人信息</text>
      <text class="subtitle">{{ getSubtitle() }}</text>
    </view>
    
    <uni-forms ref="form" :model="formData" :rules="rules" class="form">
      <!-- 基本信息 - 仅显示未填写的字段 -->
      <view v-if="hasIncompleteBasicInfo" class="section-title">基本信息</view>
      
      <uni-forms-item v-if="!formData.name" label="姓名" name="name" required>
        <uni-easyinput v-model="formData.name" placeholder="请输入姓名" />
      </uni-forms-item>
      
      <uni-forms-item v-if="!formData.student_id" label="学号/工号" name="student_id" required>
        <uni-easyinput v-model="formData.student_id" placeholder="请输入学号或工号" />
      </uni-forms-item>
      
      <uni-forms-item v-if="!formData.college" label="学院" name="college" required>
        <uni-easyinput v-model="formData.college" placeholder="请输入学院" />
      </uni-forms-item>
      
      <uni-forms-item v-if="!formData.grade_major" label="年级专业" name="grade_major" required>
        <uni-easyinput v-model="formData.grade_major" placeholder="例如：2023级计算机科学与技术" />
      </uni-forms-item>
      
      <uni-forms-item v-if="!formData.phone" label="联系方式" name="phone" required>
        <uni-easyinput v-model="formData.phone" placeholder="请输入手机号" type="number" />
      </uni-forms-item>
      
      <uni-forms-item v-if="!formData.counselor" label="辅导员" name="counselor" required>
        <uni-easyinput v-model="formData.counselor" placeholder="请输入辅导员姓名" />
      </uni-forms-item>
      
      <uni-forms-item v-if="!formData.gender || formData.gender === 'other'" label="性别" name="gender" required>
        <radio-group @change="onGenderChange">
          <label class="radio-item"><radio value="male" :checked="formData.gender === 'male'" />男</label>
          <label class="radio-item"><radio value="female" :checked="formData.gender === 'female'" />女</label>
        </radio-group>
      </uni-forms-item>
      
      <!-- 扩展信息 - 如果基本信息已完善，显示扩展信息 -->
      <view v-if="!hasIncompleteBasicInfo || hasExtendedInfo" class="section-title">扩展信息</view>
      
      <uni-forms-item v-if="!hasIncompleteBasicInfo || hasExtendedInfo" label="QQ号" name="qq">
        <uni-easyinput v-model="formData.meta.qq" placeholder="请输入QQ号" type="number" />
      </uni-forms-item>
      
      <uni-forms-item v-if="!hasIncompleteBasicInfo || hasExtendedInfo" label="微信号" name="wechat">
        <uni-easyinput v-model="formData.meta.wechat" placeholder="请输入微信号" />
      </uni-forms-item>
      
      <uni-forms-item v-if="!hasIncompleteBasicInfo || hasExtendedInfo" label="邮箱" name="email">
        <uni-easyinput v-model="formData.meta.email" placeholder="请输入邮箱" type="email" />
      </uni-forms-item>
    </uni-forms>
    
    <button class="submit-btn" @click="submitForm" :loading="submitting" :disabled="submitting">
      {{ submitting ? '提交中...' : '保存' }}
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
  
  computed: {
    hasIncompleteBasicInfo() {
      return !this.formData.name || 
             !this.formData.student_id || 
             !this.formData.college || 
             !this.formData.grade_major || 
             !this.formData.phone || 
             !this.formData.counselor || 
             !this.formData.gender ||
             this.formData.gender === 'other'
    },
    hasExtendedInfo() {
      return this.formData.meta.qq || this.formData.meta.wechat || this.formData.meta.email
    }
  },
  
  onLoad(options) {
    this.redirectUrl = options.redirect || ''
    this.loadProfile()
  },
  
  onBackPress() {
    // 拦截返回按钮，检查信息是否完善
    if (this.hasIncompleteBasicInfo) {
      // 信息未完善，提示用户
      uni.showModal({
        title: '提示',
        content: '信息还未完全完善，是否退出？将会丢失未保存的信息',
        confirmText: '确定退出',
        cancelText: '继续填写',
        confirmColor: '#fa5151',
        success: (res) => {
          if (res.confirm) {
            // 用户确认退出
            uni.navigateBack()
          }
          // res.cancel 时不做任何操作，留在当前页面
        }
      })
      return true // 阻止默认返回行为
    } else {
      // 信息已完善，提示并退出
      uni.showToast({
        title: '✅ 已完善信息',
        icon: 'success',
        duration: 1500
      })
      // 允许正常返回
      return false
    }
  },
  
  methods: {
    getSubtitle() {
      if (this.hasIncompleteBasicInfo) {
        return '请填写您的基本信息'
      } else {
        return '继续完善您的扩展信息'
      }
    },
    
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
        // 表单验证 - 只验证显示的必填字段
        const basicFieldsToValidate = []
        
        if (!this.formData.name) basicFieldsToValidate.push('name')
        if (!this.formData.student_id) basicFieldsToValidate.push('student_id')
        if (!this.formData.college) basicFieldsToValidate.push('college')
        if (!this.formData.grade_major) basicFieldsToValidate.push('grade_major')
        if (!this.formData.phone) basicFieldsToValidate.push('phone')
        if (!this.formData.counselor) basicFieldsToValidate.push('counselor')
        if (!this.formData.gender || this.formData.gender === 'other') basicFieldsToValidate.push('gender')
        
        // 如果有必填字段未填写，进行验证
        if (basicFieldsToValidate.length > 0) {
          await this.$refs.form.validate()
        }
        
        this.submitting = true
        
        console.log('[ProfileComplete] 提交表单数据:', this.formData)
        
        const data = await authAPI.updateProfile(this.formData)
        
        console.log('[ProfileComplete] 提交成功，返回数据:', data)
        
        uni.showToast({
          title: '✅ 保存成功',
          icon: 'success',
          duration: 1500
        })
        
        setTimeout(() => {
          if (this.redirectUrl) {
            const url = decodeURIComponent(this.redirectUrl)
            console.log('[ProfileComplete] 重定向到:', url)
            uni.reLaunch({ 
              url,
              fail: (err) => {
                console.error('[ProfileComplete] 重定向失败:', err)
                uni.reLaunch({ url: '/pages/welcome/welcome' })
              }
            })
          } else {
            console.log('[ProfileComplete] 跳转到主页')
            uni.reLaunch({ url: '/pages/welcome/welcome' })
          }
        }, 1500)
      } catch (error) {
        console.error('[ProfileComplete] 提交失败:', error)
        
        let errorMsg = '提交失败，请重试'
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
