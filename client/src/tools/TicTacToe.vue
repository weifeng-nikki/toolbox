<template>
  <div>
    <div class="panel">
      <div class="row">
        <div class="field" style="margin-bottom: 0">
          <label>对战模式</label>
          <select v-model="mode" @change="newRound">
            <option value="ai">人机对战</option>
            <option value="pvp">双人对战</option>
          </select>
        </div>
        <div v-if="mode === 'ai'" class="field" style="margin-bottom: 0">
          <label>先手</label>
          <select v-model="firstMode" @change="newRound">
            <option value="human">我先手</option>
            <option value="ai">电脑先手</option>
          </select>
        </div>
        <div v-if="mode === 'ai'" class="field" style="margin-bottom: 0">
          <label>难度</label>
          <select v-model="difficulty" @change="newRound">
            <option value="easy">简单（随机）</option>
            <option value="normal">普通（会有失误）</option>
            <option value="hard">困难（不败）</option>
          </select>
        </div>
      </div>
      <div class="row" style="margin-top: 12px">
        <button class="btn primary" @click="newRound">重开本局</button>
        <button class="btn" @click="resetScore">重置比分</button>
      </div>
      <p class="hint">{{ statusText }}</p>
    </div>

    <div class="panel">
      <div class="stats-grid">
        <div class="stat"><b>{{ score.win }}</b><span>{{ mode === 'ai' ? '胜' : 'X 胜' }}</span></div>
        <div class="stat"><b>{{ score.lose }}</b><span>{{ mode === 'ai' ? '负' : 'O 胜' }}</span></div>
        <div class="stat"><b>{{ score.draw }}</b><span>平局</span></div>
      </div>
    </div>

    <div class="panel center">
      <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; width: 100%; max-width: 330px; margin: 0 auto">
        <button v-for="(v, i) in board" :key="i" :style="cellStyle(i, v)" @click="play(i)">
          {{ v }}
        </button>
      </div>
      <p class="hint" style="margin-top: 14px">
        {{ mode === 'ai'
          ? '你执 ' + humanMark + '，电脑执 ' + aiMark + '。三子连成一线即获胜。'
          : 'X 先手，双方轮流在空格落子，三子连成一线即获胜。' }}
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'

const LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8],
  [0, 3, 6], [1, 4, 7], [2, 5, 8],
  [0, 4, 8], [2, 4, 6]
]

function loadScore() {
  try {
    const raw = JSON.parse(localStorage.getItem('ttt-score') || '{}')
    return {
      win: Number(raw.win) || 0,
      lose: Number(raw.lose) || 0,
      draw: Number(raw.draw) || 0
    }
  } catch (e) {
    return { win: 0, lose: 0, draw: 0 }
  }
}

const board = ref(Array(9).fill(''))
const mode = ref('ai')
const firstMode = ref('human')
const difficulty = ref('normal')
const turn = ref('X')
const ended = ref(false)
const isDraw = ref(false)
const winLine = ref([])
const winnerMark = ref('')
const score = ref(loadScore())

let aiTimer = null

const humanMark = computed(() => {
  if (mode.value === 'pvp') return 'X'
  return firstMode.value === 'human' ? 'X' : 'O'
})

const aiMark = computed(() => (humanMark.value === 'X' ? 'O' : 'X'))

const statusText = computed(() => {
  if (ended.value) {
    if (isDraw.value) return '平局，再来一局？'
    if (mode.value === 'ai') {
      return winnerMark.value === humanMark.value ? '你赢了！' : '电脑获胜，再接再厉！'
    }
    return winnerMark.value === 'X' ? '玩家 X 获胜！' : '玩家 O 获胜！'
  }
  if (mode.value === 'ai') {
    return turn.value === humanMark.value ? '轮到你落子（' + humanMark.value + '）' : '电脑思考中…'
  }
  return '轮到玩家 ' + turn.value + ' 落子'
})

function winnerOf(b) {
  for (const line of LINES) {
    const a = b[line[0]]
    if (a && a === b[line[1]] && a === b[line[2]]) return { mark: a, line }
  }
  return null
}

function saveScore() {
  localStorage.setItem('ttt-score', JSON.stringify(score.value))
}

function record(mark) {
  if (mark === null) {
    score.value.draw++
  } else if (mode.value === 'pvp') {
    if (mark === 'X') score.value.win++
    else score.value.lose++
  } else if (mark === humanMark.value) {
    score.value.win++
  } else {
    score.value.lose++
  }
  saveScore()
}

function minimax(b, maxing, ai, human, depth) {
  const w = winnerOf(b)
  if (w) return w.mark === ai ? 10 - depth : depth - 10
  if (b.every(v => v)) return 0

  let best = maxing ? -Infinity : Infinity
  for (let i = 0; i < 9; i++) {
    if (b[i]) continue
    b[i] = maxing ? ai : human
    const s = minimax(b, !maxing, ai, human, depth + 1)
    b[i] = ''
    best = maxing ? Math.max(best, s) : Math.min(best, s)
  }
  return best
}

function bestMove(b, ai, human) {
  let bestScore = -Infinity
  let move = -1
  for (let i = 0; i < 9; i++) {
    if (b[i]) continue
    b[i] = ai
    const s = minimax(b, false, ai, human, 1)
    b[i] = ''
    if (s > bestScore) {
      bestScore = s
      move = i
    }
  }
  return move
}

function chooseAiMove() {
  const empties = []
  board.value.forEach((v, i) => {
    if (!v) empties.push(i)
  })
  if (!empties.length) return -1

  if (difficulty.value === 'easy') {
    return empties[Math.floor(Math.random() * empties.length)]
  }
  if (difficulty.value === 'normal' && Math.random() < 0.3) {
    return empties[Math.floor(Math.random() * empties.length)]
  }
  const move = bestMove(board.value.slice(), aiMark.value, humanMark.value)
  return move >= 0 ? move : empties[0]
}

function scheduleAi() {
  clearTimeout(aiTimer)
  aiTimer = setTimeout(() => {
    if (ended.value) return
    if (mode.value !== 'ai' || turn.value !== aiMark.value) return
    const move = chooseAiMove()
    if (move >= 0) place(move, aiMark.value)
  }, 320)
}

function place(i, mark) {
  if (ended.value || board.value[i]) return
  board.value[i] = mark

  const w = winnerOf(board.value)
  if (w) {
    winLine.value = w.line
    winnerMark.value = w.mark
    ended.value = true
    record(w.mark)
    return
  }
  if (board.value.every(v => v)) {
    ended.value = true
    isDraw.value = true
    record(null)
    return
  }

  turn.value = mark === 'X' ? 'O' : 'X'
  if (mode.value === 'ai' && turn.value === aiMark.value) scheduleAi()
}

function play(i) {
  if (ended.value || board.value[i]) return
  if (mode.value === 'ai' && turn.value !== humanMark.value) return
  place(i, turn.value)
}

function newRound() {
  clearTimeout(aiTimer)
  board.value = Array(9).fill('')
  turn.value = 'X'
  ended.value = false
  isDraw.value = false
  winLine.value = []
  winnerMark.value = ''
  if (mode.value === 'ai' && aiMark.value === 'X') scheduleAi()
}

function resetScore() {
  score.value = { win: 0, lose: 0, draw: 0 }
  saveScore()
}

function cellStyle(i, v) {
  const style = {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    aspectRatio: '1',
    padding: 0,
    fontFamily: 'inherit',
    fontSize: 'clamp(26px, 8vw, 40px)',
    fontWeight: '700',
    lineHeight: '1',
    color: 'var(--text)',
    background: 'var(--panel2)',
    border: '1px solid var(--border)',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'background 0.15s ease, border-color 0.15s ease'
  }

  if (v === 'X') style.color = 'var(--blue-ink)'
  if (v === 'O') style.color = 'var(--rose-ink)'

  if (winLine.value.includes(i)) {
    style.background = 'var(--sage-soft)'
    style.borderColor = 'var(--accent)'
    style.boxShadow = 'inset 0 0 0 2px var(--accent)'
  }

  if (v || ended.value || (mode.value === 'ai' && turn.value !== humanMark.value)) {
    style.cursor = 'default'
  }
  return style
}

newRound()

onBeforeUnmount(() => {
  clearTimeout(aiTimer)
})
</script>
