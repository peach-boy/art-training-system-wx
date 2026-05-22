const { BASE_URL } = require('./config')
const storage = require('./storage')

function uploadFile(filePath, category) {
  const urlMap = {
    lesson: '/upload/lesson-image'
  }
  const url = `${BASE_URL}${urlMap[category] || urlMap.lesson}`
  const token = storage.getToken()
  const header = {}
  if (token) header.Authorization = `Bearer ${token}`

  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url,
      filePath,
      name: 'file',
      header,
      success(res) {
        try {
          const body = JSON.parse(res.data || '{}')
          if (body.code === 200) {
            resolve(body.data)
            return
          }
          reject(new Error(body.message || '上传失败'))
        } catch (e) {
          reject(new Error('上传响应解析失败'))
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || '上传失败'))
      }
    })
  })
}

module.exports = {
  uploadLessonImage(filePath) {
    return uploadFile(filePath, 'lesson')
  }
}
