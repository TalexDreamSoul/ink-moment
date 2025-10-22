<template>
  <view class="profile-edit">
    <view class="header">
      <text class="title">完善个人信息</text>
      <text class="subtitle">请填写您的详细信息</text>
    </view>
    
    <view class="form-container">
      <uni-forms ref="form" :model="formData" :rules="rules" label-width="100px">
        <uni-forms-item label="姓名" required>
          <uni-easyinput 
            v-model="formData.name" 
            placeholder="请输入姓名"
            :clearable="false"
          />
        </uni-forms-item>
        
        <uni-forms-item label="学号" required>
          <uni-easyinput 
            v-model="formData.student_id" 
            placeholder="请输入学号"
            :clearable="false"
          />
        </uni-forms-item>
        
        <uni-forms-item label="学院" required>
          <view class="college-picker">
            <uni-data-picker 
              v-model="formData.college" 
              :localdata="colleges"
              placeholder="请选择学院"
              @change="onCollegeChange"
            />
            <input 
              v-if="showCustomCollege" 
              v-model="customCollege" 
              placeholder="请输入其他学院"
              class="custom-college-input"
            />
          </view>
        </uni-forms-item>
        
        <uni-forms-item label="年级专业" required>
          <uni-easyinput 
            v-model="formData.grade_major" 
            placeholder="请输入年级专业"
            :clearable="false"
          />
        </uni-forms-item>
        
        <uni-forms-item label="联系方式" required>
          <uni-easyinput 
            v-model="formData.phone" 
            placeholder="请输入手机号"
            type="number"
            :clearable="false"
          />
        </uni-forms-item>
        
        <uni-forms-item label="辅导员" required>
          <uni-easyinput 
            v-model="formData.counselor" 
            placeholder="请输入辅导员姓名"
            :clearable="false"
          />
        </uni-forms-item>
        
        <uni-forms-item label="性别">
          <uni-data-picker 
            v-model="formData.gender" 
            :localdata="genders"
            placeholder="请选择性别"
          />
        </uni-forms-item>
        
        <uni-forms-item label="QQ号">
          <uni-easyinput 
            v-model="formData.meta.qq" 
            placeholder="请输入QQ号(可选)"
            type="number"
            :clearable="false"
          />
        </uni-forms-item>
        
        <uni-forms-item label="微信号">
          <uni-easyinput 
            v-model="formData.meta.wechat" 
            placeholder="请输入微信号(可选)"
            :clearable="false"
          />
        </uni-forms-item>
        
        <uni-forms-item label="邮箱">
          <uni-easyinput 
            v-model="formData.meta.email" 
            placeholder="请输入邮箱(可选)"
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
        {{ submitting ? '提交中...' : '提交信息' }}
      </button>
    </view>
    
    <view class="tips">
      <text class="tips-title">温馨提示：</text>
      <text class="tips-content">• 学号具有唯一性，请确保输入正确</text>
      <text class="tips-content">• 信息提交后可在个人中心修改</text>
      <text class="tips-content">• 请确保信息真实有效</text>
    </view>
  </view>
</template>

<script>
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
          email: '',
          avatar: '',
          birthday: null,
          address: '',
          emergency_contact: '',
          emergency_phone: ''
        }
      },
      customCollege: '',
      showCustomCollege: false,
      submitting: false,
      colleges: [
        { value: '计算机学院', text: '计算机学院' },
        { value: '数字经济学院', text: '数字经济学院' },
        { value: '艺术学院', text: '艺术学院' },
        { value: '文学与传媒学院', text: '文学与传媒学院' },
        { value: '商学院', text: '商学院' },
        { value: 'other', text: '其他(自定义)' }
      ],
      genders: [
        { value: 'male', text: '男' },
        { value: 'female', text: '女' },
        { value: 'other', text: '其他' }
      ],
      rules: {
        name: {
          rules: [
            { required: true, errorMessage: '请输入姓名' },
            { minLength: 1, maxLength: 20, errorMessage: '姓名长度为1-20个字符' }
          ]
        },
        student_id: {
          rules: [
            { required: true, errorMessage: '请输入学号' },
            { minLength: 1, maxLength: 20, errorMessage: '学号长度为1-20个字符' }
          ]
        },
        college: {
          rules: [
            { required: true, errorMessage: '请选择学院' }
          ]
        },
        grade_major: {
          rules: [
            { required: true, errorMessage: '请输入年级专业' },
            { minLength: 1, maxLength: 50, errorMessage: '年级专业长度为1-50个字符' }
          ]
        },
        phone: {
          rules: [
            { required: true, errorMessage: '请输入联系方式' },
            { pattern: /^1[3-9]\d{9}$/, errorMessage: '请输入正确的手机号' }
          ]
        },
        counselor: {
          rules: [
            { required: true, errorMessage: '请输入辅导员姓名' },
            { minLength: 1, maxLength: 20, errorMessage: '辅导员姓名长度为1-20个字符' }
          ]
        }
      }
    }
  },
  
  onLoad() {
    // 如果是编辑模式，加载现有数据
    if (this.$route.query.edit === 'true') {
      this.loadUserProfile()
    }
  },
  
  methods: {
    onCollegeChange(e) {
      if (e === 'other') {
        this.showCustomCollege = true
        this.formData.college = ''
      } else {
        this.showCustomCollege = false
        this.formData.college = e
      }
    },
    
    async loadUserProfile() {
      try {
        uni.showLoading({ title: '加载中...' })
        
        // 从本地存储获取用户信息
        const userInfo = uni.getStorageSync('userInfo')
        if (userInfo) {
          this.formData.name = userInfo.nickName || ''
          this.formData.meta.avatar = userInfo.avatarUrl || ''
        }
      } catch (error) {
        console.error('loadUserProfile error:', error)
        uni.showToast({
          title: '加载失败',
          icon: 'none'
        })
      } finally {
        uni.hideLoading()
      }
    },
    
    async submitForm() {
      try {
        // 表单验证
        await this.$refs.form.validate()
        
        // 处理自定义学院
        if (this.showCustomCollege && this.customCollege) {
          this.formData.college = this.customCollege
        }
        
        if (!this.formData.college) {
          uni.showToast({
            title: '请选择或输入学院',
            icon: 'none'
          })
          return
        }
        
        this.submitting = true
        
        // 保存用户信息到本地存储
        const userProfile = {
          ...this.formData,
          is_completed: true,
          updated_at: new Date().toISOString()
        }
        
        uni.setStorageSync('userProfile', userProfile)
        
        uni.showToast({
          title: '信息提交成功',
          icon: 'success'
        })
        
        // 延迟跳转到主页
        setTimeout(() => {
          uni.reLaunch({
            url: '/pages/home/index'
          })
        }, 1500)
      } catch (error) {
        console.error('submitForm error:', error)
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
  padding: 20rpx;
  background-color: #f8f8f8;
  min-height: 100vh;
}

.header {
  text-align: center;
  padding: 40rpx 0;
  background-color: #fff;
  border-radius: 20rpx;
  margin-bottom: 20rpx;
}

.title {
  display: block;
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  margin-bottom: 10rpx;
}

.subtitle {
  display: block;
  font-size: 28rpx;
  color: #666;
}

.form-container {
  background-color: #fff;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 20rpx;
}

.college-picker {
  width: 100%;
}

.custom-college-input {
  width: 100%;
  height: 80rpx;
  border: 2rpx solid #e5e5e5;
  border-radius: 10rpx;
  padding: 0 20rpx;
  margin-top: 20rpx;
  font-size: 28rpx;
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
  display: flex;
  align-items: center;
  justify-content: center;
}

.submit-btn:disabled {
  background: #ccc;
}

.tips {
  background-color: #fff;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-top: 20rpx;
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
  line-height: 1.6;
  margin-bottom: 10rpx;
}
</style>
