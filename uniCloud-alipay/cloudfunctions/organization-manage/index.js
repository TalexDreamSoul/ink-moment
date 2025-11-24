'use strict';

// Token 验证
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

// 生成随机邀请码
function generateInviteCode() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
    let code = ''
    for (let i = 0; i < 6; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length))
    }
    return code
}

exports.main = async (event, context) => {
    const { action } = event
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
            case 'createOrganization':
                return await createOrganization(userId, event, db)
            case 'getUserOrganizations':
                return await getUserOrganizations(userId, db)
            case 'getOrganizationDetail':
                return await getOrganizationDetail(userId, event.orgId, db)
            case 'updateOrganization':
                return await updateOrganization(userId, event.orgId, event.data, db)
            case 'deleteOrganization':
                return await deleteOrganization(userId, event.orgId, db)
            case 'joinOrganization':
                return await joinOrganization(userId, event, db)
            case 'leaveOrganization':
                return await leaveOrganization(userId, event.orgId, db)
            case 'getOrganizationQRCode':
                return await getOrganizationQRCode(userId, event.orgId, db)
            case 'setMemberRole':
                return await setMemberRole(userId, event.orgId, event.memberId, event.role, db)
            case 'getOrganizationMembers':
                return await getOrganizationMembers(userId, event.orgId, db)
            default:
                return {
                    code: 400,
                    message: '无效的操作类型'
                }
        }
    } catch (error) {
        console.error('organization-manage error:', error)
        return {
            code: 500,
            message: '服务器错误',
            error: error.message
        }
    }
}

// 创建组织
async function createOrganization(userId, event, db) {
    try {
        const { name, description, location } = event

        if (!name || name.trim().length === 0) {
            return {
                code: 400,
                message: '组织名称不能为空'
            }
        }

        if (name.length > 50) {
            return {
                code: 400,
                message: '组织名称不能超过50个字符'
            }
        }

        // 生成邀请码
        const qrcodeKey = generateInviteCode()

        const orgData = {
            name: name.trim(),
            description: description ? description.trim() : '',
            owner_id: userId,
            qrcode_key: qrcodeKey,
            status: 'active',
            created_at: new Date(),
            updated_at: new Date()
        }

        // 如果提供了位置信息
        if (location && location.latitude && location.longitude) {
            orgData.location = {
                latitude: location.latitude,
                longitude: location.longitude,
                radius: location.radius || 1000
            }
        }

        // 创建组织
        const orgResult = await db.collection('organizations').add(orgData)

        // 将创建者添加为组织成员（owner角色）
        await db.collection('organization-members').add({
            org_id: orgResult.id,
            user_id: userId,
            role: 'owner',
            status: 'active',
            joined_at: new Date()
        })

        return {
            code: 0,
            message: '创建组织成功',
            data: {
                orgId: orgResult.id,
                qrcodeKey: qrcodeKey
            }
        }
    } catch (error) {
        console.error('createOrganization error:', error)
        return {
            code: 500,
            message: '创建组织失败',
            error: error.message
        }
    }
}

// 获取用户加入的所有组织
async function getUserOrganizations(userId, db) {
    try {
        // 查询用户的组织成员记录
        const memberResult = await db.collection('organization-members')
            .where({
                user_id: userId,
                status: 'active'
            })
            .get()

        if (memberResult.data.length === 0) {
            return {
                code: 0,
                message: '获取成功',
                data: []
            }
        }

        // 获取所有组织ID
        const orgIds = memberResult.data.map(m => m.org_id)

        // 查询组织详情
        const orgResult = await db.collection('organizations')
            .where({
                _id: db.command.in(orgIds),
                status: 'active'
            })
            .get()

        // 合并组织信息和成员角色
        const organizations = orgResult.data.map(org => {
            const member = memberResult.data.find(m => m.org_id === org._id)
            return {
                ...org,
                role: member ? member.role : 'user',
                joined_at: member ? member.joined_at : null
            }
        })

        return {
            code: 0,
            message: '获取成功',
            data: organizations
        }
    } catch (error) {
        console.error('getUserOrganizations error:', error)
        return {
            code: 500,
            message: '获取组织列表失败',
            error: error.message
        }
    }
}

// 获取组织详情
async function getOrganizationDetail(userId, orgId, db) {
    try {
        if (!orgId) {
            return {
                code: 400,
                message: '组织ID不能为空'
            }
        }

        // 检查用户是否是组织成员
        const memberResult = await db.collection('organization-members')
            .where({
                org_id: orgId,
                user_id: userId,
                status: 'active'
            })
            .get()

        if (memberResult.data.length === 0) {
            return {
                code: 403,
                message: '您不是该组织成员'
            }
        }

        const userRole = memberResult.data[0].role

        // 获取组织信息
        const orgResult = await db.collection('organizations')
            .doc(orgId)
            .get()

        if (orgResult.data.length === 0) {
            return {
                code: 404,
                message: '组织不存在'
            }
        }

        const org = orgResult.data[0]

        // 获取成员列表（仅admin和supervisor可见）
        let members = []
        if (userRole === 'admin' || userRole === 'supervisor') {
            const allMembersResult = await db.collection('organization-members')
                .where({
                    org_id: orgId,
                    status: 'active'
                })
                .get()

            // 获取成员的用户信息
            const userIds = allMembersResult.data.map(m => m.user_id)
            const usersResult = await db.collection('user-profiles')
                .where({
                    user_id: db.command.in(userIds)
                })
                .get()

            members = allMembersResult.data.map(member => {
                const userProfile = usersResult.data.find(u => u.user_id === member.user_id)
                return {
                    user_id: member.user_id,
                    role: member.role,
                    joined_at: member.joined_at,
                    name: userProfile ? userProfile.name : '未知',
                    avatar: userProfile ? userProfile.avatar : ''
                }
            })
        }

        return {
            code: 0,
            message: '获取成功',
            data: {
                ...org,
                userRole: userRole,
                members: members,
                memberCount: members.length
            }
        }
    } catch (error) {
        console.error('getOrganizationDetail error:', error)
        return {
            code: 500,
            message: '获取组织详情失败',
            error: error.message
        }
    }
}

// 更新组织信息
async function updateOrganization(userId, orgId, data, db) {
    try {
        if (!orgId) {
            return {
                code: 400,
                message: '组织ID不能为空'
            }
        }

        // 检查是否是管理员
        const orgResult = await db.collection('organizations')
            .doc(orgId)
            .get()

        if (orgResult.data.length === 0) {
            return {
                code: 404,
                message: '组织不存在'
            }
        }

        if (orgResult.data[0].owner_id !== userId) {
            return {
                code: 403,
                message: '只有创建者可以修改组织信息'
            }
        }

        // 构建更新数据
        const updateData = {
            updated_at: new Date()
        }

        if (data.name && data.name.trim()) {
            if (data.name.length > 50) {
                return {
                    code: 400,
                    message: '组织名称不能超过50个字符'
                }
            }
            updateData.name = data.name.trim()
        }

        if (data.description !== undefined) {
            if (data.description && data.description.length > 200) {
                return {
                    code: 400,
                    message: '组织描述不能超过200个字符'
                }
            }
            updateData.description = data.description ? data.description.trim() : ''
        }

        if (data.location) {
            updateData.location = {
                latitude: data.location.latitude,
                longitude: data.location.longitude,
                radius: data.location.radius || 1000
            }
        }

        await db.collection('organizations')
            .doc(orgId)
            .update(updateData)

        return {
            code: 0,
            message: '更新成功'
        }
    } catch (error) {
        console.error('updateOrganization error:', error)
        return {
            code: 500,
            message: '更新组织失败',
            error: error.message
        }
    }
}

// 删除（禁用）组织
async function deleteOrganization(userId, orgId, db) {
    try {
        if (!orgId) {
            return {
                code: 400,
                message: '组织ID不能为空'
            }
        }

        // 检查是否是管理员
        const orgResult = await db.collection('organizations')
            .doc(orgId)
            .get()

        if (orgResult.data.length === 0) {
            return {
                code: 404,
                message: '组织不存在'
            }
        }

        if (orgResult.data[0].owner_id !== userId) {
            return {
                code: 403,
                message: '只有创建者可以删除组织'
            }
        }

        // 软删除：将状态改为 inactive
        await db.collection('organizations')
            .doc(orgId)
            .update({
                status: 'inactive',
                updated_at: new Date()
            })

        // 同时将所有成员状态改为 inactive
        await db.collection('organization-members')
            .where({
                org_id: orgId
            })
            .update({
                status: 'inactive'
            })

        return {
            code: 0,
            message: '删除成功'
        }
    } catch (error) {
        console.error('deleteOrganization error:', error)
        return {
            code: 500,
            message: '删除组织失败',
            error: error.message
        }
    }
}

// 加入组织
async function joinOrganization(userId, event, db) {
    try {
        const { qrcodeKey, orgId } = event
        let targetOrgId = orgId

        // 检查用户资料是否完整
        const profileResult = await db.collection('user-profiles').doc(userId).get()
        if (profileResult.data.length === 0 || !profileResult.data[0].is_completed) {
            return {
                code: 403,
                message: '请先完善个人信息后再加入组织'
            }
        }

        // 如果提供了二维码key，通过key查找组织
        if (qrcodeKey) {
            const orgResult = await db.collection('organizations')
                .where({
                    qrcode_key: qrcodeKey,
                    status: 'active'
                })
                .get()

            if (orgResult.data.length === 0) {
                return {
                    code: 404,
                    message: '无效的邀请码'
                }
            }

            targetOrgId = orgResult.data[0]._id
        }

        if (!targetOrgId) {
            return {
                code: 400,
                message: '组织ID或邀请码不能为空'
            }
        }

        // 检查组织是否存在
        const orgResult = await db.collection('organizations')
            .doc(targetOrgId)
            .get()

        if (orgResult.data.length === 0 || orgResult.data[0].status !== 'active') {
            return {
                code: 404,
                message: '组织不存在或已被禁用'
            }
        }

        // 检查是否已经是成员
        const existingMember = await db.collection('organization-members')
            .where({
                org_id: targetOrgId,
                user_id: userId,
                status: 'active'
            })
            .get()

        if (existingMember.data.length > 0) {
            return {
                code: 400,
                message: '您已经是该组织成员'
            }
        }

        // 添加为组织成员
        await db.collection('organization-members').add({
            org_id: targetOrgId,
            user_id: userId,
            role: 'user',
            status: 'active',
            joined_at: new Date()
        })

        return {
            code: 0,
            message: '加入组织成功',
            data: {
                orgId: targetOrgId,
                orgName: orgResult.data[0].name
            }
        }
    } catch (error) {
        console.error('joinOrganization error:', error)
        return {
            code: 500,
            message: '加入组织失败',
            error: error.message
        }
    }
}

// 退出组织
async function leaveOrganization(userId, orgId, db) {
    try {
        if (!orgId) {
            return {
                code: 400,
                message: '组织ID不能为空'
            }
        }

        // 检查组织是否存在
        const orgResult = await db.collection('organizations')
            .doc(orgId)
            .get()

        if (orgResult.data.length === 0) {
            return {
                code: 404,
                message: '组织不存在'
            }
        }

        // owner不能退出组织
        if (orgResult.data[0].owner_id === userId) {
            return {
                code: 403,
                message: '创建者不能退出组织，请先转让所有权或删除组织'
            }
        }

        // 检查是否是成员
        const memberResult = await db.collection('organization-members')
            .where({
                org_id: orgId,
                user_id: userId,
                status: 'active'
            })
            .get()

        if (memberResult.data.length === 0) {
            return {
                code: 400,
                message: '您不是该组织成员'
            }
        }

        // 将成员状态改为 inactive
        await db.collection('organization-members')
            .doc(memberResult.data[0]._id)
            .update({
                status: 'inactive'
            })

        return {
            code: 0,
            message: '退出组织成功'
        }
    } catch (error) {
        console.error('leaveOrganization error:', error)
        return {
            code: 500,
            message: '退出组织失败',
            error: error.message
        }
    }
}

// 获取组织二维码（仅owner和admin可访问）
async function getOrganizationQRCode(userId, orgId, db) {
    try {
        if (!orgId) {
            return {
                code: 400,
                message: '组织ID不能为空'
            }
        }

        // 检查用户在组织中的角色
        const memberResult = await db.collection('organization-members')
            .where({
                org_id: orgId,
                user_id: userId,
                status: 'active'
            })
            .get()

        if (memberResult.data.length === 0) {
            return {
                code: 403,
                message: '您不是该组织成员'
            }
        }

        const userRole = memberResult.data[0].role
        if (userRole !== 'owner' && userRole !== 'admin') {
            return {
                code: 403,
                message: '只有创建者和管理员可以查看二维码'
            }
        }

        // 获取组织信息
        const orgResult = await db.collection('organizations')
            .doc(orgId)
            .get()

        if (orgResult.data.length === 0) {
            return {
                code: 404,
                message: '组织不存在'
            }
        }

        const org = orgResult.data[0]

        return {
            code: 0,
            message: '获取成功',
            data: {
                qrcodeKey: org.qrcode_key,
                orgName: org.name,
                orgId: org._id
            }
        }
    } catch (error) {
        console.error('getOrganizationQRCode error:', error)
        return {
            code: 500,
            message: '获取二维码失败',
            error: error.message
        }
    }
}

// 设置成员角色（仅owner可操作）
async function setMemberRole(userId, orgId, memberId, newRole, db) {
    try {
        if (!orgId || !memberId || !newRole) {
            return {
                code: 400,
                message: '参数不完整'
            }
        }

        // 验证角色有效性
        const validRoles = ['admin', 'supervisor', 'user']
        if (!validRoles.includes(newRole)) {
            return {
                code: 400,
                message: '无效的角色类型'
            }
        }

        // 检查组织是否存在及操作者是否为owner
        const orgResult = await db.collection('organizations')
            .doc(orgId)
            .get()

        if (orgResult.data.length === 0) {
            return {
                code: 404,
                message: '组织不存在'
            }
        }

        if (orgResult.data[0].owner_id !== userId) {
            return {
                code: 403,
                message: '只有创建者可以设置成员角色'
            }
        }

        // 不能修改owner的角色
        if (memberId === userId) {
            return {
                code: 400,
                message: '不能修改自己的角色'
            }
        }

        // 查找目标成员
        const memberResult = await db.collection('organization-members')
            .where({
                org_id: orgId,
                user_id: memberId,
                status: 'active'
            })
            .get()

        if (memberResult.data.length === 0) {
            return {
                code: 404,
                message: '目标成员不存在'
            }
        }

        const member = memberResult.data[0]

        // 不能修改owner角色的成员
        if (member.role === 'owner') {
            return {
                code: 400,
                message: '不能修改创建者的角色'
            }
        }

        // 更新角色
        await db.collection('organization-members')
            .doc(member._id)
            .update({
                role: newRole
            })

        return {
            code: 0,
            message: '角色设置成功'
        }
    } catch (error) {
        console.error('setMemberRole error:', error)
        return {
            code: 500,
            message: '设置角色失败',
            error: error.message
        }
    }
}

// 获取组织成员列表（owner和admin可查看）
async function getOrganizationMembers(userId, orgId, db) {
    try {
        if (!orgId) {
            return {
                code: 400,
                message: '组织ID不能为空'
            }
        }

        // 检查用户权限
        const memberResult = await db.collection('organization-members')
            .where({
                org_id: orgId,
                user_id: userId,
                status: 'active'
            })
            .get()

        if (memberResult.data.length === 0) {
            return {
                code: 403,
                message: '您不是该组织成员'
            }
        }

        const userRole = memberResult.data[0].role
        if (userRole !== 'owner' && userRole !== 'admin') {
            return {
                code: 403,
                message: '只有创建者和管理员可以查看成员列表'
            }
        }

        // 获取所有成员
        const allMembersResult = await db.collection('organization-members')
            .where({
                org_id: orgId,
                status: 'active'
            })
            .get()

        // 获取成员的用户信息
        const userIds = allMembersResult.data.map(m => m.user_id)
        const usersResult = await db.collection('user-profiles')
            .where({
                user_id: db.command.in(userIds)
            })
            .get()

        // 组合数据
        const members = allMembersResult.data.map(member => {
            const userProfile = usersResult.data.find(u => u.user_id === member.user_id)
            return {
                _id: member._id,
                user_id: member.user_id,
                role: member.role,
                joined_at: member.joined_at,
                name: userProfile ? userProfile.name : '未知',
                student_id: userProfile ? userProfile.student_id : '',
                avatar: userProfile?.meta?.avatar || ''
            }
        })

        // 按角色排序：owner > admin > supervisor > user
        const roleOrder = { owner: 0, admin: 1, supervisor: 2, user: 3 }
        members.sort((a, b) => roleOrder[a.role] - roleOrder[b.role])

        return {
            code: 0,
            message: '获取成功',
            data: members
        }
    } catch (error) {
        console.error('getOrganizationMembers error:', error)
        return {
            code: 500,
            message: '获取成员列表失败',
            error: error.message
        }
    }
}
