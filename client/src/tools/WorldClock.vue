<template>
  <div>
    <div class="panel">
      <div class="row" style="margin-bottom: 12px">
        <select v-model="pick">
          <option v-for="z in ZONES" :key="z.id" :value="z.id">{{ z.name }}（{{ z.id }}）</option>
        </select>
        <button class="btn small" :disabled="zones.includes(pick)" @click="add">添加</button>
      </div>
      <div v-for="z in zones" :key="z" class="clock-row">
        <div class="zone-meta">
          <div class="zone-name">{{ name(z) }}</div>
          <div class="zone-id">{{ z }}</div>
        </div>
        <div class="zone-right">
          <div class="zone-time">{{ timeIn(z) }}</div>
          <div class="zone-date">{{ dateIn(z) }}</div>
        </div>
        <button class="btn small" @click="remove(z)">移除</button>
      </div>
    </div>
    <div class="panel">
      <div class="panel-title">时区换算</div>
      <div class="row">
        <select v-model="convFrom">
          <option v-for="z in ZONES" :key="z.id" :value="z.id">{{ z.name }}</option>
        </select>
        <span class="arrow">→</span>
        <select v-model="convTo">
          <option v-for="z in ZONES" :key="z.id" :value="z.id">{{ z.name }}</option>
        </select>
        <input v-model="convTime" type="datetime-local" />
      </div>
      <p v-if="convResult" class="conv-result">
        {{ name(convFrom) }} {{ convTime.replace('T', ' ') }} = {{ name(convTo) }}
        <b>{{ convResult }}</b>
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const ZONES = [
  { id: 'Asia/Shanghai', name: '北京' },
  { id: 'Asia/Tokyo', name: '东京' },
  { id: 'Asia/Singapore', name: '新加坡' },
  { id: 'Asia/Dubai', name: '迪拜' },
  { id: 'Asia/Kolkata', name: '孟买' },
  { id: 'Europe/London', name: '伦敦' },
  { id: 'Europe/Paris', name: '巴黎' },
  { id: 'Europe/Berlin', name: '柏林' },
  { id: 'America/New_York', name: '纽约' },
  { id: 'America/Los_Angeles', name: '洛杉矶' },
  { id: 'Australia/Sydney', name: '悉尼' },
  { id: 'UTC', name: 'UTC' }
]

function name(z) {
  const hit = ZONES.find(x => x.id === z)
  return hit ? hit.name : z
}

const zones = ref(
  (() => {
    try {
      const saved = JSON.parse(localStorage.getItem('worldclock.zones') || 'null')
      if (Array.isArray(saved) && saved.length) return saved
    } catch {
      /* 忽略 */
    }
    return ['Asia/Shanghai', 'America/New_York', 'Europe/London']
  })()
)

watch(zones, v => localStorage.setItem('worldclock.zones', JSON.stringify(v)), { deep: true })

const pick = ref('Asia/Tokyo')

function add() {
  if (!zones.value.includes(pick.value)) zones.value.push(pick.value)
}

function remove(z) {
  zones.value = zones.value.filter(x => x !== z)
}

const now = ref(Date.now())
const timer = setInterval(() => (now.value = Date.now()), 250)
onBeforeUnmount(() => clearInterval(timer))

// 读取某时区的墙钟时间各部分（h23 避免午夜显示 24）
function parts(date, tz) {
  const f = new Intl.DateTimeFormat('zh-CN', {
    timeZone: tz,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23'
  })
  const o = {}
  for (const p of f.formatToParts(date)) o[p.type] = p.value
  return o
}

function timeIn(tz) {
  const p = parts(now.value, tz)
  return `${p.hour}:${p.minute}:${p.second}`
}

function dateIn(tz) {
  const p = parts(now.value, tz)
  return `${p.year}-${p.month}-${p.day}`
}

// —— 时区换算：源时区墙钟 → UTC 时刻 → 目标时区显示 ——
const convFrom = ref('Asia/Shanghai')
const convTo = ref('America/New_York')
const convTime = ref('')

function wallAsUtc(date, tz) {
  const p = parts(date, tz)
  return Date.UTC(+p.year, +p.month - 1, +p.day, +p.hour, +p.minute, +p.second)
}

const convResult = computed(() => {
  if (!convTime.value) return null
  const [d, t] = convTime.value.split('T')
  const [y, mo, da] = d.split('-').map(Number)
  const [h, mi] = t.split(':').map(Number)
  if ([y, mo, da, h, mi].some(v => isNaN(v))) return null
  const asUtc = Date.UTC(y, mo - 1, da, h, mi)
  // 一次校正：把"当作 UTC 的墙钟"与真实时区墙钟的差补回去
  const utcMs = asUtc - (wallAsUtc(new Date(asUtc), convFrom.value) - asUtc)
  const p = parts(new Date(utcMs), convTo.value)
  return `${p.year}-${p.month}-${p.day} ${p.hour}:${p.minute}`
})
</script>

<style scoped>
.clock-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 9px 0;
  border-bottom: 1px dashed var(--border);
}

.clock-row:last-child {
  border-bottom: none;
}

.zone-meta {
  flex: 1;
}

.zone-name {
  font-weight: 600;
  font-size: 14px;
}

.zone-id {
  font-size: 12px;
  color: var(--muted);
}

.zone-right {
  text-align: right;
}

.zone-time {
  font-family: var(--mono);
  font-size: 18px;
  font-variant-numeric: tabular-nums;
}

.zone-date {
  font-size: 12px;
  color: var(--muted);
}

.arrow {
  color: var(--muted);
}

.conv-result {
  margin: 12px 0 0;
  font-size: 14px;
}

.conv-result b {
  font-family: var(--mono);
}
</style>
