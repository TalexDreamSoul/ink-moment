'use strict';

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
  const { action, location, recordId } = event
  const db = uniCloud.database()

  try {
    // 从多个来源读取 token
    const token = event.uniIdToken ||
      event.token ||
      (context && context.headers && (context.headers['uni-id-token'] || context.headers['x-token'] || context.headers['token']))

    const userId = await checkToken(db, token)

    if (!userId) {
      return {
        code: 401,
        message: '请先登录'
      }
    }

    switch (action) {
      case 'clockIn':
        return await clockIn(userId, location, db, event.orgId)
      case 'clockOut':
        return await clockOut(userId, recordId, location, db)
      case 'getTodayRecords':
        return await getTodayRecords(userId, db)
      case 'getWorkDuration':
        return await getWorkDuration(userId, db)
      case 'getRecentRecords':
        return await getRecentRecords(userId, db)
      case 'getCurrentStatus':
        return await getCurrentStatus(userId, db)
      default:
        return {
          code: 400,
          message: '无效的操作类型'
        }
    }
  } catch (error) {
    console.error('work-clock error:', error)
    return {
      code: 500,
      message: '服务器错误',
      error: error.message
    }
  }
}

// 获取当前打卡状态
async function getCurrentStatus(userId, db) {
  try {
    const cmd = db.command

    // 1. 查找当前正在进行的记录（全局查找，不限组织，不限时间）
    const activeRecords = await db.collection('work-records')
      .where({
        user_id: userId,
        clock_out_time: cmd.exists(false)
      })
      .orderBy('clock_in_time', 'desc')
      .limit(1)
      .get()

    if (activeRecords.data.length > 0) {
      return {
        code: 0,
        message: '获取成功',
        data: activeRecords.data[0]
      }
    }

    // 2. 如果没有进行中的记录，查找今天最近的一条记录
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const todayRecords = await db.collection('work-records')
      .where({
        user_id: userId,
        clock_in_time: cmd.gte(today.getTime()).and(cmd.lt(tomorrow.getTime()))
      })
      .orderBy('clock_in_time', 'desc')
      .limit(1)
      .get()

    return {
      code: 0,
      message: '获取成功',
      data: todayRecords.data.length > 0 ? todayRecords.data[0] : null
    }

  } catch (error) {
    console.error('getCurrentStatus error:', error)
    return {
      code: 500,
      message: '获取状态失败',
      error: error.message
    }
  }
}

// 上班打卡
async function clockIn(userId, location, db, orgId) {
  try {
    const now = new Date()

    // 检查 orgId 是否提供
    if (!orgId) {
      return {
        code: 400,
        message: '请选择要打卡的组织'
      }
    }

    // 检查用户是否是该组织的成员
    console.log('Checking membership for user:', userId, 'org:', orgId)
    const memberResult = await db.collection('organization-members')
      .where({
        org_id: orgId,
        user_id: userId,
        status: 'active'
      })
      .get()
    console.log('Membership check result:', memberResult.data.length)

    if (memberResult.data.length === 0) {
      return {
        code: 403,
        message: '您不是该组织的成员，无法打卡'
      }
    }

    // 全局检查是否有正在进行的打卡记录（不限组织，不限时间）
    // 只要有未结束的打卡，就不允许新开
    const cmd = db.command
    const activeRecord = await db.collection('work-records')
      .where({
        user_id: userId,
        clock_out_time: cmd.exists(false)
      })
      .get()

    console.log('Active records check result:', activeRecord.data.length)

    if (activeRecord.data.length > 0) {
      const record = activeRecord.data[0]
      // 如果是同一个组织的，提示已上班
      if (record.org_id === orgId) {
        return {
          code: 400,
          message: '您当前已在上班中，请先下班'
        }
      } else {
        // 如果是其他组织的，提示先结束那边的
        return {
          code: 400,
          message: '您在其他组织有未结束的打卡，请先结束该记录'
        }
      }
    }

    // 创建打卡记录
    const recordData = {
      user_id: userId,
      org_id: orgId,
      clock_in_time: now,
      clock_in_location: {
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address || ''
      },
      status: 'ongoing',
      audit_status: 'pending',
      created_at: now
    }

    const result = await db.collection('work-records').add(recordData)

    return {
      code: 0,
      message: '上班打卡成功',
      data: {
        recordId: result.id,
        clockInTime: now
      }
    }
  } catch (error) {
    console.error('clockIn error:', error)
    return {
      code: 500,
      message: '上班打卡失败: ' + error.message,
      error: error.message
    }
  }
}

// 下班打卡
async function clockOut(userId, recordId, location, db) {
  try {
    const now = new Date()

    // 获取打卡记录
    const recordResult = await db.collection('work-records')
      .doc(recordId)
      .get()

    if (recordResult.data.length === 0) {
      return {
        code: 404,
        message: '打卡记录不存在'
      }
    }

    const record = recordResult.data[0]

    if (record.clock_out_time) {
      return {
        code: 400,
        message: '今日已下班打卡'
      }
    }

    if (record.user_id !== userId) {
      return {
        code: 403,
        message: '无权操作该打卡记录'
      }
    }

    // 计算工作时长
    const clockInTime = new Date(record.clock_in_time)
    const diffSeconds = Math.floor((now - clockInTime) / 1000)
    const minutes = Math.floor(diffSeconds / 60)
    const seconds = diffSeconds % 60
    const durationMinutes = seconds >= 30 ? minutes + 1 : minutes

    // 更新打卡记录
    const updateData = {
      clock_out_time: now,
      clock_out_location: {
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address
      },
      duration_minutes: durationMinutes,
      status: 'completed'
    }

    await db.collection('work-records')
      .doc(recordId)
      .update(updateData)

    // 更新日统计
    await updateDailyStats(record.user_id, record.org_id, durationMinutes, db)

    return {
      code: 0,
      message: '下班打卡成功',
      data: {
        clockOutTime: now,
        durationMinutes: durationMinutes
      }
    }
  } catch (error) {
    console.error('clockOut error:', error)
    return {
      code: 500,
      message: '下班打卡失败',
      error: error.message
    }
  }
}

// 获取今日打卡记录
async function getTodayRecords(userId, db) {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    const cmd = db.command
    const result = await db.collection('work-records')
      .where({
        user_id: userId,
        clock_in_time: cmd.gte(today.getTime()).and(cmd.lt(tomorrow.getTime()))
      })
      .orderBy('clock_in_time', 'desc')
      .get()

    return {
      code: 0,
      message: '获取成功',
      data: result.data
    }
  } catch (error) {
    console.error('getTodayRecords error:', error)
    return {
      code: 500,
      message: '获取打卡记录失败',
      error: error.message
    }
  }
}

// 获取工作时长
async function getWorkDuration(userId, db) {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)

    // 获取今日所有打卡记录
    const cmd = db.command
    const records = await db.collection('work-records')
      .where({
        user_id: userId,
        clock_in_time: cmd.gte(today.getTime()).and(cmd.lt(tomorrow.getTime())),
        audit_status: 'approved'
      })
      .get()

    let totalMinutes = 0
    let currentRecord = null

    for (const record of records.data) {
      if (record.clock_out_time) {
        // 已完成的记录
        totalMinutes += record.duration_minutes || 0
      } else {
        // 进行中的记录
        currentRecord = record
        const now = new Date()
        const diffSeconds = Math.floor((now - new Date(record.clock_in_time)) / 1000)
        const minutes = Math.floor(diffSeconds / 60)
        const seconds = diffSeconds % 60
        totalMinutes += seconds >= 30 ? minutes + 1 : minutes
      }
    }

    return {
      code: 0,
      message: '获取成功',
      data: {
        totalMinutes,
        currentRecord,
        recordCount: records.data.length
      }
    }
  } catch (error) {
    console.error('getWorkDuration error:', error)
    return {
      code: 500,
      message: '获取工作时长失败',
      error: error.message
    }
  }
}

// 获取最近打卡记录
async function getRecentRecords(userId, db) {
  try {
    const result = await db.collection('work-records')
      .where({
        user_id: userId
      })
      .orderBy('clock_in_time', 'desc')
      .limit(5)
      .get()

    return {
      code: 0,
      message: '获取成功',
      data: result.data
    }
  } catch (error) {
    console.error('getRecentRecords error:', error)
    return {
      code: 500,
      message: '获取最近记录失败',
      error: error.message
    }
  }
}

// 更新日统计
async function updateDailyStats(userId, orgId, minutes, db) {
  try {
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    // 查找今日统计记录
    const whereCondition = {
      user_id: userId,
      date: today.getTime() // 使用时间戳
    }

    // 如果有组织，添加组织条件
    if (orgId) {
      whereCondition.org_id = orgId
    }

    const statsResult = await db.collection('attendance-statistics')
      .where(whereCondition)
      .get()

    if (statsResult.data.length > 0) {
      // 更新现有统计
      const stats = statsResult.data[0]
      await db.collection('attendance-statistics')
        .doc(stats._id)
        .update({
          total_minutes: (stats.total_minutes || 0) + minutes,
          record_count: (stats.record_count || 0) + 1,
          updated_at: new Date()
        })
    } else {
      // 创建新统计
      const statsData = {
        user_id: userId,
        date: today.getTime(), // 使用时间戳
        total_minutes: minutes,
        record_count: 1,
        created_at: new Date(),
        updated_at: new Date()
      }

      // 如果有组织，添加组织ID
      if (orgId) {
        statsData.org_id = orgId
      }

      await db.collection('attendance-statistics').add(statsData)
    }
  } catch (error) {
    console.error('updateDailyStats error:', error)
  }
}
