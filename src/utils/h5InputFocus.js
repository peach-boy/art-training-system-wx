/**
 * H5：点击 uni-input / uni-textarea 区域时主动 focus 内部原生控件（绕过部分 WebView 无法弹键盘）
 */
export function setupH5InputFocus() {
  if (typeof document === 'undefined') return

  const shouldSkip = (el) =>
    el?.closest?.(
      'button, .tab-bar-wrap, .tab-fab, picker, .uni-mask, .uni-picker-container, .uni-actionsheet'
    )

  const focusFromTarget = (target) => {
    if (!target || shouldSkip(target)) return

    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      target.focus()
      return
    }

    const host =
      target.closest?.('uni-input') ||
      target.closest?.('uni-textarea')
    if (!host) return

    const inner = host.querySelector('.uni-input-input, .uni-textarea-textarea')
    if (inner && typeof inner.focus === 'function') {
      inner.focus()
    }
  }

  const onPointer = (e) => {
    focusFromTarget(e.target)
  }

  document.addEventListener('touchend', onPointer, { passive: true, capture: true })
  document.addEventListener('click', onPointer, { capture: true })
}
