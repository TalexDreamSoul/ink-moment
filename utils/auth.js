/**
 * 统一认证工具类
 * 用于管理用户登录状态、token存储和验证
 */

const AUTH_STORAGE_KEYS = {
    UID: 'uid',
    TOKEN: 'token',
    IS_LOGGED_IN: 'isLoggedIn',
    UNI_ID_UID: 'uni_id_uid',
    UNI_ID_TOKEN: 'uni_id_token',
    UNI_ID_TOKEN_EXPIRED: 'uni_id_token_expired',
    USER_PROFILE: 'userProfile'
}

export default {
    /**
     * 检查是否已登录
     * @returns {boolean}
     */
    isLoggedIn() {
        try {
            const uid = uni.getStorageSync(AUTH_STORAGE_KEYS.UID)
            const token = uni.getStorageSync(AUTH_STORAGE_KEYS.TOKEN)
            const isLoggedIn = uni.getStorageSync(AUTH_STORAGE_KEYS.IS_LOGGED_IN)

            // 检查token是否过期
            const tokenExpired = uni.getStorageSync(AUTH_STORAGE_KEYS.UNI_ID_TOKEN_EXPIRED)
            if (tokenExpired && Date.now() > tokenExpired) {
                console.log('[Auth] Token已过期')
                this.clearLoginInfo()
                return false
            }

            return !!(uid && token && isLoggedIn)
        } catch (error) {
            console.error('[Auth] 检查登录状态失败:', error)
            return false
        }
    },

    /**
     * 获取用户ID
     * @returns {string|null}
     */
    getUserId() {
        try {
            return uni.getStorageSync(AUTH_STORAGE_KEYS.UID) || null
        } catch (error) {
            console.error('[Auth] 获取用户ID失败:', error)
            return null
        }
    },

    /**
     * 获取Token
     * @returns {string|null}
     */
    getToken() {
        try {
            return uni.getStorageSync(AUTH_STORAGE_KEYS.TOKEN) || null
        } catch (error) {
            console.error('[Auth] 获取Token失败:', error)
            return null
        }
    },

    /**
     * 保存登录信息
     * @param {Object} loginData - 登录数据
     * @param {string} loginData.uid - 用户ID
     * @param {string} loginData.token - 访问令牌
     * @param {number} loginData.tokenExpired - token过期时间戳
     */
    saveLoginInfo({ uid, token, tokenExpired }) {
        try {
            uni.setStorageSync(AUTH_STORAGE_KEYS.UID, uid)
            uni.setStorageSync(AUTH_STORAGE_KEYS.TOKEN, token)
            uni.setStorageSync(AUTH_STORAGE_KEYS.IS_LOGGED_IN, true)
            uni.setStorageSync(AUTH_STORAGE_KEYS.UNI_ID_UID, uid)
            uni.setStorageSync(AUTH_STORAGE_KEYS.UNI_ID_TOKEN, token)
            uni.setStorageSync(AUTH_STORAGE_KEYS.UNI_ID_TOKEN_EXPIRED, tokenExpired || 0)

            console.log('[Auth] 登录信息已保存')
        } catch (error) {
            console.error('[Auth] 保存登录信息失败:', error)
            throw error
        }
    },

    /**
     * 清除登录信息
     */
    clearLoginInfo() {
        try {
            uni.removeStorageSync(AUTH_STORAGE_KEYS.UID)
            uni.removeStorageSync(AUTH_STORAGE_KEYS.TOKEN)
            uni.removeStorageSync(AUTH_STORAGE_KEYS.IS_LOGGED_IN)
            uni.removeStorageSync(AUTH_STORAGE_KEYS.UNI_ID_UID)
            uni.removeStorageSync(AUTH_STORAGE_KEYS.UNI_ID_TOKEN)
            uni.removeStorageSync(AUTH_STORAGE_KEYS.UNI_ID_TOKEN_EXPIRED)
            uni.removeStorageSync(AUTH_STORAGE_KEYS.USER_PROFILE)

            console.log('[Auth] 登录信息已清除')
        } catch (error) {
            console.error('[Auth] 清除登录信息失败:', error)
        }
    },



    /**
     * 跳转到登录页
     * @param {string} redirect - 登录成功后要跳转的页面
     */
    toLogin(redirect) {
        const url = redirect
            ? `/pages/auth/login?redirect=${encodeURIComponent(redirect)}`
            : '/pages/auth/login'

        uni.navigateTo({
            url,
            fail: () => {
                // 如果已经在登录页，则不跳转
                console.log('[Auth] 已在登录页面')
            }
        })
    },

    /**
     * 检查登录状态，未登录则跳转登录页
     * @param {string} redirect - 登录成功后要跳转的页面（可选）
     * @returns {boolean} 是否已登录
     */
    requireLogin(redirect) {
        if (!this.isLoggedIn()) {
            this.toLogin(redirect)
            return false
        }
        return true
    },

    /**
     * 退出登录
     * @param {boolean} showConfirm - 是否显示确认对话框
     * @returns {Promise<void>}
     */
    async logout(showConfirm = true) {
        return new Promise((resolve, reject) => {
            const doLogout = () => {
                this.clearLoginInfo()
                uni.reLaunch({
                    url: '/pages/auth/login',
                    success: () => {
                        console.log('[Auth] 退出登录成功')
                        resolve()
                    },
                    fail: (error) => {
                        console.error('[Auth] 退出登录失败:', error)
                        reject(error)
                    }
                })
            }

            if (showConfirm) {
                uni.showModal({
                    title: '确认退出',
                    content: '确定要退出登录吗？',
                    success: (res) => {
                        if (res.confirm) {
                            doLogout()
                        } else {
                            reject(new Error('用户取消退出'))
                        }
                    },
                    fail: reject
                })
            } else {
                doLogout()
            }
        })
    }
}
