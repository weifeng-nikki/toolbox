import express from 'express'
import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const DATA_DIR = path.join(__dirname, 'data')
fs.mkdirSync(DATA_DIR, { recursive: true })

const app = express()
app.use(express.json({ limit: '2mb' }))

// 键名只允许字母数字下划线中划线，防止路径穿越
const safeKey = k => (/^[\w-]{1,64}$/.test(k) ? k : null)

// 通用 JSON 键值存储：GET 读取，PUT 写入，文件落在 server/data/<key>.json
app.get('/api/storage/:key', (req, res) => {
  const key = safeKey(req.params.key)
  if (!key) return res.status(400).json({ error: 'invalid key' })
  const file = path.join(DATA_DIR, `${key}.json`)
  if (!fs.existsSync(file)) return res.json(null)
  try {
    res.type('json').send(fs.readFileSync(file, 'utf8'))
  } catch {
    res.status(500).json({ error: 'read failed' })
  }
})

app.put('/api/storage/:key', (req, res) => {
  const key = safeKey(req.params.key)
  if (!key) return res.status(400).json({ error: 'invalid key' })
  try {
    fs.writeFileSync(path.join(DATA_DIR, `${key}.json`), JSON.stringify(req.body ?? null, null, 2))
    res.json({ ok: true })
  } catch {
    res.status(500).json({ error: 'write failed' })
  }
})

// 生产模式：托管前端构建产物
const dist = path.join(__dirname, '..', 'client', 'dist')
if (fs.existsSync(dist)) {
  app.use(express.static(dist))
  app.get('*', (req, res, next) => {
    if (req.path.startsWith('/api/')) return next()
    res.sendFile(path.join(dist, 'index.html'))
  })
}

const port = process.env.PORT || 3000
app.listen(port, () => {
  console.log(`本地工具箱服务已启动`)
  console.log(`  本机访问:   http://localhost:${port}`)
  const nets = os.networkInterfaces()
  for (const list of Object.values(nets)) {
    for (const net of list || []) {
      if (net.family === 'IPv4' && !net.internal) {
        console.log(`  局域网访问: http://${net.address}:${port}`)
      }
    }
  }
})
