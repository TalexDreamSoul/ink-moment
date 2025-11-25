/**
 * 工作时长格式化工具
 * 提供分钟到小时的精确转换
 */

/**
 * 将分钟数转换为小时（保留2位小数）
 * @param {number} minutes - 分钟数
 * @returns {number} 小时数
 */
export function minutesToHours(minutes) {
    if (!minutes || minutes === 0) return 0
    return parseFloat((minutes / 60).toFixed(2))
}

/**
 * 格式化时长显示（智能显示）
 * @param {number} minutes - 分钟数
 * @param {string} format - 显示格式 'auto' | 'hours' | 'full'
 * @returns {string} 格式化后的时长
 */
export function formatDuration(minutes, format = 'auto') {
    if (!minutes || minutes === 0) return '0分钟'

    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60

    if (format === 'hours') {
        return `${minutesToHours(minutes)}h`
    }

    if (format === 'full') {
        if (hours === 0) {
            return `${mins}分钟 (${minutesToHours(minutes)}小时)`
        }
        return `${hours}小时${mins}分钟 (${minutesToHours(minutes)}小时)`
    }

    // auto 格式
    if (hours === 0) {
        return `${mins}分钟`
    }
    return `${hours}小时${mins}分钟`
}

/**
 * 格式化时长显示为小时（带单位）
 * @param {number} minutes - 分钟数
 * @returns {string} 格式化后的小时数
 */
export function formatHours(minutes) {
    return `${minutesToHours(minutes)}小时`
}

/**
 * 格式化时长显示（紧凑型，用于列表）
 * @param {number} minutes - 分钟数
 * @returns {string} 格式化后的时长
 */
export function formatDurationCompact(minutes) {
    if (!minutes || minutes === 0) return '0h'

    const hours = Math.floor(minutes / 60)
    const mins = minutes % 60

    if (hours === 0) {
        return `${mins}分`
    }
    if (mins === 0) {
        return `${hours}h`
    }
    return `${hours}h${mins}分`
}
