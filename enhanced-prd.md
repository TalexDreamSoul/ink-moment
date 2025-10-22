# 溯间砚时 - 志愿时长管理系统 增强版 PRD

## 一、新增功能概述

### 1.1 邀请功能
- **督导/管理员邀请**: 督导和管理员可以邀请特定用户加入组织
- **二维码邀请**: 生成专属邀请二维码，包含邀请人信息、组织信息、角色信息
- **授权确认**: 被邀请人扫码后需要督导/管理员确认才能正式加入
- **详细记录**: 记录邀请人、被邀请人、邀请时间、确认时间等完整信息

### 1.2 通知系统
- **审核结果通知**: 督导审核完成后自动通知用户
- **邀请通知**: 收到邀请时通知用户
- **系统通知**: 重要系统更新、维护通知
- **提醒通知**: 打卡提醒、审核提醒等

### 1.3 统计优化
- **日统计表**: 预计算每日统计数据，提升查询性能
- **缓存机制**: 统计数据缓存，减少重复计算
- **图表展示**: 可视化统计图表，直观展示数据趋势

### 1.4 反馈系统
- **用户反馈**: 用户可提交bug报告、建议、投诉、表扬
- **管理员回复**: 管理员可回复用户反馈
- **问题跟踪**: 反馈状态跟踪，从提交到解决的全流程

### 1.5 提醒系统
- **打卡提醒**: 定时提醒用户打卡
- **审核提醒**: 提醒督导及时审核
- **统计提醒**: 定期统计报告提醒

### 1.6 数据导出增强
- **批量导出**: 支持批量导出多个用户数据
- **模板定制**: 自定义导出模板
- **数据可视化**: 导出图表和趋势分析

---

## 二、新增数据库表

### 2.1 邀请表 (invitations)

```json
{
  "_id": "邀请ID",
  "org_id": "组织ID",
  "inviter_id": "邀请人ID",
  "invitee_info": {
    "name": "被邀请人姓名",
    "student_id": "学号",
    "phone": "联系方式",
    "college": "学院"
  },
  "invite_code": "邀请码(8位唯一)",
  "role": "邀请角色(user/supervisor)",
  "status": "状态(pending/accepted/rejected/expired)",
  "accepted_at": "接受时间",
  "expires_at": "过期时间(7天)",
  "created_at": "创建时间"
}
```

### 2.2 通知表 (notifications)

```json
{
  "_id": "通知ID",
  "user_id": "接收用户ID",
  "type": "通知类型(audit_result/invitation/system/reminder)",
  "title": "通知标题",
  "content": "通知内容",
  "related_id": "关联记录ID",
  "status": "状态(unread/read)",
  "created_at": "创建时间",
  "read_at": "阅读时间"
}
```

### 2.3 考勤统计表 (attendance_statistics)

```json
{
  "_id": "统计ID",
  "user_id": "用户ID",
  "org_id": "组织ID",
  "date": "统计日期",
  "total_minutes": "总时长(分钟)",
  "record_count": "记录数量",
  "created_at": "创建时间",
  "updated_at": "更新时间"
}
```

### 2.4 反馈表 (feedback)

```json
{
  "_id": "反馈ID",
  "user_id": "反馈用户ID",
  "type": "反馈类型(bug/suggestion/complaint/praise)",
  "content": "反馈内容",
  "images": "反馈图片数组",
  "status": "处理状态(pending/processing/resolved/closed)",
  "reply": "回复内容",
  "replied_by": "回复人ID",
  "replied_at": "回复时间",
  "created_at": "创建时间"
}
```

---

## 三、邀请功能详细设计

### 3.1 邀请流程

```
1. 督导/管理员发起邀请:
   - 填写被邀请人信息(姓名/学号/联系方式/学院)
   - 选择邀请角色(user/supervisor)
   - 系统生成8位邀请码
   - 生成邀请二维码(包含邀请信息)

2. 被邀请人扫码:
   - 扫描邀请二维码
   - 显示邀请详情(邀请人/组织/角色)
   - 确认加入申请

3. 督导/管理员确认:
   - 收到加入申请通知
   - 查看被邀请人信息
   - 确认或拒绝申请

4. 加入成功:
   - 创建 organization_members 记录
   - 发送成功通知
   - 更新邀请状态为 accepted
```

### 3.2 邀请二维码内容

```json
{
  "type": "invitation",
  "invite_code": "ABC12345",
  "org_id": "组织ID",
  "inviter_id": "邀请人ID",
  "role": "邀请角色",
  "timestamp": "生成时间戳"
}
```

### 3.3 权限控制

- 只有督导和管理员可以发起邀请
- 被邀请人信息必须完整
- 邀请码7天过期
- 每个邀请码只能使用一次

---

## 四、通知系统设计

### 4.1 通知类型

**审核结果通知**
```
标题: 您的打卡记录已审核
内容: 您在[组织名]的打卡记录已通过审核，工作时长: X小时X分钟
触发: 督导审核通过/拒绝时
```

**邀请通知**
```
标题: 收到组织邀请
内容: [邀请人]邀请您加入[组织名]，角色: [角色]
触发: 收到邀请时
```

**系统通知**
```
标题: 系统维护通知
内容: 系统将于X月X日进行维护，预计X小时
触发: 管理员发布时
```

**提醒通知**
```
标题: 打卡提醒
内容: 您今天还未打卡，请及时打卡
触发: 定时任务(每天18:00)
```

### 4.2 通知推送

- 小程序内通知(实时)
- 微信模板消息(重要通知)
- 邮件通知(可选)

---

## 五、统计优化设计

### 5.1 日统计表

**统计维度**
- 按用户统计
- 按组织统计
- 按日期统计
- 按角色统计

**统计内容**
- 总工作时长
- 打卡次数
- 平均工作时长
- 出勤率

### 5.2 缓存策略

**缓存层级**
1. 用户级缓存(个人统计)
2. 组织级缓存(组织统计)
3. 系统级缓存(全局统计)

**缓存更新**
- 实时更新(打卡时)
- 定时更新(每日凌晨)
- 手动更新(管理员触发)

### 5.3 图表展示

**个人统计图表**
- 工作时长趋势图
- 月度统计柱状图
- 组织对比饼图

**督导统计图表**
- 管辖成员统计
- 审核效率统计
- 组织活跃度统计

---

## 六、反馈系统设计

### 6.1 反馈类型

**Bug报告**
- 功能异常
- 界面问题
- 性能问题

**建议反馈**
- 功能建议
- 界面优化
- 流程改进

**投诉反馈**
- 服务态度
- 处理效率
- 系统问题

**表扬反馈**
- 服务表扬
- 功能认可
- 团队表扬

### 6.2 反馈处理流程

```
1. 用户提交反馈
2. 系统自动分类
3. 管理员查看反馈
4. 管理员回复反馈
5. 用户查看回复
6. 反馈状态更新
```

### 6.3 反馈统计

- 反馈数量统计
- 处理效率统计
- 满意度统计
- 问题分类统计

---

## 七、提醒系统设计

### 7.1 提醒类型

**打卡提醒**
- 上班提醒(9:00)
- 下班提醒(18:00)
- 未打卡提醒(20:00)

**审核提醒**
- 待审核提醒(每日)
- 审核超时提醒(3天)

**统计提醒**
- 周统计报告(每周一)
- 月统计报告(每月1号)

### 7.2 提醒设置

**用户设置**
- 开启/关闭提醒
- 提醒时间设置
- 提醒方式选择

**系统设置**
- 默认提醒时间
- 提醒频率设置
- 提醒内容模板

---

## 八、数据导出增强

### 8.1 批量导出

**批量导出功能**
- 选择多个用户
- 选择时间范围
- 选择导出格式
- 批量生成文件

**导出模板**
- 标准模板
- 自定义模板
- 组织模板
- 角色模板

### 8.2 数据可视化

**图表类型**
- 柱状图(时长对比)
- 折线图(趋势分析)
- 饼图(比例分析)
- 雷达图(多维度分析)

**可视化内容**
- 个人工作时长趋势
- 组织活跃度分析
- 角色工作效率对比
- 时间段分布分析

### 8.3 导出优化

**性能优化**
- 异步导出
- 分页处理
- 压缩优化
- 缓存机制

**用户体验**
- 导出进度显示
- 导出历史记录
- 导出结果预览
- 导出文件管理

---

## 九、技术实现要点

### 9.1 邀请功能实现

**云函数**
```javascript
// 创建邀请
exports.createInvitation = async (event) => {
  const { org_id, invitee_info, role } = event
  const invite_code = generateInviteCode() // 8位随机码
  const expires_at = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000) // 7天后过期
  
  return await db.collection('invitations').add({
    org_id,
    inviter_id: event.userInfo.uid,
    invitee_info,
    invite_code,
    role,
    expires_at
  })
}

// 处理邀请
exports.handleInvitation = async (event) => {
  const { invite_code, action } = event // action: accept/reject
  
  if (action === 'accept') {
    // 创建组织成员记录
    await db.collection('organization_members').add({
      org_id: invitation.org_id,
      user_id: event.userInfo.uid,
      role: invitation.role
    })
    
    // 更新邀请状态
    await db.collection('invitations').doc(invitation._id).update({
      status: 'accepted',
      accepted_at: new Date()
    })
  }
}
```

### 9.2 通知系统实现

**通知发送**
```javascript
// 发送通知
exports.sendNotification = async (event) => {
  const { user_id, type, title, content, related_id } = event
  
  // 创建通知记录
  await db.collection('notifications').add({
    user_id,
    type,
    title,
    content,
    related_id,
    status: 'unread'
  })
  
  // 发送微信模板消息
  if (type === 'audit_result' || type === 'invitation') {
    await sendTemplateMessage(user_id, title, content)
  }
}
```

### 9.3 统计优化实现

**日统计更新**
```javascript
// 更新日统计
exports.updateDailyStats = async (event) => {
  const { user_id, org_id, date, minutes } = event
  
  const stats = await db.collection('attendance_statistics')
    .where({
      user_id,
      org_id,
      date: new Date(date)
    })
    .get()
  
  if (stats.data.length > 0) {
    // 更新现有统计
    await db.collection('attendance_statistics').doc(stats.data[0]._id).update({
      total_minutes: stats.data[0].total_minutes + minutes,
      record_count: stats.data[0].record_count + 1,
      updated_at: new Date()
    })
  } else {
    // 创建新统计
    await db.collection('attendance_statistics').add({
      user_id,
      org_id,
      date: new Date(date),
      total_minutes: minutes,
      record_count: 1
    })
  }
}
```

### 9.4 提醒系统实现

**定时任务**
```javascript
// 打卡提醒
exports.clockReminder = async (event) => {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  
  // 查找今天未打卡的用户
  const users = await db.collection('work_records')
    .where({
      clock_in_time: db.command.gte(today),
      clock_out_time: db.command.exists(false)
    })
    .get()
  
  // 发送提醒通知
  for (const user of users.data) {
    await sendNotification({
      user_id: user.user_id,
      type: 'reminder',
      title: '打卡提醒',
      content: '您今天还未打卡，请及时打卡'
    })
  }
}
```

---

## 十、页面结构更新

### 10.1 新增页面

```
pages/
├── invitation/
│   ├── create.vue              # 创建邀请
│   ├── scan.vue                # 扫描邀请码
│   ├── detail.vue              # 邀请详情
│   └── list.vue                # 邀请列表
├── notification/
│   ├── list.vue                # 通知列表
│   ├── detail.vue              # 通知详情
│   └── settings.vue            # 通知设置
├── feedback/
│   ├── create.vue              # 创建反馈
│   ├── list.vue                # 反馈列表
│   └── detail.vue              # 反馈详情
├── statistics/
│   ├── charts.vue              # 统计图表
│   ├── export.vue              # 数据导出
│   └── settings.vue            # 统计设置
└── reminder/
    ├── settings.vue            # 提醒设置
    └── history.vue              # 提醒历史
```

### 10.2 页面功能说明

**邀请页面**
- 创建邀请: 督导/管理员填写被邀请人信息
- 扫描邀请: 用户扫描邀请二维码
- 邀请详情: 显示邀请信息和确认按钮
- 邀请列表: 管理已发送的邀请

**通知页面**
- 通知列表: 显示所有通知，支持筛选
- 通知详情: 显示通知详细内容
- 通知设置: 设置通知偏好

**反馈页面**
- 创建反馈: 用户提交反馈
- 反馈列表: 显示反馈历史
- 反馈详情: 查看反馈和回复

**统计页面**
- 统计图表: 可视化统计数据
- 数据导出: 导出统计报告
- 统计设置: 设置统计参数

---

## 十一、实施计划更新

### 阶段一: 基础功能
1. 数据库表结构创建 ✅
2. 用户授权登录与信息绑定
3. 主页面与打卡功能
4. 组织管理与成员加入

### 阶段二: 核心功能
1. 督导审核功能
2. 个人时长统计
3. 数据导出功能
4. 多角色权限体系

### 阶段三: 增强功能
1. 邀请功能实现
2. 通知系统
3. 反馈系统
4. 提醒系统

### 阶段四: 优化功能
1. 统计优化
2. 数据可视化
3. 性能优化
4. 用户体验优化

---

## 十二、注意事项

1. **邀请安全**: 邀请码必须唯一，防止重复使用
2. **通知频率**: 避免通知过多，影响用户体验
3. **统计准确性**: 确保统计数据准确，及时更新
4. **反馈处理**: 及时处理用户反馈，提升满意度
5. **提醒设置**: 允许用户自定义提醒设置
6. **数据隐私**: 保护用户隐私，合理使用数据
7. **性能考虑**: 大量数据时考虑分页和缓存
8. **用户体验**: 界面友好，操作简便

---

## 十三、关键文件清单

### 新增数据库 Schema
- `uniCloud-alipay/database/invitations.schema.json`
- `uniCloud-alipay/database/notifications.schema.json`
- `uniCloud-alipay/database/attendance-statistics.schema.json`
- `uniCloud-alipay/database/feedback.schema.json`

### 新增云函数
- `uniCloud-alipay/cloudfunctions/invitation-manage/index.js`
- `uniCloud-alipay/cloudfunctions/notification-send/index.js`
- `uniCloud-alipay/cloudfunctions/statistics-update/index.js`
- `uniCloud-alipay/cloudfunctions/feedback-handle/index.js`
- `uniCloud-alipay/cloudfunctions/reminder-schedule/index.js`

### 新增页面组件
- 参考第十节页面结构

### 配置文件更新
- `pages.json` - 添加新页面路由
- `manifest.json` - 配置通知权限
