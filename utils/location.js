/**
 * 位置服务工具类
 * 用于统一处理定位相关功能
 */

/**
 * 获取当前位置信息
 * @param {Object} options - 配置选项
 * @param {string} options.type - 坐标类型，默认'gcj02'
 * @param {boolean} options.geocode - 是否需要地址信息，默认true
 * @returns {Promise<Object>} 位置信息对象
 */
export function getCurrentLocation(options = {}) {
    const { type = 'gcj02', geocode = true } = options

    return new Promise((resolve, reject) => {
        uni.getLocation({
            type,
            geocode,
            success: (res) => {
                resolve({
                    latitude: res.latitude,
                    longitude: res.longitude,
                    address: res.address || '',
                    city: res.city || '',
                    province: res.province || ''
                })
            },
            fail: (error) => {
                console.error('[Location] 获取位置失败:', error)

                // 根据错误类型返回友好提示
                if (error.errMsg && error.errMsg.includes('auth deny')) {
                    reject(new Error('位置权限被拒绝，请在设置中开启位置权限'))
                } else if (error.errMsg && error.errMsg.includes('timeout')) {
                    reject(new Error('获取位置超时，请检查网络连接'))
                } else {
                    reject(new Error('获取位置失败，请稍后重试'))
                }
            }
        })
    })
}

/**
 * 检查位置权限状态
 * @returns {Promise<boolean>} 是否已授权
 */
export async function checkLocationPermission() {
    try {
        const result = await new Promise((resolve, reject) => {
            uni.getSetting({
                success: (res) => {
                    resolve(res.authSetting['scope.userLocation'])
                },
                fail: reject
            })
        })

        return result === true
    } catch (error) {
        console.error('[Location] 检查权限失败:', error)
        return false
    }
}

/**
 * 请求位置权限
 * @returns {Promise<boolean>} 是否授权成功
 */
export async function requestLocationPermission() {
    try {
        // 先检查是否已授权
        const hasPermission = await checkLocationPermission()
        if (hasPermission) {
            return true
        }

        // 请求授权
        return new Promise((resolve) => {
            uni.authorize({
                scope: 'scope.userLocation',
                success: () => {
                    console.log('[Location] 位置权限授权成功')
                    resolve(true)
                },
                fail: () => {
                    console.log('[Location] 位置权限授权失败')
                    resolve(false)
                }
            })
        })
    } catch (error) {
        console.error('[Location] 请求权限失败:', error)
        return false
    }
}

/**
 * 打开位置权限设置页面
 */
export function openLocationSettings() {
    uni.showModal({
        title: '需要位置权限',
        content: '打卡功能需要获取您的位置信息，请在设置中开启位置权限',
        confirmText: '去设置',
        success: (res) => {
            if (res.confirm) {
                uni.openSetting({
                    success: (settingRes) => {
                        console.log('[Location] 打开设置页面:', settingRes)
                    }
                })
            }
        }
    })
}

/**
 * 计算两点之间的距离（单位：米）
 * 使用 Haversine 公式
 * @param {number} lat1 - 第一个点的纬度
 * @param {number} lon1 - 第一个点的经度
 * @param {number} lat2 - 第二个点的纬度
 * @param {number} lon2 - 第二个点的经度
 * @returns {number} 距离（米）
 */
export function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371e3 // 地球半径（米）
    const φ1 = lat1 * Math.PI / 180
    const φ2 = lat2 * Math.PI / 180
    const Δφ = (lat2 - lat1) * Math.PI / 180
    const Δλ = (lon2 - lon1) * Math.PI / 180

    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
        Math.cos(φ1) * Math.cos(φ2) *
        Math.sin(Δλ / 2) * Math.sin(Δλ / 2)

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a))

    return R * c
}

/**
 * 检查当前位置是否在指定范围内
 * @param {Object} currentLocation - 当前位置
 * @param {Object} targetLocation - 目标位置
 * @param {number} radius - 允许范围（米）
 * @returns {boolean} 是否在范围内
 */
export function isInRange(currentLocation, targetLocation, radius = 1000) {
    if (!currentLocation || !targetLocation) {
        return false
    }

    const distance = calculateDistance(
        currentLocation.latitude,
        currentLocation.longitude,
        targetLocation.latitude,
        targetLocation.longitude
    )

    return distance <= radius
}

/**
 * 获取位置信息（带权限检查和错误处理）
 * @param {Object} options - 配置选项
 * @returns {Promise<Object>} 位置信息
 */
export async function getLocationWithPermission(options = {}) {
    try {
        // 1. 检查权限
        const hasPermission = await checkLocationPermission()

        if (!hasPermission) {
            // 2. 请求权限
            const granted = await requestLocationPermission()

            if (!granted) {
                // 3. 权限被拒绝，引导用户打开设置
                openLocationSettings()
                throw new Error('需要位置权限才能使用打卡功能')
            }
        }

        // 4. 获取位置
        const location = await getCurrentLocation(options)
        return location

    } catch (error) {
        console.error('[Location] 获取位置失败:', error)
        throw error
    }
}

export default {
    getCurrentLocation,
    checkLocationPermission,
    requestLocationPermission,
    openLocationSettings,
    calculateDistance,
    isInRange,
    getLocationWithPermission
}
