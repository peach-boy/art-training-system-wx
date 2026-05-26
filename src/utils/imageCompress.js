/** 上传前压缩：H5 用 Canvas，小程序用 uni.compressImage */

const DEFAULT_MAX_LONG_EDGE = 1280
const DEFAULT_JPEG_QUALITY = 0.78

function computeOutSize(w, h, maxLong) {
  const long = Math.max(w, h)
  if (!long || long <= maxLong) return { ow: w, oh: h }
  const scale = maxLong / long
  return {
    ow: Math.max(1, Math.round(w * scale)),
    oh: Math.max(1, Math.round(h * scale))
  }
}

// #ifdef H5
async function pathToBlob(filePath) {
  if (filePath.startsWith('blob:') || filePath.startsWith('http')) {
    const res = await fetch(filePath)
    return res.blob()
  }
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest()
    xhr.open('GET', filePath, true)
    xhr.responseType = 'blob'
    xhr.onload = () => {
      if (xhr.status >= 200 && xhr.status < 300) resolve(xhr.response)
      else reject(new Error('读取图片失败'))
    }
    xhr.onerror = () => reject(new Error('读取图片失败'))
    xhr.send()
  })
}

async function decodeToBitmap(blob) {
  if (typeof createImageBitmap === 'function') {
    try {
      return await createImageBitmap(blob)
    } catch {
      /* fallback */
    }
  }
  const url = URL.createObjectURL(blob)
  try {
    const img = await new Promise((resolve, reject) => {
      const i = new Image()
      i.onload = () => resolve(i)
      i.onerror = reject
      i.src = url
    })
    const canvas = document.createElement('canvas')
    canvas.width = img.naturalWidth
    canvas.height = img.naturalHeight
    canvas.getContext('2d').drawImage(img, 0, 0)
    return await createImageBitmap(canvas)
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function compressBlobToJpeg(blob, options = {}) {
  if (!blob?.type?.startsWith('image/')) {
    throw new Error('只能上传图片')
  }
  const maxLongEdge = options.maxLongEdge ?? DEFAULT_MAX_LONG_EDGE
  const jpegQuality = options.jpegQuality ?? DEFAULT_JPEG_QUALITY

  const bmp = await decodeToBitmap(blob)
  const { ow, oh } = computeOutSize(bmp.width, bmp.height, maxLongEdge)

  const canvas = document.createElement('canvas')
  canvas.width = ow
  canvas.height = oh
  const ctx = canvas.getContext('2d')
  ctx.fillStyle = '#fff'
  ctx.fillRect(0, 0, ow, oh)
  ctx.drawImage(bmp, 0, 0, ow, oh)
  bmp.close?.()

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error('图片压缩失败'))),
      'image/jpeg',
      jpegQuality
    )
  })
}

async function prepareH5(filePath, options) {
  const blob = await pathToBlob(filePath)
  if (blob.size > 10 * 1024 * 1024) {
    throw new Error('图片不能超过 10MB')
  }
  try {
    return await compressBlobToJpeg(blob, options)
  } catch {
    return blob
  }
}
// #endif

// #ifdef MP-WEIXIN
function prepareMp(filePath, options) {
  const maxLong = options.maxLongEdge ?? DEFAULT_MAX_LONG_EDGE
  const quality = Math.round((options.jpegQuality ?? DEFAULT_JPEG_QUALITY) * 100)
  return new Promise((resolve) => {
    uni.compressImage({
      src: filePath,
      quality,
      compressedWidth: maxLong,
      success: (res) => resolve(res.tempFilePath || filePath),
      fail: () => resolve(filePath)
    })
  })
}
// #endif

export async function prepareImageForUpload(filePath, options = {}) {
  // #ifdef H5
  return prepareH5(filePath, options)
  // #endif
  // #ifdef MP-WEIXIN
  return prepareMp(filePath, options)
  // #endif
  return filePath
}
