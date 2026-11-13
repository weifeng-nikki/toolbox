<template>
  <div>
    <div class="panel">
      <div class="row">
        <button v-if="!running || over" class="btn primary" @click="start">开始游戏</button>
        <button v-else class="btn" @click="togglePause">{{ paused ? '继续' : '暂停' }}</button>
        <button class="btn" @click="start">重开</button>
        <span class="pill">等级 {{ level }}</span>
      </div>
      <p class="hint">← → 左右移动，↑ 旋转，↓ 软降，空格 硬降，P 暂停。手机可用下方按钮操作。</p>
    </div>

    <div class="panel">
      <div class="stats-grid">
        <div class="stat"><b>{{ score }}</b><span>分数</span></div>
        <div class="stat"><b>{{ level }}</b><span>等级</span></div>
        <div class="stat"><b>{{ lines }}</b><span>消行数</span></div>
        <div class="stat"><b>{{ best }}</b><span>最高分</span></div>
      </div>
    </div>

    <div class="panel center">
      <div style="display: inline-flex; gap: 18px; align-items: flex-start; justify-content: center; flex-wrap: wrap">
        <div style="position: relative; width: 260px; max-width: 100%; line-height: 0">
          <canvas
            ref="boardEl"
            :width="COLS * CELL"
            :height="ROWS * CELL"
            style="display: block; width: 100%; height: auto; border: 1px solid var(--border); border-radius: 8px; background: #f7f4f1"
          ></canvas>
          <div
            v-if="over"
            style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(255, 253, 251, 0.62); border-radius: 8px; line-height: 1.6"
          >
            <div style="background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 20px 26px; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15)">
              <div style="font-size: 20px; font-weight: 700">游戏结束</div>
              <div style="color: var(--muted); margin: 6px 0 14px">本局得分 {{ score }}</div>
              <button class="btn primary" @click="start">重新开始</button>
            </div>
          </div>
        </div>

        <div style="display: flex; flex-direction: column; align-items: center; gap: 8px">
          <div class="hint" style="margin: 0">下一块</div>
          <canvas
            ref="nextEl"
            width="90"
            height="90"
            style="display: block; border: 1px solid var(--border); border-radius: 8px; background: #f7f4f1"
          ></canvas>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="row" style="justify-content: center">
        <button class="btn" :disabled="!running || paused || over" @click="move(-1)">← 左移</button>
        <button class="btn" :disabled="!running || paused || over" @click="rotate">↻ 旋转</button>
        <button class="btn" :disabled="!running || paused || over" @click="move(1)">右移 →</button>
        <button class="btn" :disabled="!running || paused || over" @click="softDrop">↓ 下落</button>
        <button class="btn" :disabled="!running || paused || over" @click="hardDrop">⤓ 直落</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

const COLS = 10
const ROWS = 20
const CELL = 26

const PIECES = [
  { shape: [[1, 1, 1, 1]], color: '#8fa9bd' },
  { shape: [[1, 1], [1, 1]], color: '#c89ba4' },
  { shape: [[0, 1, 0], [1, 1, 1]], color: '#a79bba' },
  { shape: [[0, 1, 1], [1, 1, 0]], color: '#9eb3a6' },
  { shape: [[1, 1, 0], [0, 1, 1]], color: '#b9a58f' },
  { shape: [[1, 0, 0], [1, 1, 1]], color: '#9a9ab5' },
  { shape: [[0, 0, 1], [1, 1, 1]], color: '#c0a8a0' }
]

const boardEl = ref(null)
const nextEl = ref(null)
const score = ref(0)
const lines = ref(0)
const level = ref(1)
const best = ref(Number(localStorage.getItem('tetris-best') || 0))
const running = ref(false)
const paused = ref(false)
const over = ref(false)

let board = []
let cur = null
let nextPiece = null
let raf = null
let lastT = 0
let acc = 0

function emptyBoard() {
  const rows = []
  for (let r = 0; r < ROWS; r++) rows.push(Array(COLS).fill(null))
  return rows
}

function randomPiece() {
  const p = PIECES[Math.floor(Math.random() * PIECES.length)]
  return { shape: p.shape.map(row => row.slice()), color: p.color }
}

function collides(shape, px, py) {
  for (let r = 0; r < shape.length; r++) {
    for (let c = 0; c < shape[r].length; c++) {
      if (!shape[r][c]) continue
      const x = px + c
      const y = py + r
      if (x < 0 || x >= COLS || y >= ROWS) return true
      if (y >= 0 && board[y][x]) return true
    }
  }
  return false
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

function drawCell(ctx, x, y, color, cell) {
  const px = x * cell
  const py = y * cell
  ctx.fillStyle = color
  roundRect(ctx, px + 1, py + 1, cell - 2, cell - 2, 4)
  ctx.fill()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.28)'
  roundRect(ctx, px + 3, py + 3, cell - 6, Math.max(3, (cell - 6) * 0.2), 2)
  ctx.fill()
}

function draw() {
  const cv = boardEl.value
  if (!cv) return
  const ctx = cv.getContext('2d')
  const w = COLS * CELL
  const h = ROWS * CELL

  ctx.fillStyle = '#f7f4f1'
  ctx.fillRect(0, 0, w, h)

  ctx.strokeStyle = '#ece4dc'
  ctx.lineWidth = 1
  for (let c = 1; c < COLS; c++) {
    ctx.beginPath()
    ctx.moveTo(c * CELL + 0.5, 0)
    ctx.lineTo(c * CELL + 0.5, h)
    ctx.stroke()
  }
  for (let r = 1; r < ROWS; r++) {
    ctx.beginPath()
    ctx.moveTo(0, r * CELL + 0.5)
    ctx.lineTo(w, r * CELL + 0.5)
    ctx.stroke()
  }

  for (let r = 0; r < ROWS; r++) {
    for (let c = 0; c < COLS; c++) {
      if (board[r][c]) drawCell(ctx, c, r, board[r][c], CELL)
    }
  }

  if (cur) {
    const s = cur.shape
    for (let r = 0; r < s.length; r++) {
      for (let c = 0; c < s[r].length; c++) {
        if (!s[r][c]) continue
        const y = cur.y + r
        if (y >= 0) drawCell(ctx, cur.x + c, y, cur.color, CELL)
      }
    }
  }

  if (paused.value && !over.value) {
    ctx.fillStyle = 'rgba(255, 253, 251, 0.72)'
    ctx.fillRect(0, 0, w, h)
    ctx.fillStyle = '#38332f'
    ctx.font = 'bold 22px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('已暂停', w / 2, h / 2)
  }
}

function drawNext() {
  const cv = nextEl.value
  if (!cv || !nextPiece) return
  const ctx = cv.getContext('2d')
  const cell = 18
  ctx.clearRect(0, 0, cv.width, cv.height)
  ctx.fillStyle = '#f7f4f1'
  ctx.fillRect(0, 0, cv.width, cv.height)

  const s = nextPiece.shape
  const ox = (cv.width - s[0].length * cell) / 2
  const oy = (cv.height - s.length * cell) / 2
  for (let r = 0; r < s.length; r++) {
    for (let c = 0; c < s[r].length; c++) {
      if (!s[r][c]) continue
      ctx.fillStyle = nextPiece.color
      roundRect(ctx, ox + c * cell + 1, oy + r * cell + 1, cell - 2, cell - 2, 3)
      ctx.fill()
    }
  }
}

function spawn() {
  cur = nextPiece || randomPiece()
  nextPiece = randomPiece()
  cur.x = Math.floor((COLS - cur.shape[0].length) / 2)
  cur.y = 0
  drawNext()
  if (collides(cur.shape, cur.x, cur.y)) endGame()
}

function tick() {
  if (!cur) return
  if (collides(cur.shape, cur.x, cur.y + 1)) lock()
  else cur.y++
}

function lock() {
  if (!cur) return
  const s = cur.shape
  for (let r = 0; r < s.length; r++) {
    for (let c = 0; c < s[r].length; c++) {
      if (!s[r][c]) continue
      const y = cur.y + r
      const x = cur.x + c
      if (y >= 0 && y < ROWS && x >= 0 && x < COLS) board[y][x] = cur.color
    }
  }
  cur = null
  clearLines()
  if (running.value) spawn()
}

function clearLines() {
  let cleared = 0
  for (let r = ROWS - 1; r >= 0; r--) {
    if (board[r].every(v => v)) {
      board.splice(r, 1)
      board.unshift(Array(COLS).fill(null))
      cleared++
      r++
    }
  }
  if (!cleared) return

  const table = [0, 100, 300, 500, 800]
  score.value += table[cleared] * level.value
  lines.value += cleared
  level.value = Math.floor(lines.value / 10) + 1
  if (score.value > best.value) {
    best.value = score.value
    localStorage.setItem('tetris-best', String(best.value))
  }
}

function move(dx) {
  if (!running.value || paused.value || over.value || !cur) return
  if (!collides(cur.shape, cur.x + dx, cur.y)) cur.x += dx
}

function rotate() {
  if (!running.value || paused.value || over.value || !cur) return
  const s = cur.shape
  const n = s.length
  const m = s[0].length
  const rotated = []
  for (let c = 0; c < m; c++) {
    const row = []
    for (let r = n - 1; r >= 0; r--) row.push(s[r][c])
    rotated.push(row)
  }
  const kicks = [0, -1, 1, -2, 2]
  for (const off of kicks) {
    if (!collides(rotated, cur.x + off, cur.y)) {
      cur.shape = rotated
      cur.x += off
      return
    }
  }
}

function softDrop() {
  if (!running.value || paused.value || over.value || !cur) return
  if (collides(cur.shape, cur.x, cur.y + 1)) lock()
  else cur.y++
}

function hardDrop() {
  if (!running.value || paused.value || over.value || !cur) return
  while (!collides(cur.shape, cur.x, cur.y + 1)) cur.y++
  lock()
}

function endGame() {
  cur = null
  running.value = false
  over.value = true
  if (score.value > best.value) {
    best.value = score.value
    localStorage.setItem('tetris-best', String(best.value))
  }
}

function reset() {
  board = emptyBoard()
  score.value = 0
  lines.value = 0
  level.value = 1
  cur = null
  nextPiece = randomPiece()
  running.value = false
  paused.value = false
  over.value = false
  acc = 0
  drawNext()
  draw()
}

function start() {
  reset()
  running.value = true
  spawn()
}

function togglePause() {
  if (!running.value || over.value) return
  paused.value = !paused.value
  acc = 0
}

function loop(t) {
  raf = requestAnimationFrame(loop)
  if (!lastT) lastT = t
  const dt = t - lastT
  lastT = t

  if (running.value && !paused.value && !over.value) {
    acc += dt
    const interval = Math.max(90, 850 - (level.value - 1) * 75)
    if (acc >= interval) {
      acc = 0
      tick()
    }
  } else {
    acc = 0
  }
  draw()
}

function onKey(e) {
  const k = e.key
  if (k === 'ArrowLeft' || k === 'ArrowRight' || k === 'ArrowUp' || k === 'ArrowDown' || k === ' ') {
    e.preventDefault()
  }
  if (k === 'p' || k === 'P') {
    togglePause()
    return
  }
  if (!running.value || paused.value || over.value) return
  if (k === 'ArrowLeft') move(-1)
  else if (k === 'ArrowRight') move(1)
  else if (k === 'ArrowUp') rotate()
  else if (k === 'ArrowDown') softDrop()
  else if (k === ' ') hardDrop()
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  reset()
  raf = requestAnimationFrame(loop)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  if (raf) cancelAnimationFrame(raf)
  raf = null
})
</script>
