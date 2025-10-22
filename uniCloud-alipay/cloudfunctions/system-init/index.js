'use strict';

exports.main = async (event, context) => {
  const { action } = event
  
  try {
    switch (action) {
      case 'checkSuperAdmin':
        return await checkSuperAdmin()
      case 'initSuperAdmin':
        return await initSuperAdmin(event.userInfo.uid, event.userInfo)
      case 'getSystemStatus':
        return await getSystemStatus()
      default:
        return {
          code: 400,
          message: '无效的操作类型'
        }
    }
  } catch (error) {
    console.error('system-init error:', error)
    return {
      code: 500,
      message: '服务器错误',
      error: error.message
    }
  }
}

// 检查是否存在超级管理员
async function checkSuperAdmin() {
  try {
    const db = uniCloud.database()
    const result = await db.collection('system_roles')
      .where({
        role: 'super_admin'
      })
      .get()
    
    return {
      code: 0,
      message: '检查完成',
      data: {
        hasSuperAdmin: result.data.length > 0,
        count: result.data.length
      }
    }
  } catch (error) {
    console.error('checkSuperAdmin error:', error)
    return {
      code: 500,
      message: '检查超级管理员失败',
      error: error.message
    }
  }
}

// 初始化超级管理员
async function initSuperAdmin(userId, userInfo) {
  try {
    const db = uniCloud.database()
    
    // 再次检查是否已有超级管理员
    const existingAdmin = await db.collection('system_roles')
      .where({
        role: 'super_admin'
      })
      .get()
    
    if (existingAdmin.data.length > 0) {
      return {
        code: 400,
        message: '系统已有超级管理员，无法重复初始化'
      }
    }
    
    // 创建超级管理员记录
    const now = new Date()
    const result = await db.collection('system_roles').add({
      user_id: userId,
      role: 'super_admin',
      assigned_by: 'system',
      assigned_at: now
    })
    
    // 创建用户信息记录（如果不存在）
    const existingProfile = await db.collection('user_profiles')
      .where({
        user_id: userId
      })
      .get()
    
    if (existingProfile.data.length === 0) {
      await db.collection('user_profiles').add({
        user_id: userId,
        name: userInfo.nickName || '超级管理员',
        student_id: 'ADMIN_' + Date.now(),
        college: '系统管理',
        grade_major: '超级管理员',
        phone: '00000000000',
        counselor: '系统',
        gender: 'other',
        meta: {
          avatar: userInfo.avatarUrl || '',
          wechat: userInfo.nickName || '超级管理员'
        },
        is_completed: true,
        created_at: now,
        updated_at: now,
        submitted_at: now
      })
    }
    
    return {
      code: 0,
      message: '超级管理员初始化成功',
      data: {
        roleId: result.id,
        userId: userId
      }
    }
  } catch (error) {
    console.error('initSuperAdmin error:', error)
    return {
      code: 500,
      message: '初始化超级管理员失败',
      error: error.message
    }
  }
}

// 获取系统状态
async function getSystemStatus() {
  try {
    const db = uniCloud.database()
    
    // 检查超级管理员
    const superAdminResult = await db.collection('system_roles')
      .where({
        role: 'super_admin'
      })
      .get()
    
    // 检查管理员数量
    const adminResult = await db.collection('system_roles')
      .where({
        role: 'admin'
      })
      .get()
    
    // 检查组织数量
    const orgResult = await db.collection('organizations')
      .get()
    
    // 检查用户数量
    const userResult = await db.collection('user_profiles')
      .get()
    
    return {
      code: 0,
      message: '获取系统状态成功',
      data: {
        hasSuperAdmin: superAdminResult.data.length > 0,
        superAdminCount: superAdminResult.data.length,
        adminCount: adminResult.data.length,
        orgCount: orgResult.data.length,
        userCount: userResult.data.length,
        systemReady: superAdminResult.data.length > 0
      }
    }
  } catch (error) {
    console.error('getSystemStatus error:', error)
    return {
      code: 500,
      message: '获取系统状态失败',
      error: error.message
    }
  }
}
