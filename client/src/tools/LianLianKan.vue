<template>
  <div>
    <div class="panel">
      <div class="row">
        <select v-model="level" @change="restart">
          <option value="easy">简单 · 8×6 / 6 种图案</option>
          <option value="normal">普通 · 8×6 / 8 种图案</option>
          <option value="hard">困难 · 10×6 / 10 种图案</option>
        </select>
        <button class="btn primary" @click="restart">重开</button>
        <button class="btn" :disabled="won || locked || !remaining" @click="hint">提示</button>
        <button class="btn" :disabled="won || locked || !remaining" @click="shuffleBoard">洗牌</button>
      </div>
      <div class="row" style="margin-top: 10px">
        <span class="pill">剩余 {{ remaining }} 对</span>
        <span class="pill">⏱ {{ timeText }}</span>
        <span class="pill">得分 {{ score }}</span>
        <span class="pill">最高 {{ best }}</span>
      </div>
      <p class="hint">
        点击两张相同图案，若能用不超过 2 个拐点的路径连通即可消除；路径可以绕行棋盘外围一圈空白。
      </p>
      <p v-if="message" :class="messageType">{{ message }}</p>
    </div>

    <div class="panel">
      <div style="position: relative; width: 100%; max-width: 660px; margin: 0 auto">
        <div :style="boardStyle">
          <button
            v-for="(v, i) in board"
            :key="i"
            type="button"
            :style="cellStyle(i)"
            @click="clickCell(i)"
          >{{ v || '' }}</button>
        </div>

        <div v-if="won" :style="overlayStyle">
          <div :style="overlayCardStyle">
            <div style="font-size: 20px; font-weight: 700">🎉 全部消除！</div>
            <div class="hint" style="margin: 8px 0 14px">
              用时 {{ timeText }} · 得分 {{ score }} · 最高 {{ best }}
            </div>
            <div class="row" style="justify-content: center">
              <button class="btn primary" @click="restart">再来一局</button>
            </div>
            <div class="row" style="justify-content: center; margin-top: 10px">
              <button
                v-for="item in LEVEL_KEYS"
                :key="item.key"
                class="btn small"
                @click="startWith(item.key)"
              >{{ item.label }}</button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'

const POOL = ['🍎', '🍋', '🍇', '🍑', '🥝', '🍒', '🍉', '🍓', '🍊', '🍍', '🥑', '🍐']

const LEVELS = {
  easy: { rows: 6, cols: 8, kinds: 6 },
  normal: { rows: 6, cols: 8, kinds: 8 },
  hard: { rows: 6, cols: 10, kinds: 10 }
}

const LEVEL_KEYS = [
  { key: 'easy', label: '简单' },
  { key: 'normal', label: '普通' },
  { key: 'hard', label: '困难' }
]

const level = ref('easy')
const board = ref([])
const first = ref(-1)
const score = ref(0)
const best = ref(0)
const elapsed = ref(0)
const won = ref(false)
const locked = ref(false)
const message = ref('')
const messageType = ref('err')
const pathCells = ref(new Set())
const hintCells = ref(new Set())

let ticker = null
let startedAt = 0
let pendingTimer = null
let hintTimer = null

const dim = computed(() => LEVELS[level.value])
const cols = computed(() => dim.value.cols)
const remaining = computed(() => Math.floor(board.value.filter(v => v).length / 2))
const timeText = computed(() => fmt(elapsed.value))

const boardStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${cols.value}, 1fr)`,
  gap: '5px',
  padding: '8px',
  background: '#ece4dc',
  borderRadius: '12px',
  userSelect: 'none'
}))

const overlayStyle = {
  position: 'absolute',
  inset: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(247, 244, 241, 0.78)',
  borderRadius: '12px'
}

const overlayCardStyle = {
  background: '#fbf8f5',
  border: '1px solid #ece4dc',
  borderRadius: '12px',
  padding: '20px 28px',
  textAlign: 'center',
  boxShadow: '0 10px 30px rgba(120, 105, 95, 0.16)'
}

function fmt(sec) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function shuffleArr(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function toPoint(i) {
  const c = dim.value.cols
  return { r: Math.floor(i / c) + 1, c: (i % c) + 1 }
}

// 棋盘外围多留一圈空白，坐标从 1 开始
function occupied(r, c) {
  const { rows, cols: c2 } = dim.value
  if (r < 1 || r > rows || c < 1 || c > c2) return false
  return !!board.value[(r - 1) * c2 + (c - 1)]
}

function clearLine(r1, c1, r2, c2) {
  if (r1 === r2) {
    const from = Math.min(c1, c2)
    const to = Math.max(c1, c2)
    for (let c = from + 1; c < to; c++) {
      if (occupied(r1, c)) return false
    }
    return true
  }
  if (c1 === c2) {
    const from = Math.min(r1, r2)
    const to = Math.max(r1, r2)
    for (let r = from + 1; r < to; r++) {
      if (occupied(r, c1)) return false
    }
    return true
  }
  return false
}

function straightPath(a, b) {
  if (a.r === b.r && a.c === b.c) return null
  if (a.r !== b.r && a.c !== b.c) return null
  return clearLine(a.r, a.c, b.r, b.c) ? [a, b] : null
}

function oneTurnPath(a, b) {
  if (a.r === b.r || a.c === b.c) return null
  const corners = [
    { r: a.r, c: b.c },
    { r: b.r, c: a.c }
  ]
  for (const p of corners) {
    if (occupied(p.r, p.c)) continue
    if (clearLine(a.r, a.c, p.r, p.c) && clearLine(p.r, p.c, b.r, b.c)) {
      return [a, p, b]
    }
  }
  return null
}

// 0 / 1 / 2 个拐点：枚举第一个拐点，再检查剩下的一拐或直连
function findPath(a, b) {
  const direct = straightPath(a, b)
  if (direct) return direct

  const one = oneTurnPath(a, b)
  if (one) return one

  const { rows, cols: c2 } = dim.value
  const dirs = [[0, 1], [0, -1], [1, 0], [-1, 0]]
  for (const [dr, dc] of dirs) {
    let r = a.r + dr
    let c = a.c + dc
    while (r >= 0 && r <= rows + 1 && c >= 0 && c <= c2 + 1) {
      if (occupied(r, c)) break
      const p = { r, c }
      const sp = straightPath(p, b)
      if (sp) return [a, ...sp]
      const op = oneTurnPath(p, b)
      if (op) return [a, ...op]
      r += dr
      c += dc
    }
  }
  return null
}

function findAnyPair() {
  const groups = new Map()
  board.value.forEach((v, i) => {
    if (!v) return
    if (!groups.has(v)) groups.set(v, [])
    groups.get(v).push(i)
  })
  for (const arr of groups.values()) {
    for (let a = 0; a < arr.length; a++) {
      for (let b = a + 1; b < arr.length; b++) {
        if (findPath(toPoint(arr[a]), toPoint(arr[b]))) return [arr[a], arr[b]]
      }
    }
  }
  return null
}

function ensureSolvable() {
  for (let attempt = 0; attempt < 120; attempt++) {
    if (findAnyPair()) return
    board.value = shuffleArr(board.value.slice())
  }
}

function cellStyle(i) {
  const style = {
    aspectRatio: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    border: '1px solid #ece4dc',
    borderRadius: '10px',
    background: 'linear-gradient(180deg, #fbf8f5, #f2ece6)',
    fontFamily: 'inherit',
    fontSize: 'clamp(18px, 4.4vw, 28px)',
    lineHeight: '1',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'background 0.15s ease, box-shadow 0.15s ease'
  }

  if (!board.value[i]) {
    style.background = 'rgba(255, 255, 255, 0.28)'
    style.border = '1px dashed #ece4dc'
    style.cursor = 'default'
    return style
  }

  const p = toPoint(i)
  const key = p.r + ',' + p.c

  if (pathCells.value.has(key)) {
    style.background = 'rgba(200, 155, 164, 0.38)'
    style.boxShadow = 'inset 0 0 0 2px #c89ba4'
  } else if (hintCells.value.has(key)) {
    style.background = 'rgba(158, 179, 166, 0.42)'
    style.boxShadow = 'inset 0 0 0 2px #9eb3a6'
  } else if (first.value === i) {
    style.background = 'rgba(167, 155, 186, 0.34)'
    style.boxShadow = 'inset 0 0 0 2px #a79bba'
  }

  if (locked.value) style.cursor = 'default'
  return style
}

function startTimer() {
  if (ticker) return
  startedAt = Date.now() - elapsed.value * 1000
  ticker = setInterval(() => {
    elapsed.value = Math.floor((Date.now() - startedAt) / 1000)
  }, 250)
}

function stopTimer() {
  if (ticker) {
    clearInterval(ticker)
    ticker = null
  }
}

function clickCell(i) {
  if (won.value || locked.value || !board.value[i]) return
  startTimer()

  if (first.value === -1) {
    first.value = i
    message.value = ''
    return
  }
  if (first.value === i) {
    first.value = -1
    return
  }
  if (board.value[first.value] !== board.value[i]) {
    first.value = -1
    messageType.value = 'err'
    message.value = '图案不同，请重新选择。'
    return
  }

  const path = findPath(toPoint(first.value), toPoint(i))
  if (!path) {
    first.value = -1
    messageType.value = 'err'
    message.value = '这两个图案无法连通（最多两个拐点），换一对试试。'
    return
  }

  const a = first.value
  const b = i
  first.value = -1
  locked.value = true
  message.value = ''
  pathCells.value = new Set(path.map(p => p.r + ',' + p.c))

  pendingTimer = setTimeout(() => {
    pendingTimer = null
    const next = board.value.slice()
    next[a] = null
    next[b] = null
    board.value = next
    pathCells.value = new Set()
    locked.value = false
    score.value += 10
    if (score.value > best.value) {
      best.value = score.value
      try {
        localStorage.setItem('match-best', String(best.value))
      } catch (e) {
        // 本地存储不可用时忽略
      }
    }
    if (!board.value.some(v => v)) {
      won.value = true
      stopTimer()
    }
  }, 260)
}

function hint() {
  if (won.value || locked.value) return
  const pair = findAnyPair()
  if (!pair) {
    messageType.value = 'err'
    message.value = '当前没有可连通的配对，试试洗牌。'
    return
  }
  message.value = ''
  hintCells.value = new Set(pair.map(i => {
    const p = toPoint(i)
    return p.r + ',' + p.c
  }))
  clearTimeout(hintTimer)
  hintTimer = setTimeout(() => {
    hintTimer = null
    hintCells.value = new Set()
  }, 1000)
}

function shuffleBoard() {
  if (won.value || locked.value) return
  const idxs = []
  board.value.forEach((v, i) => {
    if (v) idxs.push(i)
  })
  if (!idxs.length) return

  const values = idxs.map(i => board.value[i])
  for (let attempt = 0; attempt < 120; attempt++) {
    shuffleArr(values)
    const next = board.value.slice()
    idxs.forEach((i, k) => {
      next[i] = values[k]
    })
    board.value = next
    if (findAnyPair()) break
  }

  first.value = -1
  message.value = ''
  hintCells.value = new Set()
  clearTimeout(hintTimer)
  hintTimer = null
}

function startWith(key) {
  level.value = key
  restart()
}

function restart() {
  stopTimer()
  clearTimeout(pendingTimer)
  pendingTimer = null
  clearTimeout(hintTimer)
  hintTimer = null

  locked.value = false
  won.value = false
  first.value = -1
  score.value = 0
  elapsed.value = 0
  message.value = ''
  messageType.value = 'ok'
  pathCells.value = new Set()
  hintCells.value = new Set()

  const { rows, cols: c, kinds } = dim.value
  const perKind = (rows * c) / kinds
  const deck = []
  for (let k = 0; k < kinds; k++) {
    for (let j = 0; j < perKind; j++) deck.push(POOL[k % POOL.length])
  }

  board.value = shuffleArr(deck)
  ensureSolvable()
  best.value = Number(localStorage.getItem('match-best') || 0)
}

onBeforeUnmount(() => {
  stopTimer()
  clearTimeout(pendingTimer)
  clearTimeout(hintTimer)
})

restart()
</script>
