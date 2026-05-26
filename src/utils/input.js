/** uni-app H5 / 小程序兼容：从 input/textarea 事件取 value */
export function inputEventValue(e) {
  if (e?.detail != null && e.detail.value != null) return e.detail.value
  if (e?.target?.value != null) return e.target.value
  return ''
}
