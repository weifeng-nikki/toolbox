<template>
  <div>
    <div class="panel">
      <div class="row">
        <button v-if="status === 'ready' || status === 'over'" class="btn primary" @click="start">
          {{ status === 'over' ? '再来一局' : '开始游戏' }}
        </button>
        <button v-else class="btn" @click="togglePause">{{ status === 'paused' ? '继续' : '暂停' }}</button>
        <button class="btn" @click="start">重开</button>
        <span class="pill">先到 {{ WIN_SCORE }} 分获胜</span>
      </div>
      <div class="row" style="margin-top: 10px">
        <span class="hint" style="margin: 0">球速档位</span>
        <button class="btn small" :class="{ primary: tier === 'slow' }" @click="setTier('slow')">慢</button>
        <button class="btn small" :class="{ primary: tier === 'mid' }" @click="setTier('mid')">中</button>
        <button class="btn small" :class="{ primary: tier === 'fast' }" @click="setTier('fast')">快</button>
      </div>
      <p class="hint">左侧 W / S 控制蓝色挡板，右侧 ↑ / ↓ 控制粉色挡板。空格开始 / 暂停，每次击球球速提升 3%（有上限）。</p>
    </div>

    <div class="panel center">
      <div style="position: relative; display: inline-block; width: 640px; max-width: 100%; line-height: 0">
        <canvas
          ref="canvasEl"
          :width="W"
          :height="H"
          style="display: block; width: 100%; height: auto; border: 1px solid var(--border); border-radius: 8px; background: #2f2c2a"
        ></canvas>
        <div
          v-if="status === 'over'"
          style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(47, 44, 42, 0.6); border-radius: 8px; line-height: 1.6"
        >
          <div style="background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 20px 28px; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.25)">
            <div style="font-size: 22px; font-weight: 700">{{ winner === '左' ? '左侧获胜' : '右侧获胜' }}</div>
            <div style="color: var(--muted); margin: 6px 0 14px">比分 {{ scoreL }} : {{ scoreR }}</div>
            <button class="btn primary" @click="start">再来一局</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

const W = 640
const H = 400
const PW = 12
const PH = 74
const PADDLE_SPEED = 430
const WIN_SCORE = 7
const SPEED_CAP = 900
const TIERS = { slow: 250, mid: 330, fast: 420 }

const canvasEl = ref(null)
const scoreL = ref(0)
const scoreR = ref(0)
const tier = ref('mid')
const status = ref('ready')
const winner = ref('')

const left = { x: 26, y: (H - PH) / 2 }
const right = { x: W - 26 - PW, y: (H - PH) / 2 }
const ball = { x: W / 2, y: H / 2, r: 7, vx: 0, vy: 0 }
const keys = { w: false, s: false, up: false, down: false }

let inPlay = false
let serveTimer = null
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

function scheduleServe(delay) {
  if (serveTimer) clearTimeout(serveTimer)
  inPlay = false
  ball.x = W / 2
  ball.y = H / 2
  ball.vx = 0
  ball.vy = 0
  serveTimer = setTimeout(() => {
    serveTimer = null
    if (status.value !== 'running') return
    launchBall()
  }, delay)
}

function launchBall() {
  const sp = TIERS[tier.value]
  const dir = Math.random() < 0.5 ? -1 : 1
  const angle = (Math.random() * 0.5 - 0.25) * Math.PI
  ball.vx = Math.cos(angle) * sp * dir
  ball.vy = Math.sin(angle) * sp
  inPlay = true
}

function bounce(p, dir) {
  const rel = Math.max(-1, Math.min(1, (ball.y - (p.y + PH / 2)) / (PH / 2)))
  const angle = rel * (Math.PI / 3)
  const sp = Math.min(SPEED_CAP, Math.max(TIERS[tier.value], Math.hypot(ball.vx, ball.vy)) * 1.03)
  ball.vx = Math.cos(angle) * sp * dir
  ball.vy = Math.sin(angle) * sp
}

function point(side) {
  if (side === 1) scoreR.value++
  else scoreL.value++

  inPlay = false
  ball.x = W / 2
  ball.y = H / 2
  ball.vx = 0
  ball.vy = 0

  if (scoreL.value >= WIN_SCORE || scoreR.value >= WIN_SCORE) {
    if (serveTimer) clearTimeout(serveTimer)
    serveTimer = null
    status.value = 'over'
    winner.value = scoreL.value > scoreR.value ? '左' : '右'
    return
  }

  scheduleServe(700)
}

function stepBall(dt) {
  ball.x += ball.vx * dt
  ball.y += ball.vy * dt

  if (ball.y - ball.r < 0) {
    ball.y = ball.r
    ball.vy = Math.abs(ball.vy)
  }
  if (ball.y + ball.r > H) {
    ball.y = H - ball.r
    ball.vy = -Math.abs(ball.vy)
  }

  if (
    ball.vx < 0 &&
    ball.x - ball.r <= left.x + PW &&
    ball.x + ball.r >= left.x &&
    ball.y >= left.y - ball.r &&
    ball.y <= left.y + PH + ball.r
  ) {
    ball.x = left.x + PW + ball.r
    bounce(left, 1)
  }

  if (
    ball.vx > 0 &&
    ball.x + ball.r >= right.x &&
    ball.x - ball.r <= right.x + PW &&
    ball.y >= right.y - ball.r &&
    ball.y <= right.y + PH + ball.r
  ) {
    ball.x = right.x - ball.r
    bounce(right, -1)
  }

  if (ball.x + ball.r < 0) {
    point(1)
    return
  }
  if (ball.x - ball.r > W) {
    point(-1)
  }
}

function update(dt) {
  if (keys.w) left.y -= PADDLE_SPEED * dt
  if (keys.s) left.y += PADDLE_SPEED * dt
  if (keys.up) right.y -= PADDLE_SPEED * dt
  if (keys.down) right.y += PADDLE_SPEED * dt
  left.y = Math.max(0, Math.min(H - PH, left.y))
  right.y = Math.max(0, Math.min(H - PH, right.y))

  if (!inPlay) return

  const dist = Math.hypot(ball.vx, ball.vy) * dt
  const steps = Math.max(1, Math.min(10, Math.ceil(dist / 7)))
  const sdt = dt / steps
  for (let i = 0; i < steps && inPlay; i++) stepBall(sdt)
}

function drawPaddle(ctx, p, color) {
  ctx.fillStyle = color
  roundRect(ctx, p.x, p.y, PW, PH, 6)
  ctx.fill()
  ctx.fillStyle = 'rgba(255, 255, 255, 0.22)'
  roundRect(ctx, p.x + 3, p.y + 4, 3, PH - 8, 2)
  ctx.fill()
}

function draw() {
  const cv = canvasEl.value
  if (!cv) return
  const ctx = cv.getContext('2d')

  ctx.fillStyle = '#2f2c2a'
  ctx.fillRect(0, 0, W, H)

  ctx.strokeStyle = 'rgba(236, 228, 220, 0.26)'
  ctx.lineWidth = 2
  ctx.setLineDash([9, 11])
  ctx.beginPath()
  ctx.moveTo(W / 2, 0)
  ctx.lineTo(W / 2, H)
  ctx.stroke()
  ctx.setLineDash([])

  ctx.fillStyle = 'rgba(247, 244, 241, 0.92)'
  ctx.font = 'bold 54px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.fillText(String(scoreL.value), W / 2 - 92, 18)
  ctx.fillText(String(scoreR.value), W / 2 + 92, 18)

  drawPaddle(ctx, left, '#8fa9bd')
  drawPaddle(ctx, right, '#c89ba4')

  ctx.beginPath()
  ctx.arc(ball.x, ball.y, ball.r, 0, Math.PI * 2)
  ctx.fillStyle = '#f7f4f1'
  ctx.fill()

  ctx.fillStyle = 'rgba(247, 244, 241, 0.32)'
  ctx.font = '13px system-ui, sans-serif'
  ctx.textBaseline = 'bottom'
  ctx.textAlign = 'left'
  ctx.fillText('W / S', 18, H - 14)
  ctx.textAlign = 'right'
  ctx.fillText('↑ / ↓', W - 18, H - 14)

  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'

  if (status.value === 'ready') {
    ctx.fillStyle = 'rgba(247, 244, 241, 0.85)'
    ctx.font = 'bold 24px system-ui, sans-serif'
    ctx.fillText('按空格开始', W / 2, H / 2 + 78)
    ctx.fillStyle = 'rgba(247, 244, 241, 0.42)'
    ctx.font = '14px system-ui, sans-serif'
    ctx.fillText('左侧 W / S　　右侧 ↑ / ↓', W / 2, H / 2 + 110)
  } else if (status.value === 'paused') {
    ctx.fillStyle = 'rgba(47, 44, 42, 0.66)'
    ctx.fillRect(0, 0, W, H)
    ctx.fillStyle = '#f7f4f1'
    ctx.font = 'bold 26px system-ui, sans-serif'
    ctx.fillText('已暂停', W / 2, H / 2 - 12)
    ctx.fillStyle = 'rgba(247, 244, 241, 0.55)'
    ctx.font = '14px system-ui, sans-serif'
    ctx.fillText('按空格或点「继续」恢复', W / 2, H / 2 + 24)
  } else if (status.value === 'running' && !inPlay) {
    ctx.fillStyle = 'rgba(247, 244, 241, 0.5)'
    ctx.font = '15px system-ui, sans-serif'
    ctx.fillText('准备发球…', W / 2, H / 2 + 46)
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

function start() {
  if (serveTimer) clearTimeout(serveTimer)
  serveTimer = null
  scoreL.value = 0
  scoreR.value = 0
  winner.value = ''
  left.y = (H - PH) / 2
  right.y = (H - PH) / 2
  status.value = 'running'
  scheduleServe(600)
}

function togglePause() {
  if (status.value === 'running') {
    status.value = 'paused'
    if (serveTimer) {
      clearTimeout(serveTimer)
      serveTimer = null
    }
  } else if (status.value === 'paused') {
    status.value = 'running'
    if (!inPlay && !serveTimer) scheduleServe(500)
  }
}

function setTier(t) {
  tier.value = t
  if (inPlay) {
    const sp = Math.hypot(ball.vx, ball.vy)
    if (sp > 0) {
      const k = TIERS[t] / sp
      ball.vx *= k
      ball.vy *= k
    }
  }
}

function onKeyDown(e) {
  const k = e.key
  if (k === 'ArrowUp' || k === 'ArrowDown' || k === ' ') e.preventDefault()
  if (k === 'w' || k === 'W') keys.w = true
  else if (k === 's' || k === 'S') keys.s = true
  else if (k === 'ArrowUp') keys.up = true
  else if (k === 'ArrowDown') keys.down = true
  else if (k === ' ') {
    if (status.value === 'ready' || status.value === 'over') start()
    else togglePause()
  }
}

function onKeyUp(e) {
  const k = e.key
  if (k === 'w' || k === 'W') keys.w = false
  if (k === 's' || k === 'S') keys.s = false
  if (k === 'ArrowUp') keys.up = false
  if (k === 'ArrowDown') keys.down = false
}

onMounted(() => {
  window.addEventListener('keydown', onKeyDown)
  window.addEventListener('keyup', onKeyUp)
  raf = requestAnimationFrame(loop)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeyDown)
  window.removeEventListener('keyup', onKeyUp)
  if (raf) cancelAnimationFrame(raf)
  raf = null
  if (serveTimer) clearTimeout(serveTimer)
  serveTimer = null
})
</script>
