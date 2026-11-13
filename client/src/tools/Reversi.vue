<template>
  <div>
    <div class="panel">
      <div class="row">
        <select v-model="mode" @change="restart">
          <option value="ai">人机对战</option>
          <option value="pvp">双人对战</option>
        </select>
        <select v-if="mode === 'ai'" v-model.number="humanSide" @change="restart">
          <option :value="1">你执黑（先行）</option>
          <option :value="2">你执白（后行）</option>
        </select>
        <select v-if="mode === 'ai'" v-model="difficulty" @change="restart">
          <option value="easy">难度：简单</option>
          <option value="normal">难度：普通</option>
          <option value="hard">难度：困难</option>
        </select>
        <button class="btn primary" @click="restart">重新开始</button>
        <button class="btn" :disabled="!canUndo" @click="undo">悔棋</button>
      </div>
      <div class="row" style="margin-top: 10px">
        <span class="pill">{{ turnText }}</span>
        <span class="pill">黑 {{ blackCount }} · 白 {{ whiteCount }}</span>
        <span class="pill">步数 {{ history.length }}</span>
        <span
          v-if="notice"
          class="pill"
          style="background: var(--lilac-soft); color: var(--lilac-ink)"
        >{{ notice }}</span>
      </div>
      <p v-if="gameOver" class="ok">{{ resultText }}</p>
      <p v-else class="hint">点击半透明圆点落子，被夹住的对方棋子会在八个方向上自动翻转。无合法落点的一方自动跳过。</p>
    </div>

    <div class="panel">
      <div class="stats-grid">
        <div class="stat"><b>{{ blackCount }}</b><span>黑棋</span></div>
        <div class="stat"><b>{{ whiteCount }}</b><span>白棋</span></div>
        <div class="stat"><b>{{ turnLabel }}</b><span>当前轮次</span></div>
        <div class="stat"><b>{{ history.length }}</b><span>已走步数</span></div>
      </div>
    </div>

    <div class="panel center">
      <div
        style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 3px; width: 100%; max-width: 440px; margin: 0 auto; padding: 10px; border-radius: 12px; background: #8b9d94; user-select: none; touch-action: manipulation; box-shadow: inset 0 2px 10px rgba(56, 51, 47, 0.18)"
      >
        <div v-for="(v, i) in flat" :key="i" :style="cellStyle(i)" @click="onCell(i)">
          <div v-if="v" :style="stoneStyle(v)"></div>
          <div
            v-else-if="hints.has(i)"
            style="width: 26%; height: 26%; border-radius: 50%; background: rgba(56, 51, 47, 0.3)"
          ></div>
          <div
            v-if="v && lastKey === i"
            style="position: absolute; left: 50%; top: 50%; width: 16%; height: 16%; margin: -8% 0 0 -8%; border-radius: 50%; background: #c89ba4"
          ></div>
        </div>
      </div>
      <p class="hint">黑白棋：落子必须夹住对方的棋子，可横、竖、斜共八个方向同时翻转；双方都无子可落时对局结束。</p>
    </div>

    <div class="panel">
      <div class="panel-title">历史步骤</div>
      <div style="display: flex; flex-wrap: wrap; gap: 6px; max-height: 130px; overflow-y: auto">
        <span v-for="(m, i) in history" :key="i" class="pill" style="font-weight: 500">
          {{ i + 1 }}. {{ m.player === 1 ? '⚫' : '⚪' }} {{ coord(m) }}
        </span>
        <span v-if="!history.length" class="hint" style="margin: 0">还没有落子</span>
      </div>
      <div class="kv" style="margin-top: 10px">
        <span>人机累计战绩</span>
        <b>胜 {{ record.win }} · 负 {{ record.lose }} · 和 {{ record.draw }}</b>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'

const N = 8
const DIRS = [
  [-1, -1],
  [-1, 0],
  [-1, 1],
  [0, -1],
  [0, 1],
  [1, -1],
  [1, 0],
  [1, 1]
]

const board = ref(makeBoard())
const current = ref(1)
const history = ref([])
const mode = ref('ai')
const humanSide = ref(1)
const difficulty = ref('normal')
const gameOver = ref(false)
const winner = ref(0)
const thinking = ref(false)
const notice = ref('')
const record = ref(loadRecord())

let aiTimer = null

const flat = computed(() => board.value.flat())

const blackCount = computed(() => countStones(1))
const whiteCount = computed(() => countStones(2))

const lastKey = computed(() => {
  const m = history.value[history.value.length - 1]
  return m ? m.r * N + m.c : -1
})

const hints = computed(() => {
  if (gameOver.value) return new Set()
  if (mode.value === 'ai' && current.value !== humanSide.value) return new Set()
  return new Set(legalMoves(current.value).map(m => m.r * N + m.c))
})

const canUndo = computed(() => {
  if (gameOver.value || !history.value.length) return false
  if (mode.value !== 'ai') return true
  return history.value.some(m => m.player === humanSide.value)
})

const turnText = computed(() => {
  if (gameOver.value) return '对局结束'
  const side = current.value === 1 ? '⚫ 黑方' : '⚪ 白方'
  if (mode.value !== 'ai') return side + '落子'
  if (thinking.value) return side + '（电脑思考中…）'
  return side + (current.value === humanSide.value ? '（你）落子' : '（电脑）落子')
})

const turnLabel = computed(() => {
  if (gameOver.value) return '结束'
  if (mode.value === 'ai' && thinking.value) return '电脑'
  return current.value === 1 ? '黑方' : '白方'
})

const resultText = computed(() => {
  const b = blackCount.value
  const w = whiteCount.value
  const base =
    winner.value === 0
      ? '平局（黑 ' + b + ' : 白 ' + w + '）'
      : (winner.value === 1 ? '⚫ 黑方获胜' : '⚪ 白方获胜') + '（黑 ' + b + ' : 白 ' + w + '）'
  if (mode.value !== 'ai') return base
  const mine = winner.value === 0 ? '平局' : winner.value === humanSide.value ? '你赢了！' : '你输了'
  return base + ' · ' + mine
})

function makeBoard() {
  const b = Array.from({ length: N }, () => new Array(N).fill(0))
  b[3][3] = 2
  b[4][4] = 2
  b[3][4] = 1
  b[4][3] = 1
  return b
}

function inB(r, c) {
  return r >= 0 && r < N && c >= 0 && c < N
}

function loadRecord() {
  try {
    const raw = JSON.parse(localStorage.getItem('reversi-score') || 'null')
    if (raw && typeof raw === 'object') {
      return {
        win: Number(raw.win) || 0,
        lose: Number(raw.lose) || 0,
        draw: Number(raw.draw) || 0
      }
    }
  } catch (e) {
    // 记录损坏时重新开始统计
  }
  return { win: 0, lose: 0, draw: 0 }
}

function countStones(player) {
  let n = 0
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      if (board.value[r][c] === player) n++
    }
  }
  return n
}

// 计算在 (r,c) 落子后能翻转的棋子坐标
function flipsFor(b, r, c, player) {
  if (b[r][c] !== 0) return []
  const out = []
  for (const [dr, dc] of DIRS) {
    let rr = r + dr
    let cc = c + dc
    const line = []
    while (inB(rr, cc) && b[rr][cc] === 3 - player) {
      line.push([rr, cc])
      rr += dr
      cc += dc
    }
    if (line.length && inB(rr, cc) && b[rr][cc] === player) {
      for (const p of line) out.push(p)
    }
  }
  return out
}

function legalMoves(player, b) {
  const bb = b || board.value
  const res = []
  for (let r = 0; r < N; r++) {
    for (let c = 0; c < N; c++) {
      const flips = flipsFor(bb, r, c, player)
      if (flips.length) res.push({ r, c, flips })
    }
  }
  return res
}

function coord(m) {
  return String.fromCharCode(97 + m.c) + (m.r + 1)
}

function cellStyle(i) {
  const playable = hints.value.has(i)
  return {
    position: 'relative',
    aspectRatio: '1',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '4px',
    background: '#a6bbb0',
    cursor: playable ? 'pointer' : 'default',
    transition: 'background 0.15s ease'
  }
}

function stoneStyle(player) {
  return {
    width: '82%',
    height: '82%',
    borderRadius: '50%',
    background: player === 1 ? '#3b3531' : '#fbf7f2',
    border: player === 1 ? '1px solid #2b2623' : '1px solid #ded3c9',
    boxShadow:
      player === 1
        ? '0 2px 4px rgba(56, 51, 47, 0.35), inset 0 -2px 4px rgba(255, 255, 255, 0.12)'
        : '0 2px 4px rgba(56, 51, 47, 0.22), inset 0 -2px 4px rgba(0, 0, 0, 0.06)',
    transition: 'background 0.25s ease, border-color 0.25s ease'
  }
}

function onCell(i) {
  const r = Math.floor(i / N)
  const c = i % N
  place(r, c)
}

function place(r, c) {
  if (gameOver.value || !inB(r, c)) return
  if (mode.value === 'ai' && current.value !== humanSide.value) return
  const flips = flipsFor(board.value, r, c, current.value)
  if (!flips.length) return

  const snapshot = {
    board: board.value.map(row => row.slice()),
    current: current.value
  }
  const b = board.value.map(row => row.slice())
  b[r][c] = current.value
  for (const [fr, fc] of flips) b[fr][fc] = current.value
  board.value = b
  history.value.push({ r, c, player: current.value, flips: flips.length, snapshot })
  notice.value = ''
  current.value = 3 - current.value
  advance()
}

function advance() {
  if (gameOver.value) return
  let guard = 0
  while (guard++ < 4) {
    if (legalMoves(current.value).length) break
    const other = 3 - current.value
    if (!legalMoves(other).length) {
      finish()
      return
    }
    notice.value = (current.value === 1 ? '黑方' : '白方') + '无合法落点，自动跳过'
    current.value = other
  }
  if (mode.value === 'ai' && current.value !== humanSide.value) scheduleAi()
}

function scheduleAi() {
  clearAi()
  if (gameOver.value) return
  if (mode.value !== 'ai' || current.value === humanSide.value) return
  thinking.value = true
  aiTimer = setTimeout(() => {
    aiTimer = null
    thinking.value = false
    if (gameOver.value) return
    if (mode.value !== 'ai' || current.value === humanSide.value) return
    const move = chooseAiMove()
    if (move) place(move.r, move.c)
  }, 340)
}

function simulate(move, player) {
  const b = board.value.map(row => row.slice())
  b[move.r][move.c] = player
  for (const [r, c] of move.flips) b[r][c] = player
  return b
}

// 角位 / 边位 / 角旁格的价值
function positional(r, c) {
  const rowEdge = r === 0 || r === N - 1
  const colEdge = c === 0 || c === N - 1
  if (rowEdge && colEdge) return 120
  if (rowEdge || colEdge) return 24
  if ((r === 1 || r === N - 2) && (c === 1 || c === N - 2)) return -40
  if ((rowEdge && (c === 1 || c === N - 2)) || (colEdge && (r === 1 || r === N - 2))) return -20
  return 0
}

function chooseAiMove() {
  const player = current.value
  const moves = legalMoves(player)
  if (!moves.length) return null

  if (difficulty.value === 'easy') {
    return moves[Math.floor(Math.random() * moves.length)]
  }

  if (difficulty.value === 'normal') {
    let best = moves[0]
    let bestScore = -Infinity
    for (const m of moves) {
      const s = m.flips.length + positional(m.r, m.c) * 0.6 + Math.random() * 0.5
      if (s > bestScore) {
        bestScore = s
        best = m
      }
    }
    return best
  }

  let best = moves[0]
  let bestScore = -Infinity
  for (const m of moves) {
    const nb = simulate(m, player)
    const opp = 3 - player
    const replies = legalMoves(opp, nb)
    let oppBest = 0
    for (const om of replies) {
      const s = om.flips.length + positional(om.r, om.c) * 0.7
      if (s > oppBest) oppBest = s
    }
    let s = m.flips.length + positional(m.r, m.c) * 1.4
    if (!replies.length) s += 12
    else s -= oppBest * 0.85
    s += (legalMoves(player, nb).length - replies.length) * 0.8
    s += Math.random() * 0.6
    if (s > bestScore) {
      bestScore = s
      best = m
    }
  }
  return best
}

function finish() {
  gameOver.value = true
  thinking.value = false
  clearAi()
  const b = blackCount.value
  const w = whiteCount.value
  winner.value = b > w ? 1 : w > b ? 2 : 0
  if (mode.value === 'ai') {
    const rec = { ...record.value }
    if (winner.value === 0) rec.draw++
    else if (winner.value === humanSide.value) rec.win++
    else rec.lose++
    record.value = rec
    localStorage.setItem('reversi-score', JSON.stringify(rec))
  }
}

function undo() {
  if (!canUndo.value) return
  clearAi()
  thinking.value = false
  notice.value = ''
  let guard = 0
  while (history.value.length && guard++ < 4) {
    const entry = history.value.pop()
    board.value = entry.snapshot.board
    current.value = entry.snapshot.current
    if (mode.value !== 'ai') break
    if (current.value === humanSide.value) break
  }
  winner.value = 0
  if (mode.value === 'ai' && current.value !== humanSide.value) scheduleAi()
}

function clearAi() {
  if (aiTimer) {
    clearTimeout(aiTimer)
    aiTimer = null
  }
}

function restart() {
  clearAi()
  board.value = makeBoard()
  current.value = 1
  history.value = []
  gameOver.value = false
  winner.value = 0
  thinking.value = false
  notice.value = ''
  advance()
}

restart()

onBeforeUnmount(clearAi)
</script>
