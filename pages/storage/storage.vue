<template>
	<view class="content">
		<view class="header-nav">
			<view class="back-btn" @click="goHome">
				<text class="back-icon">←</text>
				<text class="back-text">返回主页</text>
			</view>
		</view>
		<view class="btn-list">
			<button type="primary" plain @click="pageTo('/pages/storage/space-storage')">空间内置云存储</button>
			<text class="tips">演示空间自带的云储存</text>
			<button type="primary" plain @click="pageTo('/pages/storage/ext-storage-qiniu')">扩展存储-七牛云</button>
			<text class="tips">演示扩展存储-七牛云</text>
		</view>
	</view>
</template>

<script>
	export default {
		data() {
			return {}
		},
		mounted() {},
		methods: {
			goHome() {
				uni.reLaunch({
					url: '/pages/home/home'
				})
			},
			pageTo(url){
				uni.navigateTo({
					url
				});
			}
		}
	}
</script>

<style>
	.content {
		padding-bottom: 30px;
	}

	.tips {
		color: #999999;
		font-size: 14px;
		padding: 20px 30px;
	}

	.btn-list {
		padding: 0px 30px;
	}

	.btn-list button {
		margin-top: 20px;
	}
	
	.header-nav {
		padding: 20rpx 30rpx;
		background: #f8f8f8;
		border-bottom: 1rpx solid #e5e5e5;
	}
	
	.back-btn {
		display: flex;
		align-items: center;
		padding: 20rpx 0;
	}
	
	.back-icon {
		font-size: 36rpx;
		color: #007aff;
		margin-right: 10rpx;
	}
	
	.back-text {
		font-size: 32rpx;
		color: #007aff;
	}

</style>
