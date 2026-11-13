<template>
  <div>
    <div class="panel">
      <div class="row">
        <div class="field inline">
          <label>时</label>
          <input v-model.number="h" type="number" min="0" max="99" :disabled="running" style="width: 70px" />
        </div>
        <div class="field inline">
          <label>分</label>
          <input v-model.number="m" type="number" min="0" max="59" :disabled="running" style="width: 70px" />
        </div>
        <div class="field inline">
          <label>秒</label>
          <input v-model.number="s" type="number" min="0" max="59" :disabled="running" style="width: 70px" />
        </div>
      </div>
      <div class="count-display" :class="{ done }">{{ display }}</div>
      <div class="progress">
        <div class="progress-bar" :style="{ width: progressPct + '%' }"></div>
      </div>
      <div class="row">
        <button class="btn primary" :disabled="!running && totalMs() === 0" @click="toggle">
          {{ running ? '暂停' : '开始' }}
        </button>
        <button class="btn" @click="reset">重置</button>
      </div>
      <p class="hint">结束后播放提示音并发送系统通知（首次开始时请求通知权限）。</p>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const h = ref(0)
const m = ref(5)
const s = ref(0)
const running = ref(false)
const remaining = ref(0)
const done = ref(false)

let endTs = 0
let timer = null

function totalMs() {
  const hh = Math.max(0, h.value || 0)
  const mm = Math.max(0, m.value || 0)
  const ss = Math.max(0, s.value || 0)
  return ((hh * 60 + mm) * 60 + ss) * 1000
}

function fmt(ms) {
  const t = Math.max(0, Math.ceil(ms / 1000))
  const hh = Math.floor(t / 3600)
  const mm = Math.floor((t % 3600) / 60)
  const ss = t % 60
  const p = n => String(n).padStart(2, '0')
  return (hh ? `${p(hh)}:` : '') + `${p(mm)}:${p(ss)}`
}

const display = computed(() => fmt(remaining.value))
const progressPct = computed(() => {
  const total = totalMs()
  return total > 0 && !running.value && remaining.value === total
    ? 100
    : total > 0
      ? Math.max(0, Math.min(100, (remaining.value / total) * 100))
      : 0
})

watch([h, m, s], () => {
  if (!running.value) {
    remaining.value = totalMs()
    done.value = false
  }
})

function toggle() {
  if (running.value) {
    running.value = false
    clearInterval(timer)
    return
  }
  if (remaining.value <= 0) remaining.value = totalMs()
  if (remaining.value <= 0) return
  done.value = false
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission().catch(() => {})
  }
  running.value = true
  endTs = Date.now() + remaining.value
  timer = setInterval(() => {
    remaining.value = endTs - Date.now()
    if (remaining.value <= 0) {
      remaining.value = 0
      running.value = false
      clearInterval(timer)
      finish()
    }
  }, 100)
}

function finish() {
  done.value = true
  beep()
  try {
    if ('Notification' in window && Notification.permission === 'granted') {
      new Notification('⏰ 倒计时结束')
    }
  } catch {
    /* 忽略通知失败 */
  }
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
      osc.frequency.value = 880
      gain.gain.value = 0.08
      osc.start(t0 + i * 0.35)
      osc.stop(t0 + i * 0.35 + 0.18)
    }
    osc.onended = () => ctx.close()
  } catch {
    /* 无音频环境时忽略 */
  }
}

function reset() {
  running.value = false
  clearInterval(timer)
  done.value = false
  remaining.value = totalMs()
}

reset()
onBeforeUnmount(() => clearInterval(timer))
</script>

<style scoped>
.count-display {
  font-size: 52px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  text-align: center;
  margin: 10px 0 4px;
}

.count-display.done {
  color: var(--accent);
  animation: blink 0.8s ease-in-out 4;
}

@keyframes blink {
  50% {
    opacity: 0.3;
  }
}
</style>
