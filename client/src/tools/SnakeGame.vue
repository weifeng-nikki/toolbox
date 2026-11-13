<template>
  <div>
    <div class="panel">
      <div class="row">
        <div class="field">
          <label>撞墙模式</label>
          <select v-model="mode">
            <option value="wall">撞墙结束</option>
            <option value="wrap">穿墙继续</option>
          </select>
        </div>
        <button v-if="!running" class="btn primary" @click="start">开始游戏</button>
        <button v-else class="btn" @click="togglePause">{{ paused ? '继续' : '暂停' }}</button>
        <button class="btn" @click="start">重开</button>
      </div>
      <div class="row" style="margin-top: 12px">
        <span class="pill pill-score">得分 {{ score }}</span>
        <span class="pill">最高分 {{ best }}</span>
      </div>
      <p class="hint">方向键 / WASD 控制，空格暂停。吃到食物加速，看你能拿多少分！</p>
    </div>

    <div class="panel center">
      <canvas ref="canvasEl" width="400" height="400" class="snake-canvas"></canvas>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

const GRID = 20
const CELL = 20

const canvasEl = ref(null)
const mode = ref('wall')
const score = ref(0)
const best = ref(Number(localStorage.getItem('snake-best') || 0))
const running = ref(false)
const paused = ref(false)

let snake = []
let dir = { x: 1, y: 0 }
let dirQueue = []
let food = { x: 15, y: 10 }
let timer = null
let speed = 160

const rand = n => Math.floor(Math.random() * n)

function placeFood() {
  while (true) {
    const f = { x: rand(GRID), y: rand(GRID) }
    if (!snake.some(s => s.x === f.x && s.y === f.y)) {
      food = f
      return
    }
  }
}

function reset() {
  snake = [
    { x: 10, y: 10 },
    { x: 9, y: 10 },
    { x: 8, y: 10 }
  ]
  dir = { x: 1, y: 0 }
  dirQueue = []
  score.value = 0
  speed = 160
  placeFood()
}

function schedule() {
  clearInterval(timer)
  timer = setInterval(tick, speed)
}

function start() {
  reset()
  running.value = true
  paused.value = false
  schedule()
  draw()
}

function togglePause() {
  if (!running.value) return
  paused.value = !paused.value
  draw()
}

function gameOver() {
  running.value = false
  clearInterval(timer)
  draw(true)
}

function tick() {
  if (paused.value || !running.value) return

  if (dirQueue.length) {
    const nd = dirQueue.shift()
    if (nd.x !== -dir.x || nd.y !== -dir.y) dir = nd
  }

  const head = { x: snake[0].x + dir.x, y: snake[0].y + dir.y }
  if (mode.value === 'wrap') {
    head.x = (head.x + GRID) % GRID
    head.y = (head.y + GRID) % GRID
  } else if (head.x < 0 || head.y < 0 || head.x >= GRID || head.y >= GRID) {
    return gameOver()
  }

  // 撞自己（尾巴这一步会让开，不算）
  for (let i = 0; i < snake.length - 1; i++) {
    if (snake[i].x === head.x && snake[i].y === head.y) return gameOver()
  }

  snake.unshift(head)
  if (head.x === food.x && head.y === food.y) {
    score.value += 10
    if (score.value > best.value) {
      best.value = score.value
      localStorage.setItem('snake-best', String(best.value))
    }
    speed = Math.max(70, speed - 4)
    schedule()
    placeFood()
  } else {
    snake.pop()
  }

  draw()
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

function draw(dead = false) {
  const ctx = canvasEl.value.getContext('2d')
  ctx.fillStyle = '#f4f6f8'
  ctx.fillRect(0, 0, GRID * CELL, GRID * CELL)

  ctx.strokeStyle = '#e4e7ec'
  ctx.lineWidth = 1
  for (let i = 1; i < GRID; i++) {
    ctx.beginPath()
    ctx.moveTo(i * CELL + 0.5, 0)
    ctx.lineTo(i * CELL + 0.5, GRID * CELL)
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(0, i * CELL + 0.5)
    ctx.lineTo(GRID * CELL, i * CELL + 0.5)
    ctx.stroke()
  }

  ctx.fillStyle = '#e5484d'
  ctx.beginPath()
  ctx.arc(food.x * CELL + CELL / 2, food.y * CELL + CELL / 2, CELL / 2 - 3, 0, Math.PI * 2)
  ctx.fill()

  snake.forEach((s, i) => {
    ctx.fillStyle = i === 0 ? '#2f9e63' : '#57b981'
    roundRect(ctx, s.x * CELL + 1.5, s.y * CELL + 1.5, CELL - 3, CELL - 3, 4)
    ctx.fill()
  })

  if (paused && paused.value) {
    ctx.fillStyle = 'rgba(20, 24, 33, 0.45)'
    ctx.fillRect(0, 0, GRID * CELL, GRID * CELL)
    ctx.fillStyle = '#fff'
    ctx.font = 'bold 24px sans-serif'
    ctx.textAlign = 'center'
    ctx.fillText('已暂停', GRID * CELL / 2, GRID * CELL / 2)
  }

  if (dead) {
    ctx.fillStyle = 'rgba(20, 24, 33, 0.55)'
    ctx.fillRect(0, 0, GRID * CELL, GRID * CELL)
    ctx.fillStyle = '#fff'
    ctx.textAlign = 'center'
    ctx.font = 'bold 26px sans-serif'
    ctx.fillText('游戏结束', GRID * CELL / 2, GRID * CELL / 2 - 12)
    ctx.font = '14px sans-serif'
    ctx.fillText('得分 ' + score.value + '，点「开始游戏」再来一局', GRID * CELL / 2, GRID * CELL / 2 + 16)
  }
}

const DIRS = {
  ArrowUp: { x: 0, y: -1 }, ArrowDown: { x: 0, y: 1 },
  ArrowLeft: { x: -1, y: 0 }, ArrowRight: { x: 1, y: 0 },
  w: { x: 0, y: -1 }, s: { x: 0, y: 1 },
  a: { x: -1, y: 0 }, d: { x: 1, y: 0 },
  W: { x: 0, y: -1 }, S: { x: 0, y: 1 },
  A: { x: -1, y: 0 }, D: { x: 1, y: 0 }
}

function onKey(e) {
  if (e.key === ' ') {
    if (running.value) {
      e.preventDefault()
      togglePause()
    }
    return
  }
  const nd = DIRS[e.key]
  if (!nd || !running.value) return
  e.preventDefault()
  const last = dirQueue.length ? dirQueue[dirQueue.length - 1] : dir
  if (nd.x === -last.x && nd.y === -last.y) return
  if (nd.x === last.x && nd.y === last.y) return
  if (dirQueue.length < 2) dirQueue.push(nd)
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
  reset()
  draw()
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  clearInterval(timer)
})
</script>

<style scoped>
.snake-canvas {
  max-width: 100%;
  border-radius: 8px;
  border: 1px solid var(--border);
}

.pill-score {
  background: var(--accent-soft);
  color: var(--accent);
}
</style>
