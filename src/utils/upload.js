import { BASE_URL } from './config'
import { getToken } from './storage'

function uploadFile(filePath, category = 'lesson') {
  const urlMap = { lesson: '/upload/lesson-image' }
  const url = `${BASE_URL}${urlMap[category] || urlMap.lesson}`
  const token = getToken()
  const header = {}
  if (token) header.Authorization = `Bearer ${token}`

  return new Promise((resolve, reject) => {
    uni.uploadFile({
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
        } catch {
          reject(new Error('上传响应解析失败'))
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || '上传失败'))
      }
    })
  })
}

export function uploadLessonImage(filePath) {
  return uploadFile(filePath, 'lesson')
}
