# 溯间砚时 - 志愿时长管理系统

## 项目简介

溯间砚时是一个基于uniCloud的志愿时长记录管理系统，支持微信小程序端，提供完整的打卡、统计、组织管理等功能。

## 核心功能

### 1. 用户认证系统
- **微信授权登录**: 支持微信小程序一键登录
- **用户信息管理**: 姓名、学号、学院、年级专业、联系方式等
- **性别选择**: 男/女/其他
- **扩展信息**: QQ、微信、邮箱、头像、生日、地址、紧急联系人等

### 2. 打卡系统
- **上班打卡**: 记录上班时间、定位信息
- **下班打卡**: 记录下班时间、计算工作时长
- **实时定位**: 自动获取用户当前位置
- **智能计算**: 满30秒进1分钟，不满不计
- **防重复**: 防止重复打卡机制

### 3. 组织管理
- **组织创建**: 支持创建和管理组织
- **成员管理**: 邀请成员加入组织
- **角色分配**: 用户、督导、管理员角色
- **权限控制**: 基于角色的数据访问控制

### 4. 统计功能
- **个人统计**: 工作时长、打卡次数统计
- **组织统计**: 组织成员活跃度统计
- **数据导出**: 支持Excel格式导出
- **可视化图表**: 直观展示数据趋势

### 5. 督导审核
- **审核列表**: 待审核的打卡记录
- **审核详情**: 详细的打卡信息查看
- **时长调整**: 督导可调整工作时长
- **审核统计**: 审核效率和统计

## 技术架构

### 前端技术
- **uniapp**: 跨平台开发框架
- **Vue 3**: 响应式数据绑定
- **uni-ui**: 组件库
- **CSS3**: 现代化样式设计

### 后端技术
- **uniCloud**: 云开发平台
- **云函数**: 服务端逻辑
- **云数据库**: MongoDB文档数据库
- **JQL**: 数据库查询语言

### 数据库设计
- **用户信息表** (user-profiles): 用户基本信息
- **组织表** (organizations): 组织管理
- **组织成员表** (organization-members): 成员关系
- **打卡记录表** (work-records): 上下班打卡记录
- **时长调整表** (duration-adjustments): 督导调整记录
- **导出记录表** (export-records): 数据导出管理
- **系统角色表** (system-roles): 权限管理
- **邀请表** (invitations): 邀请功能
- **通知表** (notifications): 通知系统
- **考勤统计表** (attendance-statistics): 统计优化
- **反馈表** (feedback): 反馈系统

## 页面结构

```
pages/
├── home/
│   └── index.vue                # 主页面
├── auth/
│   ├── login.vue                # 登录页面
│   └── profile-edit.vue         # 信息填写
├── work/
│   ├── records.vue              # 打卡记录
│   └── detail.vue               # 打卡详情
├── volunteer/
│   ├── statistics.vue           # 时长统计
│   └── export.vue               # 数据导出
├── organization/
│   ├── list.vue                 # 我的组织
│   ├── join.vue                 # 加入组织
│   ├── detail.vue               # 组织详情
│   └── create.vue               # 创建组织
├── supervisor/
│   ├── audit-list.vue           # 待审核
│   ├── audit-detail.vue         # 审核详情
│   └── statistics.vue           # 督导统计
├── admin/
│   ├── home.vue                 # 管理员主页
│   ├── org-manage.vue           # 组织管理
│   ├── member-manage.vue        # 成员管理
│   ├── supervisor-assign.vue    # 指定督导
│   ├── invite-admin.vue         # 邀请管理员
│   └── init-super-admin.vue     # 超级管理员初始化
├── invitation/
│   ├── create.vue               # 创建邀请
│   ├── scan.vue                 # 扫描邀请
│   ├── detail.vue               # 邀请详情
│   └── list.vue                 # 邀请列表
├── notification/
│   ├── list.vue                 # 通知中心
│   ├── detail.vue               # 通知详情
│   └── settings.vue             # 通知设置
├── feedback/
│   ├── create.vue               # 意见反馈
│   ├── list.vue                 # 反馈列表
│   └── detail.vue               # 反馈详情
├── statistics/
│   ├── charts.vue               # 统计图表
│   ├── export.vue               # 数据导出
│   └── settings.vue             # 统计设置
├── reminder/
│   ├── settings.vue             # 提醒设置
│   └── history.vue              # 提醒历史
├── profile/
│   └── index.vue                # 个人中心
└── verify/
    └── check.vue                # 验证查询
```

## 设计风格

### 简约大气
- **色彩搭配**: 主色调使用蓝色系(#007aff)，辅助色使用灰色系
- **布局设计**: 采用卡片式布局，圆角设计，阴影效果
- **字体规范**: 标题32rpx，正文28rpx，说明文字24rpx
- **间距规范**: 统一使用8rpx的倍数作为间距

### 交互体验
- **按钮设计**: 圆角按钮，悬停效果，禁用状态
- **状态反馈**: 加载状态、成功提示、错误提示
- **动画效果**: 平滑过渡，微交互反馈

## 开发环境

### 环境要求
- HBuilderX 3.0+
- Node.js 14+
- 微信开发者工具

### 安装步骤
1. 克隆项目到本地
2. 使用HBuilderX打开项目
3. 配置uniCloud服务空间
4. 上传云函数和数据库schema
5. 配置微信小程序AppID
6. 运行到微信开发者工具

### 配置说明
- **manifest.json**: 应用配置，包含微信小程序AppID
- **pages.json**: 页面路由配置
- **uniCloud**: 云开发配置，包含云函数和数据库

## 部署说明

### 云函数部署
1. 在HBuilderX中右键云函数目录
2. 选择"上传并部署"
3. 等待部署完成

### 数据库初始化
1. 在uniCloud控制台创建数据库
2. 导入database目录下的schema文件
3. 配置数据库权限

### 微信小程序发布
1. 在微信开发者工具中预览
2. 上传代码到微信后台
3. 提交审核

## 常见问题

### 1. 登录问题
- **问题**: getUserProfile只能在用户点击手势中调用
- **解决**: 确保getUserProfile在用户点击事件中调用

### 2. OAuth配置错误
- **问题**: Config param required: mp-weixin.oauth.weixin.appid
- **解决**: 使用简化版登录，不需要OAuth配置

### 3. 定位权限
- **问题**: 无法获取位置信息
- **解决**: 确保在manifest.json中配置了位置权限

## 更新日志

### v1.0.0 (2024-01-15)
- 初始版本发布
- 完成基础功能开发
- 支持微信小程序端

## 许可证

MIT License

## 联系方式

如有问题，请联系开发团队。