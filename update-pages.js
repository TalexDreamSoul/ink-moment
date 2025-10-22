const fs = require('fs');
const path = require('path');

// 页面配置
const pageConfigs = [
  { file: 'pages/volunteer/statistics.vue', name: 'VolunteerStatistics', title: '时长统计', message: '时长统计功能开发中' },
  { file: 'pages/volunteer/export.vue', name: 'VolunteerExport', title: '数据导出', message: '数据导出功能开发中' },
  { file: 'pages/organization/list.vue', name: 'OrganizationList', title: '我的组织', message: '组织列表功能开发中' },
  { file: 'pages/organization/join.vue', name: 'OrganizationJoin', title: '加入组织', message: '加入组织功能开发中' },
  { file: 'pages/organization/detail.vue', name: 'OrganizationDetail', title: '组织详情', message: '组织详情功能开发中' },
  { file: 'pages/organization/create.vue', name: 'OrganizationCreate', title: '创建组织', message: '创建组织功能开发中' },
  { file: 'pages/supervisor/audit-list.vue', name: 'SupervisorAuditList', title: '待审核', message: '审核列表功能开发中' },
  { file: 'pages/supervisor/audit-detail.vue', name: 'SupervisorAuditDetail', title: '审核详情', message: '审核详情功能开发中' },
  { file: 'pages/supervisor/statistics.vue', name: 'SupervisorStatistics', title: '督导统计', message: '督导统计功能开发中' },
  { file: 'pages/admin/home.vue', name: 'AdminHome', title: '管理员', message: '管理员功能开发中' },
  { file: 'pages/admin/org-manage.vue', name: 'AdminOrgManage', title: '组织管理', message: '组织管理功能开发中' },
  { file: 'pages/admin/member-manage.vue', name: 'AdminMemberManage', title: '成员管理', message: '成员管理功能开发中' },
  { file: 'pages/admin/supervisor-assign.vue', name: 'AdminSupervisorAssign', title: '指定督导', message: '指定督导功能开发中' },
  { file: 'pages/admin/invite-admin.vue', name: 'AdminInviteAdmin', title: '邀请管理员', message: '邀请管理员功能开发中' },
  { file: 'pages/invitation/create.vue', name: 'InvitationCreate', title: '创建邀请', message: '创建邀请功能开发中' },
  { file: 'pages/invitation/scan.vue', name: 'InvitationScan', title: '扫描邀请', message: '扫描邀请功能开发中' },
  { file: 'pages/invitation/detail.vue', name: 'InvitationDetail', title: '邀请详情', message: '邀请详情功能开发中' },
  { file: 'pages/invitation/list.vue', name: 'InvitationList', title: '邀请列表', message: '邀请列表功能开发中' },
  { file: 'pages/notification/list.vue', name: 'NotificationList', title: '通知中心', message: '通知中心功能开发中' },
  { file: 'pages/notification/detail.vue', name: 'NotificationDetail', title: '通知详情', message: '通知详情功能开发中' },
  { file: 'pages/notification/settings.vue', name: 'NotificationSettings', title: '通知设置', message: '通知设置功能开发中' },
  { file: 'pages/feedback/create.vue', name: 'FeedbackCreate', title: '意见反馈', message: '意见反馈功能开发中' },
  { file: 'pages/feedback/list.vue', name: 'FeedbackList', title: '反馈列表', message: '反馈列表功能开发中' },
  { file: 'pages/feedback/detail.vue', name: 'FeedbackDetail', title: '反馈详情', message: '反馈详情功能开发中' },
  { file: 'pages/statistics/charts.vue', name: 'StatisticsCharts', title: '统计图表', message: '统计图表功能开发中' },
  { file: 'pages/statistics/export.vue', name: 'StatisticsExport', title: '数据导出', message: '数据导出功能开发中' },
  { file: 'pages/statistics/settings.vue', name: 'StatisticsSettings', title: '统计设置', message: '统计设置功能开发中' },
  { file: 'pages/reminder/settings.vue', name: 'ReminderSettings', title: '提醒设置', message: '提醒设置功能开发中' },
  { file: 'pages/reminder/history.vue', name: 'ReminderHistory', title: '提醒历史', message: '提醒历史功能开发中' },
  { file: 'pages/verify/check.vue', name: 'VerifyCheck', title: '验证查询', message: '验证查询功能开发中' },
  { file: 'pages/profile/index.vue', name: 'Profile', title: '个人中心', message: '个人中心功能开发中' }
];

// 生成页面内容
function generatePageContent(config) {
  return `<template>
  <view class="page">
    <view class="header">
      <text class="title">${config.title}</text>
    </view>
    
    <view class="content">
      <view class="empty-state">
        <text class="empty-text">${config.message}</text>
        <button class="btn" @click="handleClick">操作</button>
      </view>
    </view>
  </view>
</template>

<script>
export default {
  name: '${config.name}',
  data() {
    return {
      
    }
  },
  methods: {
    handleClick() {
      uni.showToast({
        title: '${config.message}',
        icon: 'none'
      })
    }
  }
}
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #fff;
  padding-top: var(--status-bar-height);
}

.header {
  padding: 32rpx 24rpx;
  border-bottom: 1rpx solid #e5e5e5;
}

.title {
  font-size: 32rpx;
  font-weight: 600;
  color: #1a1a1a;
}

.content {
  padding: 40rpx 24rpx;
}

.empty-state {
  text-align: center;
  padding: 80rpx 0;
}

.empty-text {
  display: block;
  font-size: 28rpx;
  color: #666;
  margin-bottom: 32rpx;
}

.btn {
  width: 160rpx;
  height: 64rpx;
  background: #007aff;
  color: #fff;
  border: none;
  border-radius: 8rpx;
  font-size: 28rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto;
}
</style>`;
}

// 更新所有页面
pageConfigs.forEach(config => {
  const filePath = path.join(__dirname, config.file);
  const content = generatePageContent(config);
  
  try {
    fs.writeFileSync(filePath, content, 'utf8');
    console.log(`Updated ${config.file}`);
  } catch (error) {
    console.error(`Error updating ${config.file}:`, error.message);
  }
});

console.log('All pages updated successfully!');
