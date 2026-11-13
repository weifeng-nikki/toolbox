<template>
  <div>
    <div class="panel">
      <div class="row">
        <select v-model.number="size" @change="newGame">
          <option :value="3">3 × 3</option>
          <option :value="4">4 × 4</option>
          <option :value="5">5 × 5</option>
        </select>
        <button class="btn primary" @click="newGame">重新打乱</button>
        <button class="btn" :class="{ primary: mode === 'number' }" @click="switchMode('number')">
          数字模式
        </button>
        <button class="btn" :class="{ primary: mode === 'image' }" @click="switchMode('image')">
          图片模式
        </button>
        <label class="btn" style="position: relative; overflow: hidden">
          上传图片
          <input
            ref="fileInput"
            type="file"
            accept="image/*"
            style="position: absolute; inset: 0; opacity: 0; cursor: pointer"
            @change="onFile"
          />
        </label>
      </div>
      <div class="row" style="margin-top: 10px">
        <span class="pill">步数 {{ moves }}</span>
        <span class="pill">⏱ {{ timeText }}</span>
        <span class="pill">最佳 {{ best ? best + ' 步' : '—' }}</span>
        <span class="pill">{{ size }} × {{ size }}</span>
      </div>
      <p class="hint">
        点击与空格相邻的方块交换，也可用方向键移动空格（↑↓←→ 控制空格移动的方向）。图片模式会按 N×N 等分切块。
      </p>
      <p v-if="message" :class="messageType">{{ message }}</p>
    </div>

    <div class="panel">
      <div :style="boardStyle">
        <button
          v-for="(v, i) in board"
          :key="i"
          type="button"
          :style="tileStyle(i, v)"
          @click="clickTile(i)"
        >
          <span v-if="v && !(mode === 'image' && imageUrl)">{{ v }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const size = ref(3)
const board = ref([])
const moves = ref(0)
const elapsed = ref(0)
const best = ref(0)
const solved = ref(false)
const running = ref(false)
const mode = ref('number')
const imageUrl = ref('')
const message = ref('')
const messageType = ref('ok')
const fileInput = ref(null)

let ticker = null
let startedAt = 0

const blankIndex = computed(() => board.value.indexOf(0))
const timeText = computed(() => fmt(elapsed.value))

const boardStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${size.value}, 1fr)`,
  gap: '6px',
  width: '100%',
  maxWidth: (size.value === 3 ? 330 : size.value === 4 ? 420 : 500) + 'px',
  margin: '0 auto',
  padding: '10px',
  background: '#ece4dc',
  borderRadius: '14px',
  boxSizing: 'border-box',
  userSelect: 'none'
}))

function fmt(sec) {
  const m = Math.floor(sec / 60)
  const s = sec % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function isSolvedArray(arr) {
  for (let i = 0; i < arr.length - 1; i++) {
    if (arr[i] !== i + 1) return false
  }
  return arr[arr.length - 1] === 0
}

function neighborsOf(i, n) {
  const r = Math.floor(i / n)
  const c = i % n
  const out = []
  if (r > 0) out.push(i - n)
  if (r < n - 1) out.push(i + n)
  if (c > 0) out.push(i - 1)
  if (c < n - 1) out.push(i + 1)
  return out
}

function isMovableIndex(i) {
  const n = size.value
  const b = blankIndex.value
  if (b < 0 || i === b) return false
  const r1 = Math.floor(i / n)
  const c1 = i % n
  const r2 = Math.floor(b / n)
  const c2 = b % n
  return (r1 === r2 && Math.abs(c1 - c2) === 1) || (c1 === c2 && Math.abs(r1 - r2) === 1)
}

function loadBest() {
  best.value = Number(localStorage.getItem(`slide-best-${size.value}`) || 0)
}

function startTimer() {
  if (ticker) return
  running.value = true
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

function swap(i, j) {
  const arr = board.value.slice()
  const t = arr[i]
  arr[i] = arr[j]
  arr[j] = t
  board.value = arr
}

function newGame() {
  stopTimer()
  running.value = false
  solved.value = false
  moves.value = 0
  elapsed.value = 0
  message.value = ''
  messageType.value = 'ok'

  const n = size.value
  const arr = []
  for (let i = 1; i < n * n; i++) arr.push(i)
  arr.push(0)

  // 用随机合法走法打乱，保证一定可解
  let blank = arr.length - 1
  let prev = -1
  let guard = 0
  while (isSolvedArray(arr) && guard++ < 10) {
    const steps = n * n * 60 + 30
    for (let k = 0; k < steps; k++) {
      const cand = neighborsOf(blank, n).filter(x => x !== prev)
      const pick = cand[Math.floor(Math.random() * cand.length)]
      arr[blank] = arr[pick]
      arr[pick] = 0
      prev = blank
      blank = pick
    }
  }

  board.value = arr
  loadBest()
}

function checkSolved() {
  if (!isSolvedArray(board.value)) return
  if (running.value) {
    elapsed.value = Math.floor((Date.now() - startedAt) / 1000)
  }
  solved.value = true
  running.value = false
  stopTimer()

  const key = `slide-best-${size.value}`
  const saved = Number(localStorage.getItem(key) || 0)
  const isNew = !saved || moves.value < saved
  if (isNew) {
    best.value = moves.value
    try {
      localStorage.setItem(key, String(moves.value))
    } catch (e) {
      // 本地存储不可用时忽略
    }
  } else {
    best.value = saved
  }

  messageType.value = 'ok'
  message.value = isNew
    ? `完成！用了 ${moves.value} 步 / ${elapsed.value} 秒，刷新最佳纪录！`
    : `完成！用了 ${moves.value} 步 / ${elapsed.value} 秒，最佳 ${best.value} 步。`
}

function clickTile(i) {
  if (solved.value || !isMovableIndex(i)) return
  swap(i, blankIndex.value)
  moves.value++
  if (!running.value) startTimer()
  checkSolved()
}

function switchMode(m) {
  if (m === 'image' && !imageUrl.value) {
    messageType.value = 'err'
    message.value = '请先上传一张图片，再切换到图片模式。'
    return
  }
  mode.value = m
  message.value = ''
  messageType.value = 'ok'
}

function onFile(e) {
  const file = e.target.files && e.target.files[0]
  e.target.value = ''
  if (!file) return
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
  imageUrl.value = URL.createObjectURL(file)
  mode.value = 'image'
  message.value = ''
  messageType.value = 'ok'
}

function tileStyle(i, v) {
  const n = size.value
  const style = {
    aspectRatio: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 0,
    border: '1px solid #ece4dc',
    borderRadius: '10px',
    fontFamily: 'inherit',
    fontWeight: '700',
    fontSize: n === 5 ? 'clamp(14px, 4vw, 22px)' : n === 4 ? 'clamp(16px, 5vw, 26px)' : 'clamp(18px, 6vw, 32px)',
    lineHeight: '1',
    color: '#6b625c',
    backgroundColor: '#fbf8f5',
    cursor: 'pointer',
    overflow: 'hidden',
    transition: 'background-color 0.14s ease, box-shadow 0.14s ease, transform 0.14s ease'
  }

  if (!v) {
    style.backgroundColor = 'rgba(255, 255, 255, 0.28)'
    style.border = '1px dashed #ece4dc'
    style.cursor = 'default'
    return style
  }

  if (mode.value === 'image' && imageUrl.value) {
    const row = Math.floor((v - 1) / n)
    const col = (v - 1) % n
    style.backgroundColor = '#e7ded5'
    style.backgroundImage = `url(${imageUrl.value})`
    style.backgroundSize = `${n * 100}% ${n * 100}%`
    style.backgroundPosition = `${(col * 100) / (n - 1)}% ${(row * 100) / (n - 1)}%`
    style.backgroundRepeat = 'no-repeat'
    style.color = 'transparent'
    style.border = '1px solid rgba(255, 255, 255, 0.55)'
    style.borderRadius = '6px'
    return style
  }

  if (isMovableIndex(i)) {
    style.backgroundColor = '#f1ebe4'
    style.boxShadow = 'inset 0 0 0 2px #c0a8a0'
  }
  return style
}

const KEY_DIRS = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1]
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
  if (solved.value) return
  const d = KEY_DIRS[e.key]
  if (!d) return
  e.preventDefault()

  const n = size.value
  const b = blankIndex.value
  if (b < 0) return
  const r = Math.floor(b / n)
  const c = b % n
  const nr = r + d[0]
  const nc = c + d[1]
  if (nr < 0 || nr >= n || nc < 0 || nc >= n) return

  swap(nr * n + nc, b)
  moves.value++
  if (!running.value) startTimer()
  checkSolved()
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  stopTimer()
  if (imageUrl.value) URL.revokeObjectURL(imageUrl.value)
})

newGame()
</script>
