<template>
  <div>
    <div class="panel">
      <div class="row">
        <select v-model.number="levelNo" @change="loadLevel(levelNo)">
          <option v-for="n in unlocked" :key="n" :value="n">第 {{ n }} 关</option>
        </select>
        <button class="btn primary" @click="restart">重来本关</button>
        <button class="btn" :disabled="won || !history.length" @click="undo">撤销一步</button>
        <span class="pill">第 {{ levelNo }} / {{ totalLevels }} 关</span>
        <span class="pill">步数 {{ moves }}</span>
        <span class="pill">推动 {{ pushes }}</span>
      </div>
      <p class="hint">
        方向键 / WASD 移动，Z 或 U 撤销一步，R 重来本关。把全部箱子推到目标点即可过关，进度会自动保存。
      </p>
      <p v-if="message" class="ok">{{ message }}</p>
    </div>

    <div class="panel">
      <div :style="boardStyle">
        <div v-for="(cell, i) in cells" :key="i" :style="cellStyle(cell)">
          <template v-if="!cell.wall">
            <span v-if="cell.goal" :style="goalRingStyle"></span>
            <span v-if="cell.player" :style="playerStyle"></span>
            <span v-else-if="cell.box" :style="boxStyle(cell)"></span>
          </template>
        </div>
      </div>
      <p class="hint" style="margin-top: 12px; text-align: center">
        <span style="color: #8fa9bd">●</span> 玩家 ·
        <span style="color: #b9a58f">■</span> 箱子 ·
        <span style="color: #9eb3a6">■</span> 归位 ·
        <span style="color: #b9a58f">○</span> 目标点
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

// # 墙  空格 地面  . 目标点  $ 箱子  * 箱子在目标点  @ 玩家  + 玩家在目标点
const LEVELS = [
  [
    '#######',
    '#     #',
    '#  .  #',
    '#  $  #',
    '#  @  #',
    '#     #',
    '#######'
  ],
  [
    '#######',
    '#     #',
    '#  .  #',
    '#     #',
    '#  $  #',
    '#  @  #',
    '#######'
  ],
  [
    '########',
    '#      #',
    '# .  . #',
    '# $  $ #',
    '#  @   #',
    '#      #',
    '########'
  ],
  [
    '#########',
    '#   #   #',
    '# . # . #',
    '# $   $ #',
    '#   @   #',
    '#       #',
    '#########'
  ],
  [
    '########',
    '#      #',
    '# .  . #',
    '# $##$ #',
    '#   @  #',
    '#      #',
    '########'
  ],
  [
    '#########',
    '#       #',
    '# . . . #',
    '# $ $ $ #',
    '#   @   #',
    '#       #',
    '#########'
  ],
  [
    '#########',
    '#       #',
    '# .     #',
    '#       #',
    '#   $   #',
    '#   @   #',
    '#       #',
    '#########'
  ],
  [
    '##########',
    '#        #',
    '#  .  .  #',
    '#        #',
    '#  $  $  #',
    '#   @    #',
    '#        #',
    '##########'
  ],
  [
    '##########',
    '#        #',
    '#   . .  #',
    '#  # #   #',
    '#  $ $   #',
    '#   @    #',
    '#        #',
    '##########'
  ],
  [
    '###########',
    '#         #',
    '# . . . . #',
    '#         #',
    '# $ $ $ $ #',
    '#    @    #',
    '#         #',
    '###########'
  ],
  [
    '##########',
    '#        #',
    '#   . .  #',
    '#  # #   #',
    '#  $ $   #',
    '#        #',
    '#  $ $   #',
    '#   @    #',
    '#  . .   #',
    '#        #',
    '##########'
  ],
  [
    '############',
    '#          #',
    '#   .  .   #',
    '#          #',
    '#  $ ## $  #',
    '#          #',
    '#  $    $  #',
    '#    @     #',
    '#   .  .   #',
    '#          #',
    '############'
  ]
]

const totalLevels = LEVELS.length

const levelNo = ref(1)
const unlocked = ref(1)
const rows = ref(0)
const cols = ref(0)
const walls = ref([])
const goals = ref(new Set())
const boxes = ref([])
const player = ref(0)
const moves = ref(0)
const pushes = ref(0)
const history = ref([])
const won = ref(false)
const message = ref('')

let nextTimer = null

const cells = computed(() => {
  const w = cols.value
  const h = rows.value
  const boxSet = new Set(boxes.value)
  const out = []
  for (let i = 0; i < h * w; i++) {
    out.push({
      wall: walls.value[i] === true,
      goal: goals.value.has(i),
      box: boxSet.has(i),
      player: player.value === i
    })
  }
  return out
})

const boardStyle = computed(() => ({
  display: 'grid',
  gridTemplateColumns: `repeat(${cols.value}, 1fr)`,
  gap: '3px',
  width: '100%',
  maxWidth: Math.min(560, cols.value * 48) + 'px',
  margin: '0 auto',
  padding: '8px',
  background: '#ece4dc',
  borderRadius: '10px',
  boxSizing: 'border-box',
  userSelect: 'none'
}))

const goalRingStyle = {
  position: 'absolute',
  width: '46%',
  height: '46%',
  borderRadius: '50%',
  border: '2px solid #b9a58f',
  boxSizing: 'border-box'
}

function playerStyle() {
  return {
    width: '62%',
    height: '62%',
    borderRadius: '50%',
    background: '#8fa9bd',
    boxShadow: 'inset 0 -3px 0 rgba(0, 0, 0, 0.08), inset 0 2px 0 rgba(255, 255, 255, 0.35)',
    transition: 'transform 0.16s ease'
  }
}

function boxStyle(cell) {
  return {
    width: '76%',
    height: '76%',
    borderRadius: '16%',
    background: cell.goal ? '#9eb3a6' : '#b9a58f',
    boxShadow: 'inset 0 0 0 2px rgba(255, 255, 255, 0.3)',
    transform: won.value ? 'scale(1.08)' : 'scale(1)',
    transition: 'background 0.25s ease, transform 0.25s ease'
  }
}

function cellStyle(cell) {
  const style = {
    position: 'relative',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    aspectRatio: '1',
    boxSizing: 'border-box',
    borderRadius: '3px',
    transition: 'background 0.2s ease'
  }
  if (cell.wall) {
    style.background = '#8d857e'
    style.transform = 'scale(0.97)'
    return style
  }
  style.background = cell.goal ? '#efe7df' : '#f7f4f1'
  style.boxShadow = 'inset 0 0 0 1px #ece4dc'
  return style
}

function clamp(n, min, max) {
  return Math.min(max, Math.max(min, n))
}

function loadProgress() {
  const total = LEVELS.length
  let current = 1
  let maxUnlocked = 1
  try {
    const cur = Number(localStorage.getItem('sokoban-level') || 1)
    const unl = Number(localStorage.getItem('sokoban-unlocked') || 1)
    if (Number.isFinite(cur)) current = clamp(Math.floor(cur), 1, total)
    if (Number.isFinite(unl)) maxUnlocked = clamp(Math.floor(unl), 1, total)
  } catch (e) {
    current = 1
    maxUnlocked = 1
  }
  return { current, maxUnlocked }
}

function saveProgress() {
  try {
    localStorage.setItem('sokoban-level', String(levelNo.value))
    localStorage.setItem('sokoban-unlocked', String(unlocked.value))
  } catch (e) {
    // 本地存储不可用时忽略
  }
}

function loadLevel(n) {
  clearTimeout(nextTimer)
  nextTimer = null

  const idx = clamp(Math.floor(Number(n) || 1), 1, LEVELS.length)
  levelNo.value = idx
  if (idx > unlocked.value) unlocked.value = idx

  const map = LEVELS[idx - 1]
  const w = Math.max(...map.map(line => line.length))
  const h = map.length
  rows.value = h
  cols.value = w

  const wallArr = new Array(h * w).fill(false)
  const goalSet = new Set()
  const boxArr = []
  let playerPos = 0

  for (let r = 0; r < h; r++) {
    const line = map[r]
    for (let c = 0; c < w; c++) {
      const ch = line[c] || ' '
      const i = r * w + c
      if (ch === '#') wallArr[i] = true
      if (ch === '.' || ch === '*' || ch === '+') goalSet.add(i)
      if (ch === '$' || ch === '*') boxArr.push(i)
      if (ch === '@' || ch === '+') playerPos = i
    }
  }

  walls.value = wallArr
  goals.value = goalSet
  boxes.value = boxArr
  player.value = playerPos
  moves.value = 0
  pushes.value = 0
  history.value = []
  won.value = false
  message.value = ''
  saveProgress()
}

function restart() {
  loadLevel(levelNo.value)
}

function checkWin() {
  if (!boxes.value.every(b => goals.value.has(b))) return
  won.value = true
  if (levelNo.value < LEVELS.length) {
    unlocked.value = Math.max(unlocked.value, levelNo.value + 1)
    message.value = `🎉 过关！${moves.value} 步，正在进入第 ${levelNo.value + 1} 关…`
    saveProgress()
    nextTimer = setTimeout(() => {
      nextTimer = null
      loadLevel(levelNo.value + 1)
    }, 900)
  } else {
    message.value = `🎉 恭喜！全部 ${LEVELS.length} 关已通关。`
  }
}

function tryMove(dr, dc) {
  if (won.value) return
  const w = cols.value
  const h = rows.value
  const r = Math.floor(player.value / w)
  const c = player.value % w
  const nr = r + dr
  const nc = c + dc
  if (nr < 0 || nr >= h || nc < 0 || nc >= w) return

  const target = nr * w + nc
  if (walls.value[target]) return

  const boxAt = boxes.value.indexOf(target)
  if (boxAt >= 0) {
    const br = nr + dr
    const bc = nc + dc
    if (br < 0 || br >= h || bc < 0 || bc >= w) return
    const beyond = br * w + bc
    if (walls.value[beyond]) return
    if (boxes.value.includes(beyond)) return

    history.value.push({ player: player.value, boxes: boxes.value.slice(), pushes: pushes.value })
    const next = boxes.value.slice()
    next[boxAt] = beyond
    boxes.value = next
    pushes.value++
  } else {
    history.value.push({ player: player.value, boxes: boxes.value.slice(), pushes: pushes.value })
  }

  player.value = target
  moves.value++
  message.value = ''
  checkWin()
}

function undo() {
  if (won.value || !history.value.length) return
  const last = history.value.pop()
  player.value = last.player
  boxes.value = last.boxes
  pushes.value = last.pushes
  moves.value = history.value.length
  message.value = ''
}

const KEY_DIRS = {
  ArrowUp: [-1, 0],
  ArrowDown: [1, 0],
  ArrowLeft: [0, -1],
  ArrowRight: [0, 1],
  w: [-1, 0],
  s: [1, 0],
  a: [0, -1],
  d: [0, 1],
  W: [-1, 0],
  S: [1, 0],
  A: [0, -1],
  D: [0, 1]
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

  const dir = KEY_DIRS[e.key]
  if (dir) {
    e.preventDefault()
    tryMove(dir[0], dir[1])
    return
  }
  if (e.key === 'z' || e.key === 'Z' || e.key === 'u' || e.key === 'U') {
    e.preventDefault()
    undo()
    return
  }
  if (e.key === 'r' || e.key === 'R') {
    e.preventDefault()
    restart()
  }
}

onMounted(() => window.addEventListener('keydown', onKey))
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
  clearTimeout(nextTimer)
  nextTimer = null
})

const saved = loadProgress()
unlocked.value = Math.max(saved.maxUnlocked, saved.current)
loadLevel(saved.current)
</script>
