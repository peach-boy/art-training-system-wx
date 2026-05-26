/** 移动端角色展示（教师 / 管理员） */

const SUB_LABELS = {
  teacher: '授课教师',
  admin: '门店管理员',
  finance_admin: '财务管理员',
  super_admin: '超级管理员'
}

/**
 * @param {string} role
 * @returns {{
 *   isTeacher: boolean,
 *   primaryLabel: string,
 *   subLabel: string,
 *   workspaceTitle: string,
 *   workspaceDesc: string,
 *   badgeTheme: 'teacher' | 'admin'
 * }}
 */
export function getRoleDisplay(role) {
  const isTeacher = role === 'teacher'
  const subLabel = SUB_LABELS[role] || (isTeacher ? '教师' : '管理员')

  if (isTeacher) {
    return {
      isTeacher: true,
      primaryLabel: '教师',
      subLabel,
      workspaceTitle: '教师工作台',
      workspaceDesc: '录入课时、查看本人课表与学员',
      badgeTheme: 'teacher'
    }
  }

  const adminDesc = {
    super_admin: '移动端可进行录课与店铺切换，完整报表请用 PC 后台',
    finance_admin: '录入成本、查看课时与学员续费情况',
    admin: '管理本店学员、课时与教务日常'
  }

  return {
    isTeacher: false,
    primaryLabel: '管理员',
    subLabel,
    workspaceTitle: '管理工作台',
    workspaceDesc: adminDesc[role] || '管理本店学员与课时',
    badgeTheme: 'admin'
  }
}
