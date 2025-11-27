'use strict';

// 简单的 token 生成函数
function generateToken() {
  return 'token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
}

// 简单的 token 验证
async function checkToken(db, token) {
  if (!token) return null

  const result = await db.collection('user-tokens').where({ token }).get()
  if (result.data.length === 0) return null

  const tokenData = result.data[0]
  // 检查 token 是否过期（7天）
  const now = Date.now()
  if (now - tokenData.created_at > 7 * 24 * 60 * 60 * 1000) {
    return null
  }

  return tokenData.user_id
}

exports.main = async (event, context) => {
  const { action, code, profile } = event
  const db = uniCloud.database()

  // 从多个来源读取token
  const token = event.token ||
    event.uniIdToken ||
    (context && context.headers && context.headers['x-token']) ||
    (context && context.headers && context.headers['uni-id-token']) ||
    null

  console.log('[user-auth] 请求信息:', {
    action,
    hasCode: !!code,
    hasProfile: !!profile,
    hasToken: !!token,
    headers: context?.headers
  })

  try {
    switch (action) {
      case 'wxLogin':
        return await handleWxLogin(code, db)
      case 'getUserInfo':
        return await getUserInfo(token, db)
      case 'updateProfile':
        return await updateProfile(profile, token, db)
      case 'getUserFullInfo':
        return await getUserFullInfo(token, db)
      case 'getUserStats':
        return await getUserStats(token, event.type, db)
      case 'checkUserRoles':
        return await checkUserRoles(token, db)
      case 'checkProfileComplete':
        return await checkProfileComplete(token, db)
      default:
        console.error('[user-auth] 未知操作:', action)
        return { code: -1, message: '未知操作' }
    }
  } catch (error) {
    console.error('[user-auth] 错误:', error)
    return { code: -1, message: error.message || '操作失败' }
  }
}


// 处理微信登录
async function handleWxLogin(code, db) {
  try {
    console.log('[handleWxLogin] 开始处理微信登录, code:', code)

    if (!code) {
      console.error('[handleWxLogin] code为空')
      return { code: -1, message: '微信登录code无效' }
    }

    // 调用微信接口获取 openid
    const result = await uniCloud.httpclient.request(
      'https://api.weixin.qq.com/sns/jscode2session', {
      method: 'GET',
      data: {
        appid: 'wx0a9c4d5b8cac1bc1', // 替换为你的小程序 appid
        secret: '6a0b8065b4795bd63d219c91fdc18f28', // 替换为你的小程序 secret
        js_code: code,
        grant_type: 'authorization_code'
      },
      dataType: 'json'
    }
    )

    if (result.data.errcode) {
      return { code: -1, message: '微信登录失败: ' + result.data.errmsg }
    }

    const openid = result.data.openid
    console.log('[handleWxLogin] 获取到openid:', openid)

    // 查找或创建用户
    const userResult = await db.collection('uni-id-users').where({ wx_openid: { mp: openid } }).get()
    console.log('[handleWxLogin] 查询用户结果:', userResult.data.length)

    let userId
    if (userResult.data.length === 0) {
      // 创建新用户
      const newUser = await db.collection('uni-id-users').add({
        wx_openid: { mp: openid },
        created_at: Date.now(),
        updated_at: Date.now()
      })
      userId = newUser.id
    } else {
      userId = userResult.data[0]._id
    }

    // 检查用户profile是否完善
    const profileResult = await db.collection('user-profiles').doc(userId).get()
    let needProfileCompletion = true
    let isFirstUser = false

    if (profileResult.data.length > 0) {
      const profile = profileResult.data[0]
      needProfileCompletion = !profile.is_completed
    } else {
      // 检查是否是系统第一个用户
      const allUsersResult = await db.collection('user-profiles').count()
      isFirstUser = allUsersResult.total === 0
    }

    // 生成 token
    const token = generateToken()
    const tokenExpired = Date.now() + 7 * 24 * 60 * 60 * 1000 // 7天后过期

    // 保存 token
    await db.collection('user-tokens').add({
      user_id: userId,
      token: token,
      created_at: Date.now(),
      expired_at: tokenExpired
    })

    console.log('[handleWxLogin] 登录成功:', {
      userId,
      needProfileCompletion,
      isFirstUser
    })

    return {
      code: 0,
      data: {
        uid: userId,
        token: token,
        tokenExpired: tokenExpired,
        needProfileCompletion: needProfileCompletion,
        isFirstUser: isFirstUser
      }
    }
  } catch (error) {
    console.error('handleWxLogin error:', error)
    return { code: -1, message: '微信登录失败' }
  }
}

// 获取用户信息
async function getUserInfo(token, db) {
  try {
    console.log('[getUserInfo] 获取用户信息, hasToken:', !!token)

    const userId = await checkToken(db, token)
    if (!userId) {
      console.error('[getUserInfo] token验证失败')
      return { code: 401, message: '未登录' }
    }

    console.log('[getUserInfo] userId:', userId)

    const userResult = await db.collection('user-profiles').doc(userId).get()

    if (userResult.data.length === 0) {
      return { code: -1, message: '用户不存在' }
    }

    return {
      code: 0,
      data: {
        profile: userResult.data[0]
      }
    }
  } catch (error) {
    console.error('getUserInfo error:', error)
    return { code: -1, message: '获取用户信息失败' }
  }
}

// 更新用户信息
async function updateProfile(profile, token, db) {
  try {
    console.log('[updateProfile] 更新用户资料, hasToken:', !!token)

    if (!profile || typeof profile !== 'object') {
      console.error('[updateProfile] profile参数无效')
      return { code: -1, message: '用户信息参数无效' }
    }

    const userId = await checkToken(db, token)
    if (!userId) {
      console.error('[updateProfile] token验证失败')
      return { code: 401, message: '未登录' }
    }

    console.log('[updateProfile] userId:', userId)

    // 验证必填字段 - 基本信息
    if (!profile.name || !profile.student_id) {
      return { code: -1, message: '请填写姓名和学号/工号' }
    }

    // 检查是否所有必填字段都已填写（用于判断 is_completed）
    const requiredFields = ['name', 'student_id', 'college', 'grade_major', 'phone', 'counselor', 'gender']
    const allFieldsFilled = requiredFields.every(field => profile[field] && profile[field].toString().trim() !== '')

    // 扩展信息（QQ、微信、邮箱）是可选的，不影响 is_completed 状态
    // 只要基本信息完整，就认为资料已完善

    const now = Date.now()
    const profileCollection = db.collection('user-profiles')
    const existingProfile = await profileCollection.doc(userId).get()

    // 检查是否是第一个用户
    let isFirstUser = false
    if (existingProfile.data.length === 0) {
      const allUsersResult = await db.collection('user-profiles').count()
      isFirstUser = allUsersResult.total === 0
    }

    const updateData = {
      ...profile,
      user_id: userId,
      updated_at: now,
      is_completed: allFieldsFilled  // 只需基本信息完整即可
    }

    if (existingProfile.data.length > 0) {
      await profileCollection.doc(userId).update(updateData)
    } else {
      await profileCollection.doc(userId).set({
        ...updateData,
        created_at: now
      })
    }

    // 如果是第一个用户，分配管理员角色
    if (isFirstUser) {
      const rolesCollection = db.collection('system-roles')
      await rolesCollection.add({
        user_id: userId,
        role: 'admin',
        created_at: now
      })
    }

    return {
      code: 0,
      message: '用户信息更新成功',
      data: {
        isFirstUser: isFirstUser
      }
    }
  } catch (error) {
    console.error('updateProfile error:', error)
    return { code: -1, message: '更新用户信息失败' }
  }
}

// ============================================
// 新增API：获取完整用户信息
// ============================================

/**
 * 获取完整用户信息（资料+角色+统计）
 */
async function getUserFullInfo(token, db) {
  try {
    console.log('[getUserFullInfo] 获取完整用户信息')

    const userId = await checkToken(db, token)
    if (!userId) {
      console.error('[getUserFullInfo] token验证失败')
      return { code: 401, message: '未登录' }
    }

    console.log('[getUserFullInfo] userId:', userId)

    // 获取用户资料
    const profileResult = await db.collection('user-profiles').doc(userId).get()
    if (profileResult.data.length === 0) {
      return { code: -1, message: '用户资料不存在' }
    }
    const profile = profileResult.data[0]

    // 并行获取其他信息
    const [roles, stats, todayStats, unreadCount] = await Promise.all([
      getRoles(userId, db),
      getStats(userId, db),
      getTodayStats(userId, db),
      getUnreadCount(userId, db)
    ])

    console.log('[getUserFullInfo] 数据获取成功')

    return {
      code: 0,
      data: {
        profile,
        roles,
        stats,
        todayStats,
        unreadCount
      }
    }
  } catch (error) {
    console.error('[getUserFullInfo] 错误:', error)
    return { code: -1, message: '获取用户信息失败' }
  }
}

/**
 * 获取用户统计数据
 */
async function getUserStats(token, type, db) {
  try {
    console.log('[getUserStats] 获取统计数据, type:', type)

    const userId = await checkToken(db, token)
    if (!userId) {
      return { code: 401, message: '未登录' }
    }

    if (type === 'today') {
      const todayStats = await getTodayStats(userId, db)
      return {
        code: 0,
        data: todayStats
      }
    } else {
      // 获取完整的统计数据（用于统计页面）
      const [stats, organizations, thisMonthMinutes, recentRecords] = await Promise.all([
        getStats(userId, db),
        getOrganizationStats(userId, db),
        getThisMonthMinutes(userId, db),
        getRecentRecordsWithOrg(userId, db)
      ])

      return {
        code: 0,
        data: {
          totalHours: stats.totalMinutes || 0, // 注意：这里返回的是分钟数，前端会转换
          totalDays: stats.totalDays || 0,
          thisMonthHours: thisMonthMinutes || 0, // 本月分钟数
          orgCount: stats.orgCount || 0,
          organizations: organizations || [],
          recentRecords: recentRecords || []
        }
      }
    }
  } catch (error) {
    console.error('[getUserStats] 错误:', error)
    return { code: -1, message: '获取统计数据失败' }
  }
}

/**
 * 检查用户角色
 */
async function checkUserRoles(token, db) {
  try {
    console.log('[checkUserRoles] 检查用户角色')

    const userId = await checkToken(db, token)
    if (!userId) {
      return { code: 401, message: '未登录' }
    }

    const roles = await getRoles(userId, db)

    return {
      code: 0,
      data: roles
    }
  } catch (error) {
    console.error('[checkUserRoles] 错误:', error)
    return { code: -1, message: '检查角色失败' }
  }
}

/**
 * 检查用户资料是否完整
 */
async function checkProfileComplete(token, db) {
  try {
    console.log('[checkProfileComplete] 检查资料完整性')

    const userId = await checkToken(db, token)
    if (!userId) {
      return { code: 401, message: '未登录' }
    }

    const profileResult = await db.collection('user-profiles').doc(userId).get()

    if (profileResult.data.length === 0) {
      return {
        code: 0,
        data: {
          isComplete: false,
          missingFields: ['所有字段']
        }
      }
    }

    const profile = profileResult.data[0]
    const requiredFields = [
      { key: 'name', label: '姓名' },
      { key: 'student_id', label: '学号/工号' },
      { key: 'college', label: '学院' },
      { key: 'grade_major', label: '年级专业' },
      { key: 'phone', label: '联系方式' },
      { key: 'counselor', label: '辅导员' },
      { key: 'gender', label: '性别' }
    ]

    const missingFields = []
    requiredFields.forEach(field => {
      if (!profile[field.key] || profile[field.key].toString().trim() === '') {
        missingFields.push(field.label)
      }
    })

    // 扩展信息（QQ、微信、邮箱）是可选的，不影响完成状态
    // 只检查基本必填字段即可

    const isComplete = missingFields.length === 0 && profile.is_completed

    return {
      code: 0,
      data: {
        isComplete,
        missingFields
      }
    }
  } catch (error) {
    console.error('[checkProfileComplete] 错误:', error)
    return { code: -1, message: '检查资料失败' }
  }
}

// ============================================
// 辅助函数
// ============================================

/**
 * 获取用户角色信息
 */
async function getRoles(userId, db) {
  try {
    // 检查是否为管理员
    const adminResult = await db.collection('system-roles')
      .where({ user_id: userId })
      .get()

    // 检查是否为督导员
    const supervisorResult = await db.collection('organization-members')
      .where({
        user_id: userId,
        role: 'supervisor',
        status: 'active'
      })
      .get()

    return {
      isAdmin: adminResult.data.length > 0,
      isSupervisor: supervisorResult.data.length > 0
    }
  } catch (error) {
    console.error('[getRoles] 错误:', error)
    return {
      isAdmin: false,
      isSupervisor: false
    }
  }
}

/**
 * 获取用户总体统计数据
 */
async function getStats(userId, db) {
  try {
    // 获取考勤统计
    const statsResult = await db.collection('attendance-statistics')
      .where({ user_id: userId })
      .get()

    let totalMinutes = 0
    const uniqueDates = new Set() // 使用 Set 去重日期

    if (statsResult.data.length > 0) {
      statsResult.data.forEach(stat => {
        totalMinutes += stat.total_minutes || 0
        if (stat.total_minutes > 0 && stat.date) {
          // 将时间戳转为日期字符串进行去重
          const dateStr = new Date(stat.date).toDateString()
          uniqueDates.add(dateStr)
        }
      })
    }

    // 获取组织数量
    const orgResult = await db.collection('organization-members')
      .where({
        user_id: userId,
        status: 'active'
      })
      .get()

    return {
      totalDays: uniqueDates.size, // 使用 Set 的大小作为天数
      totalMinutes,  // 返回总分钟数
      totalHours: Math.floor(totalMinutes / 60),
      orgCount: orgResult.data.length
    }
  } catch (error) {
    console.error('[getStats] 错误:', error)
    return {
      totalDays: 0,
      totalMinutes: 0,
      totalHours: 0,
      orgCount: 0
    }
  }
}

/**
 * 获取今日统计数据
 */
async function getTodayStats(userId, db) {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const todayTimestamp = today.getTime()

    // 获取今日考勤统计
    const statsResult = await db.collection('attendance-statistics')
      .where({
        user_id: userId,
        date: todayTimestamp
      })
      .get()

    // 获取组织数量（复用总体统计中的逻辑）
    const orgResult = await db.collection('organization-members')
      .where({
        user_id: userId,
        status: 'active'
      })
      .get()

    return {
      totalMinutes: statsResult.data[0]?.total_minutes || 0,
      recordCount: statsResult.data[0]?.record_count || 0,
      orgCount: orgResult.data.length
    }
  } catch (error) {
    console.error('[getTodayStats] 错误:', error)
    return {
      totalMinutes: 0,
      recordCount: 0,
      orgCount: 0
    }
  }
}

/**
 * 获取未读消息数
 */
async function getUnreadCount(userId, db) {
  try {
    const result = await db.collection('notifications')
      .where({
        user_id: userId,
        is_read: false
      })
      .count()

    return result.total
  } catch (error) {
    console.error('[getUnreadCount] 错误:', error)
    return 0
  }
}

/**
 * 获取各组织的统计数据
 */
async function getOrganizationStats(userId, db) {
  try {
    // 获取用户的所有考勤统计，按组织分组
    const statsResult = await db.collection('attendance-statistics')
      .where({ user_id: userId })
      .get()

    // 按组织ID聚合数据
    const orgMap = new Map()
    for (const stat of statsResult.data) {
      if (!stat.org_id) continue

      if (orgMap.has(stat.org_id)) {
        const existing = orgMap.get(stat.org_id)
        existing.total_minutes += stat.total_minutes || 0
        existing.record_count += stat.record_count || 0
      } else {
        orgMap.set(stat.org_id, {
          org_id: stat.org_id,
          total_minutes: stat.total_minutes || 0,
          record_count: stat.record_count || 0
        })
      }
    }

    // 获取组织名称
    const orgIds = Array.from(orgMap.keys())
    if (orgIds.length === 0) {
      return []
    }

    const cmd = db.command
    const orgsResult = await db.collection('organizations')
      .where({
        _id: cmd.in(orgIds)
      })
      .get()

    // 创建组织ID到名称的映射
    const orgNameMap = new Map()
    orgsResult.data.forEach(org => {
      orgNameMap.set(org._id, org.name)
    })

    // 组合结果
    const result = []
    for (const [orgId, stats] of orgMap.entries()) {
      result.push({
        org_id: orgId,
        org_name: orgNameMap.get(orgId) || '未知组织',
        total_minutes: stats.total_minutes,
        record_count: stats.record_count
      })
    }

    return result
  } catch (error) {
    console.error('[getOrganizationStats] 错误:', error)
    return []
  }
}

/**
 * 获取本月总时长（分钟）
 */
async function getThisMonthMinutes(userId, db) {
  try {
    const now = new Date()
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    firstDayOfMonth.setHours(0, 0, 0, 0)
    const firstDayTimestamp = firstDayOfMonth.getTime()

    const cmd = db.command
    const statsResult = await db.collection('attendance-statistics')
      .where({
        user_id: userId,
        date: cmd.gte(firstDayTimestamp)
      })
      .get()

    let totalMinutes = 0
    statsResult.data.forEach(stat => {
      totalMinutes += stat.total_minutes || 0
    })

    return totalMinutes
  } catch (error) {
    console.error('[getThisMonthMinutes] 错误:', error)
    return 0
  }
}

/**
 * 获取最近打卡记录（带组织名称）
 */
async function getRecentRecordsWithOrg(userId, db) {
  try {
    // 获取最近10条已完成的打卡记录
    const cmd = db.command
    const recordsResult = await db.collection('work-records')
      .where({
        user_id: userId,
        clock_out_time: cmd.exists(true)
      })
      .orderBy('clock_in_time', 'desc')
      .limit(10)
      .get()

    if (recordsResult.data.length === 0) {
      return []
    }

    // 获取所有涉及的组织ID
    const orgIds = [...new Set(recordsResult.data.map(r => r.org_id).filter(id => id))]

    if (orgIds.length === 0) {
      return []
    }

    // 批量获取组织信息
    const orgsResult = await db.collection('organizations')
      .where({
        _id: cmd.in(orgIds)
      })
      .get()

    // 创建组织ID到名称的映射
    const orgNameMap = new Map()
    orgsResult.data.forEach(org => {
      orgNameMap.set(org._id, org.name)
    })

    // 组合结果
    return recordsResult.data.map(record => ({
      _id: record._id,
      org_name: orgNameMap.get(record.org_id) || '未知组织',
      duration_minutes: record.duration_minutes || 0,
      clock_in_time: record.clock_in_time,
      clock_out_time: record.clock_out_time
    }))
  } catch (error) {
    console.error('[getRecentRecordsWithOrg] 错误:', error)
    return []
  }
}

