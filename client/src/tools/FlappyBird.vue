<template>
  <div>
    <div class="panel">
      <div class="row">
        <button v-if="status !== 'running'" class="btn primary" @click="start">
          {{ status === 'over' ? '再来一局' : '开始游戏' }}
        </button>
        <button v-else class="btn" @click="flap">扇动翅膀</button>
        <span class="pill">最高分 {{ best }}</span>
      </div>
      <p class="hint">点击画布 / 空格 / ↑ 扇动翅膀，穿过管道间隙。碰到管道或落地即结束，间隙会随分数慢慢变窄。</p>
    </div>

    <div class="panel center">
      <div style="position: relative; display: inline-block; width: 420px; max-width: 100%; line-height: 0">
        <canvas
          ref="canvasEl"
          :width="W"
          :height="H"
          @pointerdown="onTap"
          style="display: block; width: 100%; height: auto; border: 1px solid var(--border); border-radius: 8px; background: #e8eef2; touch-action: none; cursor: pointer"
        ></canvas>
        <div
          v-if="status === 'ready'"
          style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; pointer-events: none; line-height: 1.6"
        >
          <div style="background: rgba(255, 253, 251, 0.82); border: 1px solid var(--border); border-radius: 12px; padding: 14px 22px; color: #38332f; font-size: 18px; font-weight: 700">
            点击开始
          </div>
        </div>
        <div
          v-if="status === 'over'"
          style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(255, 253, 251, 0.55); border-radius: 8px; line-height: 1.6"
        >
          <div style="background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 20px 26px; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15)">
            <div style="font-size: 20px; font-weight: 700">游戏结束</div>
            <div style="color: var(--muted); margin: 6px 0 4px">本局得分 {{ score }}</div>
            <div style="color: var(--muted); margin-bottom: 14px">最高分 {{ best }}</div>
            <button class="btn primary" @click="start">再来一局</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

const W = 420
const H = 560
const GROUND_H = 70
const BIRD_X = 108
const BIRD_R = 14
const GRAVITY = 1500
const FLAP_VY = -430
const PIPE_W = 64
const PIPE_SPEED = 138
const GAP_MAX = 172
const GAP_MIN = 118

const canvasEl = ref(null)
const score = ref(0)
const best = ref(Number(localStorage.getItem('flappy-best') || 0))
const status = ref('ready')

const bird = { y: H * 0.42, vy: 0, angle: 0 }
let pipes = []
let spawnClock = 0
let groundOffset = 0
let idleT = 0
let raf = null
let last = 0
let acc = 0

const STEP = 1 / 120

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath()
  ctx.moveTo(x + r, y)
  ctx.arcTo(x + w, y, x + w, y + h, r)
  ctx.arcTo(x + w, y + h, x, y + h, r)
  ctx.arcTo(x, y + h, x, y, r)
  ctx.arcTo(x, y, x + w, y, r)
  ctx.closePath()
}

function gapSize() {
  return Math.max(GAP_MIN, GAP_MAX - score.value * 1.5)
}

function spawnInterval() {
  return Math.max(1.15, 1.55 - score.value * 0.005)
}

function spawnPipe() {
  const gap = gapSize()
  const minTop = 60
  const maxTop = H - GROUND_H - gap - 90
  const top = minTop + Math.random() * Math.max(1, maxTop - minTop)
  pipes.push({ x: W + 16, top, gap, scored: false })
}

function hitRect(cx, cy, r, x, y, w, h) {
  const nx = Math.max(x, Math.min(cx, x + w))
  const ny = Math.max(y, Math.min(cy, y + h))
  const dx = cx - nx
  const dy = cy - ny
  return dx * dx + dy * dy <= r * r
}

function die() {
  if (status.value !== 'running') return
  status.value = 'over'
  acc = 0
  if (score.value > best.value) {
    best.value = score.value
    localStorage.setItem('flappy-best', String(best.value))
  }
}

function step(dt) {
  bird.vy += GRAVITY * dt
  bird.y += bird.vy * dt
  const target = Math.max(-0.55, Math.min(1.15, bird.vy / 600))
  bird.angle += (target - bird.angle) * Math.min(1, dt * 12)
  groundOffset = (groundOffset + PIPE_SPEED * dt) % 24

  if (bird.y - BIRD_R < 0) {
    bird.y = BIRD_R
    bird.vy = Math.max(bird.vy, 0)
  }

  spawnClock += dt
  if (spawnClock >= spawnInterval()) {
    spawnClock = 0
    spawnPipe()
  }

  for (const p of pipes) p.x -= PIPE_SPEED * dt
  while (pipes.length && pipes[0].x + PIPE_W < -40) pipes.shift()

  for (const p of pipes) {
    if (!p.scored && p.x + PIPE_W < BIRD_X - BIRD_R) {
      p.scored = true
      score.value++
      if (score.value > best.value) {
        best.value = score.value
        localStorage.setItem('flappy-best', String(best.value))
      }
    }
  }

  if (bird.y + BIRD_R >= H - GROUND_H) {
    bird.y = H - GROUND_H - BIRD_R
    die()
    return
  }

  const hitR = BIRD_R - 2
  for (const p of pipes) {
    if (
      hitRect(BIRD_X, bird.y, hitR, p.x, 0, PIPE_W, p.top) ||
      hitRect(BIRD_X, bird.y, hitR, p.x, p.top + p.gap, PIPE_W, H - GROUND_H - p.top - p.gap)
    ) {
      die()
      return
    }
  }
}

function drawCloud(ctx, x, y, s) {
  ctx.beginPath()
  ctx.arc(x, y, 18 * s, 0, Math.PI * 2)
  ctx.arc(x + 22 * s, y - 6 * s, 24 * s, 0, Math.PI * 2)
  ctx.arc(x + 48 * s, y, 17 * s, 0, Math.PI * 2)
  ctx.arc(x + 24 * s, y + 8 * s, 20 * s, 0, Math.PI * 2)
  ctx.fill()
}

function drawBird(ctx, x, y, angle) {
  ctx.save()
  ctx.translate(x, y)
  ctx.rotate(angle)

  ctx.fillStyle = '#b9a58f'
  ctx.beginPath()
  ctx.ellipse(0, 0, 17, 13, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#e0d8cf'
  ctx.beginPath()
  ctx.ellipse(2, 5, 11, 7, 0, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#a79bba'
  ctx.beginPath()
  ctx.ellipse(-5, 0, 8, 6, -0.15, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#f7f4f1'
  ctx.beginPath()
  ctx.arc(7, -5, 4.5, 0, Math.PI * 2)
  ctx.fill()
  ctx.fillStyle = '#38332f'
  ctx.beginPath()
  ctx.arc(8.5, -5, 2, 0, Math.PI * 2)
  ctx.fill()

  ctx.fillStyle = '#c0a8a0'
  ctx.beginPath()
  ctx.moveTo(13, 0)
  ctx.lineTo(24, 3)
  ctx.lineTo(13, 6)
  ctx.closePath()
  ctx.fill()

  ctx.restore()
}

function draw() {
  const cv = canvasEl.value
  if (!cv) return
  const ctx = cv.getContext('2d')

  ctx.fillStyle = '#e8eef2'
  ctx.fillRect(0, 0, W, H)

  ctx.fillStyle = 'rgba(255, 255, 255, 0.45)'
  drawCloud(ctx, 44, 118, 1)
  drawCloud(ctx, 268, 196, 0.8)
  drawCloud(ctx, 132, 310, 0.6)

  for (const p of pipes) {
    ctx.fillStyle = '#9eb3a6'
    roundRect(ctx, p.x, 0, PIPE_W, Math.max(0, p.top), 6)
    ctx.fill()
    const bottomY = p.top + p.gap
    roundRect(ctx, p.x, bottomY, PIPE_W, Math.max(0, H - GROUND_H - bottomY), 6)
    ctx.fill()

    ctx.fillStyle = 'rgba(255, 255, 255, 0.18)'
    ctx.fillRect(p.x + 8, 0, 8, Math.max(0, p.top - 4))
    ctx.fillRect(p.x + 8, bottomY + 4, 8, Math.max(0, H - GROUND_H - bottomY - 8))

    ctx.fillStyle = '#9eb3a6'
    roundRect(ctx, p.x - 5, Math.max(0, p.top - 22), PIPE_W + 10, 22, 5)
    ctx.fill()
    roundRect(ctx, p.x - 5, bottomY, PIPE_W + 10, 22, 5)
    ctx.fill()
  }

  const gy = H - GROUND_H
  ctx.fillStyle = '#e0d8cf'
  ctx.fillRect(0, gy, W, GROUND_H)
  ctx.fillStyle = '#ece4dc'
  for (let x = -24; x < W + 24; x += 24) {
    ctx.fillRect(x - groundOffset, gy + 14, 12, 3)
    ctx.fillRect(x - groundOffset + 6, gy + 30, 12, 3)
  }

  const by = status.value === 'ready' ? bird.y + Math.sin(idleT * 3) * 5 : bird.y
  drawBird(ctx, BIRD_X, by, bird.angle)

  ctx.font = 'bold 46px system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'top'
  ctx.lineWidth = 6
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)'
  ctx.strokeText(String(score.value), W / 2, 26)
  ctx.fillStyle = '#5b544d'
  ctx.fillText(String(score.value), W / 2, 26)
}

function reset() {
  bird.y = H * 0.42
  bird.vy = 0
  bird.angle = 0
  pipes = []
  spawnClock = 0
  groundOffset = 0
  acc = 0
  score.value = 0
}

function start() {
  reset()
  status.value = 'running'
  bird.vy = FLAP_VY
}

function flap() {
  if (status.value !== 'running') return
  bird.vy = FLAP_VY
}

function onTap() {
  if (status.value === 'ready') start()
  else if (status.value === 'running') flap()
}

function loop(t) {
  raf = requestAnimationFrame(loop)
  if (!last) last = t
  let dt = (t - last) / 1000
  last = t
  if (dt > 0.05) dt = 0.05
  if (dt < 0) dt = 0
  idleT += dt

  if (status.value === 'running') {
    acc += dt
    let guard = 0
    while (acc >= STEP && guard++ < 20 && status.value === 'running') {
      step(STEP)
      acc -= STEP
    }
  } else {
    acc = 0
  }
  draw()
}

function onKey(e) {
  const k = e.key
  if (k === ' ' || k === 'ArrowUp') {
    e.preventDefault()
    if (status.value === 'ready') start()
    else if (status.value === 'running') flap()
  }
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
