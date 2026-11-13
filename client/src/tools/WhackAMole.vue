<template>
  <div>
    <div class="panel">
      <div class="row">
        <button v-if="status === 'ready' || status === 'over'" class="btn primary" @click="start">
          {{ status === 'over' ? '再来一局' : '开始游戏' }}
        </button>
        <button v-else class="btn" @click="togglePause">{{ status === 'paused' ? '继续' : '暂停' }}</button>
        <button class="btn" @click="start">重开</button>
        <span class="pill">失误 {{ misses }}</span>
        <span class="pill">命中率 {{ accuracy }}%</span>
      </div>
      <p class="hint">点击冒头的地鼠得分并累积连击，点空扣 1 分且连击清零。地鼠停留时间会随分数变短，60 秒内尽量多得。</p>
    </div>

    <div class="panel">
      <div class="stats-grid">
        <div class="stat"><b>{{ timeLeft }}</b><span>剩余秒数</span></div>
        <div class="stat"><b>{{ score }}</b><span>分数</span></div>
        <div class="stat"><b>x{{ combo }}</b><span>连击</span></div>
        <div class="stat"><b>{{ best }}</b><span>最高分</span></div>
      </div>
    </div>

    <div class="panel center" style="position: relative; line-height: 1.6">
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 14px; width: 100%; max-width: 360px; margin: 0 auto">
        <div v-for="(h, i) in holes" :key="i" style="position: relative; aspect-ratio: 1 / 1; user-select: none">
          <div
            style="position: absolute; left: 6%; right: 6%; bottom: 8%; height: 60%; background: #e0d8cf; border: 2px solid #ece4dc; border-radius: 50%; overflow: hidden; box-shadow: inset 0 8px 12px rgba(70, 60, 55, 0.12)"
          >
            <div
              :style="moleStyle(h)"
              style="position: absolute; left: 20%; right: 20%; bottom: 0; height: 84%; background: #b9a58f; border-radius: 50% 50% 38% 38%"
            >
              <div style="position: absolute; left: 20%; top: 30%; width: 16%; height: 16%; border-radius: 50%; background: #38332f"></div>
              <div style="position: absolute; left: 64%; top: 30%; width: 16%; height: 16%; border-radius: 50%; background: #38332f"></div>
              <div style="position: absolute; left: 32%; right: 32%; bottom: 16%; height: 26%; border-radius: 50%; background: #c0a8a0"></div>
            </div>
          </div>
          <div @click="onHoleClick(i)" style="position: absolute; inset: 0; cursor: pointer"></div>
          <div
            v-if="lastMiss === i"
            style="position: absolute; inset: 0; border-radius: 50%; background: rgba(200, 155, 164, 0.32); pointer-events: none"
          ></div>
        </div>
      </div>

      <div
        v-if="status !== 'running'"
        style="position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(255, 253, 251, 0.78); border-radius: 12px"
      >
        <div style="background: var(--panel); border: 1px solid var(--border); border-radius: 12px; padding: 20px 26px; line-height: 1.6; box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12)">
          <div v-if="status === 'ready'">
            <div style="font-size: 20px; font-weight: 700">打地鼠</div>
            <div style="color: var(--muted); margin: 6px 0 14px">60 秒内敲中更多地鼠</div>
            <button class="btn primary" @click="start">开始游戏</button>
          </div>
          <div v-else-if="status === 'paused'">
            <div style="font-size: 20px; font-weight: 700">已暂停</div>
            <div style="color: var(--muted); margin: 6px 0 14px">按「继续」恢复计时</div>
            <button class="btn primary" @click="togglePause">继续</button>
          </div>
          <div v-else>
            <div style="font-size: 20px; font-weight: 700">时间到</div>
            <div style="color: var(--muted); margin: 6px 0 4px">本局得分 {{ score }}（最高 {{ best }}）</div>
            <div style="color: var(--muted); margin-bottom: 14px">命中 {{ hits }} 次 / 失误 {{ misses }} 次，命中率 {{ accuracy }}%</div>
            <button class="btn primary" @click="start">再来一局</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'

const GAME_SECONDS = 60
const HOLE_COUNT = 9

const holes = ref(Array.from({ length: HOLE_COUNT }, (_, i) => ({ id: i, out: false, hit: false })))
const score = ref(0)
const best = ref(Number(localStorage.getItem('whack-best') || 0))
const combo = ref(0)
const timeLeft = ref(GAME_SECONDS)
const hits = ref(0)
const misses = ref(0)
const status = ref('ready')
const lastMiss = ref(-1)

const accuracy = computed(() => {
  const total = hits.value + misses.value
  return total ? Math.round((hits.value / total) * 100) : 0
})

let tickTimer = null
let spawnTimer = null
const hideTimers = new Set()
const feedbackTimers = new Set()

function moleStyle(h) {
  let transform = 'translateY(105%) scale(0.9)'
  let opacity = 1
  if (h.out) {
    if (h.hit) {
      transform = 'translateY(6%) scale(1.22)'
      opacity = 0.4
    } else {
      transform = 'translateY(0) scale(1)'
    }
  }
  return { transform, opacity, transition: 'transform 0.16s ease-out, opacity 0.16s ease-out' }
}

function clearTimerSet(set) {
  for (const id of set) clearTimeout(id)
  set.clear()
}

function clearAllTimers() {
  if (tickTimer) clearInterval(tickTimer)
  tickTimer = null
  if (spawnTimer) clearTimeout(spawnTimer)
  spawnTimer = null
  clearTimerSet(hideTimers)
  clearTimerSet(feedbackTimers)
  lastMiss.value = -1
}

function nextSpawnDelay() {
  const base = Math.max(380, 900 - score.value * 22)
  return base + Math.random() * 260
}

function spawnOne() {
  const maxMoles = score.value >= 10 ? 3 : 2
  const activeCount = holes.value.filter(h => h.out).length
  if (activeCount >= maxMoles) return
  const empty = holes.value.filter(h => !h.out)
  if (!empty.length) return

  const target = empty[Math.floor(Math.random() * empty.length)]
  const dwell = Math.max(380, 900 - score.value * 28)
  target.out = true
  target.hit = false

  const id = setTimeout(() => {
    hideTimers.delete(id)
    if (!target.out || target.hit) return
    target.out = false
  }, dwell)
  hideTimers.add(id)
}

function scheduleSpawn(delay) {
  if (spawnTimer) clearTimeout(spawnTimer)
  spawnTimer = setTimeout(() => {
    spawnTimer = null
    if (status.value !== 'running') return
    spawnOne()
    scheduleSpawn(nextSpawnDelay())
  }, delay)
}

function onHoleClick(i) {
  if (status.value !== 'running') return
  const h = holes.value[i]
  if (!h || h.hit) return

  if (h.out) {
    h.hit = true
    hits.value++
    score.value++
    combo.value++
    if (score.value > best.value) {
      best.value = score.value
      localStorage.setItem('whack-best', String(best.value))
    }
    const id = setTimeout(() => {
      feedbackTimers.delete(id)
      h.out = false
      h.hit = false
    }, 200)
    feedbackTimers.add(id)
  } else {
    misses.value++
    combo.value = 0
    score.value = Math.max(0, score.value - 1)
    lastMiss.value = i
    const id = setTimeout(() => {
      feedbackTimers.delete(id)
      if (lastMiss.value === i) lastMiss.value = -1
    }, 260)
    feedbackTimers.add(id)
  }
}

function endGame() {
  clearAllTimers()
  status.value = 'over'
  for (const h of holes.value) {
    h.out = false
    h.hit = false
  }
  if (score.value > best.value) {
    best.value = score.value
    localStorage.setItem('whack-best', String(best.value))
  }
}

function tick() {
  timeLeft.value--
  if (timeLeft.value <= 0) {
    timeLeft.value = 0
    endGame()
  }
}

function start() {
  clearAllTimers()
  score.value = 0
  combo.value = 0
  hits.value = 0
  misses.value = 0
  timeLeft.value = GAME_SECONDS
  for (const h of holes.value) {
    h.out = false
    h.hit = false
  }
  status.value = 'running'
  tickTimer = setInterval(tick, 1000)
  scheduleSpawn(500)
}

function togglePause() {
  if (status.value === 'running') {
    status.value = 'paused'
    clearAllTimers()
    for (const h of holes.value) {
      h.out = false
      h.hit = false
    }
  } else if (status.value === 'paused') {
    status.value = 'running'
    if (!tickTimer) tickTimer = setInterval(tick, 1000)
    scheduleSpawn(400)
  }
}

onBeforeUnmount(() => {
  clearAllTimers()
})
</script>
