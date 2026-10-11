/** 晚托课时可选授课老师（与机构约定一致，按此顺序展示） */
export const CARE_EVENING_TEACHER_NAMES = ['吴老师', '李老师', '王老师']

export function filterCareEveningTeachers(list) {
  const map = new Map((list || []).map((t) => [t.name, t]))
  return CARE_EVENING_TEACHER_NAMES.map((name) => map.get(name)).filter(Boolean)
}
