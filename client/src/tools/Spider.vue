<template>
  <div>
    <div class="panel">
      <div class="row">
        <select v-model.number="suitCount" @change="newGame">
          <option :value="1">1 种花色 · 简单</option>
          <option :value="2">2 种花色 · 普通</option>
          <option :value="4">4 种花色 · 困难</option>
        </select>
        <button class="btn primary" :disabled="!deck.length || won" @click="deal">
          发牌（剩 {{ deck.length }} 张）
        </button>
        <button class="btn" :disabled="won || !history.length" @click="undo">撤销</button>
        <button class="btn" @click="restart">重开</button>
        <button class="btn" @click="newGame">新一局</button>
      </div>
      <div class="row" style="margin-top: 10px">
        <span class="pill">分数 {{ score }}</span>
        <span class="pill">已收 {{ removed }} / 8 组</span>
        <span class="pill">步数 {{ moves }}</span>
        <span class="pill">用时 {{ timeText }}</span>
        <span class="pill">最佳 {{ best }}</span>
      </div>
      <p class="hint">
        点击选中一段同花色连续降序的牌，再点击目标列落下；只能压到点数大 1 的牌或空列上。
        某列凑齐同花色 K→A 共 13 张会自动收走。有空白列时不能发牌。
      </p>
      <p v-if="message" :class="messageType">{{ message }}</p>
    </div>

    <div class="panel" @click="clearSelection">
      <div style="overflow-x: auto; padding-bottom: 4px">
        <div :style="boardStyle">
          <div
            v-for="(col, c) in columns"
            :key="c"
            :style="colStyle"
            @click.stop="clickColumn(c)"
          >
            <div v-if="!col.length" :style="emptyStyle">空列</div>
            <div
              v-for="(card, i) in col"
              :key="card.id"
              :style="cardWrapStyle(c, i, col)"
              @click.stop="clickCard(c, i)"
            >
              <div :style="cardStyle(card, c, i)">
                <template v-if="card.faceUp">
                  <div :style="cornerStyle">
                    <span :style="rankStyle">{{ rankText(card.rank) }}</span>
                    <span :style="suitStyle">{{ card.suit }}</span>
                  </div>
                  <span :style="centerSuitStyle">{{ card.suit }}</span>
                  <div :style="cornerStyleBottom">
                    <span :style="rankStyle">{{ rankText(card.rank) }}</span>
                    <span :style="suitStyle">{{ card.suit }}</span>
                  </div>
                </template>
                <template v-else>
                  <div :style="backInnerStyle">◆</div>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="won" :style="overlayStyle">
        <div :style="overlayCardStyle">
          <div style="font-size: 20px; font-weight: 700">🎉 恭喜通关！</div>
          <p class="hint" style="margin: 8px 0 16px; font-size: 14px">
            用时 {{ timeText }} · 分数 {{ score }} · 最高 {{ best }}
          </p>
          <div class="row" style="justify-content: center">
            <button class="btn primary" @click.stop="newGame">再来一局</button>
            <button class="btn" @click.stop="restart">重开本局</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'

const suitCount = ref(1)
const columns = ref([])
const deck = ref([])
const score = ref(500)
const removed = ref(0)
const moves = ref(0)
const elapsed = ref(0)
const won = ref(false)
const history = ref([])
const selection = ref(null)
const message = ref('')
const messageType = ref('err')
const best = ref(500)

let timer = null
let msgTimer = null
let initialSnapshot = null

const boardStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(10, 58px)',
  gap: '10px',
  width: 'fit-content',
  padding: '10px',
  background: '#ece4dc',
  borderRadius: '10px',
  userSelect: 'none'
}

const colStyle = {
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  width: '58px',
  minHeight: '260px',
  paddingBottom: '8px'
}

const emptyStyle = {
  width: '58px',
  height: '82px',
  border: '1px dashed #d5c9be',
  borderRadius: '7px',
  background: 'rgba(255, 255, 255, 0.5)',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: '#a99e94',
  fontSize: '11px'
}

const cornerStyle = {
  position: 'absolute',
  top: '3px',
  left: '4px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center'
}

const cornerStyleBottom = {
  position: 'absolute',
  bottom: '3px',
  right: '4px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  transform: 'rotate(180deg)'
}

const rankStyle = {
  fontSize: '13px',
  fontWeight: '700',
  lineHeight: '1'
}

const suitStyle = {
  fontSize: '11px',
  lineHeight: '1.1'
}

const centerSuitStyle = {
  position: 'absolute',
  left: '50%',
  top: '50%',
  transform: 'translate(-50%, -50%)',
  fontSize: '25px',
  lineHeight: '1',
  opacity: 0.9
}

const backInnerStyle = {
  position: 'absolute',
  inset: '5px',
  border: '1px solid rgba(255, 255, 255, 0.45)',
  borderRadius: '4px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  color: 'rgba(255, 255, 255, 0.8)',
  fontSize: '16px'
}

const overlayStyle = {
  position: 'absolute',
  inset: 0,
  zIndex: 1000,
  background: 'rgba(255, 253, 251, 0.72)',
  backdropFilter: 'blur(3px)',
  borderRadius: '16px',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center'
}

const overlayCardStyle = {
  background: '#fffdfb',
  border: '1px solid #e0d8d0',
  borderRadius: '14px',
  padding: '24px 32px',
  textAlign: 'center',
  boxShadow: '0 18px 40px -18px rgba(56, 51, 47, 0.45)'
}

const timeText = computed(() => {
  const total = elapsed.value
  const m = Math.floor(total / 60)
  const s = total % 60
  return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0')
})

function isRed(suit) {
  return suit === '♥' || suit === '♦'
}

function rankText(rank) {
  if (rank === 1) return 'A'
  if (rank === 11) return 'J'
  if (rank === 12) return 'Q'
  if (rank === 13) return 'K'
  return String(rank)
}

function isSelected(c, i) {
  const sel = selection.value
  return !!sel && sel.col === c && i >= sel.index
}

function cardWrapStyle(c, i, col) {
  const selected = isSelected(c, i)
  return {
    position: 'relative',
    zIndex: selected ? 200 + i : i + 1,
    marginTop: i === 0 ? '0px' : col[i - 1].faceUp ? '-58px' : '-72px'
  }
}

function cardStyle(card, c, i) {
  const selected = isSelected(c, i)
  const style = {
    width: '58px',
    height: '82px',
    boxSizing: 'border-box',
    borderRadius: '7px',
    position: 'relative',
    cursor: 'pointer',
    userSelect: 'none',
    transition: 'transform 0.12s ease, box-shadow 0.12s ease'
  }
  if (card.faceUp) {
    style.background = '#fffdfb'
    style.border = '1px solid #e0d8d0'
    style.color = isRed(card.suit) ? '#c05f5e' : '#3f3a46'
    style.boxShadow = selected
      ? '0 0 0 2px #8fa9bd'
      : '0 1px 2px rgba(56, 51, 47, 0.12)'
  } else {
    style.background =
      'repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.22) 0 2px, transparent 2px 6px), linear-gradient(135deg, #8fa9bd, #a79bba)'
    style.border = '1px solid #7e93a6'
    style.boxShadow = '0 1px 2px rgba(56, 51, 47, 0.12)'
  }
  style.transform = selected ? 'translateY(-8px)' : 'none'
  return style
}

function loadBest(n) {
  try {
    const v = Number(localStorage.getItem('spider-best-' + n))
    return Number.isFinite(v) && v > 0 ? v : 500
  } catch (e) {
    return 500
  }
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const t = arr[i]
    arr[i] = arr[j]
    arr[j] = t
  }
}

function buildDeck(n) {
  const suits = n === 1 ? ['♠'] : n === 2 ? ['♠', '♥'] : ['♠', '♥', '♦', '♣']
  const copies = 8 / suits.length
  const cards = []
  let id = 0
  for (const suit of suits) {
    for (let c = 0; c < copies; c++) {
      for (let r = 1; r <= 13; r++) {
        cards.push({ id: id++, suit, rank: r, faceUp: false })
      }
    }
  }
  shuffle(cards)
  return cards
}

function cloneColumns(cols) {
  return cols.map(col => col.map(card => ({ ...card })))
}

function startTimer() {
  stopTimer()
  timer = setInterval(() => {
    elapsed.value++
  }, 1000)
}

function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function showMessage(text, type) {
  message.value = text
  messageType.value = type || 'err'
  if (msgTimer) clearTimeout(msgTimer)
  msgTimer = setTimeout(() => {
    message.value = ''
    msgTimer = null
  }, 2600)
}

function clearMessage() {
  if (msgTimer) {
    clearTimeout(msgTimer)
    msgTimer = null
  }
  message.value = ''
}

function resetState() {
  score.value = 500
  removed.value = 0
  moves.value = 0
  elapsed.value = 0
  won.value = false
  selection.value = null
  history.value = []
  clearMessage()
}

function newGame() {
  stopTimer()
  resetState()
  best.value = loadBest(suitCount.value)

  const all = buildDeck(suitCount.value)
  const cols = Array.from({ length: 10 }, () => [])
  for (let i = 0; i < 54; i++) {
    cols[i % 10].push(all[i])
  }
  cols.forEach(col => {
    col[col.length - 1].faceUp = true
  })

  columns.value = cols
  deck.value = all.slice(54)
  initialSnapshot = {
    columns: cloneColumns(cols),
    deck: deck.value.map(card => ({ ...card }))
  }
  startTimer()
}

function restart() {
  if (!initialSnapshot) {
    newGame()
    return
  }
  stopTimer()
  resetState()
  best.value = loadBest(suitCount.value)
  columns.value = cloneColumns(initialSnapshot.columns)
  deck.value = initialSnapshot.deck.map(card => ({ ...card }))
  startTimer()
}

function pushHistory() {
  history.value.push({
    columns: cloneColumns(columns.value),
    deck: deck.value.map(card => ({ ...card })),
    score: score.value,
    moves: moves.value,
    removed: removed.value
  })
}

function undo() {
  if (won.value || !history.value.length) return
  const last = history.value.pop()
  columns.value = last.columns
  deck.value = last.deck
  score.value = last.score
  moves.value = last.moves
  removed.value = last.removed
  selection.value = null
  clearMessage()
}

function clearSelection() {
  selection.value = null
}

function canPickUp(col, index) {
  const first = col[index]
  if (!first || !first.faceUp) return false
  for (let k = index; k < col.length; k++) {
    const card = col[k]
    if (!card.faceUp || card.suit !== first.suit) return false
    if (k > index && card.rank !== col[k - 1].rank - 1) return false
  }
  return true
}

function clickCard(c, i) {
  if (won.value) return
  if (selection.value) {
    if (selection.value.col === c) {
      selection.value = null
      return
    }
    attemptMove(c)
    return
  }
  const col = columns.value[c]
  const card = col[i]
  if (!card || !card.faceUp) {
    showMessage('暗牌不能移动，请从明牌中选取', 'err')
    return
  }
  if (!canPickUp(col, i)) {
    showMessage('只能移动同花色且连续降序的一段牌组', 'err')
    return
  }
  selection.value = { col: c, index: i }
  clearMessage()
}

function clickColumn(c) {
  if (won.value) return
  if (!selection.value) return
  attemptMove(c)
}

function collectRuns(c) {
  let count = 0
  const col = columns.value[c]
  while (col.length >= 13) {
    const start = col.length - 13
    const suit = col[start].suit
    let ok = true
    for (let k = 0; k < 13; k++) {
      const card = col[start + k]
      if (!card.faceUp || card.suit !== suit || card.rank !== 13 - k) {
        ok = false
        break
      }
    }
    if (!ok) break
    col.splice(start, 13)
    if (col.length && !col[col.length - 1].faceUp) {
      col[col.length - 1].faceUp = true
    }
    removed.value++
    score.value += 100
    count++
  }
  return count
}

function checkWin() {
  if (won.value || removed.value < 8) return
  won.value = true
  stopTimer()
  selection.value = null
  const key = 'spider-best-' + suitCount.value
  try {
    const prev = loadBest(suitCount.value)
    if (score.value > prev) {
      localStorage.setItem(key, String(score.value))
    }
  } catch (e) {
    // 本地存储不可用时忽略
  }
  best.value = Math.max(loadBest(suitCount.value), score.value)
}

function attemptMove(dest) {
  const sel = selection.value
  if (!sel) return
  if (dest === sel.col) {
    selection.value = null
    return
  }
  const source = columns.value[sel.col]
  const target = columns.value[dest]
  const moving = source[sel.index]
  if (!moving) {
    selection.value = null
    return
  }
  if (target.length) {
    const top = target[target.length - 1]
    if (!top.faceUp || top.rank !== moving.rank + 1) {
      showMessage('不能放在这里：只能压到点数大 1 的牌或空列上', 'err')
      return
    }
  }

  pushHistory()
  const picked = source.splice(sel.index)
  if (source.length && !source[source.length - 1].faceUp) {
    source[source.length - 1].faceUp = true
  }
  target.push(...picked)
  score.value = Math.max(0, score.value - 1)
  moves.value++
  selection.value = null
  clearMessage()

  const gained = collectRuns(dest)
  if (gained) {
    showMessage('收齐 ' + gained + ' 组，+' + gained * 100 + ' 分！', 'ok')
  }
  checkWin()
}

function deal() {
  if (won.value) return
  if (!deck.value.length) {
    showMessage('牌堆已空，无法继续发牌', 'err')
    return
  }
  if (columns.value.some(col => col.length === 0)) {
    showMessage('存在空白列，请先将空列填上牌再发牌', 'err')
    return
  }

  pushHistory()
  const cards = deck.value.splice(0, 10)
  cards.forEach((card, i) => {
    card.faceUp = true
    columns.value[i].push(card)
  })
  selection.value = null
  clearMessage()

  let gained = 0
  for (let c = 0; c < columns.value.length; c++) {
    gained += collectRuns(c)
  }
  if (gained) {
    showMessage('发牌后收齐 ' + gained + ' 组，+' + gained * 100 + ' 分！', 'ok')
  }
  checkWin()
}

newGame()

onBeforeUnmount(() => {
  stopTimer()
  if (msgTimer) {
    clearTimeout(msgTimer)
    msgTimer = null
  }
})
</script>
