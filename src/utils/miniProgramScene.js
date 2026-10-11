/** 从小程序码 / 扫码进入时解析 scene（兼容 onLoad 与冷启动入口参数） */
export function sceneFromPageQuery(query) {
  let scene = query?.scene || ''
  if (scene) {
    try {
      scene = decodeURIComponent(scene)
    } catch {
      /* 保持原值 */
    }
    return scene
  }

  try {
    if (typeof uni.getEnterOptionsSync === 'function') {
      const enter = uni.getEnterOptionsSync()
      scene = enter?.query?.scene || ''
    }
    if (!scene && typeof uni.getLaunchOptionsSync === 'function') {
      const launch = uni.getLaunchOptionsSync()
      scene = launch?.query?.scene || ''
    }
    if (scene) {
      try {
        scene = decodeURIComponent(scene)
      } catch {
        /* 保持原值 */
      }
    }
  } catch {
    scene = ''
  }

  return scene || ''
}
