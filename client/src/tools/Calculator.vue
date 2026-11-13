<template>
  <div>
    <div class="panel">
      <div class="field">
        <label>表达式（支持 + - * / % ^ ! 括号、函数与常量，回车计算）</label>
        <input
          v-model="expr"
          class="mono"
          placeholder="例：2^10 + sin(pi/2) * 3!"
          @keydown.enter="saveHistory"
        />
      </div>
      <div class="row" style="margin-bottom: 10px">
        <label class="check"><input v-model="deg" type="checkbox" />角度制（三角函数）</label>
      </div>
      <div class="calc-result">
        <template v-if="evaluated.value !== null"><span class="eq">=</span>{{ evaluated.value }}</template>
        <span v-else-if="evaluated.error" class="err">{{ evaluated.error }}</span>
      </div>
      <div class="grid">
        <button v-for="b in keys" :key="b.k" class="btn" :class="b.cls" @click="press(b.k)">
          {{ b.label }}
        </button>
        <button class="btn primary" style="grid-column: span 2" @click="saveHistory">写入历史</button>
        <button class="btn" @click="expr = ''">清空</button>
      </div>
    </div>
    <div v-if="history.length" class="panel">
      <div class="panel-title">历史记录 <button class="btn small" @click="clearHistory">清空历史</button></div>
      <div v-for="(h, i) in history" :key="i" class="kv">
        <span></span>
        <b class="hist-item" @click="expr = h.split(' = ')[0]">{{ h }}</b>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const expr = ref('')
const deg = ref(false)
const history = ref(
  (() => {
    try {
      return JSON.parse(localStorage.getItem('calc.history') || '[]')
    } catch {
      return []
    }
  })()
)

watch(history, v => localStorage.setItem('calc.history', JSON.stringify(v)), { deep: true })

function fmtNum(v) {
  if (typeof v !== 'number' || !isFinite(v)) return '错误'
  if (Math.abs(v) >= 1e12 || (Math.abs(v) < 1e-6 && v !== 0)) return v.toExponential(8)
  return String(parseFloat(v.toPrecision(12)))
}

const toRad = x => (deg.value ? (x * Math.PI) / 180 : x)
const fromRad = x => (deg.value ? (x * 180) / Math.PI : x)

const FUNCS = {
  sin: x => Math.sin(toRad(x)),
  cos: x => Math.cos(toRad(x)),
  tan: x => Math.tan(toRad(x)),
  asin: x => fromRad(Math.asin(x)),
  acos: x => fromRad(Math.acos(x)),
  atan: x => fromRad(Math.atan(x)),
  ln: Math.log,
  log: Math.log10,
  sqrt: Math.sqrt,
  abs: Math.abs,
  max: (...a) => Math.max(...a),
  min: (...a) => Math.min(...a)
}

function factorial(n) {
  if (n < 0 || !Number.isInteger(n)) throw new Error('阶乘仅支持非负整数')
  if (n > 170) throw new Error('阶乘结果过大（n ≤ 170）')
  let r = 1
  for (let i = 2; i <= n; i++) r *= i
  return r
}

// —— 词法分析 ——
function tokenize(s) {
  const tokens = []
  let i = 0
  while (i < s.length) {
    const ch = s[i]
    if (/\s/.test(ch)) {
      i++
      continue
    }
    if (/[0-9.]/.test(ch)) {
      let j = i
      while (j < s.length && /[0-9.]/.test(s[j])) j++
      const num = s.slice(i, j)
      if ((num.match(/\./g) || []).length > 1) throw new Error(`非法数字：${num}`)
      tokens.push({ t: 'num', v: parseFloat(num) })
      i = j
      continue
    }
    if (/[a-z]/i.test(ch)) {
      let j = i
      while (j < s.length && /[a-z]/i.test(s[j])) j++
      tokens.push({ t: 'id', v: s.slice(i, j).toLowerCase() })
      i = j
      continue
    }
    if ('+-*/%^()!,'.includes(ch)) {
      tokens.push({ t: ch })
      i++
      continue
    }
    throw new Error(`无法识别的字符：${ch}`)
  }
  return tokens
}

// —— 递归下降解析：expr → term → unary → power → postfix → primary ——
function evaluate(tokens) {
  let pos = 0
  const peek = () => tokens[pos]
  const next = () => tokens[pos++]

  function expr() {
    let v = term()
    while (peek() && (peek().t === '+' || peek().t === '-')) {
      const op = next().t
      const r = term()
      v = op === '+' ? v + r : v - r
    }
    return v
  }

  function term() {
    let v = unary()
    while (peek() && ['*', '/', '%'].includes(peek().t)) {
      const op = next().t
      const r = unary()
      v = op === '*' ? v * r : op === '/' ? v / r : v % r
    }
    return v
  }

  function unary() {
    if (peek() && peek().t === '-') {
      next()
      return -unary()
    }
    if (peek() && peek().t === '+') {
      next()
      return unary()
    }
    return power()
  }

  function power() {
    const base = postfix()
    if (peek() && peek().t === '^') {
      next()
      return Math.pow(base, unary()) // 右结合
    }
    return base
  }

  function postfix() {
    let v = primary()
    while (peek() && peek().t === '!') {
      next()
      v = factorial(v)
    }
    return v
  }

  function primary() {
    const tk = next()
    if (!tk) throw new Error('表达式不完整')
    if (tk.t === 'num') return tk.v
    if (tk.t === 'id') {
      if (tk.v === 'pi') return Math.PI
      if (tk.v === 'e') return Math.E
      if (!(tk.v in FUNCS)) throw new Error(`未知函数：${tk.v}`)
      if (!peek() || peek().t !== '(') throw new Error(`${tk.v} 后需要括号`)
      next()
      const args = [expr()]
      while (peek() && peek().t === ',') {
        next()
        args.push(expr())
      }
      if (!peek() || peek().t !== ')') throw new Error('缺少右括号')
      next()
      return FUNCS[tk.v](...args)
    }
    if (tk.t === '(') {
      const v = expr()
      if (!peek() || peek().t !== ')') throw new Error('缺少右括号')
      next()
      return v
    }
    throw new Error(`意外的符号：${tk.t}`)
  }

  const v = expr()
  if (pos < tokens.length) throw new Error('表达式存在多余部分')
  return v
}

const evaluated = computed(() => {
  const s = expr.value.trim()
  if (!s) return { value: null, error: '' }
  try {
    return { value: fmtNum(evaluate(tokenize(s))), error: '' }
  } catch (e) {
    return { value: null, error: e.message }
  }
})

const keys = [
  { k: '(', label: '(' },
  { k: ')', label: ')' },
  { k: '^', label: '^' },
  { k: '!', label: 'n!' },
  { k: '7', label: '7' },
  { k: '8', label: '8' },
  { k: '9', label: '9' },
  { k: '/', label: '÷' },
  { k: '4', label: '4' },
  { k: '5', label: '5' },
  { k: '6', label: '6' },
  { k: '*', label: '×' },
  { k: '1', label: '1' },
  { k: '2', label: '2' },
  { k: '3', label: '3' },
  { k: '-', label: '−' },
  { k: '0', label: '0' },
  { k: '.', label: '.' },
  { k: '%', label: '%' },
  { k: '+', label: '+' },
  { k: 'sin(', label: 'sin' },
  { k: 'cos(', label: 'cos' },
  { k: 'tan(', label: 'tan' },
  { k: 'sqrt(', label: '√' },
  { k: 'pi', label: 'π' },
  { k: 'e', label: 'e' },
  { k: 'ln(', label: 'ln' },
  { k: 'log(', label: 'log' }
]

function press(k) {
  expr.value += k
}

function saveHistory() {
  const { value } = evaluated
  const s = expr.value.trim()
  if (!s || value === null) return
  history.value = [`${s} = ${value}`, ...history.value].slice(0, 20)
}

function clearHistory() {
  history.value = []
}
</script>

<style scoped>
.check {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
  cursor: pointer;
}

.check input {
  width: auto;
}

.mono {
  font-family: var(--mono);
}

.calc-result {
  font-size: 24px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  min-height: 34px;
  margin-bottom: 12px;
  word-break: break-all;
}

.eq {
  color: var(--muted);
  margin-right: 8px;
}

.grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 8px;
}

.hist-item {
  cursor: pointer;
}

.hist-item:hover {
  color: var(--accent);
}
</style>
