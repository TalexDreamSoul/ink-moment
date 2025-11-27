<template>
  <view class="custom-navbar">
    <!-- 状态栏占位 -->
    <view class="status-bar" :style="{ height: statusBarHeight + 'px' }"></view>
    
    <!-- 导航栏 -->
    <view class="navbar">
      <!-- 左侧返回按钮 -->
      <view class="navbar-left" @click="handleBack" v-if="showBack">
        <view class="back-btn">
          <text class="back-icon">‹</text>
          <text class="back-text" v-if="backText">{{ backText }}</text>
        </view>
      </view>
      <view class="navbar-left" v-else></view>
      
      <!-- 中间标题 -->
      <view class="navbar-center">
        <text class="navbar-title">{{ title }}</text>
      </view>
      
      <!-- 右侧插槽 -->
      <view class="navbar-right">
        <slot name="right"></slot>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: 'CustomNavbar',
  props: {
    // 标题
    title: {
      type: String,
      default: ''
    },
    // 是否显示返回按钮
    showBack: {
      type: Boolean,
      default: true
    },
    // 返回按钮文字
    backText: {
      type: String,
      default: ''
    },
    // 背景色
    backgroundColor: {
      type: String,
      default: '#F8F8F8'
    },
    // 标题颜色
    titleColor: {
      type: String,
      default: '#000000'
    }
  },
  data() {
    return {
      statusBarHeight: 0,
      navbarHeight: 44
    }
  },
  mounted() {
    this.getSystemInfo()
  },
  methods: {
    getSystemInfo() {
      const systemInfo = uni.getSystemInfoSync()
      this.statusBarHeight = systemInfo.statusBarHeight || 0
    },
    
    handleBack() {
      this.$emit('back')
      // 如果没有监听 back 事件，默认执行 navigateBack
      if (!this.$listeners.back) {
        const pages = getCurrentPages()
        if (pages.length > 1) {
          uni.navigateBack()
        } else {
          uni.switchTab({
            url: '/pages/welcome/welcome'
          })
        }
      }
    }
  }
}
</script>

<style scoped>
.custom-navbar {
  width: 100%;
  position: fixed;
  top: 0;
  left: 0;
  z-index: 999;
  background-color: #F8F8F8;
}

.status-bar {
  width: 100%;
}

.navbar {
  height: 44px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 16rpx;
  position: relative;
}

.navbar-left {
  width: 120rpx;
  display: flex;
  align-items: center;
  justify-content: flex-start;
}

.back-btn {
  display: flex;
  align-items: center;
  padding: 8rpx 16rpx;
  border-radius: 8rpx;
  transition: background-color 0.2s;
}

.back-btn:active {
  background-color: rgba(0, 0, 0, 0.05);
}

.back-icon {
  font-size: 48rpx;
  font-weight: 300;
  color: #000000;
  line-height: 1;
  margin-right: 4rpx;
}

.back-text {
  font-size: 32rpx;
  color: #000000;
}

.navbar-center {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  position: absolute;
  left: 50%;
  transform: translateX(-50%);
}

.navbar-title {
  font-size: 36rpx;
  font-weight: 600;
  color: #000000;
  max-width: 400rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.navbar-right {
  width: 120rpx;
  display: flex;
  align-items: center;
  justify-content: flex-end;
}
</style>
