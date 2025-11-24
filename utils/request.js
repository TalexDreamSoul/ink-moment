/**
 * 统一API请求工具
 * 用于调用云函数和处理错误
 */

import auth from './auth.js'

/**
 * 调用云函数
 * @param {string} name - 云函数名称
 * @param {Object} data - 请求数据
 * @param {boolean} requireAuth - 是否需要认证
 * @returns {Promise<any>}
 */
export async function callFunction(name, data = {}, requireAuth = true) {
    try {
        // 如果需要认证，检查登录状态
        if (requireAuth && !auth.isLoggedIn()) {
            throw new Error('请先登录')
        }

        // 获取token并添加到请求中
        const token = auth.getToken()
        const requestData = { ...data }

        if (token && requireAuth) {
            requestData.token = token
            requestData.uniIdToken = token
        }

        console.log(`[API] 调用云函数: ${name}`, requestData)

        // 调用云函数
        const result = await uniCloud.callFunction({
            name,
            data: requestData,
            header: token ? {
                'x-token': token,
                'uni-id-token': token
            } : {}
        })

        console.log(`[API] 云函数 ${name} 返回:`, result)

        // 检查返回结果
        if (!result || !result.result) {
            throw new Error('云函数返回数据格式错误')
        }

        const { code, message, data: resData } = result.result

        // 处理错误
        if (code !== 0) {
            // token失效，清除登录信息并跳转登录页
            if (code === 401 || message === '未登录' || message === 'token无效') {
                console.warn('[API] Token失效，需要重新登录')
                auth.clearLoginInfo()
                auth.toLogin()
                throw new Error('登录已失效，请重新登录')
            }

            throw new Error(message || '请求失败')
        }

        return resData
    } catch (error) {
        console.error(`[API] 调用云函数 ${name} 失败:`, error)

        // 显示错误提示
        const errorMsg = error.message || '网络请求失败'
        uni.showToast({
            title: errorMsg,
            icon: 'none',
            duration: 2000
        })

        throw error
    }
}

/**
 * 用户认证相关API
 */
export const authAPI = {
    /**
     * 微信登录
     * @param {string} code - 微信登录code
     * @returns {Promise<Object>}
     */
    async wxLogin(code) {
        return callFunction('user-auth', {
            action: 'wxLogin',
            code
        }, false)
    },

    /**
     * 获取用户信息
     * @returns {Promise<Object>}
     */
    async getUserInfo() {
        return callFunction('user-auth', {
            action: 'getUserInfo'
        }, true)
    },

    /**
     * 更新用户资料
     * @param {Object} profile - 用户资料
     * @returns {Promise<Object>}
     */
    async updateProfile(profile) {
        return callFunction('user-auth', {
            action: 'updateProfile',
            profile
        }, true)
    },

    /**
     * 获取完整用户信息（资料+角色+统计）
     * @returns {Promise<Object>}
     */
    async getUserFullInfo() {
        return callFunction('user-auth', {
            action: 'getUserFullInfo'
        }, true)
    },

    /**
     * 获取用户统计数据
     * @param {string} type - 'all' | 'today'
     * @returns {Promise<Object>}
     */
    async getUserStats(type = 'all') {
        return callFunction('user-auth', {
            action: 'getUserStats',
            type
        }, true)
    },

    /**
     * 检查用户角色
     * @returns {Promise<Object>}
     */
    async checkUserRoles() {
        return callFunction('user-auth', {
            action: 'checkUserRoles'
        }, true)
    }
}

/**
 * 打卡相关API
 */
export const clockAPI = {
    /**
     * 打卡
     * @param {Object} data - 打卡数据
     * @returns {Promise<Object>}
     */
    async clock(data) {
        return callFunction('work-clock', {
            action: 'clock',
            ...data
        }, true)
    },

    /**
     * 获取打卡记录
     * @param {Object} params - 查询参数
     * @returns {Promise<Object>}
     */
    async getRecords(params) {
        return callFunction('work-clock', {
            action: 'getRecords',
            ...params
        }, true)
    }
}

export default {
    callFunction,
    authAPI,
    clockAPI
}
