'use strict';

const db = uniCloud.database()

exports.main = async (event, context) => {
  const { action, code, profile } = event
  
  try {
    switch (action) {
      case 'wxLogin':
        return await handleWxLogin(code)
      case 'getUserInfo':
        return await getUserInfo(context)
      case 'updateProfile':
        return await updateProfile(profile, context)
      default:
        return {
          code: -1,
          message: '未知操作'
        }
    }
  } catch (error) {
    console.error('user-auth error:', error)
    return {
      code: -1,
      message: error.message || '操作失败'
    }
  }
}

// 处理微信登录
async function handleWxLogin(code) {
  try {
    // 验证code参数
    if (!code || typeof code !== 'string') {
      return {
        code: -1,
        message: '微信登录code无效'
      }
    }
    
    // 调用微信API获取openid和session_key
    const wxResult = await uniCloud.httpclient.request('https://api.weixin.qq.com/sns/jscode2session', {
      method: 'GET',
      data: {
        appid: 'wx0a9c4d5b8cac1bc1', // 微信小程序AppID
        secret: '6a0b8065b4795bd63d219c91fdc18f28', // 微信小程序Secret，需要配置
        js_code: code,
        grant_type: 'authorization_code'
      }
    })
    
    if (wxResult.data.errcode) {
      return {
        code: -1,
        message: `微信登录失败: ${wxResult.data.errmsg}`
      }
    }
    
    const { openid, session_key } = wxResult.data
    
    // 检查用户是否已存在
    const userResult = await db.collection('user-profiles').where({
      openid: openid
    }).get()
    
    let uid
    if (userResult.data.length > 0) {
      // 用户已存在
      uid = userResult.data[0]._id
    } else {
      // 创建新用户
      const createResult = await db.collection('user-profiles').add({
        openid: openid,
        session_key: session_key,
        created_at: new Date(),
        updated_at: new Date()
      })
      uid = createResult.id
    }
    
    // 生成token
    const token = generateToken(uid)
    
    return {
      code: 0,
      data: {
        uid: uid,
        token: token
      }
    }
  } catch (error) {
    console.error('handleWxLogin error:', error)
    return {
      code: -1,
      message: '微信登录失败'
    }
  }
}

// 获取用户信息
async function getUserInfo(context) {
  try {
    // 从请求头获取token
    const token = context.headers['x-token'] || context.headers['token']
    if (!token) {
      return {
        code: -1,
        message: '未登录'
      }
    }
    
    // 解析token
    const tokenData = parseToken(token)
    if (!tokenData) {
      return {
        code: -1,
        message: 'token无效或已过期'
      }
    }
    
    const uid = tokenData.uid
    
    const userResult = await db.collection('user-profiles').doc(uid).get()
    
    if (userResult.data.length === 0) {
      return {
        code: -1,
        message: '用户不存在'
      }
    }
    
    return {
      code: 0,
      data: {
        profile: userResult.data[0]
      }
    }
  } catch (error) {
    console.error('getUserInfo error:', error)
    return {
      code: -1,
      message: '获取用户信息失败'
    }
  }
}

// 更新用户信息
async function updateProfile(profile, context) {
  try {
    // 验证profile参数
    if (!profile || typeof profile !== 'object') {
      return {
        code: -1,
        message: '用户信息参数无效'
      }
    }
    
    // 从请求头获取token
    const token = context.headers['x-token'] || context.headers['token']
    if (!token) {
      return {
        code: -1,
        message: '未登录'
      }
    }
    
    // 解析token
    const tokenData = parseToken(token)
    if (!tokenData) {
      return {
        code: -1,
        message: 'token无效或已过期'
      }
    }
    
    const uid = tokenData.uid
    
    // 检查学号是否重复
    if (profile.student_id) {
      const existingUser = await db.collection('user-profiles').where({
        student_id: profile.student_id,
        _id: db.command.neq(uid)
      }).get()
      
      if (existingUser.data.length > 0) {
        return {
          code: -1,
          message: '学号已存在，请使用其他学号'
        }
      }
    }
    
    // 更新用户信息
    const updateResult = await db.collection('user-profiles').doc(uid).update({
      ...profile,
      updated_at: new Date()
    })
    
    if (updateResult.updated === 0) {
      return {
        code: -1,
        message: '更新用户信息失败'
      }
    }
    
    return {
      code: 0,
      message: '用户信息更新成功'
    }
  } catch (error) {
    console.error('updateProfile error:', error)
    return {
      code: -1,
      message: '更新用户信息失败'
    }
  }
}

// 生成token
function generateToken(uid) {
  const timestamp = Date.now()
  const random = Math.random().toString(36).substr(2, 9)
  return `token_${uid}_${timestamp}_${random}`
}

// 解析token
function parseToken(token) {
  if (!token || typeof token !== 'string') {
    return null
  }
  
  const parts = token.split('_')
  if (parts.length !== 4 || parts[0] !== 'token') {
    return null
  }
  
  const uid = parts[1]
  const timestamp = parseInt(parts[2])
  const random = parts[3]
  
  // 检查时间戳是否有效（24小时内）
  const now = Date.now()
  const tokenTime = timestamp
  const validTime = 24 * 60 * 60 * 1000 // 24小时
  
  if (now - tokenTime > validTime) {
    return null
  }
  
  return {
    uid: uid,
    timestamp: timestamp,
    random: random
  }
}