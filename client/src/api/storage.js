// 通用键值存储：优先后端 /api/storage，失败时兜底 localStorage
const API = '/api/storage'

export async function loadStore(key) {
  try {
    const res = await fetch(`${API}/${key}`)
    if (res.ok) return await res.json()
  } catch {
    /* 后端不可用时走本地兜底 */
  }
  try {
    return JSON.parse(localStorage.getItem(`store:${key}`))
  } catch {
    return null
  }
}

export async function saveStore(key, value) {
  try {
    const res = await fetch(`${API}/${key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(value)
    })
    if (res.ok) return
  } catch {
    /* 同上 */
  }
  try {
    localStorage.setItem(`store:${key}`, JSON.stringify(value))
  } catch {
    /* 存储不可用时静默失败 */
  }
}
