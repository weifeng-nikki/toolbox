<template>
  <div>
    <div class="panel center">
      <div class="stopwatch">{{ fmt(elapsed) }}</div>
      <div class="row center-row">
        <button class="btn primary" @click="toggle">{{ running ? '暂停' : '开始' }}</button>
        <button class="btn" :disabled="!running" @click="lap">计次</button>
        <button class="btn" :disabled="!running && elapsed === 0" @click="reset">重置</button>
      </div>
    </div>
    <div v-if="laps.length" class="panel">
      <div class="panel-title">计次记录（{{ laps.length }}）</div>
      <div v-for="l in reversedLaps" :key="l.n" class="lap">
        <span>#{{ l.n }}</span><span>{{ fmt(l.t) }}</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'

const running = ref(false)
const elapsed = ref(0)
const laps = ref([])
const reversedLaps = computed(() => [...laps.value].reverse())

let base = 0
let startTs = 0
let timer = null

function pad(n) {
  return String(n).padStart(2, '0')
}

function fmt(ms) {
  const cs = Math.floor(ms / 10) % 100
  const s = Math.floor(ms / 1000) % 60
  const m = Math.floor(ms / 60000) % 60
  const h = Math.floor(ms / 3600000)
  return (h ? `${pad(h)}:` : '') + `${pad(m)}:${pad(s)}.${pad(cs)}`
}

function toggle() {
  if (running.value) {
    base = elapsed.value
    running.value = false
    clearInterval(timer)
  } else {
    running.value = true
    startTs = performance.now()
    timer = setInterval(() => {
      elapsed.value = base + performance.now() - startTs
    }, 33)
  }
}

function lap() {
  if (running.value) laps.value.push({ n: laps.value.length + 1, t: elapsed.value })
}

function reset() {
  running.value = false
  clearInterval(timer)
  base = 0
  elapsed.value = 0
  laps.value = []
}

onBeforeUnmount(() => clearInterval(timer))
</script>

<style scoped>
.stopwatch {
  font-size: 48px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  margin-bottom: 14px;
}

.center-row {
  justify-content: center;
}

.lap {
  display: flex;
  justify-content: space-between;
  padding: 7px 0;
  border-bottom: 1px dashed var(--border);
  font-family: var(--mono);
  font-size: 14px;
}

.lap:last-child {
  border-bottom: none;
}
</style>
