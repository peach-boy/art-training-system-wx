const { request } = require('../utils/request')

const authAPI = {
  getCaptcha() {
    return request({ url: '/auth/captcha', method: 'GET' })
  },
  login(data) {
    return request({ url: '/auth/login', method: 'POST', data })
  },
  teacherLogin(data) {
    return request({ url: '/auth/teacher/login', method: 'POST', data })
  },
  logout() {
    return request({ url: '/auth/logout', method: 'POST' })
  }
}

const studentAPI = {
  search(keyword, scope) {
    return request({
      url: '/students/search',
      method: 'GET',
      params: { keyword: keyword || '', scope: scope || 'mine' }
    })
  }
}

const attendanceAPI = {
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
        sortBy: params.sortBy || 'classDate'
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

const coursePackageAPI = {
  getByStudent(studentId) {
    return request({ url: `/packages/student/${studentId}`, method: 'GET' })
  }
}

const courseTypeAPI = {
  getList() {
    return request({ url: '/course-types', method: 'GET' })
  }
}

const coursewareAPI = {
  listByCourseType(courseTypeId, keyword) {
    return request({
      url: '/courseware/list',
      method: 'GET',
      params: { courseTypeId, keyword: keyword || undefined }
    })
  }
}

const teacherAPI = {
  getList(storeId) {
    const params = storeId != null && storeId !== '' ? { storeId } : {}
    return request({ url: '/teachers/list', method: 'GET', params })
  }
}

const storeAPI = {
  getList() {
    return request({ url: '/stores', method: 'GET' })
  }
}

module.exports = {
  authAPI,
  studentAPI,
  attendanceAPI,
  coursePackageAPI,
  courseTypeAPI,
  coursewareAPI,
  teacherAPI,
  storeAPI
}
