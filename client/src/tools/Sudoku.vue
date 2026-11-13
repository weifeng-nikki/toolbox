<template>
  <div>
    <div class="panel">
      <div class="row">
        <select v-model="difficulty" :disabled="generating" @change="newGame">
          <option value="easy">简单 · 40 空</option>
          <option value="normal">普通 · 50 空</option>
          <option value="hard">困难 · 56 空</option>
        </select>
        <button class="btn primary" :disabled="generating" @click="newGame">
          {{ generating ? '生成中…' : '新一局' }}
        </button>
        <button class="btn" :disabled="generating" @click="check">检查</button>
        <button class="btn" :disabled="generating || hintsLeft === 0 || finished" @click="hint">
          提示（{{ hintsLeft }}）
        </button>
        <span class="pill">⏱ {{ timeText }}</span>
      </div>
      <p class="hint">
        点选格子后用键盘 1-9 填数，Backspace / 0 清除；红色表示同行、同列或同宫重复。
      </p>
      <p v-if="message" :class="messageType">{{ message }}</p>
    </div>

    <div class="panel">
      <div class="board">
        <button
          v-for="(v, i) in board"
          :key="i"
          type="button"
          class="cell"
          :class="cellClass(i)"
          @click="selected = i"
        >
          {{ v || '' }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const BLANKS = { easy: 40, normal: 50, hard: 56 }

const difficulty = ref('easy')
const puzzle = ref(new Array(81).fill(0))
const solution = ref(new Array(81).fill(0))
const board = ref(new Array(81).fill(0))
const selected = ref(-1)
const hintsLeft = ref(3)
const finished = ref(false)
const generating = ref(false)
const message = ref('')
const messageType = ref('err')
const elapsed = ref(0)

let ticker = null
let startedAt = 0
let genTimer = null

const timeText = computed(() => fmt(elapsed.value))

const conflicts = computed(() => {
  const out = new Set()
  const groups = []
  for (let r = 0; r < 9; r++) {
    const g = []
    for (let c = 0; c < 9; c++) g.push(r * 9 + c)
    groups.push(g)
  }
  for (let c = 0; c < 9; c++) {
    const g = []
    for (let r = 0; r < 9; r++) g.push(r * 9 + c)
    groups.push(g)
  }
  for (let b = 0; b < 9; b++) {
    const g = []
    const br = Math.floor(b / 3) * 3
    const bc = (b % 3) * 3
    for (let dr = 0; dr < 3; dr++) {
      for (let dc = 0; dc < 3; dc++) g.push((br + dr) * 9 + bc + dc)
    }
    groups.push(g)
  }
  for (const g of groups) {
    const map = new Map()
    for (const i of g) {
      const v = board.value[i]
      if (!v) continue
      if (!map.has(v)) map.set(v, [])
      map.get(v).push(i)
    }
    for (const arr of map.values()) {
      if (arr.length > 1) arr.forEach(i => out.add(i))
    }
  }
  return out
})

function fmt(sec) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[arr[i], arr[j]] = [arr[j], arr[i]]
  }
  return arr
}

function boxOf(r, c) {
  return Math.floor(r / 3) * 3 + Math.floor(c / 3)
}

function bitCount(x) {
  let n = 0
  while (x) {
    x &= x - 1
    n++
  }
  return n
}

// 随机回溯生成一个合法终盘
function generateSolution() {
  const grid = new Array(81).fill(0)
  const rows = new Array(9).fill(0)
  const cols = new Array(9).fill(0)
  const boxes = new Array(9).fill(0)

  function fill(pos) {
    if (pos === 81) return true
    const r = (pos / 9) | 0
    const c = pos % 9
    const b = boxOf(r, c)
    const cand = shuffle([1, 2, 3, 4, 5, 6, 7, 8, 9])
    for (const v of cand) {
      const bit = 1 << (v - 1)
      if ((rows[r] | cols[c] | boxes[b]) & bit) continue
      grid[pos] = v
      rows[r] |= bit
      cols[c] |= bit
      boxes[b] |= bit
      if (fill(pos + 1)) return true
      grid[pos] = 0
      rows[r] &= ~bit
      cols[c] &= ~bit
      boxes[b] &= ~bit
    }
    return false
  }

  fill(0)
  return grid
}

// 回溯 + 计数求解，找到 limit 个解即提前退出
function countSolutions(source, limit = 2) {
  const grid = source.slice()
  const rows = new Array(9).fill(0)
  const cols = new Array(9).fill(0)
  const boxes = new Array(9).fill(0)

  for (let i = 0; i < 81; i++) {
    const v = grid[i]
    if (!v) continue
    const r = (i / 9) | 0
    const c = i % 9
    const b = boxOf(r, c)
    const bit = 1 << (v - 1)
    if ((rows[r] | cols[c] | boxes[b]) & bit) return 0
    rows[r] |= bit
    cols[c] |= bit
    boxes[b] |= bit
  }

  let count = 0

  function dfs() {
    if (count >= limit) return
    let idx = -1
    let mask = 0
    let best = 10
    for (let i = 0; i < 81; i++) {
      if (grid[i]) continue
      const r = (i / 9) | 0
      const c = i % 9
      const m = ~(rows[r] | cols[c] | boxes[boxOf(r, c)]) & 0x1ff
      const n = bitCount(m)
      if (n === 0) return
      if (n < best) {
        best = n
        idx = i
        mask = m
        if (n === 1) break
      }
    }
    if (idx === -1) {
      count++
      return
    }
    const r = (idx / 9) | 0
    const c = idx % 9
    const b = boxOf(r, c)
    for (let v = 1; v <= 9; v++) {
      const bit = 1 << (v - 1)
      if (!(mask & bit)) continue
      grid[idx] = v
      rows[r] |= bit
      cols[c] |= bit
      boxes[b] |= bit
      dfs()
      grid[idx] = 0
      rows[r] &= ~bit
      cols[c] &= ~bit
      boxes[b] &= ~bit
      if (count >= limit) return
    }
  }

  dfs()
  return count
}

// 按难度挖空，每次挖空都校验唯一解
function makePuzzle(sol, targetBlanks) {
  const out = sol.slice()
  const order = shuffle([...Array(81).keys()])
  let blanks = 0
  for (const i of order) {
    if (blanks >= targetBlanks) break
    const backup = out[i]
    out[i] = 0
    if (countSolutions(out, 2) === 1) blanks++
    else out[i] = backup
  }
  return out
}

function newGame() {
  stopTimer()
  if (genTimer) {
    clearTimeout(genTimer)
    genTimer = null
  }
  generating.value = true
  finished.value = false
  message.value = ''
  selected.value = -1
  elapsed.value = 0
  puzzle.value = new Array(81).fill(0)
  board.value = new Array(81).fill(0)
  genTimer = setTimeout(() => {
    genTimer = null
    const sol = generateSolution()
    const p = makePuzzle(sol, BLANKS[difficulty.value])
    solution.value = sol
    puzzle.value = p
    board.value = p.slice()
    hintsLeft.value = 3
    generating.value = false
  }, 20)
}

function cellClass(i) {
  return {
    fixed: puzzle.value[i] !== 0,
    selected: selected.value === i,
    conflict: conflicts.value.has(i),
    br: i % 9 === 2 || i % 9 === 5,
    bb: ((i / 9) | 0) === 2 || ((i / 9) | 0) === 5
  }
}

function setCell(v) {
  if (generating.value || finished.value || selected.value < 0) return
  if (puzzle.value[selected.value]) return
  board.value[selected.value] = v
  message.value = ''
  if (v) startTimer()
}

function check() {
  if (generating.value) return
  const blanks = board.value.filter(v => !v).length
  if (blanks) {
    messageType.value = 'err'
    message.value = `还有 ${blanks} 格没有填完。`
    return
  }
  if (conflicts.value.size) {
    messageType.value = 'err'
    message.value = '有重复数字，请检查红色格子。'
    return
  }
  finished.value = true
  stopTimer()
  messageType.value = 'ok'
  message.value = `🎉 完成！用时 ${timeText.value}。`
}

function hint() {
  if (generating.value || finished.value || hintsLeft.value <= 0) return
  const empty = []
  board.value.forEach((v, i) => {
    if (!v) empty.push(i)
  })
  if (!empty.length) return
  const i = empty[Math.floor(Math.random() * empty.length)]
  board.value[i] = solution.value[i]
  selected.value = i
  hintsLeft.value--
  message.value = ''
  startTimer()
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

function onKey(e) {
  const t = e.target
  if (
    t &&
    (t.tagName === 'INPUT' ||
      t.tagName === 'TEXTAREA' ||
      t.tagName === 'SELECT' ||
      t.isContentEditable)
  ) {
    return
  }
  if (selected.value < 0) return
  if (/^[1-9]$/.test(e.key)) {
    e.preventDefault()
    setCell(Number(e.key))
  } else if (e.key === 'Backspace' || e.key === 'Delete' || e.key === '0') {
    e.preventDefault()
    setCell(0)
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  stopTimer()
  if (genTimer) clearTimeout(genTimer)
})

newGame()
</script>

<style scoped>
.board {
  display: grid;
  grid-template-columns: repeat(9, 1fr);
  grid-template-rows: repeat(9, 1fr);
  width: min(100%, 460px);
  aspect-ratio: 1;
  margin: 0 auto;
  border: 2px solid var(--border-strong);
  border-radius: var(--radius-sm);
  overflow: hidden;
  background: var(--panel);
}

.cell {
  display: grid;
  place-items: center;
  padding: 0;
  border: 0;
  border-right: 1px solid var(--border);
  border-bottom: 1px solid var(--border);
  background: var(--panel);
  color: var(--accent-ink);
  font-family: inherit;
  font-size: clamp(15px, 4.4vw, 23px);
  font-weight: 500;
  line-height: 1;
  cursor: pointer;
  transition: background 0.12s ease, color 0.12s ease;
}

.cell:hover {
  background: var(--tint-soft);
}

.cell.fixed {
  background: var(--panel2);
  color: var(--text);
  font-weight: 700;
}

.cell.br {
  border-right: 2px solid var(--border-strong);
}

.cell.bb {
  border-bottom: 2px solid var(--border-strong);
}

.cell:nth-child(9n) {
  border-right: none;
}

.cell:nth-child(n + 73) {
  border-bottom: none;
}

.cell.selected {
  background: var(--tint-soft);
  box-shadow: inset 0 0 0 2px var(--tint);
}

.cell.conflict {
  background: var(--rose-soft);
  color: var(--danger);
  font-weight: 700;
}
</style>
