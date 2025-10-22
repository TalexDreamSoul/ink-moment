'use strict';

const uniID = require('uni-id')

exports.main = async (event, context) => {
  const { action, code, userInfo } = event
  
  try {
    switch (action) {
      case 'wxLogin':
        return await wxLogin(code, userInfo)
      case 'getUserProfile':
        return await getUserProfile(event.userInfo.uid)
      case 'updateUserProfile':
        return await updateUserProfile(event.userInfo.uid, event.profileData)
      default:
        return {
          code: 400,
          message: '无效的操作类型'
        }
    }
  } catch (error) {
    console.error('user-auth error:', error)
    return {
      code: 500,
      message: '服务器错误',
      error: error.message
    }
  }
}

// 微信登录
async function wxLogin(code, userInfo) {
  try {
    // 简化登录方式，直接使用微信openid
    const db = uniCloud.database()
    
    // 通过code获取openid
    const openidResult = await uniCloud.httpclient.request('https://api.weixin.qq.com/sns/jscode2session', {
      method: 'GET',
      data: {
        appid: 'wx0a9c4d5b8cac1bc1', // 从manifest.json获取
        secret: 'YOUR_WECHAT_SECRET', // 需要配置微信小程序的secret
        js_code: code,
        grant_type: 'authorization_code'
      }
    })
    
    if (openidResult.status !== 200) {
      return {
        code: 400,
        message: '获取微信openid失败'
      }
    }
    
    const { openid, session_key } = JSON.parse(openidResult.data)
    
    if (!openid) {
      return {
        code: 400,
        message: '微信登录失败，未获取到openid'
      }
    }
    
    // 生成用户ID和token
    const uid = 'user_' + openid
    const token = 'token_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    
    // 检查用户是否已填写个人信息
    const db = uniCloud.database()
    const profileResult = await db.collection('user_profiles')
      .where({
        user_id: uid
      })
      .get()
    
    const hasProfile = profileResult.data.length > 0
    const isCompleted = hasProfile && profileResult.data[0].is_completed
    
    return {
      code: 0,
      message: '登录成功',
      data: {
        uid,
        token,
        hasProfile,
        isCompleted,
        profile: hasProfile ? profileResult.data[0] : null
      }
    }
  } catch (error) {
    console.error('wxLogin error:', error)
    return {
      code: 500,
      message: '微信登录失败',
      error: error.message
    }
  }
}

// 获取用户信息
async function getUserProfile(uid) {
  try {
    const db = uniCloud.database()
    const result = await db.collection('user_profiles')
      .where({
        user_id: uid
      })
      .get()
    
    if (result.data.length === 0) {
      return {
        code: 404,
        message: '用户信息不存在'
      }
    }
    
    return {
      code: 0,
      message: '获取成功',
      data: result.data[0]
    }
  } catch (error) {
    console.error('getUserProfile error:', error)
    return {
      code: 500,
      message: '获取用户信息失败',
      error: error.message
    }
  }
}

// 更新用户信息
async function updateUserProfile(uid, profileData) {
  try {
    const db = uniCloud.database()
    
    // 检查学号是否已存在
    if (profileData.student_id) {
      const existingUser = await db.collection('user_profiles')
        .where({
          student_id: profileData.student_id,
          user_id: db.command.neq(uid)
        })
        .get()
      
      if (existingUser.data.length > 0) {
        return {
          code: 400,
          message: '学号已存在，请使用其他学号'
        }
      }
    }
    
    // 检查是否已存在用户信息
    const existingProfile = await db.collection('user_profiles')
      .where({
        user_id: uid
      })
      .get()
    
    const now = new Date()
    const updateData = {
      ...profileData,
      updated_at: now,
      submitted_at: now,
      is_completed: true
    }
    
    // 确保meta对象存在
    if (!updateData.meta) {
      updateData.meta = {}
    }
    
    let result
    if (existingProfile.data.length > 0) {
      // 更新现有记录
      result = await db.collection('user_profiles')
        .doc(existingProfile.data[0]._id)
        .update(updateData)
    } else {
      // 创建新记录
      result = await db.collection('user_profiles')
        .add({
          user_id: uid,
          ...updateData,
          created_at: now
        })
    }
    
    return {
      code: 0,
      message: '用户信息更新成功',
      data: result
    }
  } catch (error) {
    console.error('updateUserProfile error:', error)
    return {
      code: 500,
      message: '更新用户信息失败',
      error: error.message
    }
  }
}
