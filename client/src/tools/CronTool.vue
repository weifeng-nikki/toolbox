<template>
  <div>
    <div class="panel">
      <div class="panel-title">Cron 表达式解析（5 段）</div>
      <div class="field">
        <label>分 时 日 月 周</label>
        <input
          v-model="expr"
          class="mono"
          placeholder="*/5 * * * *"
          @keyup.enter="run"
        />
      </div>
      <div class="row">
        <button class="btn primary" @click="run">解析并计算</button>
        <button
          v-for="ex in examples"
          :key="ex.expr"
          class="btn small"
          @click="applyExample(ex)"
        >
          {{ ex.label }}
        </button>
      </div>
      <p v-if="error" class="err">{{ error }}</p>
      <p class="hint">
        支持 *、*/n、a-b、a,b,c、纯数字；不支持 L、W、#。周字段 0 或 7 表示周日。
      </p>
    </div>

    <div v-if="times.length" class="panel">
      <div class="panel-title">未来 8 次执行时间（本地时区）</div>
      <div v-for="(t, i) in times" :key="i" class="kv">
        <span>第 {{ i + 1 }} 次</span>
        <b>{{ t }}</b>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const FIELDS = [
  { name: '分钟', min: 0, max: 59 },
  { name: '小时', min: 0, max: 23 },
  { name: '日', min: 1, max: 31 },
  { name: '月', min: 1, max: 12 },
  { name: '周', min: 0, max: 7 }
]

const WEEK = ['日', '一', '二', '三', '四', '五', '六']

const examples = [
  { label: '每分钟', expr: '* * * * *' },
  { label: '每天 9 点', expr: '0 9 * * *' },
  { label: '工作日 9 点', expr: '0 9 * * 1-5' },
  { label: '每月 1 号 0 点', expr: '0 0 1 * *' }
]

const expr = ref('* * * * *')
const error = ref('')
const times = ref([])

function parseField(raw, f) {
  const set = new Set()
  for (const part of raw.split(',')) {
    if (!part) throw new Error(`${f.name}字段包含空项`)

    let m
    if (part === '*') {
      for (let v = f.min; v <= f.max; v++) set.add(v)
    } else if ((m = /^\*\/(\d+)$/.exec(part))) {
      const n = Number(m[1])
      if (n <= 0) throw new Error(`${f.name}字段的步长必须大于 0`)
      for (let v = f.min; v <= f.max; v += n) set.add(v)
    } else if ((m = /^(\d+)-(\d+)$/.exec(part))) {
      const a = Number(m[1])
      const b = Number(m[2])
      if (a > b) throw new Error(`${f.name}字段范围「${part}」起点大于终点`)
      if (a < f.min || b > f.max) {
        throw new Error(`${f.name}字段范围「${part}」超出 ${f.min}-${f.max}`)
      }
      for (let v = a; v <= b; v++) set.add(v)
    } else if ((m = /^\d+$/.exec(part))) {
      const v = Number(part)
      if (v < f.min || v > f.max) {
        throw new Error(`${f.name}字段值 ${v} 超出范围 ${f.min}-${f.max}`)
      }
      set.add(v)
    } else {
      throw new Error(`${f.name}字段不支持语法「${part}」`)
    }
  }
  return set
}

function pad(n) {
  return String(n).padStart(2, '0')
}

function fmtTime(d) {
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(
    d.getHours()
  )}:${pad(d.getMinutes())} 周${WEEK[d.getDay()]}`
}

function run() {
  error.value = ''
  times.value = []

  const raw = expr.value.trim()
  if (!raw) {
    error.value = '请输入 cron 表达式'
    return
  }

  const parts = raw.split(/\s+/)
  if (parts.length !== 5) {
    error.value = `需要 5 段（分 时 日 月 周），当前为 ${parts.length} 段`
    return
  }

  let sets
  try {
    sets = parts.map((p, i) => parseField(p, FIELDS[i]))
  } catch (e) {
    error.value = e.message
    return
  }

  if (sets[4].has(7)) {
    sets[4].delete(7)
    sets[4].add(0)
  }

  const dayRestricted = parts[2] !== '*'
  const dowRestricted = parts[4] !== '*'

  const cur = new Date()
  cur.setSeconds(0, 0)
  cur.setMinutes(cur.getMinutes() + 1)
  const limit = cur.getTime() + 366 * 24 * 60 * 60 * 1000

  const out = []
  while (out.length < 8 && cur.getTime() <= limit) {
    const dm = sets[2].has(cur.getDate())
    const dw = sets[4].has(cur.getDay())
    const dateOk =
      dayRestricted && dowRestricted ? dm || dw : dm && dw

    if (
      dateOk &&
      sets[3].has(cur.getMonth() + 1) &&
      sets[1].has(cur.getHours()) &&
      sets[0].has(cur.getMinutes())
    ) {
      out.push(fmtTime(cur))
    }
    cur.setMinutes(cur.getMinutes() + 1)
  }

  if (!out.length) {
    error.value = '未来 366 天内没有匹配的执行时间'
    return
  }
  times.value = out
}

function applyExample(ex) {
  expr.value = ex.expr
  run()
}
</script>
