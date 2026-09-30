import { formatClassHours } from './classHours'
import { labelOf } from './lessonType'

/**
 * 课包上课记录长图（对应 PC「课包上课记录」图片下载），供家长核对 / 转发。
 * 使用离屏 2D Canvas 绘制，返回临时图片文件路径。
 */

const W = 720
const PAD = 16
const T_W = W - PAD * 2

const C = {
  orange: '#f37021',
  orangeDark: '#d85a0e',
  orangeMid: '#ff9a4d',
  orangePale: '#fff5ec',
  orangeStripe: '#fffaf5',
  white: '#ffffff',
  text: '#2a241f',
  muted: '#8a8178',
  border: '#eadfd3',
  borderDark: '#d9c8b6'
}

const FONT = 'sans-serif'

// 列宽按比例分配到表格宽度
const COLS = [
  { key: 'idx', title: '序号', w: 40, align: 'center' },
  { key: 'date', title: '日期', w: 88, align: 'center' },
  { key: 'week', title: '周', w: 40, align: 'center' },
  { key: 'course', title: '课程', w: 104, align: 'left' },
  { key: 'ware', title: '课件', w: 118, align: 'left' },
  { key: 'type', title: '类型', w: 66, align: 'center' },
  { key: 'hours', title: '扣课', w: 46, align: 'center' },
  { key: 'teacher', title: '老师', w: 66, align: 'center' },
  { key: 'notes', title: '备注', w: 116, align: 'left' }
]

function scaledCols() {
  const sum = COLS.reduce((s, c) => s + c.w, 0)
  return COLS.map((c) => ({ ...c, w: (c.w / sum) * T_W }))
}

function setFont(ctx, size, weight) {
  ctx.font = `${weight || 'normal'} ${size}px ${FONT}`
}

/** 单行文字，超出宽度用省略号截断 */
function drawText(ctx, text, x, y, { size = 12, weight, color = C.text, align = 'left', maxW } = {}) {
  let str = text == null || text === '' ? '—' : String(text)
  setFont(ctx, size, weight)
  if (maxW && ctx.measureText(str).width > maxW) {
    while (str.length > 1 && ctx.measureText(`${str}…`).width > maxW) {
      str = str.slice(0, -1)
    }
    str = `${str}…`
  }
  ctx.fillStyle = color
  ctx.textAlign = align
  ctx.textBaseline = 'middle'
  ctx.fillText(str, x, y)
}

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function statusText(s) {
  return (
    { active: '使用中', expired: '已过期', consumed: '已结束', completed: '已结束', suspended: '暂停', transferred: '已转移' }[s] ||
    s ||
    '—'
  )
}

function weekText(r) {
  const t = r.dayOfWeekText || ''
  return t.replace('星期', '').replace('周', '') || '—'
}

function monthLabel(key) {
  if (!key || key.length < 7) return key || '未知日期'
  return `${key.slice(0, 4)}年${Number(key.slice(5, 7))}月`
}

function groupByMonth(rows) {
  const groups = []
  let last = null
  for (const r of rows) {
    const key = r.classDate ? String(r.classDate).slice(0, 7) : '未知日期'
    if (key !== last) {
      groups.push({ key, label: monthLabel(key), rows: [] })
      last = key
    }
    groups[groups.length - 1].rows.push(r)
  }
  return groups
}

function createCanvas(width, height) {
  if (typeof wx === 'undefined' || !wx.createOffscreenCanvas) {
    throw new Error('当前环境不支持生成图片')
  }
  return wx.createOffscreenCanvas({ type: '2d', width, height })
}

function draw(ctx, pkg, studentName, groups, total, cols, H) {
  const H_BANNER = 88
  const H_INFO = 18 * 2 + 3 * 36
  const H_GAP = 16
  const H_TH = 40
  const H_MONTH = 30
  const H_ROW = 34
  const H_FOOTER = 44

  ctx.fillStyle = C.white
  ctx.fillRect(0, 0, W, H)

  // Banner
  const grad = ctx.createLinearGradient(0, 0, W, H_BANNER)
  grad.addColorStop(0, C.orangeDark)
  grad.addColorStop(0.6, C.orange)
  grad.addColorStop(1, C.orangeMid)
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, W, H_BANNER)
  ctx.save()
  ctx.globalAlpha = 0.15
  ctx.fillStyle = C.white
  ctx.beginPath()
  ctx.arc(W - 60, H_BANNER / 2, 90, 0, Math.PI * 2)
  ctx.fill()
  ctx.restore()
  drawText(ctx, '课包上课记录', PAD, H_BANNER * 0.4, { size: 28, weight: 'bold', color: C.white })
  drawText(ctx, '乐橙美术书法 · 供家长核对', PAD, H_BANNER * 0.76, { size: 13, color: 'rgba(255,255,255,0.88)' })
  drawText(ctx, studentName, W - PAD, H_BANNER * 0.35, { size: 20, weight: 'bold', color: C.white, align: 'right', maxW: W / 2 - PAD })
  drawText(ctx, pkg.packageName, W - PAD, H_BANNER * 0.7, { size: 13, color: 'rgba(255,255,255,0.92)', align: 'right', maxW: W / 2 - PAD })
  let y = H_BANNER

  // Info grid
  ctx.fillStyle = C.orangePale
  ctx.fillRect(0, y, W, H_INFO)
  ctx.strokeStyle = C.borderDark
  ctx.lineWidth = 1
  ctx.beginPath()
  ctx.moveTo(0, y + H_INFO)
  ctx.lineTo(W, y + H_INFO)
  ctx.stroke()

  const infoItems = [
    ['学员', studentName],
    ['课包名称', pkg.packageName],
    ['状态', statusText(pkg.status)],
    ['总课时', formatClassHours(pkg.totalClasses)],
    ['剩余课时', formatClassHours(pkg.remainingClasses)],
    ['已上课', `${total} 节`],
    ['购买日期', pkg.purchaseDate],
    ['有效期至', pkg.expiryDate],
    ['归属老师', pkg.assignedTeacherName]
  ]
  const colW = T_W / 3
  const LW = 62
  infoItems.forEach((item, i) => {
    const ix = PAD + (i % 3) * colW
    const iy = y + 18 + Math.floor(i / 3) * 36 + 18
    ctx.fillStyle = C.orange
    roundRect(ctx, ix, iy - 11, LW, 22, 4)
    ctx.fill()
    drawText(ctx, item[0], ix + LW / 2, iy, { size: 12, weight: 'bold', color: C.white, align: 'center' })
    drawText(ctx, item[1], ix + LW + 8, iy, { size: 13, maxW: colW - LW - 14 })
  })
  y += H_INFO + H_GAP

  // Table header
  ctx.fillStyle = C.orange
  ctx.fillRect(PAD, y, T_W, H_TH)
  let cx = PAD
  for (const col of cols) {
    const tx = col.align === 'center' ? cx + col.w / 2 : cx + 8
    drawText(ctx, col.title, tx, y + H_TH / 2, { size: 13, weight: 'bold', color: C.white, align: col.align })
    cx += col.w
  }
  y += H_TH
  const tableTop = y

  // Rows
  let idx = 1
  groups.forEach((group, gi) => {
    const odd = gi % 2 === 0
    ctx.fillStyle = odd ? C.orange : C.orangeDark
    ctx.fillRect(PAD, y, T_W, H_MONTH)
    drawText(ctx, `${group.label}   共 ${group.rows.length} 节`, PAD + 14, y + H_MONTH / 2, {
      size: 13,
      weight: 'bold',
      color: C.white
    })
    y += H_MONTH

    for (const r of group.rows) {
      ctx.fillStyle = odd ? C.white : C.orangeStripe
      ctx.fillRect(PAD, y, T_W, H_ROW)
      ctx.strokeStyle = C.border
      ctx.lineWidth = 0.5
      ctx.beginPath()
      ctx.moveTo(PAD, y + H_ROW)
      ctx.lineTo(PAD + T_W, y + H_ROW)
      ctx.stroke()

      const values = {
        idx: String(idx++),
        date: r.classDate ? String(r.classDate).slice(5) : '—',
        week: weekText(r),
        course: r.courseTypeName,
        ware: r.coursewareName,
        type: labelOf(r.lessonType),
        hours: formatClassHours(r.classesDeducted),
        teacher: r.teacherName,
        notes: r.notes
      }
      let x = PAD
      for (const col of cols) {
        const center = col.align === 'center'
        drawText(ctx, values[col.key], center ? x + col.w / 2 : x + 8, y + H_ROW / 2, {
          size: 12,
          align: col.align,
          maxW: col.w - (center ? 6 : 14)
        })
        x += col.w
      }
      y += H_ROW
    }
  })

  ctx.strokeStyle = C.borderDark
  ctx.lineWidth = 1
  ctx.strokeRect(PAD, tableTop - H_TH, T_W, y - tableTop + H_TH)

  // Footer
  const d = new Date()
  const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
  drawText(ctx, `共 ${total} 条记录  ·  导出时间：${dateStr}`, W / 2, y + H_FOOTER / 2, {
    size: 11,
    color: C.muted,
    align: 'center'
  })

  // Watermark
  ctx.save()
  ctx.globalAlpha = 0.07
  ctx.fillStyle = C.text
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  setFont(ctx, 28, 'bold')
  for (let wy = 120; wy < H; wy += 170) {
    for (let wx2 = 60; wx2 < W + 100; wx2 += 240) {
      ctx.save()
      ctx.translate(wx2, wy)
      ctx.rotate(-Math.PI / 6)
      ctx.fillText('乐橙美术书法', 0, 0)
      ctx.restore()
    }
  }
  ctx.restore()
}

function calcHeight(groups) {
  const rows = groups.reduce((s, g) => s + 30 + g.rows.length * 34, 0)
  return 88 + 18 * 2 + 3 * 36 + 16 + 40 + rows + 44 + 24
}

function writeTempFile(dataUrl) {
  return new Promise((resolve, reject) => {
    const fs = wx.getFileSystemManager()
    const filePath = `${wx.env.USER_DATA_PATH}/pkg_report_${Date.now()}.png`
    fs.writeFile({
      filePath,
      data: dataUrl.replace(/^data:image\/\w+;base64,/, ''),
      encoding: 'base64',
      success: () => resolve(filePath),
      fail: (e) => reject(new Error(e?.errMsg || '保存图片失败'))
    })
  })
}

/**
 * @param {object} pkg 课包
 * @param {string} studentName 学员姓名
 * @param {Array} records 该课包下的课时记录
 * @returns {Promise<string>} 临时图片路径
 */
export async function generatePackageReport(pkg, studentName, records) {
  const sorted = [...records].sort((a, b) => String(a.classDate || '').localeCompare(String(b.classDate || '')))
  const groups = groupByMonth(sorted)
  const H = calcHeight(groups)
  const scale = Math.max(1, Math.min(2, 8000 / H))
  const canvas = createCanvas(Math.round(W * scale), Math.round(H * scale))
  const ctx = canvas.getContext('2d')
  ctx.scale(scale, scale)
  draw(ctx, pkg, studentName, groups, sorted.length, scaledCols(), H)
  return writeTempFile(canvas.toDataURL('image/png'))
}

/** 弹出「发送给朋友 / 保存」菜单；旧版本微信退化为大图预览（长按可保存） */
export function shareReportImage(path) {
  if (typeof wx !== 'undefined' && wx.showShareImageMenu) {
    wx.showShareImageMenu({
      path,
      fail: (e) => {
        if (e && /cancel/i.test(e.errMsg || '')) return
        uni.previewImage({ urls: [path] })
      }
    })
    return
  }
  uni.previewImage({ urls: [path] })
}
