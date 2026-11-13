<template>
  <div>
    <div class="panel">
      <div class="row">
        <span class="pill">分数 {{ score }}</span>
        <span class="pill">步数 {{ moves }}</span>
        <span class="pill">用时 {{ timeText }}</span>
        <span class="pill">最佳 {{ best }}</span>
        <select v-model.number="drawCount" @change="onDrawModeChange">
          <option :value="1">翻 1 张</option>
          <option :value="3">翻 3 张</option>
        </select>
        <button class="btn" :disabled="won || !history.length" @click="undo">撤销</button>
        <button class="btn" @click="restart">重开</button>
        <button class="btn primary" @click="newGame">新一局</button>
      </div>
      <p class="hint">
        点击牌堆翻牌，牌堆空时再点一次可收回翻牌区。点击选中牌或牌组，再点击目标列 / 回收位落子，点击空白处取消。双击一张牌可自动送往回收位，不能送时尝试移到合法列。列内只能移动红黑交替、连续降序的牌组，空列只能放 K。
      </p>
      <p v-if="message" :class="messageIsError ? 'err' : 'ok'">{{ message }}</p>
    </div>

    <div class="panel">
      <div :style="tableStyle" @click="clearSelection">
        <div :style="topRowStyle">
          <div style="display: flex; gap: 10px">
            <div
              v-for="suit in SUITS"
              :key="'foundation-' + suit.id"
              :style="slotStyle"
              @click.stop="clickFoundation(suit.id)"
              @dblclick.stop="autoMoveFromFoundation(suit.id)"
            >
              <div v-if="!foundations[suit.id].length" :style="emptySlotStyle">
                <span :style="{ color: suit.red ? '#c05f5e' : '#3f3a46', opacity: 0.28, fontSize: '22px' }">{{ suit.char }}</span>
              </div>
              <div
                v-else
                :style="faceCardStyle(foundationTops[suit.id], isFoundationSelected(suit.id))"
              >
                <div :style="cornerStyle(foundationTops[suit.id])">
                  <span :style="rankStyle">{{ rankText(foundationTops[suit.id].rank) }}</span>
                  <span :style="smallSuitStyle">{{ suit.char }}</span>
                </div>
                <span :style="pipStyle(foundationTops[suit.id])">{{ suit.char }}</span>
              </div>
            </div>
          </div>

          <div style="display: flex; gap: 10px">
            <div :style="slotStyle" @click.stop="clickStock">
              <div v-if="stock.length" :style="backCardStyle">
                <span :style="countBadgeStyle">{{ stock.length }}</span>
              </div>
              <div v-else :style="emptySlotStyle">
                <span :style="{ fontSize: '12px', color: '#9b9188' }">{{ waste.length ? '↻ 重翻' : '空' }}</span>
              </div>
            </div>
            <div :style="slotStyle" @click.stop="clickWaste" @dblclick.stop="autoMoveFromWaste">
              <div v-if="wasteTop" :style="faceCardStyle(wasteTop, isWasteSelected())">
                <div :style="cornerStyle(wasteTop)">
                  <span :style="rankStyle">{{ rankText(wasteTop.rank) }}</span>
                  <span :style="smallSuitStyle">{{ suitChar(wasteTop.suit) }}</span>
                </div>
                <span :style="pipStyle(wasteTop)">{{ suitChar(wasteTop.suit) }}</span>
                <span v-if="waste.length > 1" :style="countBadgeStyle">{{ waste.length }}</span>
              </div>
              <div v-else :style="emptySlotStyle">
                <span :style="{ fontSize: '12px', color: '#9b9188' }">翻牌区</span>
              </div>
            </div>
          </div>
        </div>

        <div :style="boardScrollStyle">
          <div :style="boardGridStyle">
            <div
              v-for="(pile, col) in tableau"
              :key="'col-' + col"
              :style="columnStyle(col)"
              @click.stop="clickColumn(col)"
            >
              <div v-if="!pile.length" :style="emptySlotStyle">
                <span :style="{ fontSize: '12px', color: '#b3a79b' }">K</span>
              </div>
              <div
                v-for="(card, index) in pile"
                :key="card.id"
                :style="tableauCardStyle(col, index, card)"
                @click.stop="clickTableauCard(col, index)"
                @dblclick.stop="autoMoveFromTableau(col, index)"
              >
                <template v-if="card.faceUp">
                  <div :style="cornerStyle(card)">
                    <span :style="rankStyle">{{ rankText(card.rank) }}</span>
                    <span :style="smallSuitStyle">{{ suitChar(card.suit) }}</span>
                  </div>
                  <span :style="pipStyle(card)">{{ suitChar(card.suit) }}</span>
                </template>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div v-if="won" :style="winBoxStyle">
        <div class="center" style="font-size: 17px; font-weight: 700">🎉 恭喜通关！</div>
        <p class="hint center" style="margin: 6px 0 12px">四个回收位已经集齐全部 52 张牌。</p>
        <div class="stats-grid">
          <div class="stat"><b>{{ timeText }}</b><span>用时</span></div>
          <div class="stat"><b>{{ moves }}</b><span>步数</span></div>
          <div class="stat"><b>{{ score }}</b><span>分数</span></div>
        </div>
        <div class="row" style="justify-content: center; margin-top: 12px">
          <button class="btn primary" @click="newGame">再来一局</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

const CARD_HEIGHT = 84
const FACE_OFFSET = 26
const BACK_OFFSET = 11

const SUITS = [
  { id: 0, char: '♠', red: false, name: '黑桃' },
  { id: 1, char: '♥', red: true, name: '红桃' },
  { id: 2, char: '♦', red: true, name: '方块' },
  { id: 3, char: '♣', red: false, name: '梅花' }
]

const RANKS = ['', 'A', '2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K']
const BACK_BG =
  'repeating-linear-gradient(45deg, rgba(255,255,255,.22) 0 2px, transparent 2px 6px), linear-gradient(135deg, #8fa9bd, #a79bba)'

const tableau = ref([[], [], [], [], [], [], []])
const stock = ref([])
const waste = ref([])
const foundations = ref([[], [], [], []])
const score = ref(0)
const moves = ref(0)
const elapsed = ref(0)
const drawCount = ref(1)
const best = ref(loadBest())
const won = ref(false)
const selected = ref(null)
const message = ref('')
const messageIsError = ref(false)
const history = ref([])

let ticker = null
let cachedDeck = null

const foundationTops = computed(() =>
  foundations.value.map(pile => (pile.length ? pile[pile.length - 1] : null))
)
const wasteTop = computed(() => (waste.value.length ? waste.value[waste.value.length - 1] : null))
const timeText = computed(() => formatTime(elapsed.value))

const slotStyle = {
  position: 'relative',
  width: '60px',
  height: '84px',
  flex: 'none'
}

const emptySlotStyle = {
  width: '100%',
  height: '84px',
  border: '1px dashed #cfc4b9',
  borderRadius: '7px',
  boxSizing: 'border-box',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  background: 'rgba(255,255,255,.35)'
}

const topRowStyle = {
  display: 'flex',
  flexWrap: 'wrap',
  gap: '12px',
  justifyContent: 'space-between',
  alignItems: 'flex-start',
  marginBottom: '18px'
}

const tableStyle = {
  position: 'relative',
  paddingTop: '4px',
  userSelect: 'none'
}

const boardScrollStyle = {
  width: '100%',
  overflowX: 'auto',
  paddingTop: '10px',
  paddingBottom: '6px'
}

const boardGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(7, 60px)',
  gap: '14px',
  width: 'max-content',
  margin: '0 auto',
  paddingTop: '2px'
}

const winBoxStyle = {
  marginTop: '18px',
  padding: '14px 16px',
  borderRadius: '12px',
  background: '#f2f7f1',
  border: '1px solid #dbe6d8'
}

const rankStyle = {
  fontSize: '14px',
  fontWeight: '700',
  lineHeight: '1'
}

const smallSuitStyle = {
  fontSize: '11px',
  lineHeight: '1',
  marginTop: '1px'
}

const countBadgeStyle = {
  position: 'absolute',
  right: '3px',
  bottom: '3px',
  minWidth: '14px',
  height: '14px',
  padding: '0 3px',
  borderRadius: '7px',
  background: 'rgba(63,58,70,.78)',
  color: '#fff',
  fontSize: '9px',
  lineHeight: '14px',
  textAlign: 'center',
  boxSizing: 'border-box'
}

function formatTime(seconds) {
  const m = Math.floor(seconds / 60)
  const s = seconds % 60
  return `${m}:${String(s).padStart(2, '0')}`
}

function loadBest() {
  try {
    const n = Number(localStorage.getItem('klondike-best') || 0)
    return Number.isFinite(n) && n > 0 ? Math.floor(n) : 0
  } catch (e) {
    return 0
  }
}

function isRed(suit) {
  return SUITS[suit].red
}

function suitChar(suit) {
  return SUITS[suit].char
}

function rankText(rank) {
  return RANKS[rank] || ''
}

function colorOf(suit) {
  return isRed(suit) ? '#c05f5e' : '#3f3a46'
}

function faceBaseStyle() {
  return {
    width: '60px',
    height: '84px',
    borderRadius: '7px',
    background: '#fffdfb',
    border: '1px solid #e0d8d0',
    boxSizing: 'border-box',
    position: 'relative',
    overflow: 'hidden',
    userSelect: 'none',
    flex: 'none'
  }
}

function backBaseStyle() {
  return {
    width: '60px',
    height: '84px',
    borderRadius: '7px',
    background: BACK_BG,
    border: '1px solid #7f97ab',
    boxSizing: 'border-box',
    position: 'relative',
    overflow: 'hidden',
    userSelect: 'none',
    flex: 'none'
  }
}

function cornerStyle(card) {
  return {
    position: 'absolute',
    top: '4px',
    left: '5px',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    color: colorOf(card.suit),
    lineHeight: '1'
  }
}

function pipStyle(card) {
  return {
    position: 'absolute',
    inset: '0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: '30px',
    lineHeight: '1',
    color: colorOf(card.suit),
    paddingTop: '8px'
  }
}

const backCardStyle = backBaseStyle()

function faceCardStyle(card, isSelected) {
  const style = faceBaseStyle()
  style.cursor = 'pointer'
  style.transform = isSelected ? 'translateY(-8px)' : 'none'
  style.boxShadow = isSelected ? '0 0 0 2px #8fa9bd' : '0 1px 2px rgba(63,58,70,.12)'
  style.transition = 'transform 0.12s ease, box-shadow 0.12s ease'
  return style
}

function stackTop(col, index) {
  const pile = tableau.value[col]
  let y = 0
  for (let i = 0; i < index; i++) {
    y += pile[i].faceUp ? FACE_OFFSET : BACK_OFFSET
  }
  return y
}

function columnHeight(col) {
  const pile = tableau.value[col]
  if (!pile.length) return CARD_HEIGHT
  let h = CARD_HEIGHT
  for (let i = 0; i < pile.length - 1; i++) {
    h += pile[i].faceUp ? FACE_OFFSET : BACK_OFFSET
  }
  return h
}

function columnStyle(col) {
  return {
    position: 'relative',
    width: '60px',
    height: Math.max(CARD_HEIGHT + 20, columnHeight(col) + 20) + 'px',
    flex: 'none'
  }
}

function tableauCardStyle(col, index, card) {
  const base = card.faceUp ? faceBaseStyle() : backBaseStyle()
  const isSelected = isTableauSelected(col, index)
  return {
    ...base,
    position: 'absolute',
    left: '0',
    top: stackTop(col, index) + 'px',
    zIndex: index + 1,
    cursor: card.faceUp ? 'pointer' : 'default',
    transform: isSelected ? 'translateY(-8px)' : 'none',
    boxShadow: isSelected ? '0 0 0 2px #8fa9bd' : '0 1px 2px rgba(63,58,70,.12)',
    transition: 'transform 0.12s ease, box-shadow 0.12s ease'
  }
}

function isTableauSelected(col, index) {
  const sel = selected.value
  return !!sel && sel.type === 'tableau' && sel.col === col && index >= sel.index
}

function isWasteSelected() {
  return !!selected.value && selected.value.type === 'waste'
}

function isFoundationSelected(suitId) {
  return !!selected.value && selected.value.type === 'foundation' && selected.value.suit === suitId
}

function setMessage(text, isError = false) {
  message.value = text
  messageIsError.value = isError
}

function addScore(n) {
  score.value = Math.max(0, score.value + n)
}

function buildDeck() {
  const deck = []
  for (const suit of SUITS) {
    for (let rank = 1; rank <= 13; rank++) {
      deck.push({ id: suit.id * 13 + rank, suit: suit.id, rank })
    }
  }
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    const tmp = deck[i]
    deck[i] = deck[j]
    deck[j] = tmp
  }
  return deck
}

function dealGame(deck) {
  stopTimer()
  const cards = deck.map(c => ({ id: c.id, suit: c.suit, rank: c.rank, faceUp: false }))
  const nextTableau = [[], [], [], [], [], [], []]
  let k = 0
  for (let col = 0; col < 7; col++) {
    for (let row = 0; row <= col; row++) {
      const card = cards[k++]
      card.faceUp = row === col
      nextTableau[col].push(card)
    }
  }
  tableau.value = nextTableau
  stock.value = cards.slice(k)
  waste.value = []
  foundations.value = [[], [], [], []]
  score.value = 0
  moves.value = 0
  elapsed.value = 0
  won.value = false
  selected.value = null
  history.value = []
  setMessage('')
}

function newGame() {
  cachedDeck = buildDeck()
  dealGame(cachedDeck)
  startTimer()
}

function restart() {
  dealGame(cachedDeck || buildDeck())
  startTimer()
}

function startTimer() {
  stopTimer()
  ticker = setInterval(() => {
    elapsed.value++
  }, 1000)
}

function stopTimer() {
  if (ticker) {
    clearInterval(ticker)
    ticker = null
  }
}

function onDrawModeChange() {
  selected.value = null
  setMessage(`已切换为每次翻 ${drawCount.value} 张`)
}

function cloneCard(card) {
  return { id: card.id, suit: card.suit, rank: card.rank, faceUp: card.faceUp }
}

function cloneState() {
  return {
    stock: stock.value.map(cloneCard),
    waste: waste.value.map(cloneCard),
    foundations: foundations.value.map(pile => pile.map(cloneCard)),
    tableau: tableau.value.map(pile => pile.map(cloneCard)),
    score: score.value,
    moves: moves.value
  }
}

function pushHistory() {
  history.value.push(cloneState())
}

function undo() {
  if (won.value || !history.value.length) return
  const state = history.value.pop()
  stock.value = state.stock
  waste.value = state.waste
  foundations.value = state.foundations
  tableau.value = state.tableau
  score.value = state.score
  moves.value = state.moves
  selected.value = null
  setMessage('')
}

function getRun(col, index) {
  const pile = tableau.value[col]
  const cards = pile.slice(index)
  if (!cards.length) return null
  for (const card of cards) {
    if (!card.faceUp) return null
  }
  for (let i = 1; i < cards.length; i++) {
    if (cards[i - 1].rank !== cards[i].rank + 1) return null
    if (isRed(cards[i - 1].suit) === isRed(cards[i].suit)) return null
  }
  return cards
}

function canPlaceOn(card, bottom) {
  return bottom.rank === card.rank + 1 && isRed(card.suit) !== isRed(bottom.suit)
}

function selectedCards() {
  const sel = selected.value
  if (!sel) return null
  if (sel.type === 'tableau') return getRun(sel.col, sel.index)
  if (sel.type === 'waste') return wasteTop.value ? [wasteTop.value] : null
  if (sel.type === 'foundation') {
    const pile = foundations.value[sel.suit]
    return pile.length ? [pile[pile.length - 1]] : null
  }
  return null
}

function removeFromOrigin(origin) {
  if (origin.type === 'tableau') {
    const pile = tableau.value[origin.col]
    const moving = pile.splice(origin.index)
    if (pile.length && !pile[pile.length - 1].faceUp) {
      pile[pile.length - 1].faceUp = true
      addScore(5)
    }
    return moving
  }
  if (origin.type === 'waste') {
    return waste.value.length ? [waste.value.pop()] : []
  }
  if (origin.type === 'foundation') {
    const pile = foundations.value[origin.suit]
    return pile.length ? [pile.pop()] : []
  }
  return []
}

function executeMove(cards, origin, target) {
  pushHistory()
  const moving = removeFromOrigin(origin)
  if (!moving.length) return false
  if (target.type === 'foundation') {
    foundations.value[target.suit].push(moving[0])
    addScore(10)
    setMessage(`已把 ${rankText(moving[0].rank)}${suitChar(moving[0].suit)} 送入回收位`)
  } else {
    tableau.value[target.col].push(...moving)
    if (origin.type === 'foundation') {
      addScore(-15)
      setMessage('已从回收位取回一张牌，分数 -15')
    } else {
      setMessage('')
    }
  }
  moves.value++
  selected.value = null
  checkWin()
  return true
}

function tryMoveToColumn(col) {
  const sel = selected.value
  if (!sel) return false
  const cards = selectedCards()
  if (!cards || !cards.length) {
    selected.value = null
    setMessage('选中的牌已失效，请重新选择', true)
    return false
  }
  if (sel.type === 'tableau' && sel.col === col) {
    setMessage('已经在这一列了', true)
    return false
  }
  const pile = tableau.value[col]
  const bottom = pile.length ? pile[pile.length - 1] : null
  if (bottom && !bottom.faceUp) {
    setMessage('目标列的顶牌是暗牌，不能放牌', true)
    return false
  }
  if (bottom) {
    const need = bottom.rank - 1
    if (need < 1) {
      setMessage('这张牌上不能再放牌了', true)
      return false
    }
    if (!canPlaceOn(cards[0], bottom)) {
      setMessage(`需要异色且点数小 1 的牌，这里应放 ${rankText(need)}`, true)
      return false
    }
  } else if (cards[0].rank !== 13) {
    setMessage('空列只能放 K 或 K 开头的牌组', true)
    return false
  }
  return executeMove(cards, sel, { type: 'tableau', col })
}

function tryAutoMove(cards, origin) {
  if (cards.length === 1) {
    const card = cards[0]
    const pile = foundations.value[card.suit]
    const need = pile.length ? pile[pile.length - 1].rank + 1 : 1
    if (need <= 13 && card.rank === need) {
      return executeMove(cards, origin, { type: 'foundation', suit: card.suit })
    }
  }
  const cols = []
  for (let c = 0; c < 7; c++) {
    if (origin.type === 'tableau' && origin.col === c) continue
    cols.push(c)
  }
  for (const preferNonEmpty of [true, false]) {
    for (const c of cols) {
      const pile = tableau.value[c]
      if (preferNonEmpty && !pile.length) continue
      if (!preferNonEmpty && pile.length) continue
      if (canDropOnColumn(cards, c)) {
        return executeMove(cards, origin, { type: 'tableau', col: c })
      }
    }
  }
  return false
}

function canDropOnColumn(cards, col) {
  const pile = tableau.value[col]
  if (!pile.length) return cards[0].rank === 13
  const bottom = pile[pile.length - 1]
  if (!bottom.faceUp) return false
  return canPlaceOn(cards[0], bottom)
}

function clickStock() {
  if (won.value) return
  if (selected.value) {
    setMessage('请先把选中的牌放下，或点击空白处取消选中', true)
    return
  }
  if (!stock.value.length) {
    if (!waste.value.length) {
      setMessage('牌堆和翻牌区都没有牌了', true)
      return
    }
    pushHistory()
    stock.value = waste.value.slice().reverse().map(card => ({ ...card, faceUp: false }))
    waste.value = []
    moves.value++
    setMessage('已把翻牌区收回牌堆，可以重新翻牌')
    return
  }
  pushHistory()
  const count = Math.min(drawCount.value, stock.value.length)
  for (let i = 0; i < count; i++) {
    const card = stock.value.pop()
    card.faceUp = true
    waste.value.push(card)
  }
  moves.value++
  setMessage('')
}

function clickWaste() {
  if (won.value) return
  if (!waste.value.length) {
    setMessage('翻牌区还没有牌', true)
    return
  }
  if (selected.value) {
    if (selected.value.type === 'waste') {
      selected.value = null
      setMessage('')
      return
    }
    setMessage('翻牌区只能取牌，不能放牌', true)
    return
  }
  selected.value = { type: 'waste' }
  setMessage('已选中翻牌区顶牌')
}

function clickFoundation(suitId) {
  if (won.value) return
  const pile = foundations.value[suitId]
  if (selected.value && selected.value.type === 'foundation' && selected.value.suit === suitId) {
    selected.value = null
    setMessage('')
    return
  }
  if (!selected.value) {
    if (!pile.length) {
      setMessage('回收位还是空的，先把同花色的 A 送进来')
      return
    }
    selected.value = { type: 'foundation', suit: suitId }
    setMessage('已选中回收位顶牌，可放到下方列（分数 -15）')
    return
  }
  const cards = selectedCards()
  if (!cards || !cards.length) {
    selected.value = null
    setMessage('选中的牌已失效，请重新选择', true)
    return
  }
  if (cards.length !== 1) {
    setMessage('回收位只能接收单张牌', true)
    return
  }
  const card = cards[0]
  if (card.suit !== suitId) {
    setMessage('回收位只能放同花色的牌', true)
    return
  }
  const need = pile.length ? pile[pile.length - 1].rank + 1 : 1
  if (need > 13) {
    setMessage('这个回收位已经满了', true)
    return
  }
  if (card.rank !== need) {
    setMessage(`这里需要 ${rankText(need)}${SUITS[suitId].char}`, true)
    return
  }
  executeMove(cards, selected.value, { type: 'foundation', suit: suitId })
}

function clickTableauCard(col, index) {
  if (won.value) return
  const pile = tableau.value[col]
  const card = pile[index]
  if (!card) return
  if (!card.faceUp) {
    if (selected.value) setMessage('不能放到暗牌上', true)
    else setMessage('暗牌不能移动，先移走上面的牌翻开它', true)
    return
  }
  const sel = selected.value
  if (!sel) {
    selectRun(col, index)
    return
  }
  if (sel.type === 'tableau' && sel.col === col) {
    if (sel.index === index) {
      selected.value = null
      setMessage('')
      return
    }
    if (index > sel.index) {
      selectRun(col, index)
      return
    }
    setMessage('同一列内只能整体移动最上方连续的牌组，不能插到中间', true)
    return
  }
  tryMoveToColumn(col)
}

function selectRun(col, index) {
  const run = getRun(col, index)
  if (!run) {
    setMessage('这段牌不是连续降序的红黑交替牌组，不能整体移动', true)
    return
  }
  selected.value = { type: 'tableau', col, index }
  setMessage('')
}

function clickColumn(col) {
  if (won.value) return
  const sel = selected.value
  if (!sel) return
  if (sel.type === 'tableau' && sel.col === col) {
    selected.value = null
    setMessage('')
    return
  }
  tryMoveToColumn(col)
}

function clearSelection() {
  if (!selected.value) return
  selected.value = null
  setMessage('已取消选中')
}

function autoMoveFromTableau(col, index) {
  if (won.value) return
  const pile = tableau.value[col]
  const card = pile[index]
  if (!card) return
  if (!card.faceUp) {
    setMessage('暗牌不能移动', true)
    return
  }
  const run = getRun(col, index)
  if (!run) {
    setMessage('这段牌不是连续降序的红黑交替牌组，不能整体移动', true)
    return
  }
  selected.value = null
  if (tryAutoMove(run, { type: 'tableau', col, index })) return
  setMessage('这张牌暂时没有可送去的回收位，也没有合法的列', true)
}

function autoMoveFromWaste() {
  if (won.value || !wasteTop.value) return
  const card = wasteTop.value
  selected.value = null
  if (tryAutoMove([card], { type: 'waste' })) return
  setMessage('这张牌暂时没有可送去的回收位，也没有合法的列', true)
}

function autoMoveFromFoundation(suitId) {
  if (won.value) return
  const pile = foundations.value[suitId]
  if (!pile.length) return
  const card = pile[pile.length - 1]
  selected.value = null
  if (tryAutoMove([card], { type: 'foundation', suit: suitId })) return
  setMessage('回收位的这张牌暂时没有合法的列可放', true)
}

function checkWin() {
  if (!foundations.value.every(pile => pile.length === 13)) return
  won.value = true
  stopTimer()
  selected.value = null
  setMessage('')
  if (score.value > best.value) {
    best.value = score.value
    try {
      localStorage.setItem('klondike-best', String(best.value))
    } catch (e) {
      // 本地存储不可用时忽略
    }
  }
}

onMounted(() => {
  startTimer()
})

onBeforeUnmount(() => {
  stopTimer()
})

cachedDeck = buildDeck()
dealGame(cachedDeck)
</script>
