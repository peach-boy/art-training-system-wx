import { BASE_URL } from './config'
import { getToken } from './storage'

function parseUploadResponse(res) {
  try {
    const body = typeof res.data === 'string' ? JSON.parse(res.data || '{}') : res.data || {}
    if (body.code === 200) return body.data
    throw new Error(body.message || '上传失败')
  } catch (e) {
    if (e.message && e.message !== '上传失败') throw e
    throw new Error('上传响应解析失败')
  }
}

function authHeader() {
  const token = getToken()
  const header = {}
  if (token) header.Authorization = `Bearer ${token}`
  return header
}

/** H5：FormData + fetch，支持 Blob，避免大图 uni.uploadFile 过慢 */
function uploadBlobH5(blob, category, filename = 'lesson.jpg') {
  const urlMap = { lesson: '/upload/lesson-image' }
  const url = `${BASE_URL}${urlMap[category] || urlMap.lesson}`
  const fd = new FormData()
  fd.append('file', blob, filename)

  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('POST', url)
    const header = authHeader()
    Object.keys(header).forEach((k) => xhr.setRequestHeader(k, header[k]))
    xhr.timeout = 120000
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) {
        try {
          const body = JSON.parse(xhr.responseText || '{}')
          if (body.code === 200) {
            resolve(body.data)
            return
          }
          reject(new Error(body.message || '上传失败'))
        } catch {
          reject(new Error('上传响应解析失败'))
        }
        return
      }
      reject(new Error(`上传失败(${xhr.status})`))
    }
    xhr.onerror = () => reject(new Error('网络错误，上传失败'))
    xhr.ontimeout = () => reject(new Error('上传超时，请检查网络'))
    xhr.send(fd)
  })
}

function uploadFilePath(filePath, category = 'lesson') {
  const urlMap = { lesson: '/upload/lesson-image' }
  const url = `${BASE_URL}${urlMap[category] || urlMap.lesson}`

  return new Promise((resolve, reject) => {
    uni.uploadFile({
      url,
      filePath,
      name: 'file',
      header: authHeader(),
      timeout: 120000,
      success(res) {
        try {
          resolve(parseUploadResponse(res))
        } catch (e) {
          reject(e)
        }
      },
      fail(err) {
        reject(new Error(err.errMsg || '上传失败'))
      }
    })
  })
}

/**
 * @param {string|Blob} filePathOrBlob 压缩后的路径或 Blob
 */
export function uploadLessonImage(filePathOrBlob) {
  // #ifdef H5
  if (filePathOrBlob instanceof Blob) {
    return uploadBlobH5(filePathOrBlob, 'lesson')
  }
  // #endif
  return uploadFilePath(filePathOrBlob, 'lesson')
}
