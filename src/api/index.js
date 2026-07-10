import { request } from '@/utils/request'

export const authAPI = {
  getCaptcha() {
    return request({ url: '/auth/captcha', method: 'GET' })
  },
  mobileLogin(data) {
    return request({ url: '/auth/mobile/login', method: 'POST', data })
  },
  /** 小程序：loginCode 必填；首次或未绑定 openid 时传 phoneCode（getPhoneNumber） */
  wechatMiniProgramLogin(data) {
    return request({ url: '/auth/wechat/miniprogram/login', method: 'POST', data })
  },
  getCurrentUser() {
    return request({ url: '/auth/current', method: 'GET' })
  },
  logout() {
    return request({ url: '/auth/logout', method: 'POST' })
  }
}

export const studentAPI = {
  search(keyword, scope) {
    return request({
      url: '/students/search',
      method: 'GET',
      params: { keyword: keyword || '', scope: scope || 'mine' }
    })
  },
  getPage(params) {
    return request({
      url: '/students/page',
      method: 'GET',
      params: {
        current: params.current || 1,
        size: params.size || 10,
        name: params.name,
        status: params.status,
        feeStatus: params.feeStatus
      }
    })
  },
  getById(id) {
    return request({ url: `/students/${id}`, method: 'GET' })
  }
}

export const attendanceAPI = {
  getMonthlySummary() {
    return request({ url: '/attendance/teacher/monthly-summary', method: 'GET' })
  },
  getPage(params) {
    return request({
      url: '/attendance/page',
      method: 'GET',
      params: {
        current: params.current || 1,
        size: params.size || 10,
        studentId: params.studentId,
        startDate: params.startDate,
        endDate: params.endDate,
        sortBy: params.sortBy || 'classDate',
        teacherId: params.teacherId
      }
    })
  },
  getById(id) {
    return request({ url: `/attendance/${id}`, method: 'GET' })
  },
  create(data) {
    return request({ url: '/attendance', method: 'POST', data })
  },
  update(id, data) {
    return request({ url: `/attendance/${id}`, method: 'PUT', data })
  },
  checkDuplicate(params) {
    return request({ url: '/attendance/check-duplicate', method: 'GET', params })
  },
  getLatestRecordByStudent(studentId) {
    return request({ url: `/attendance/student/${studentId}/latest-record`, method: 'GET' })
  }
}

export const dashboardAPI = {
  getStats(startDate, endDate) {
    return request({
      url: '/attendance/stats/daily',
      method: 'GET',
      params: { startDate, endDate }
    })
  },
  getStudentCounts() {
    return request({ url: '/students/status-counts', method: 'GET' })
  }
}

export const storeAPI = {
  getList() {
    return request({ url: '/stores', method: 'GET' })
  }
}

export const coursePackageAPI = {
  getById(id) {
    return request({ url: `/packages/${id}`, method: 'GET' })
  },
  getByStudent(studentId) {
    return request({ url: `/packages/student/${studentId}`, method: 'GET' })
  }
}

/** 拉取某课包全部上课记录（按日期升序，供核对） */
export async function fetchPackageAttendanceRecords(packageId) {
  const pageSize = 200
  let page = 1
  let all = []
  let total = null
  while (true) {
    const data = await attendanceAPI.getPage({
      current: page,
      size: pageSize,
      packageId,
      sortBy: 'classDateAsc'
    })
    const batch = data?.records || data?.content || []
    if (total === null) total = Number(data?.total ?? data?.totalElements ?? batch.length)
    all = all.concat(batch)
    if (batch.length < pageSize || all.length >= total) break
    page += 1
    if (page > 40) break
  }
  return all
}

export const courseTypeAPI = {
  getList() {
    return request({ url: '/course-types', method: 'GET' })
  }
}

export const coursewareAPI = {
  listByCourseType(courseTypeId, keyword) {
    return request({
      url: '/courseware/list',
      method: 'GET',
      params: { courseTypeId, keyword: keyword || undefined }
    })
  }
}

export const teacherAPI = {
  getList(storeId) {
    const params = storeId != null && storeId !== '' ? { storeId } : {}
    return request({ url: '/teachers/list', method: 'GET', params })
  }
}

export const financialEntryAPI = {
  list(year, month, type) {
    return request({
      url: '/financial-entries',
      method: 'GET',
      params: { year, month, type: type || undefined }
    })
  },
  create(data) {
    return request({ url: '/financial-entries', method: 'POST', data })
  },
  update(id, data) {
    return request({ url: `/financial-entries/${id}`, method: 'PUT', data })
  },
  delete(id) {
    return request({ url: `/financial-entries/${id}`, method: 'DELETE' })
  }
}
