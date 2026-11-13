<template>
  <div>
    <div class="panel">
      <div class="row">
        <select v-model="mode" @change="restart">
          <option value="pvp">双人对战</option>
          <option value="ai">人机对战（你执黑先行）</option>
        </select>
        <button class="btn primary" @click="restart">重新开始</button>
        <button class="btn" :disabled="!history.length" @click="undo">悔棋</button>
        <span class="pill">{{ turnText }}</span>
        <span class="pill">步数 {{ history.length }}</span>
      </div>
      <p v-if="winner" class="ok">{{ winner === 1 ? '⚫ 黑方获胜！' : '⚪ 白方获胜！' }}</p>
      <p v-else-if="draw" class="ok">棋盘已满，平局。</p>
      <p v-else class="hint">点击棋盘交叉点落子，横、竖、斜任意方向连成五子即获胜。</p>
    </div>

    <div class="panel board-panel">
      <canvas ref="canvas" width="600" height="600" class="board" @click="onClick"></canvas>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const SIZE = 15
const PX = 600
const PAD = 30
const GAP = (PX - PAD * 2) / (SIZE - 1)
const DIRS = [
  [0, 1],
  [1, 0],
  [1, 1],
  [1, -1]
]

const mode = ref('pvp')
const board = ref(makeEmpty())
const current = ref(1)
const history = ref([])
const winner = ref(0)
const winLine = ref([])
const draw = ref(false)
const canvas = ref(null)

let aiTimer = null

const turnText = computed(() => {
  if (winner.value) return '对局结束'
  if (draw.value) return '平局'
  const side = current.value === 1 ? '⚫ 黑方' : '⚪ 白方'
  if (mode.value === 'ai') return `${side}${current.value === 1 ? '（你）' : '（电脑）'}落子`
  return `${side}落子`
})

function makeEmpty() {
  return Array.from({ length: SIZE }, () => new Array(SIZE).fill(0))
}

function inBoard(r, c) {
  return r >= 0 && r < SIZE && c >= 0 && c < SIZE
}

function pointX(c) {
  return PAD + c * GAP
}

function pointY(r) {
  return PAD + r * GAP
}

function drawBoard() {
  const cv = canvas.value
  if (!cv) return
  const ctx = cv.getContext('2d')
  ctx.clearRect(0, 0, PX, PX)

  // 棋盘底色
  ctx.fillStyle = '#e9d7bd'
  ctx.fillRect(0, 0, PX, PX)

  // 格线
  ctx.strokeStyle = 'rgba(92, 70, 48, 0.62)'
  ctx.lineWidth = 1
  for (let i = 0; i < SIZE; i++) {
    ctx.beginPath()
    ctx.moveTo(pointX(0), pointY(i))
    ctx.lineTo(pointX(SIZE - 1), pointY(i))
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(pointX(i), pointY(0))
    ctx.lineTo(pointX(i), pointY(SIZE - 1))
    ctx.stroke()
  }

  // 外框
  ctx.lineWidth = 2
  ctx.strokeRect(pointX(0), pointY(0), GAP * (SIZE - 1), GAP * (SIZE - 1))

  // 星位
  ctx.fillStyle = 'rgba(92, 70, 48, 0.8)'
  for (const [r, c] of [[3, 3], [3, 11], [11, 3], [11, 11], [7, 7]]) {
    ctx.beginPath()
    ctx.arc(pointX(c), pointY(r), 3.5, 0, Math.PI * 2)
    ctx.fill()
  }

  // 棋子
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board.value[r][c]) drawStone(ctx, r, c, board.value[r][c])
    }
  }

  // 最后一手
  const last = history.value[history.value.length - 1]
  if (last && !winner.value) {
    ctx.beginPath()
    ctx.arc(pointX(last.c), pointY(last.r), GAP * 0.2, 0, Math.PI * 2)
    ctx.strokeStyle = last.player === 1 ? 'rgba(255, 255, 255, 0.9)' : 'rgba(56, 48, 40, 0.75)'
    ctx.lineWidth = 2
    ctx.stroke()
  }

  // 获胜五子高亮
  for (const m of winLine.value) {
    ctx.beginPath()
    ctx.arc(pointX(m.c), pointY(m.r), GAP * 0.46, 0, Math.PI * 2)
    ctx.strokeStyle = '#c2595f'
    ctx.lineWidth = 3
    ctx.stroke()
  }
}

function drawStone(ctx, r, c, player) {
  const x = pointX(c)
  const y = pointY(r)
  const rad = GAP * 0.42
  ctx.beginPath()
  ctx.arc(x, y, rad, 0, Math.PI * 2)
  ctx.fillStyle = player === 1 ? '#2c2825' : '#faf7f1'
  ctx.fill()
  ctx.lineWidth = 1.5
  ctx.strokeStyle = player === 1 ? '#1a1715' : '#b9ab99'
  ctx.stroke()
  if (player === 1) {
    ctx.beginPath()
    ctx.arc(x - rad * 0.3, y - rad * 0.35, rad * 0.25, 0, Math.PI * 2)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.22)'
    ctx.fill()
  }
}

function onClick(e) {
  if (winner.value || draw.value) return
  if (mode.value === 'ai' && current.value === 2) return
  const cv = canvas.value
  if (!cv) return
  const rect = cv.getBoundingClientRect()
  const x = ((e.clientX - rect.left) / rect.width) * PX
  const y = ((e.clientY - rect.top) / rect.height) * PX
  const c = Math.round((x - PAD) / GAP)
  const r = Math.round((y - PAD) / GAP)
  if (!inBoard(r, c)) return
  if (Math.hypot(x - pointX(c), y - pointY(r)) > GAP * 0.62) return
  place(r, c)
}

function place(r, c) {
  if (!inBoard(r, c) || board.value[r][c]) return
  if (winner.value || draw.value) return

  const player = current.value
  board.value[r][c] = player
  history.value.push({ r, c, player })

  const line = findWin(r, c, player)
  if (line) {
    winner.value = player
    winLine.value = line
    drawBoard()
    return
  }
  if (history.value.length === SIZE * SIZE) {
    draw.value = true
    drawBoard()
    return
  }

  current.value = 3 - player
  drawBoard()

  if (mode.value === 'ai' && current.value === 2) scheduleAi()
}

function findWin(r, c, player) {
  for (const [dr, dc] of DIRS) {
    const cells = [{ r, c }]
    for (const sign of [1, -1]) {
      let nr = r + dr * sign
      let nc = c + dc * sign
      while (inBoard(nr, nc) && board.value[nr][nc] === player) {
        cells.push({ r: nr, c: nc })
        nr += dr * sign
        nc += dc * sign
      }
    }
    if (cells.length >= 5) return cells
  }
  return null
}

function scheduleAi() {
  clearAi()
  aiTimer = setTimeout(() => {
    aiTimer = null
    aiMove()
  }, 260)
}

function aiMove() {
  if (winner.value || draw.value || current.value !== 2) return
  const move = chooseAiMove()
  if (move) place(move.r, move.c)
}

function chooseAiMove() {
  const stones = []
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (board.value[r][c]) stones.push({ r, c })
    }
  }
  if (!stones.length) return { r: 7, c: 7 }

  const seen = new Set()
  const candidates = []
  for (const s of stones) {
    for (let dr = -2; dr <= 2; dr++) {
      for (let dc = -2; dc <= 2; dc++) {
        const r = s.r + dr
        const c = s.c + dc
        if (!inBoard(r, c) || board.value[r][c]) continue
        const key = r * SIZE + c
        if (seen.has(key)) continue
        seen.add(key)
        candidates.push({ r, c })
      }
    }
  }
  if (!candidates.length) return null

  let best = candidates[0]
  let bestScore = -Infinity
  for (const { r, c } of candidates) {
    const own = pointScore(r, c, 2)
    const block = pointScore(r, c, 1)
    const center = 14 - (Math.abs(r - 7) + Math.abs(c - 7))
    const score = own + block * 1.15 + center * 0.5
    if (score > bestScore) {
      bestScore = score
      best = { r, c }
    }
  }
  return best
}

function pointScore(r, c, player) {
  let total = 0
  for (const [dr, dc] of DIRS) {
    let count = 1
    let open = 0
    for (const sign of [1, -1]) {
      let nr = r + dr * sign
      let nc = c + dc * sign
      while (inBoard(nr, nc) && board.value[nr][nc] === player) {
        count++
        nr += dr * sign
        nc += dc * sign
      }
      if (inBoard(nr, nc) && board.value[nr][nc] === 0) open++
    }
    total += patternScore(count, open)
  }
  return total
}

function patternScore(count, open) {
  if (count >= 5) return 1000000
  if (count === 4) return open >= 2 ? 120000 : open === 1 ? 12000 : 0
  if (count === 3) return open >= 2 ? 6000 : open === 1 ? 700 : 0
  if (count === 2) return open >= 2 ? 350 : open === 1 ? 60 : 0
  if (count === 1) return open >= 2 ? 20 : open === 1 ? 5 : 0
  return 0
}

function undo() {
  clearAi()
  if (!history.value.length) return
  winner.value = 0
  winLine.value = []
  draw.value = false

  const last = history.value[history.value.length - 1]
  let steps = mode.value === 'ai' ? 2 : 1
  if (mode.value === 'ai' && last.player === 1) steps = 1

  for (let k = 0; k < steps && history.value.length; k++) {
    const mv = history.value.pop()
    board.value[mv.r][mv.c] = 0
  }

  if (mode.value === 'ai') {
    current.value = 1
  } else {
    const rest = history.value[history.value.length - 1]
    current.value = rest ? 3 - rest.player : 1
  }
  drawBoard()
}

function restart() {
  clearAi()
  board.value = makeEmpty()
  current.value = 1
  history.value = []
  winner.value = 0
  winLine.value = []
  draw.value = false
  drawBoard()
}

function clearAi() {
  if (aiTimer) {
    clearTimeout(aiTimer)
    aiTimer = null
  }
}

onMounted(drawBoard)
onBeforeUnmount(clearAi)
</script>

<style scoped>
.board-panel {
  display: flex;
  justify-content: center;
}

.board {
  display: block;
  width: 100%;
  height: auto;
  max-width: 520px;
  border-radius: 10px;
  cursor: pointer;
  touch-action: manipulation;
  box-shadow: 0 10px 28px -16px rgba(56, 51, 47, 0.8);
}
</style>
