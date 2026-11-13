<template>
  <div>
    <div class="panel">
      <div class="panel-title">空当接龙</div>
      <div class="row">
        <button class="btn primary" @click="newGame">新一局</button>
        <button class="btn" @click="restartDeal">重开本局</button>
        <button class="btn" :disabled="!canUndo" @click="undo">撤销</button>
        <span class="pill">步数 {{ moves }}</span>
        <span class="pill">用时 {{ timeText }}</span>
        <span class="pill">自由格剩余 {{ freeCellsLeft }}</span>
        <span class="pill">回收 {{ foundationTotal }} / 52</span>
        <span class="pill">最佳 {{ bestText }}</span>
        <span v-if="selectedCards.length" class="pill">
          已选 {{ selectedCards.length }} 张 · 上限 {{ maxMoveable }} 张
        </span>
      </div>
      <p class="hint">
        点击选中牌或牌组，再点击目标列 / 自由格 / 回收位落子；双击某张牌会自动尝试送往回收位，不能送则寻找合适的列；点击空白处取消选择。
        列内只能移动「红黑交替、连续降序」的一段牌，最大可移动张数 =（空列数 + 1）× 2<sup>空自由格数</sup>。
      </p>
      <p v-if="message" class="err">{{ message }}</p>
      <p v-if="won" class="ok">
        🎉 四个回收位已集齐！用时 {{ timeText }}，共 {{ moves }} 步。
        <span v-if="newRecord">新纪录！</span>
        <span v-else>最佳用时 {{ bestText }}。</span>
      </p>
    </div>

    <div class="panel" @click.self="clearSelection">
      <div class="panel-title">牌桌</div>
      <div :style="{ maxWidth: '540px', margin: '0 auto' }">
        <div :style="topAreaStyle">
          <div :style="groupStyle">
            <div
              v-for="(card, i) in freeView"
              :key="'free-' + i"
              :style="cardSlotStyle"
              @click="onFreeCellClick(i)"
            >
              <div v-if="!card" :style="freeSlotStyle">自由</div>
              <div v-else :style="faceStyle(isFreeSelected(i))" @dblclick.stop="onCardDblClick(card.id)">
                <div :style="cornerStyle(card.red)">
                  <span>{{ card.label }}</span>
                  <span style="font-size: 12px">{{ card.symbol }}</span>
                </div>
                <span :style="bigSuitStyle(card.red)">{{ card.symbol }}</span>
              </div>
            </div>
          </div>
          <div :style="groupStyle">
            <div
              v-for="f in foundationView"
              :key="'found-' + f.suit.key"
              :style="cardSlotStyle"
              @click="onFoundationClick(f.suit.key)"
            >
              <div v-if="!f.card" :style="foundationSlotStyle(f.suit.red)">{{ f.suit.symbol }}</div>
              <template v-else>
                <span :style="backLayerStyle"></span>
                <div :style="faceStyle(false)">
                  <div :style="cornerStyle(f.card.red)">
                    <span>{{ f.card.label }}</span>
                    <span style="font-size: 12px">{{ f.card.symbol }}</span>
                  </div>
                  <span :style="bigSuitStyle(f.card.red)">{{ f.card.symbol }}</span>
                </div>
              </template>
            </div>
          </div>
        </div>

        <div :style="boardStyle" @click.self="clearSelection">
          <div
            v-for="(col, ci) in columnsView"
            :key="'col-' + ci"
            :style="columnStyle"
            @click="onColumnClick(ci)"
          >
            <div v-if="!col.length" :style="emptyColumnStyle">空列</div>
            <div
              v-for="(card, i) in col"
              :key="card.id"
              :style="cardStyle(ci, i)"
              @click.stop="onCardClick(ci, i)"
              @dblclick.stop="onCardDblClick(card.id)"
            >
              <div :style="cornerStyle(card.red)">
                <span>{{ card.label }}</span>
                <span style="font-size: 12px">{{ card.symbol }}</span>
              </div>
              <span :style="bigSuitStyle(card.red)">{{ card.symbol }}</span>
            </div>
          </div>
        </div>

        <p class="hint center">
          <span style="color: #c05f5e">♥ ♦</span> 红色 ·
          <span style="color: #3f3a46">♠ ♣</span> 黑色 · 选中牌会上浮，虚线框为可放置的空位
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'

const SUITS = [
  { key: 'S', symbol: '♠', red: false },
  { key: 'H', symbol: '♥', red: true },
  { key: 'D', symbol: '♦', red: true },
  { key: 'C', symbol: '♣', red: false }
]

const RANK_LABELS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']

const ALL_CARDS = []
const CARD_MAP = {}
SUITS.forEach(suit => {
  for (let rank = 1; rank <= 13; rank++) {
    const card = {
      id: `${suit.key}${rank}`,
      suit: suit.key,
      symbol: suit.symbol,
      red: suit.red,
      rank,
      label: RANK_LABELS[rank]
    }
    ALL_CARDS.push(card)
    CARD_MAP[card.id] = card
  }
})

const columns = ref([[], [], [], [], [], [], [], []])
const freeCells = ref([null, null, null, null])
const foundationRank = ref({ S: 0, H: 0, D: 0, C: 0 })
const moves = ref(0)
const seconds = ref(0)
const bestTime = ref(0)
const won = ref(false)
const newRecord = ref(false)
const message = ref('')
const history = ref([])
const selected = ref(null)

let initialDeal = []
let timer = null

const columnsView = computed(() => columns.value.map(col => col.map(id => CARD_MAP[id])))
const freeView = computed(() => freeCells.value.map(id => (id ? CARD_MAP[id] : null)))
const foundationView = computed(() =>
  SUITS.map(suit => ({
    suit,
    card: foundationRank.value[suit.key]
      ? CARD_MAP[`${suit.key}${foundationRank.value[suit.key]}`]
      : null
  }))
)

const foundationTotal = computed(() =>
  SUITS.reduce((sum, suit) => sum + foundationRank.value[suit.key], 0)
)
const freeCellsLeft = computed(() => freeCells.value.filter(id => !id).length)
const emptyColumnCount = computed(() => columns.value.filter(col => col.length === 0).length)
const maxMoveable = computed(
  () => (emptyColumnCount.value + 1) * Math.pow(2, freeCellsLeft.value)
)

const selectedCards = computed(() => {
  const sel = selected.value
  if (!sel) return []
  if (sel.from === 'col') return columns.value[sel.col].slice(sel.start)
  return freeCells.value[sel.cell] ? [freeCells.value[sel.cell]] : []
})

const canUndo = computed(() => !won.value && history.value.length > 0)
const timeText = computed(() => formatTime(seconds.value))
const bestText = computed(() => (bestTime.value ? formatTime(bestTime.value) : '—'))

function formatTime(total) {
  const m = Math.floor(total / 60)
  const s = total % 60
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`
}

function startTimer() {
  if (timer) return
  timer = setInterval(() => {
    seconds.value++
  }, 1000)
}

function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function deal() {
  stopTimer()
  const deck = ALL_CARDS.map(card => card.id)
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = deck[i]
    deck[i] = deck[j]
    deck[j] = tmp
  }
  const counts = [7, 7, 7, 7, 6, 6, 6, 6]
  const next = [[], [], [], [], [], [], [], []]
  let k = 0
  for (let c = 0; c < 8; c++) {
    for (let n = 0; n < counts[c]; n++) {
      next[c].push(deck[k++])
    }
  }
  initialDeal = next.map(col => col.slice())
  resetTo(initialDeal)
}

function resetTo(cols) {
  stopTimer()
  columns.value = cols.map(col => col.slice())
  freeCells.value = [null, null, null, null]
  foundationRank.value = { S: 0, H: 0, D: 0, C: 0 }
  moves.value = 0
  seconds.value = 0
  won.value = false
  newRecord.value = false
  message.value = ''
  selected.value = null
  history.value = []
}

function newGame() {
  deal()
}

function restartDeal() {
  if (!initialDeal.length) return
  resetTo(initialDeal)
}

function pushSnapshot() {
  history.value.push({
    columns: columns.value.map(col => col.slice()),
    freeCells: freeCells.value.slice(),
    foundation: { ...foundationRank.value },
    moves: moves.value
  })
}

function undo() {
  if (won.value || !history.value.length) return
  const snap = history.value.pop()
  columns.value = snap.columns.map(col => col.slice())
  freeCells.value = snap.freeCells.slice()
  foundationRank.value = { ...snap.foundation }
  moves.value = snap.moves
  selected.value = null
  message.value = ''
}

function isRunFrom(colIdx, start) {
  const col = columns.value[colIdx]
  for (let i = start; i < col.length - 1; i++) {
    const a = CARD_MAP[col[i]]
    const b = CARD_MAP[col[i + 1]]
    if (a.red === b.red || a.rank !== b.rank + 1) return false
  }
  return true
}

function isCardSelected(colIdx, cardIdx) {
  const sel = selected.value
  return !!(sel && sel.from === 'col' && sel.col === colIdx && cardIdx >= sel.start)
}

function isFreeSelected(cellIdx) {
  const sel = selected.value
  return !!(sel && sel.from === 'free' && sel.cell === cellIdx)
}

function clearSelection() {
  selected.value = null
}

function selectFromColumn(colIdx, cardIdx) {
  if (!isRunFrom(colIdx, cardIdx)) {
    message.value = '只能选中「红黑交替、连续降序」的一段牌组'
    return
  }
  selected.value = { from: 'col', col: colIdx, start: cardIdx }
  message.value = ''
}

function removeSelected() {
  const sel = selected.value
  if (sel.from === 'col') {
    columns.value[sel.col] = columns.value[sel.col].slice(0, sel.start)
  } else {
    freeCells.value[sel.cell] = null
  }
}

function onCardClick(colIdx, cardIdx) {
  if (won.value) return
  const sel = selected.value
  if (sel && sel.from === 'col' && sel.col === colIdx) {
    if (cardIdx >= sel.start) {
      clearSelection()
      return
    }
    selectFromColumn(colIdx, cardIdx)
    return
  }
  if (sel) {
    moveToColumn(colIdx)
    return
  }
  selectFromColumn(colIdx, cardIdx)
}

function onColumnClick(colIdx) {
  if (won.value) return
  const sel = selected.value
  if (!sel) return
  if (sel.from === 'col' && sel.col === colIdx) {
    clearSelection()
    return
  }
  moveToColumn(colIdx)
}

function onFreeCellClick(cellIdx) {
  if (won.value) return
  const sel = selected.value
  if (!sel) {
    if (freeCells.value[cellIdx]) selected.value = { from: 'free', cell: cellIdx }
    else clearSelection()
    return
  }
  if (sel.from === 'free' && sel.cell === cellIdx) {
    clearSelection()
    return
  }
  moveToFreeCell(cellIdx)
}

function onFoundationClick(suitKey) {
  if (won.value) return
  if (!selected.value) {
    message.value = '请先选中一张牌，再点击回收位'
    return
  }
  applyFoundationMove(suitKey)
}

function moveToColumn(colIdx) {
  const sel = selected.value
  if (!sel) return
  const ids = selectedCards.value
  if (!ids.length) {
    clearSelection()
    return
  }
  const first = CARD_MAP[ids[0]]
  const dest = columns.value[colIdx]
  if (dest.length) {
    const top = CARD_MAP[dest[dest.length - 1]]
    if (top.red === first.red) {
      message.value = `落点必须异色：${top.label}${top.symbol} 与所选 ${first.label}${first.symbol} 颜色相同`
      return
    }
    if (top.rank !== first.rank + 1) {
      message.value = `落点必须比所选牌大 1：${top.label}${top.symbol} 不能接 ${first.label}${first.symbol}`
      return
    }
  }
  const limit = maxMoveable.value
  if (ids.length > limit) {
    message.value = `当前最多可移动 ${limit} 张（空列 ${emptyColumnCount.value}，空自由格 ${freeCellsLeft.value}），无法移动 ${ids.length} 张`
    return
  }
  pushSnapshot()
  removeSelected()
  columns.value[colIdx] = columns.value[colIdx].concat(ids)
  moves.value++
  selected.value = null
  message.value = ''
  startTimer()
  checkWin()
}

function moveToFreeCell(cellIdx) {
  const sel = selected.value
  if (!sel) return
  const ids = selectedCards.value
  if (freeCells.value[cellIdx]) {
    message.value = '该自由格已被占用，每格只能放 1 张牌'
    return
  }
  if (ids.length !== 1) {
    message.value = `自由格只能放单张牌，当前选中 ${ids.length} 张`
    return
  }
  pushSnapshot()
  removeSelected()
  freeCells.value[cellIdx] = ids[0]
  moves.value++
  selected.value = null
  message.value = ''
  startTimer()
  checkWin()
}

function applyFoundationMove(suitKey) {
  const ids = selectedCards.value
  if (!ids.length) {
    clearSelection()
    return
  }
  if (ids.length !== 1) {
    message.value = `回收位只能放单张牌，当前选中 ${ids.length} 张`
    return
  }
  const card = CARD_MAP[ids[0]]
  if (suitKey && card.suit !== suitKey) {
    message.value = `${card.label}${card.symbol} 只能放进同花色的 ${card.symbol} 回收位`
    return
  }
  const need = foundationRank.value[card.suit] + 1
  if (card.rank !== need) {
    message.value = `回收位需从 A 起同花色升序，${card.symbol} 位当前应放 ${RANK_LABELS[need] || '—'}`
    return
  }
  pushSnapshot()
  removeSelected()
  foundationRank.value = { ...foundationRank.value, [card.suit]: card.rank }
  moves.value++
  selected.value = null
  message.value = ''
  startTimer()
  checkWin()
}

function findCard(id) {
  for (let c = 0; c < columns.value.length; c++) {
    const idx = columns.value[c].indexOf(id)
    if (idx >= 0) return { type: 'col', col: c, idx }
  }
  const cell = freeCells.value.indexOf(id)
  if (cell >= 0) return { type: 'free', cell }
  return null
}

function onCardDblClick(id) {
  if (won.value) return
  const loc = findCard(id)
  if (!loc) return
  if (loc.type === 'col') {
    if (!isRunFrom(loc.col, loc.idx)) {
      message.value = '这段牌不是「红黑交替、连续降序」，无法整体移动'
      return
    }
    selected.value = { from: 'col', col: loc.col, start: loc.idx }
  } else {
    selected.value = { from: 'free', cell: loc.cell }
  }
  autoMove()
}

function autoMove() {
  const sel = selected.value
  if (!sel) return
  const ids = selectedCards.value
  if (!ids.length) return
  const first = CARD_MAP[ids[0]]
  if (ids.length === 1 && foundationRank.value[first.suit] + 1 === first.rank) {
    applyFoundationMove(first.suit)
    return
  }
  for (let i = 0; i < columns.value.length; i++) {
    if (sel.from === 'col' && sel.col === i) continue
    const col = columns.value[i]
    if (col.length) {
      const top = CARD_MAP[col[col.length - 1]]
      if (top.red === first.red || top.rank !== first.rank + 1) continue
    }
    if (ids.length > maxMoveable.value) {
      message.value = `当前最多可移动 ${maxMoveable.value} 张，没有合适的目标列`
      return
    }
    pushSnapshot()
    removeSelected()
    columns.value[i] = columns.value[i].concat(ids)
    moves.value++
    selected.value = null
    message.value = ''
    startTimer()
    checkWin()
    return
  }
  message.value = `没有可用落点：${first.label}${first.symbol} 既不能进回收位，也没有合适的列`
}

function checkWin() {
  if (foundationTotal.value < 52) return
  won.value = true
  stopTimer()
  selected.value = null
  newRecord.value = !bestTime.value || seconds.value < bestTime.value
  if (newRecord.value) {
    bestTime.value = seconds.value
    try {
      localStorage.setItem('freecell-best-time', String(seconds.value))
    } catch (e) {
      // 本地存储不可用时忽略
    }
  }
}

try {
  const saved = Number(localStorage.getItem('freecell-best-time') || 0)
  if (Number.isFinite(saved) && saved > 0) bestTime.value = Math.floor(saved)
} catch (e) {
  bestTime.value = 0
}

onBeforeUnmount(stopTimer)

const cardSlotStyle = {
  position: 'relative',
  width: '56px',
  height: '80px',
  flex: '0 0 56px'
}

function faceStyle(isSelected) {
  return {
    position: 'relative',
    width: '56px',
    height: '80px',
    borderRadius: '7px',
    background: '#fffdfb',
    border: '1px solid #e0d8d0',
    boxSizing: 'border-box',
    boxShadow: isSelected
      ? '0 0 0 2px #8fa9bd, 0 6px 14px -6px rgba(56, 51, 47, 0.42)'
      : '0 1px 2px rgba(56, 51, 47, 0.1)',
    transform: isSelected ? 'translateY(-8px)' : 'translateY(0)',
    transition: 'transform 0.14s ease, box-shadow 0.14s ease',
    cursor: 'pointer',
    userSelect: 'none'
  }
}

function cardStyle(colIdx, cardIdx) {
  const style = faceStyle(isCardSelected(colIdx, cardIdx))
  if (cardIdx > 0) style.marginTop = '-54px'
  return style
}

function cornerStyle(red) {
  return {
    position: 'absolute',
    top: '3px',
    left: '5px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    lineHeight: '1',
    fontSize: '13px',
    fontWeight: '700',
    fontFamily: 'Georgia, "Times New Roman", serif',
    color: red ? '#c05f5e' : '#3f3a46'
  }
}

function bigSuitStyle(red) {
  return {
    position: 'absolute',
    left: '0',
    right: '0',
    top: '0',
    bottom: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '27px',
    lineHeight: '1',
    color: red ? '#c05f5e' : '#3f3a46',
    opacity: '0.85',
    pointerEvents: 'none'
  }
}

const freeSlotStyle = {
  width: '56px',
  height: '80px',
  borderRadius: '7px',
  border: '1px dashed #d5c9be',
  background:
    'repeating-linear-gradient(45deg, rgba(143, 169, 189, 0.10) 0 5px, rgba(167, 155, 186, 0.08) 5px 10px)',
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '10px',
  letterSpacing: '1px',
  color: '#b9ada1',
  userSelect: 'none',
  cursor: 'pointer'
}

function foundationSlotStyle(red) {
  return {
    width: '56px',
    height: '80px',
    borderRadius: '7px',
    border: '1px dashed #d5c9be',
    background: 'rgba(255, 253, 251, 0.4)',
    boxSizing: 'border-box',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '26px',
    color: red ? 'rgba(192, 95, 94, 0.35)' : 'rgba(63, 58, 70, 0.3)',
    userSelect: 'none',
    cursor: 'pointer'
  }
}

const backLayerStyle = {
  position: 'absolute',
  left: '2px',
  top: '2px',
  width: '56px',
  height: '80px',
  borderRadius: '7px',
  border: '1px solid #cfc4da',
  boxSizing: 'border-box',
  backgroundImage:
    'repeating-linear-gradient(45deg, rgba(255, 255, 255, 0.22) 0 5px, rgba(255, 255, 255, 0) 5px 10px), linear-gradient(135deg, #8fa9bd, #a79bba)'
}

const topAreaStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  justifyContent: 'center',
  gap: '24px',
  flexWrap: 'wrap',
  padding: '4px 0 16px'
}

const groupStyle = {
  display: 'flex',
  gap: '8px'
}

const boardStyle = {
  display: 'flex',
  alignItems: 'flex-start',
  gap: '10px',
  width: '100%',
  overflowX: 'auto',
  padding: '12px 2px 16px',
  minHeight: '360px',
  userSelect: 'none'
}

const columnStyle = {
  position: 'relative',
  flex: '0 0 56px',
  width: '56px',
  minHeight: '330px',
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'stretch'
}

const emptyColumnStyle = {
  width: '56px',
  height: '80px',
  borderRadius: '7px',
  border: '1px dashed #ddd2c8',
  background:
    'repeating-linear-gradient(45deg, rgba(143, 169, 189, 0.07) 0 5px, rgba(167, 155, 186, 0.06) 5px 10px)',
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  fontSize: '11px',
  color: '#c4b8ac',
  userSelect: 'none',
  cursor: 'pointer'
}

deal()
</script>
