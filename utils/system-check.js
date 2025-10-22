/**
 * 系统状态检查工具
 */

/**
 * 检查系统是否有超级管理员
 * @returns {Promise<boolean>} 是否有超级管理员
 */
export async function checkSuperAdmin() {
  try {
    const result = await uniCloud.callFunction({
      name: 'system-init',
      data: {
        action: 'checkSuperAdmin'
      }
    })
    
    if (result.result.code === 0) {
      return result.result.data.hasSuperAdmin
    }
    
    return false
  } catch (error) {
    console.error('checkSuperAdmin error:', error)
    return false
  }
}

/**
 * 获取系统状态
 * @returns {Promise<Object>} 系统状态信息
 */
export async function getSystemStatus() {
  try {
    const result = await uniCloud.callFunction({
      name: 'system-init',
      data: {
        action: 'getSystemStatus'
      }
    })
    
    if (result.result.code === 0) {
      return result.result.data
    }
    
    return {
      hasSuperAdmin: false,
      superAdminCount: 0,
      adminCount: 0,
      orgCount: 0,
      userCount: 0,
      systemReady: false
    }
  } catch (error) {
    console.error('getSystemStatus error:', error)
    return {
      hasSuperAdmin: false,
      superAdminCount: 0,
      adminCount: 0,
      orgCount: 0,
      userCount: 0,
      systemReady: false
    }
  }
}

/**
 * 初始化超级管理员
 * @param {Object} userInfo 用户信息
 * @returns {Promise<Object>} 初始化结果
 */
export async function initSuperAdmin(userInfo) {
  try {
    const result = await uniCloud.callFunction({
      name: 'system-init',
      data: {
        action: 'initSuperAdmin',
        userInfo: userInfo
      }
    })
    
    return result.result
  } catch (error) {
    console.error('initSuperAdmin error:', error)
    return {
      code: 500,
      message: '初始化失败',
      error: error.message
    }
  }
}

/**
 * 系统启动检查
 * @returns {Promise<Object>} 检查结果
 */
export async function systemStartupCheck() {
  try {
    // 检查超级管理员
    const hasSuperAdmin = await checkSuperAdmin()
    
    if (!hasSuperAdmin) {
      return {
        needInit: true,
        message: '系统需要初始化超级管理员'
      }
    }
    
    // 获取系统状态
    const systemStatus = await getSystemStatus()
    
    return {
      needInit: false,
      systemReady: systemStatus.systemReady,
      systemStatus: systemStatus
    }
  } catch (error) {
    console.error('systemStartupCheck error:', error)
    return {
      needInit: false,
      systemReady: false,
      error: error.message
    }
  }
}
