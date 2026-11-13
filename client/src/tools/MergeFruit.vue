<template>
  <div>
    <div class="panel">
      <div class="row" style="justify-content: space-between">
        <div style="min-width: 76px; padding: 6px 14px; text-align: center; background: var(--panel2); border-radius: 8px">
          <span style="display: block; font-size: 12px; color: var(--muted)">当前分</span>
          <b style="font-size: 20px; font-variant-numeric: tabular-nums">{{ score }}</b>
        </div>
        <div style="min-width: 76px; padding: 6px 14px; text-align: center; background: var(--panel2); border-radius: 8px">
          <span style="display: block; font-size: 12px; color: var(--muted)">最高分</span>
          <b style="font-size: 20px; font-variant-numeric: tabular-nums">{{ best }}</b>
        </div>
        <div style="display: flex; align-items: center; gap: 8px">
          <span style="font-size: 12.5px; color: var(--muted)">下一个</span>
          <span :style="nextStyle">{{ nextFruit.emoji }}</span>
        </div>
        <button class="btn primary" @click="restart">重新开始</button>
      </div>
      <p class="hint">移动鼠标选择落点，点击（或松开）放下水果。两个同级水果相撞会合成高一级水果并得分，越过红色虚线持续 2 秒即结束。</p>
    </div>

    <div class="panel center">
      <canvas
        ref="canvasEl"
        :width="W"
        :height="H"
        style="display: block; width: 100%; max-width: 420px; height: auto; margin: 0 auto; border-radius: 10px; background: #f7f4f1; touch-action: none; cursor: crosshair"
      ></canvas>
      <div
        v-if="over"
        style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(255, 253, 251, 0.62); border-radius: 14px"
      >
        <div style="background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 22px 34px; text-align: center; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15)">
          <div style="font-size: 20px; font-weight: 700">游戏结束</div>
          <div style="color: var(--muted); margin: 8px 0 14px">本局得分 {{ score }} · 最高分 {{ best }}</div>
          <button class="btn primary" @click="restart">再来一局</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const W = 420
const H = 560
const DEATH_Y = 96
const GRAVITY = 1700
const FIXED_DT = 1 / 120
const ITERATIONS = 5
const MAX_LEVEL = 10

const FRUITS = [
  { name: '葡萄', emoji: '🍇', color: '#a79bba', r: 14, score: 1 },
  { name: '樱桃', emoji: '🍒', color: '#c89ba4', r: 18, score: 3 },
  { name: '橘子', emoji: '🍊', color: '#d8b48f', r: 23, score: 6 },
  { name: '柠檬', emoji: '🍋', color: '#d9cf8f', r: 29, score: 10 },
  { name: '猕猴桃', emoji: '🥝', color: '#9eb3a6', r: 35, score: 15 },
  { name: '番茄', emoji: '🍅', color: '#c98f8f', r: 42, score: 21 },
  { name: '桃子', emoji: '🍑', color: '#d3a8a0', r: 50, score: 28 },
  { name: '菠萝', emoji: '🍍', color: '#cdb884', r: 58, score: 36 },
  { name: '椰子', emoji: '🥥', color: '#b7a894', r: 66, score: 45 },
  { name: '西瓜', emoji: '🍉', color: '#8fab9a', r: 76, score: 55 },
  { name: '大西瓜', emoji: '🍉', color: '#7e9b8b', r: 86, score: 66 }
]

const canvasEl = ref(null)
const score = ref(0)
const best = ref(Number(localStorage.getItem('merge-best') || 0))
const nextLevel = ref(randLevel())
const over = ref(false)

const nextFruit = computed(() => FRUITS[nextLevel.value])
const nextStyle = computed(() => {
  const f = FRUITS[nextLevel.value]
  return {
    display: 'grid',
    placeItems: 'center',
    width: '42px',
    height: '42px',
    borderRadius: '50%',
    background: f.color,
    fontSize: '22px',
    lineHeight: '1',
    boxShadow: 'inset 0 -3px 8px rgba(0, 0, 0, 0.08)'
  }
})

let fruits = []
let raf = null
let last = 0
let acc = 0
let previewX = W / 2
let dangerTime = 0
let pressed = false
let idSeed = 1

function randLevel() {
  return Math.floor(Math.random() * 3)
}

function clamp(v, min, max) {
  return v < min ? min : v > max ? max : v
}

function addScore(v) {
  score.value += v
  if (score.value > best.value) {
    best.value = score.value
    localStorage.setItem('merge-best', String(best.value))
  }
}

function drop() {
  if (over.value) return
  const spec = FRUITS[nextLevel.value]
  const x = clamp(previewX, spec.r + 2, W - spec.r - 2)
  fruits.push({
    id: idSeed++,
    x,
    y: 34,
    vx: 0,
    vy: 60,
    r: spec.r,
    level: nextLevel.value,
    age: 0,
    fresh: 0
  })
  nextLevel.value = randLevel()
  previewX = clamp(previewX, nextFruit.value.r + 2, W - nextFruit.value.r - 2)
}

function mergePass() {
  let changed = false
  for (let i = 0; i < fruits.length; i++) {
    const a = fruits[i]
    if (a.dead) continue
    for (let j = i + 1; j < fruits.length; j++) {
      const b = fruits[j]
      if (b.dead) continue
      if (a.level !== b.level || a.level >= MAX_LEVEL) continue
      if (a.fresh > 0 || b.fresh > 0) continue
      const dx = b.x - a.x
      const dy = b.y - a.y
      const sum = a.r + b.r
      if (dx * dx + dy * dy > sum * sum) continue

      const ma = a.r * a.r
      const mb = b.r * b.r
      const mt = ma + mb
      const lv = a.level + 1
      const spec = FRUITS[lv]
      a.dead = true
      b.dead = true
      changed = true
      fruits.push({
        id: idSeed++,
        x: (a.x * ma + b.x * mb) / mt,
        y: (a.y * ma + b.y * mb) / mt,
        vx: (a.vx + b.vx) / 2,
        vy: (a.vy + b.vy) / 2 - 40,
        r: spec.r,
        level: lv,
        age: 0,
        fresh: 4
      })
      addScore(spec.score)
      break
    }
  }
  if (changed) fruits = fruits.filter(f => !f.dead)
}

function resolvePair(a, b) {
  const dx = b.x - a.x
  const dy = b.y - a.y
  const min = a.r + b.r
  const d2 = dx * dx + dy * dy
  if (d2 >= min * min) return

  let d = Math.sqrt(d2)
  let nx = 0
  let ny = -1
  if (d > 0.001) {
    nx = dx / d
    ny = dy / d
  } else {
    d = 0.001
  }

  const overlap = min - d
  const ma = a.r * a.r
  const mb = b.r * b.r
  const mt = ma + mb
  const wa = mb / mt
  const wb = ma / mt
  a.x -= nx * overlap * wa
  a.y -= ny * overlap * wa
  b.x += nx * overlap * wb
  b.y += ny * overlap * wb

  const vn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny
  if (vn < 0) {
    const e = 0.18
    const imp = (-(1 + e) * vn) / (1 / ma + 1 / mb)
    a.vx -= (imp / ma) * nx
    a.vy -= (imp / ma) * ny
    b.vx += (imp / mb) * nx
    b.vy += (imp / mb) * ny
  }
}

function constrain(f) {
  if (f.x - f.r < 0) {
    f.x = f.r
    if (f.vx < 0) f.vx *= -0.3
  }
  if (f.x + f.r > W) {
    f.x = W - f.r
    if (f.vx > 0) f.vx *= -0.3
  }
  if (f.y + f.r > H) {
    f.y = H - f.r
    if (f.vy > 0) f.vy *= -0.22
    f.vx *= 0.96
  }
  if (f.y - f.r < 0) {
    f.y = f.r
    if (f.vy < 0) f.vy *= -0.2
  }
}

function settle() {
  for (const f of fruits) {
    const onFloor = f.y + f.r >= H - 1.5
    if (onFloor && Math.abs(f.vy) < 26) f.vy = 0
    if (onFloor) f.vx *= 0.94
    if (Math.abs(f.vx) < 3) f.vx = 0
  }
}

function checkDanger(dt) {
  let worst = 0
  for (const f of fruits) {
    if (f.age < 0.7 || f.y - f.r > DEATH_Y) {
      f.aboveTime = 0
      continue
    }
    f.aboveTime = (f.aboveTime || 0) + dt
    if (f.aboveTime > worst) worst = f.aboveTime
    if (f.aboveTime >= 2) {
      endGame()
      return
    }
    if (f.aboveTime >= 0.5 && Math.hypot(f.vx, f.vy) < 22) {
      endGame()
      return
    }
  }
  if (worst > 0) dangerTime = worst
  else dangerTime = Math.max(0, dangerTime - dt * 2)
}

function step(dt) {
  if (over.value) return

  for (const f of fruits) {
    f.age += dt
    if (f.fresh > 0) f.fresh--
    f.vy += GRAVITY * dt
    f.x += f.vx * dt
    f.y += f.vy * dt
    f.vx *= 0.999
    f.vy *= 0.999
  }

  mergePass()

  for (let it = 0; it < ITERATIONS; it++) {
    const n = fruits.length
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) resolvePair(fruits[i], fruits[j])
    }
    for (let i = 0; i < n; i++) constrain(fruits[i])
  }

  settle()
  checkDanger(dt)
}

function endGame() {
  if (over.value) return
  over.value = true
  if (score.value > best.value) {
    best.value = score.value
    localStorage.setItem('merge-best', String(best.value))
  }
}

function drawFruit(ctx, f, alpha) {
  const spec = FRUITS[f.level]
  ctx.save()
  ctx.globalAlpha = alpha
  ctx.beginPath()
  ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2)
  ctx.fillStyle = spec.color
  ctx.fill()

  const grad = ctx.createRadialGradient(
    f.x - f.r * 0.35,
    f.y - f.r * 0.4,
    f.r * 0.12,
    f.x,
    f.y,
    f.r
  )
  grad.addColorStop(0, 'rgba(255, 255, 255, 0.45)')
  grad.addColorStop(1, 'rgba(0, 0, 0, 0.08)')
  ctx.fillStyle = grad
  ctx.fill()

  ctx.lineWidth = Math.max(1, f.r * 0.05)
  ctx.strokeStyle = 'rgba(255, 253, 251, 0.72)'
  ctx.stroke()

  ctx.font = Math.round(f.r * 1.25) + 'px "Segoe UI Emoji", "Apple Color Emoji", system-ui, sans-serif'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  ctx.fillText(spec.emoji, f.x, f.y + f.r * 0.04)
  ctx.restore()
}

function draw() {
  const cv = canvasEl.value
  if (!cv) return
  const ctx = cv.getContext('2d')

  ctx.clearRect(0, 0, W, H)
  ctx.fillStyle = '#f7f4f1'
  ctx.fillRect(0, 0, W, H)

  ctx.strokeStyle = '#ddd2c8'
  ctx.lineWidth = 6
  ctx.strokeRect(3, 3, W - 6, H - 6)

  if (!over.value) {
    ctx.save()
    ctx.setLineDash([4, 8])
    ctx.strokeStyle = 'rgba(131, 122, 114, 0.35)'
    ctx.lineWidth = 1.5
    ctx.beginPath()
    ctx.moveTo(previewX, 60)
    ctx.lineTo(previewX, H - 6)
    ctx.stroke()
    ctx.restore()

    drawFruit(ctx, { x: previewX, y: 34, r: nextFruit.value.r, level: nextLevel.value }, 0.85)
  }

  for (const f of fruits) drawFruit(ctx, f, 1)

  ctx.save()
  ctx.setLineDash([9, 7])
  ctx.lineWidth = dangerTime > 0 ? 3 : 2
  ctx.strokeStyle = 'rgba(180, 101, 107, ' + (0.55 + Math.min(0.4, dangerTime * 0.25)) + ')'
  ctx.beginPath()
  ctx.moveTo(0, DEATH_Y)
  ctx.lineTo(W, DEATH_Y)
  ctx.stroke()
  ctx.restore()

  ctx.fillStyle = 'rgba(180, 101, 107, 0.8)'
  ctx.font = '12px system-ui, sans-serif'
  ctx.textAlign = 'left'
  ctx.textBaseline = 'bottom'
  ctx.fillText('危险线', 10, DEATH_Y - 6)
}

function loop(t) {
  raf = requestAnimationFrame(loop)
  if (!last) last = t
  let dt = (t - last) / 1000
  last = t
  if (dt > 0.1) dt = 0.1
  if (dt < 0) dt = 0

  if (!over.value) {
    acc += dt
    let guard = 0
    while (acc >= FIXED_DT && guard < 8) {
      step(FIXED_DT)
      acc -= FIXED_DT
      guard++
    }
    if (guard >= 8) acc = 0
  }

  draw()
}

function onPointerMove(e) {
  if (over.value) return
  const cv = canvasEl.value
  if (!cv) return
  const rect = cv.getBoundingClientRect()
  if (!rect.width) return
  const x = ((e.clientX - rect.left) / rect.width) * W
  const r = nextFruit.value.r
  previewX = clamp(x, r + 2, W - r - 2)
}

function onPointerDown(e) {
  if (over.value) return
  pressed = true
  onPointerMove(e)
}

function onPointerUp() {
  if (!pressed) return
  pressed = false
  if (over.value) return
  drop()
}

function restart() {
  fruits = []
  score.value = 0
  over.value = false
  dangerTime = 0
  previewX = W / 2
  last = 0
  acc = 0
  pressed = false
  nextLevel.value = randLevel()
}

onMounted(() => {
  const cv = canvasEl.value
  if (cv) {
    cv.addEventListener('pointermove', onPointerMove)
    cv.addEventListener('pointerdown', onPointerDown)
  }
  window.addEventListener('pointerup', onPointerUp)
  raf = requestAnimationFrame(loop)
})

onBeforeUnmount(() => {
  const cv = canvasEl.value
  if (cv) {
    cv.removeEventListener('pointermove', onPointerMove)
    cv.removeEventListener('pointerdown', onPointerDown)
  }
  window.removeEventListener('pointerup', onPointerUp)
  if (raf) cancelAnimationFrame(raf)
  raf = null
})
</script>
