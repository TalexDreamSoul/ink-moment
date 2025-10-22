'use strict';

exports.main = async (event, context) => {
  const { action, location, recordId } = event
  
  try {
    switch (action) {
      case 'clockIn':
        return await clockIn(event.userInfo.uid, location)
      case 'clockOut':
        return await clockOut(recordId, location)
      case 'getTodayRecords':
        return await getTodayRecords(event.userInfo.uid)
      case 'getWorkDuration':
        return await getWorkDuration(event.userInfo.uid)
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

// 上班打卡
async function clockIn(userId, location) {
  try {
    const db = uniCloud.database()
    const now = new Date()
    
    // 检查今天是否已经打卡
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const existingRecord = await db.collection('work_records')
      .where({
        user_id: userId,
        clock_in_time: db.command.gte(today).and(db.command.lt(tomorrow)),
        clock_out_time: db.command.exists(false)
      })
      .get()
    
    if (existingRecord.data.length > 0) {
      return {
        code: 400,
        message: '今日已上班打卡，请先下班打卡'
      }
    }
    
    // 获取用户所属组织
    const orgMembers = await db.collection('organization_members')
      .where({
        user_id: userId,
        status: 'active'
      })
      .get()
    
    if (orgMembers.data.length === 0) {
      return {
        code: 400,
        message: '您还未加入任何组织，请联系管理员'
      }
    }
    
    // 创建打卡记录
    const recordData = {
      user_id: userId,
      org_id: orgMembers.data[0].org_id, // 使用第一个组织
      clock_in_time: now,
      clock_in_location: {
        latitude: location.latitude,
        longitude: location.longitude,
        address: location.address
      },
      status: 'ongoing',
      audit_status: 'pending',
      created_at: now
    }
    
    const result = await db.collection('work_records').add(recordData)
    
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
      message: '上班打卡失败',
      error: error.message
    }
  }
}

// 下班打卡
async function clockOut(recordId, location) {
  try {
    const db = uniCloud.database()
    const now = new Date()
    
    // 获取打卡记录
    const recordResult = await db.collection('work_records')
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
    
    await db.collection('work_records')
      .doc(recordId)
      .update(updateData)
    
    // 更新日统计
    await updateDailyStats(record.user_id, record.org_id, durationMinutes)
    
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
async function getTodayRecords(userId) {
  try {
    const db = uniCloud.database()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    const result = await db.collection('work_records')
      .where({
        user_id: userId,
        clock_in_time: db.command.gte(today).and(db.command.lt(tomorrow))
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
async function getWorkDuration(userId) {
  try {
    const db = uniCloud.database()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const tomorrow = new Date(today)
    tomorrow.setDate(tomorrow.getDate() + 1)
    
    // 获取今日所有打卡记录
    const records = await db.collection('work_records')
      .where({
        user_id: userId,
        clock_in_time: db.command.gte(today).and(db.command.lt(tomorrow)),
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

// 更新日统计
async function updateDailyStats(userId, orgId, minutes) {
  try {
    const db = uniCloud.database()
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    
    // 查找今日统计记录
    const statsResult = await db.collection('attendance_statistics')
      .where({
        user_id: userId,
        org_id: orgId,
        date: today
      })
      .get()
    
    if (statsResult.data.length > 0) {
      // 更新现有统计
      const stats = statsResult.data[0]
      await db.collection('attendance_statistics')
        .doc(stats._id)
        .update({
          total_minutes: (stats.total_minutes || 0) + minutes,
          record_count: (stats.record_count || 0) + 1,
          updated_at: new Date()
        })
    } else {
      // 创建新统计
      await db.collection('attendance_statistics').add({
        user_id: userId,
        org_id: orgId,
        date: today,
        total_minutes: minutes,
        record_count: 1,
        created_at: new Date(),
        updated_at: new Date()
      })
    }
  } catch (error) {
    console.error('updateDailyStats error:', error)
  }
}
