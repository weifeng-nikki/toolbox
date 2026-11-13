<template>
  <div>
    <div class="panel">
      <div class="row">
        <select v-model="level">
          <option value="easy">初级 9×9 / 10 雷</option>
          <option value="mid">中级 16×16 / 40 雷</option>
          <option value="hard">高级 16×24 / 90 雷</option>
        </select>
        <button class="btn primary" @click="restart">重新开始</button>
        <button class="btn" :class="{ primary: flagMode }" @click="flagMode = !flagMode">
          {{ flagMode ? '🚩 插旗模式' : '⛏️ 挖开模式' }}
        </button>
        <span class="pill">💣 {{ mines - flags }}</span>
        <span class="pill">⏱️ {{ time }}s</span>
      </div>
      <p class="hint">左键挖开、右键插旗；手机可切换到插旗模式。首次点击必定安全。</p>
      <p v-if="state === 'win'" class="ok">🎉 通关！用时 {{ time }} 秒。</p>
      <p v-else-if="state === 'lost'" class="err">💥 踩到雷了，点「重新开始」再来一局。</p>
    </div>

    <div class="board-wrap">
      <div class="board" :style="{ gridTemplateColumns: `repeat(${cols}, 30px)` }" @contextmenu.prevent>
        <button
          v-for="(cell, i) in cells"
          :key="i"
          type="button"
          class="cell"
          :class="cellClass(cell)"
          @click="reveal(i)"
          @contextmenu.prevent="toggleFlag(i)"
        >
          {{ cellText(cell) }}
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const LEVELS = {
  easy: { rows: 9, cols: 9, mines: 10 },
  mid: { rows: 16, cols: 16, mines: 40 },
  hard: { rows: 16, cols: 24, mines: 90 }
}

const level = ref('easy')
const cells = ref([])
const state = ref('ready')
const time = ref(0)
const flagMode = ref(false)

let timer = null

const cols = computed(() => LEVELS[level.value].cols)
const mines = computed(() => LEVELS[level.value].mines)
const flags = computed(() => cells.value.filter(c => c.flag).length)

function restart() {
  stopTimer()
  const { rows, cols: c } = LEVELS[level.value]
  cells.value = Array.from({ length: rows * c }, () => ({
    mine: false,
    open: false,
    flag: false,
    near: 0
  }))
  state.value = 'ready'
  time.value = 0
}

function neighbors(i) {
  const { rows, cols: c } = LEVELS[level.value]
  const r = Math.floor(i / c)
  const col = i % c
  const out = []
  for (let dr = -1; dr <= 1; dr++) {
    for (let dc = -1; dc <= 1; dc++) {
      if (!dr && !dc) continue
      const nr = r + dr
      const nc = col + dc
      if (nr >= 0 && nr < rows && nc >= 0 && nc < c) out.push(nr * c + nc)
    }
  }
  return out
}

function placeMines(first) {
  const { rows, cols: c, mines: m } = LEVELS[level.value]
  const safe = new Set([first, ...neighbors(first)])
  const pool = []
  for (let i = 0; i < rows * c; i++) if (!safe.has(i)) pool.push(i)
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  pool.slice(0, m).forEach(i => {
    cells.value[i].mine = true
  })
  cells.value.forEach((cell, i) => {
    cell.near = cell.mine ? 0 : neighbors(i).filter(n => cells.value[n].mine).length
  })
}

function openCell(start) {
  const stack = [start]
  while (stack.length) {
    const i = stack.pop()
    const cell = cells.value[i]
    if (cell.open || cell.flag || cell.mine) continue
    cell.open = true
    if (cell.near === 0) {
      neighbors(i).forEach(n => {
        const nb = cells.value[n]
        if (!nb.open && !nb.flag && !nb.mine) stack.push(n)
      })
    }
  }
}

function reveal(i) {
  if (state.value === 'win' || state.value === 'lost') return
  if (flagMode.value) {
    toggleFlag(i)
    return
  }
  const cell = cells.value[i]
  if (!cell || cell.open || cell.flag) return
  if (state.value === 'ready') {
    placeMines(i)
    state.value = 'playing'
    startTimer()
  }
  if (cell.mine) {
    cell.open = true
    state.value = 'lost'
    stopTimer()
    cells.value.forEach(c => {
      if (c.mine) c.open = true
    })
    return
  }
  openCell(i)
  if (cells.value.every(c => c.mine || c.open)) {
    state.value = 'win'
    stopTimer()
  }
}

function toggleFlag(i) {
  if (state.value === 'win' || state.value === 'lost') return
  const cell = cells.value[i]
  if (!cell || cell.open) return
  cell.flag = !cell.flag
}

function cellText(cell) {
  if (cell.flag && !cell.open) return '🚩'
  if (!cell.open) return ''
  if (cell.mine) return '💣'
  return cell.near > 0 ? String(cell.near) : ''
}

function cellClass(cell) {
  return {
    open: cell.open,
    flag: cell.flag && !cell.open,
    mine: cell.open && cell.mine,
    [`n${cell.near}`]: cell.open && !cell.mine && cell.near > 0
  }
}

function startTimer() {
  stopTimer()
  timer = setInterval(() => {
    time.value++
  }, 1000)
}

function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

watch(level, restart)
onBeforeUnmount(stopTimer)
restart()
</script>

<style scoped>
.board-wrap {
  overflow-x: auto;
  padding: 4px 0 8px;
}

.board {
  display: grid;
  gap: 3px;
  width: max-content;
  margin: 0 auto;
}

.cell {
  width: 30px;
  height: 30px;
  padding: 0;
  display: grid;
  place-items: center;
  font-family: inherit;
  font-size: 14px;
  font-weight: 700;
  line-height: 1;
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 6px;
  background: linear-gradient(180deg, var(--panel), var(--panel2));
  cursor: pointer;
  transition: background 0.15s ease, border-color 0.15s ease;
}

.cell:hover:not(.open) {
  border-color: var(--tint);
}

.cell.open {
  background: var(--panel2);
  cursor: default;
}

.cell.flag {
  background: var(--tint-soft);
}

.cell.mine {
  background: #f3d8d8;
}

.n1 { color: #527080; }
.n2 { color: #566c5d; }
.n3 { color: #7e545c; }
.n4 { color: #63577a; }
.n5 { color: #8a5a3a; }
.n6 { color: #4a7a86; }
.n7 { color: #6b5a7a; }
.n8 { color: #6d5353; }

:root[data-theme='dark'] .cell.mine {
  background: #4e2323;
}
</style>
