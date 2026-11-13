<template>
  <div>
    <div class="panel">
      <div class="row">
        <button
          v-if="status === 'ready' || status === 'over'"
          class="btn primary"
          @click="start"
        >{{ status === 'ready' ? '开始游戏' : '再来一局' }}</button>
        <button v-else-if="status === 'win'" class="btn primary" @click="nextLevel">进入下一关</button>
        <button v-else class="btn" @click="togglePause">{{ status === 'paused' ? '继续' : '暂停' }}</button>
        <button class="btn" @click="start">重开</button>
        <span class="pill">第 {{ level }} 关</span>
        <span class="pill">生命 {{ lives }}</span>
      </div>
      <p class="hint">鼠标 / 触摸移动挡板，← → 或 A / D 也可控制。空格：发球 / 暂停。每块砖 10 分，清空所有砖块即可过关。</p>
    </div>

    <div class="panel">
      <div class="stats-grid">
        <div class="stat"><b>{{ score }}</b><span>分数</span></div>
        <div class="stat"><b>{{ best }}</b><span>最高分</span></div>
        <div class="stat"><b>{{ lives }}</b><span>剩余生命</span></div>
        <div class="stat"><b>{{ level }}</b><span>关卡</span></div>
      </div>
    </div>

    <div class="panel center">
      <canvas
        ref="canvasEl"
        :width="W"
        :height="H"
        @pointermove="onPointerMove"
        @pointerdown="onPointerDown"
        style="display: block; width: 100%; max-width: 420px; height: auto; margin: 0 auto; border: 1px solid var(--border); border-radius: 8px; background: #f7f4f1; touch-action: none; cursor: pointer"
      ></canvas>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

const W = 420
const H = 500
const PADDLE_SPEED = 460
const ROW_COLORS = ['#c89ba4', '#a79bba', '#8fa9bd', '#9eb3a6', '#b9a58f', '#9a9ab5']

const canvasEl = ref(null)
const score = ref(0)
const best = ref(Number(localStorage.getItem('breakout-best') || 0))
const lives = ref(3)
const level = ref(1)
const status = ref('ready')

const paddle = { x: (W - 90) / 2, y: H - 40, w: 90, h: 12 }
const ball = { x: W / 2, y: H / 2, r: 7, vx: 0, vy: 0 }

let bricks = []
let serve = true
const keys = { left: false, right: false }
let raf = null
let last = 0

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function buildBricks() {
  bricks = []
  const rows = 6
  const cols = 9
  const marginX = 20
  const top = 56
  const gap = 6
  const bw = (W - marginX * 2 - gap * (cols - 1)) / cols
  const bh = 18
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      bricks.push({
        x: marginX + c * (bw + gap),
        y: top + r * (bh + gap),
        w: bw,
        h: bh,
        color: ROW_COLORS[r % ROW_COLORS.length],
        alive: true
      })
    }
  }
}

function ballSpeed() {
  return 300 + (level.value - 1) * 40
}

function resetBall() {
  serve = true
  ball.x = paddle.x + paddle.w / 2
  ball.y = paddle.y - ball.r - 2
  ball.vx = 0
  ball.vy = 0
}

function launch() {
  if (!serve) return
  serve = false
  const sp = ballSpeed()
  const angle = -Math.PI / 2 + (Math.random() * 0.7 - 0.35)
  ball.vx = Math.cos(angle) * sp
  ball.vy = Math.sin(angle) * sp
}

function start() {
  score.value = 0
  lives.value = 3
  level.value = 1
  paddle.w = 90
  paddle.x = (W - paddle.w) / 2
  paddle.y = H - 40
  buildBricks()
  resetBall()
  status.value = 'running'
}

function nextLevel() {
  level.value++
  buildBricks()
  resetBall()
  status.value = 'running'
}

function togglePause() {
  if (status.value === 'running') status.value = 'paused'
  else if (status.value === 'paused') status.value = 'running'
}

function winLevel() {
  status.value = 'win'
  if (score.value > best.value) {
    best.value = score.value
    localStorage.setItem('breakout-best', String(best.value))
  }
}

function loseLife() {
  lives.value--
  if (lives.value <= 0) {
    lives.value = 0
    status.value = 'over'
    if (score.value > best.value) {
      best.value = score.value
      localStorage.setItem('breakout-best', String(best.value))
    }
    return
  }
  resetBall()
}

function stepBall(dt) {
  ball.x += ball.vx * dt
  ball.y += ball.vy * dt

  if (ball.x - ball.r < 0) {
    ball.x = ball.r
    ball.vx = Math.abs(ball.vx)
  }
  if (ball.x + ball.r > W) {
    ball.x = W - ball.r
    ball.vx = -Math.abs(ball.vx)
  }
  if (ball.y - ball.r < 0) {
    ball.y = ball.r
    ball.vy = Math.abs(ball.vy)
  }

  if (
    ball.vy > 0 &&
    ball.y + ball.r >= paddle.y &&
    ball.y - ball.r <= paddle.y + paddle.h &&
    ball.x + ball.r >= paddle.x &&
    ball.x - ball.r <= paddle.x + paddle.w
  ) {
    ball.y = paddle.y - ball.r
    const rel = Math.max(-1, Math.min(1, (ball.x - (paddle.x + paddle.w / 2)) / (paddle.w / 2)))
    const angle = rel * (Math.PI / 3)
    const sp = Math.min(700, Math.hypot(ball.vx, ball.vy) * 1.01)
    ball.vx = sp * Math.sin(angle)
    ball.vy = -sp * Math.cos(angle)
  }

  for (const b of bricks) {
    if (!b.alive) continue
    const nx = Math.max(b.x, Math.min(ball.x, b.x + b.w))
    const ny = Math.max(b.y, Math.min(ball.y, b.y + b.h))
    const dx = ball.x - nx
    const dy = ball.y - ny
    if (dx * dx + dy * dy > ball.r * ball.r) continue

    b.alive = false
    score.value += 10
    if (score.value > best.value) {
      best.value = score.value
      localStorage.setItem('breakout-best', String(best.value))
    }

    if (Math.abs(dx) > Math.abs(dy)) ball.vx = -ball.vx
    else ball.vy = -ball.vy

    const sp = Math.min(680, Math.hypot(ball.vx, ball.vy) * 1.008)
    const ang = Math.atan2(ball.vy, ball.vx)
    ball.vx = Math.cos(ang) * sp
    ball.vy = Math.sin(ang) * sp

    if (bricks.every(item => !item.alive)) winLevel()
    break
  }

  if (ball.y - ball.r > H) loseLife()
}

function update(dt) {
  if (keys.left) paddle.x -= PADDLE_SPEED * dt
  if (keys.right) paddle.x += PADDLE_SPEED * dt
  paddle.x = Math.max(0, Math.min(W - paddle.w, paddle.x))

  if (serve) {
    ball.x = paddle.x + paddle.w / 2
    ball.y = paddle.y - ball.r - 2
    return
  }

  const dist = Math.hypot(ball.vx, ball.vy) * dt
  const steps = Math.max(1, Math.min(8, Math.ceil(dist / 6)))
  const sdt = dt / steps
  for (let i = 0; i < steps && status.value === 'running'; i++) {
    stepBall(sdt)
    if (serve) break
  }
}

function draw() {
  const cv = canvasEl.value
  if (!cv) return
  const ctx = cv.getContext('2d')

  ctx.fillStyle = '#f7f4f1'
  ctx.fillRect(0, 0, W, H)

  for (const b of bricks) {
    if (!b.alive) continue
    ctx.fillStyle = b.color
    roundRect(ctx, b.x, b.y, b.w, b.h, 4)
    ctx.fill()
    ctx.fillStyle = 'rgba(255, 255, 255, 0.26)'
    roundRect(ctx, b.x + 2, b.y + 2, b.w - 4, 4, 2)
    ctx.fill()
  }

  ctx.fillStyle = '#9a9ab5'
  roundRect(ctx, paddle.x, paddle.y, paddle.w, paddle.h, 6)
  ctx.fill()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.3)'
  roundRect(ctx, paddle.x + 3, paddle.y + 2, paddle.w - 6, 3, 2)
  ctx.fill()

  ctx.beginPath()
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2)
  ctx.fillStyle = '#7e9bb3'
  ctx.fill()
  ctx.beginPath()
  ctx.arc(ball.x - ball.r * 0.3, ball.y - ball.r * 0.3, ball.r * 0.35, 0, Math.PI * 2)
  ctx.fillStyle = 'rgba(255, 255, 255, 0.55)'
  ctx.fill()

  ctx.fillStyle = '#837a72'
  ctx.font = '13px system-ui, sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'top'
  ctx.fillText('分数 ' + score.value + '　最高 ' + best.value + '　第 ' + level.value + ' 关', 14, 16)

  for (let i = 0; i < lives.value; i++) {
    ctx.beginPath()
    ctx.arc(W - 18 - i * 16, 22, 5, 0, Math.PI * 2)
    ctx.fillStyle = '#c89ba4'
    ctx.fill()
  }

  if (status.value === 'running' && serve) {
    ctx.fillStyle = '#837a72'
    ctx.font = '14px system-ui, sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillText('按空格或点击发球', W / 2, H - 80)
  }

  if (status.value !== 'running') {
    ctx.fillStyle = 'rgba(255, 253, 251, 0.68)'
    ctx.fillRect(0, 0, W, H)
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'

    let title = '准备开始'
    let sub = '点击「开始游戏」或按空格'
    if (status.value === 'paused') {
      title = '已暂停'
      sub = '按空格或点「继续」恢复'
    } else if (status.value === 'win') {
      title = '过关！'
      sub = '得分 ' + score.value + '，继续挑战下一关'
    } else if (status.value === 'over') {
      title = '游戏结束'
      sub = '得分 ' + score.value + '，再来一局？'
    }

    ctx.fillStyle = '#38332f'
    ctx.font = 'bold 24px system-ui, sans-serif'
    ctx.fillText(title, W / 2, H / 2 - 14)
    ctx.fillStyle = '#837a72'
    ctx.font = '14px system-ui, sans-serif'
    ctx.fillText(sub, W / 2, H / 2 + 20)
  }
}

function loop(t) {
  raf = requestAnimationFrame(loop)
  if (!last) last = t
  let dt = (t - last) / 1000
  last = t
  if (dt > 0.05) dt = 0.05
  if (dt < 0) dt = 0

  if (status.value === 'running') update(dt)
  draw()
}

function paddleFromClientX(clientX, el) {
  const rect = el.getBoundingClientRect()
  if (!rect.width) return
  const x = ((clientX - rect.left) / rect.width) * W
  paddle.x = Math.max(0, Math.min(W - paddle.w, x - paddle.w / 2))
}

function onPointerMove(e) {
  paddleFromClientX(e.clientX, e.currentTarget)
}

function onPointerDown(e) {
  paddleFromClientX(e.clientX, e.currentTarget)
  if (status.value === 'ready' || status.value === 'over') start()
  else if (status.value === 'win') nextLevel()
  else if (status.value === 'paused') status.value = 'running'
  else if (serve) launch()
}

function onKeyDown(e) {
  const k = e.key
  if (k === 'ArrowLeft' || k === 'ArrowRight' || k === ' ') {
    e.preventDefault()
  }
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') keys.left = true
  else if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = true
  else if (k === ' ') {
    if (status.value === 'paused') status.value = 'running'
    else if (status.value === 'ready' || status.value === 'over') start()
    else if (status.value === 'win') nextLevel()
    else if (status.value === 'running' && serve) launch()
    else togglePause()
  } else if (k === 'p' || k === 'P') {
    togglePause()
  }
}

function onKeyUp(e) {
  const k = e.key
  if (k === 'ArrowLeft' || k === 'a' || k === 'A') keys.left = false
  if (k === 'ArrowRight' || k === 'd' || k === 'D') keys.right = false
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  buildBricks()
  resetBall()
  raf = requestAnimationFrame(loop)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  if (raf) cancelAnimationFrame(raf)
  raf = null
})
</script>
