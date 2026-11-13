<template>
  <div>
    <div class="panel">
      <div class="panel-title">年龄计算</div>
      <div class="row">
        <div class="field inline">
          <label>出生日期</label>
          <input v-model="birth" type="date" />
        </div>
      </div>
      <div v-if="age" class="row age-result">
        <div class="stat"><b>{{ age.y }}</b><span>年</span></div>
        <div class="stat"><b>{{ age.m }}</b><span>个月</span></div>
        <div class="stat"><b>{{ age.d }}</b><span>天</span></div>
        <div class="stat"><b>{{ age.total }}</b><span>总天数</span></div>
      </div>
    </div>
    <div class="panel">
      <div class="panel-title">日期天数差</div>
      <div class="row">
        <div class="field inline">
          <label>开始</label>
          <input v-model="d1" type="date" />
        </div>
        <div class="field inline">
          <label>结束</label>
          <input v-model="d2" type="date" />
        </div>
      </div>
      <p v-if="diffDays !== null" class="line-result">相差 <b>{{ diffDays }}</b> 天</p>
    </div>
    <div class="panel">
      <div class="panel-title">工作日统计</div>
      <div class="row">
        <div class="field inline">
          <label>开始</label>
          <input v-model="w1" type="date" />
        </div>
        <div class="field inline">
          <label>结束</label>
          <input v-model="w2" type="date" />
        </div>
      </div>
      <div class="field">
        <label>节假日列表（每行一个 YYYY-MM-DD，可选）</label>
        <textarea v-model="holidays" class="mono" style="min-height: 70px" placeholder="2026-01-01&#10;2026-02-17"></textarea>
      </div>
      <p v-if="workdays" class="line-result">
        工作日 <b>{{ workdays.work }}</b> 天 ｜ 跨度 {{ workdays.span }} 天 ｜ 休息 {{ workdays.rest }} 天
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const DAY = 86400000

function parseDate(s) {
  if (!s) return null
  const d = new Date(s + 'T00:00:00')
  return isNaN(d.getTime()) ? null : d
}

function startOfDay(d) {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate())
}

// —— 年龄 ——
const birth = ref('')

const age = computed(() => {
  const b = parseDate(birth.value)
  if (!b || b > new Date()) return null
  const n = new Date()
  let y = n.getFullYear() - b.getFullYear()
  let m = n.getMonth() - b.getMonth()
  let d = n.getDate() - b.getDate()
  if (d < 0) {
    m--
    d += new Date(n.getFullYear(), n.getMonth(), 0).getDate() // 借上个月天数
  }
  if (m < 0) {
    y--
    m += 12
  }
  return { y, m, d, total: Math.floor((startOfDay(n) - startOfDay(b)) / DAY) }
})

// —— 天数差 ——
const d1 = ref('')
const d2 = ref('')

const diffDays = computed(() => {
  const a = parseDate(d1.value)
  const b = parseDate(d2.value)
  if (!a || !b) return null
  return Math.abs(Math.round((startOfDay(b) - startOfDay(a)) / DAY))
})

// —— 工作日 ——
const w1 = ref('')
const w2 = ref('')
const holidays = ref('')

const workdays = computed(() => {
  const a = parseDate(w1.value)
  const b = parseDate(w2.value)
  if (!a || !b) return null
  const [from, to] = a <= b ? [a, b] : [b, a]
  const span = Math.round((to - from) / DAY) + 1
  if (span > 200000) return null
  const set = new Set(
    holidays.value
      .split('\n')
      .map(s => s.trim())
      .filter(Boolean)
  )
  let work = 0
  const cur = new Date(from)
  for (let i = 0; i < span; i++) {
    const key = cur.toLocaleDateString('sv')
    const dow = cur.getDay()
    if (dow !== 0 && dow !== 6 && !set.has(key)) work++
    cur.setDate(cur.getDate() + 1)
  }
  return { work, span, rest: span - work }
})
</script>

<style scoped>
.age-result {
  margin-top: 4px;
}

.age-result .stat {
  min-width: 90px;
}

.line-result {
  margin: 8px 0 0;
  font-size: 14px;
}

.line-result b {
  font-size: 18px;
  color: var(--accent);
}

.mono {
  font-family: var(--mono);
  font-size: 13px;
}
</style>
