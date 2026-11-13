<template>
  <div>
    <div class="panel">
      <div class="row spread">
        <div class="score-box">
          <span class="lb">得分</span>
          <b>{{ score }}</b>
        </div>
        <div class="score-box">
          <span class="lb">最高分</span>
          <b>{{ best }}</b>
        </div>
        <button class="btn primary" @click="newGame">新游戏</button>
      </div>
      <p class="hint">方向键 / WASD 移动，触屏可滑动。相同数字相碰合并，凑出 2048！</p>
    </div>

    <div class="panel center">
      <div class="board" @touchstart.passive="onTouchStart" @touchend.passive="onTouchEnd">
        <div v-for="(v, i) in board" :key="i" class="cell" :class="cellCls(v)">
          <span v-if="v">{{ v }}</span>
        </div>
      </div>
      <div v-if="over || won" class="overlay">
        <div class="overlay-card">
          <div class="ov-title">{{ won ? '🎉 达成 2048！' : '游戏结束' }}</div>
          <div class="ov-score">本局得分 {{ score }}</div>
          <button class="btn primary" @click="newGame">再来一局</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

const N = 4
const board = ref(Array(N * N).fill(0))
const score = ref(0)
const best = ref(Number(localStorage.getItem('game2048-best') || 0))
const over = ref(false)
const won = ref(false)

function cellCls(v) {
  if (!v) return 'empty'
  return v > 2048 ? 'super' : 'v' + v
}

const idx = (r, c) => r * N + c

function addRandom() {
  const empty = []
  board.value.forEach((v, i) => {
    if (!v) empty.push(i)
  })
  if (!empty.length) return
  board.value[empty[Math.floor(Math.random() * empty.length)]] = Math.random() < 0.9 ? 2 : 4
}

// 压缩 + 合并一行（朝索引 0 方向滑动）
function slideLine(line) {
  const arr = line.filter(v => v)
  const out = []
  let gained = 0
  for (let i = 0; i < arr.length; i++) {
    if (i + 1 < arr.length && arr[i] === arr[i + 1]) {
      const merged = arr[i] * 2
      out.push(merged)
      gained += merged
      if (merged >= 2048) won.value = true
      i++
    } else {
      out.push(arr[i])
    }
  }
  while (out.length < N) out.push(0)
  return { out, gained }
}

function move(dir) {
  if (over.value) return
  const b = board.value.slice()
  let changed = false
  let gained = 0

  for (let k = 0; k < N; k++) {
    const line = []
    for (let j = 0; j < N; j++) {
      if (dir === 'l') line.push(b[idx(k, j)])
      else if (dir === 'r') line.push(b[idx(k, N - 1 - j)])
      else if (dir === 'u') line.push(b[idx(j, k)])
      else line.push(b[idx(N - 1 - j, k)])
    }
    const { out, gained: g } = slideLine(line)
    gained += g
    for (let j = 0; j < N; j++) {
      const pos =
        dir === 'l' ? idx(k, j)
        : dir === 'r' ? idx(k, N - 1 - j)
        : dir === 'u' ? idx(j, k)
        : idx(N - 1 - j, k)
      if (b[pos] !== out[j]) changed = true
      b[pos] = out[j]
    }
  }

  if (!changed) return
  board.value = b
  score.value += gained
  if (score.value > best.value) {
    best.value = score.value
    localStorage.setItem('game2048-best', String(best.value))
  }
  addRandom()
  if (!canMove()) over.value = true
}

function canMove() {
  const b = board.value
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const v = b[idx(r, c)]
      if (!v) return true
      if (c + 1 < N && b[idx(r, c + 1)] === v) return true
      if (r + 1 < N && b[idx(r + 1, c)] === v) return true
    }
  }
  return false
}

function newGame() {
  board.value = Array(N * N).fill(0)
  score.value = 0
  over.value = false
  won.value = false
  addRandom()
  addRandom()
}

const KEYMAP = {
  ArrowLeft: 'l', ArrowRight: 'r', ArrowUp: 'u', ArrowDown: 'd',
  a: 'l', d: 'r', w: 'u', s: 'd',
  A: 'l', D: 'r', W: 'u', S: 'd'
}

function onKey(e) {
  const dir = KEYMAP[e.key]
  if (!dir) return
  e.preventDefault()
  move(dir)
}

let touchX = 0
let touchY = 0
function onTouchStart(e) {
  touchX = e.touches[0].clientX
  touchY = e.touches[0].clientY
}
function onTouchEnd(e) {
  const dx = e.changedTouches[0].clientX - touchX
  const dy = e.changedTouches[0].clientY - touchY
  if (Math.max(Math.abs(dx), Math.abs(dy)) < 24) return
  if (Math.abs(dx) > Math.abs(dy)) move(dx > 0 ? 'r' : 'l')
  else move(dy > 0 ? 'd' : 'u')
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => window.removeEventListener('keydown', onKey))

newGame()
</script>

<style scoped>
.spread {
  justify-content: space-between;
}

.score-box {
  background: var(--panel2);
  border-radius: 8px;
  padding: 6px 16px;
  text-align: center;
  min-width: 78px;
}

.score-box .lb {
  display: block;
  font-size: 12px;
  color: var(--muted);
}

.score-box b {
  font-size: 20px;
  font-variant-numeric: tabular-nums;
}

.board {
  position: relative;
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 10px;
  background: #bbada0;
  padding: 10px;
  border-radius: 10px;
  max-width: 420px;
  margin: 0 auto;
  touch-action: none;
  user-select: none;
}

.cell {
  aspect-ratio: 1;
  border-radius: 6px;
  background: rgba(238, 228, 218, 0.35);
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: clamp(18px, 5vw, 30px);
  font-variant-numeric: tabular-nums;
  transition: transform 0.08s ease;
}

.v2 { background: #eee4da; color: #776e65; }
.v4 { background: #ede0c8; color: #776e65; }
.v8 { background: #f2b179; color: #fff; }
.v16 { background: #f59563; color: #fff; }
.v32 { background: #f67c5f; color: #fff; }
.v64 { background: #f65e3b; color: #fff; }
.v128 { background: #edcf72; color: #fff; }
.v256 { background: #edcc61; color: #fff; }
.v512 { background: #edc850; color: #fff; }
.v1024 { background: #edc53f; color: #fff; }
.v2048 { background: #edc22e; color: #fff; }
.super { background: #3c3a32; color: #fff; }

.overlay {
  position: absolute;
  inset: 0;
  background: rgba(255, 255, 255, 0.45);
  border-radius: var(--radius);
  display: flex;
  align-items: center;
  justify-content: center;
}

.overlay-card {
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 22px 34px;
  text-align: center;
  box-shadow: 0 8px 30px rgba(0, 0, 0, 0.15);
}

.ov-title {
  font-size: 20px;
  font-weight: 700;
}

.ov-score {
  color: var(--muted);
  margin: 8px 0 14px;
}
</style>
