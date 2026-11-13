<template>
  <div>
    <div class="panel center">
      <span class="mode" :class="mode">{{ mode === 'work' ? '专注中' : '休息中' }}</span>
      <div class="big-num">{{ display }}</div>
      <div class="progress">
        <div class="progress-bar" :style="{ width: pct + '%' }"></div>
      </div>
      <div class="row center-row">
        <button class="btn primary" @click="toggle">
          {{ running ? '暂停' : remaining === total() || remaining <= 0 ? '开始' : '继续' }}
        </button>
        <button class="btn" @click="skip">跳过本阶段</button>
        <button class="btn" @click="reset">重置</button>
      </div>
      <p class="hint">今日专注：{{ todayCount }} 次 ｜ 完成专注阶段后自动记录并进入休息</p>
    </div>
    <div class="panel">
      <div class="panel-title">时长设置（分钟）</div>
      <div class="row">
        <div class="field inline">
          <label>专注</label>
          <input v-model.number="workMin" type="number" min="1" max="120" style="width: 80px" :disabled="running" />
        </div>
        <div class="field inline">
          <label>休息</label>
          <input v-model.number="breakMin" type="number" min="1" max="60" style="width: 80px" :disabled="running" />
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { loadStore, saveStore } from '../api/storage.js'

const workMin = ref(25)
const breakMin = ref(5)
const mode = ref('work')
const running = ref(false)
const remaining = ref(25 * 60000)
const todayCount = ref(0)

let endTs = 0
let timer = null

function total() {
  return Math.max(1, mode.value === 'work' ? workMin.value : breakMin.value) * 60000
}

function fmt(ms) {
  const t = Math.max(0, Math.ceil(ms / 1000))
  const m = Math.floor(t / 60)
  const s = t % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

const display = computed(() => fmt(remaining.value))
const pct = computed(() => Math.max(0, Math.min(100, (remaining.value / total()) * 100)))

function today() {
  return new Date().toLocaleDateString('sv') // YYYY-MM-DD
}

function beep() {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)()
    const t0 = ctx.currentTime
    for (let i = 0; i < 3; i++) {
      const osc = ctx.createOscillator()
      const gain = ctx.createGain()
      osc.connect(gain)
      gain.connect(ctx.destination)
      osc.frequency.value = mode.value === 'work' ? 880 : 660
      gain.gain.value = 0.08
      osc.start(t0 + i * 0.35)
      osc.stop(t0 + i * 0.35 + 0.18)
    }
    osc.onended = () => ctx.close()
  } catch {
    /* 忽略 */
  }
}

onMounted(async () => {
  try {
    const s = JSON.parse(localStorage.getItem('pomodoro.settings') || 'null')
    if (s) {
      workMin.value = s.workMin || 25
      breakMin.value = s.breakMin || 5
    }
  } catch {
    /* 忽略 */
  }
  remaining.value = total()
  const data = await loadStore('pomodoro')
  const rec = data && data.records ? data.records : {}
  todayCount.value = rec[today()] || 0
})

watch([workMin, breakMin], () => {
  localStorage.setItem('pomodoro.settings', JSON.stringify({ workMin: workMin.value, breakMin: breakMin.value }))
  if (!running.value) remaining.value = total()
})

function toggle() {
  if (running.value) {
    running.value = false
    clearInterval(timer)
    return
  }
  if (remaining.value <= 0) remaining.value = total()
  running.value = true
  endTs = Date.now() + remaining.value
  timer = setInterval(() => {
    remaining.value = endTs - Date.now()
    if (remaining.value <= 0) phaseDone()
  }, 200)
}

async function phaseDone() {
  running.value = false
  clearInterval(timer)
  beep()
  if (mode.value === 'work') {
    todayCount.value++
    const data = (await loadStore('pomodoro')) || { records: {} }
    if (!data.records) data.records = {}
    data.records[today()] = (data.records[today()] || 0) + 1
    await saveStore('pomodoro', data)
    mode.value = 'break'
  } else {
    mode.value = 'work'
  }
  remaining.value = total()
}

function skip() {
  running.value = false
  clearInterval(timer)
  remaining.value = 0
  phaseDone()
}

function reset() {
  running.value = false
  clearInterval(timer)
  mode.value = 'work'
  remaining.value = total()
}

onBeforeUnmount(() => clearInterval(timer))
</script>

<style scoped>
.mode {
  display: inline-block;
  padding: 3px 14px;
  border-radius: 999px;
  font-size: 13px;
  font-weight: 600;
}

.mode.work {
  background: var(--accent-soft);
  color: var(--accent);
}

.mode.break {
  background: #e8f0fe;
  color: #1a73e8;
}

:root[data-theme='dark'] .mode.break {
  background: #1a2c4e;
  color: #8ab4f8;
}

.center-row {
  justify-content: center;
}
</style>
