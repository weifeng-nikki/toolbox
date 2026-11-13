<template>
  <div>
    <div class="panel">
      <div class="panel-title">
        成就殿堂
        <button class="btn small" @click="refresh">刷新记录</button>
      </div>

      <div class="stats-grid">
        <div class="stat">
          <b>{{ unlockedCount }}</b>
          <span>已解锁成就</span>
        </div>
        <div class="stat">
          <b>{{ totalCount }}</b>
          <span>成就总数</span>
        </div>
        <div class="stat">
          <b>{{ percent }}%</b>
          <span>总完成度</span>
        </div>
      </div>

      <div class="progress" style="margin: 14px 0 10px">
        <div class="progress-bar" :style="{ width: percent + '%' }"></div>
      </div>

      <div class="row">
        <button
          v-for="c in categories"
          :key="c"
          class="btn small"
          :class="{ primary: cat === c }"
          @click="cat = c"
        >
          {{ c }}
        </button>
        <span class="hint" style="margin: 0 0 0 auto">只读取各小工具已保存的本地记录，不会改动任何数据。</span>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">
        成就列表
        <span class="pill">{{ filtered.length }} 项</span>
      </div>

      <div v-if="!filtered.length" class="hint">这个分类下还没有成就。</div>

      <div
        v-else
        style="display: grid; grid-template-columns: repeat(auto-fit, minmax(228px, 1fr)); gap: 12px"
      >
        <div v-for="a in filtered" :key="a.id" :style="cardStyle(a)">
          <div style="display: flex; align-items: center; gap: 10px">
            <span style="font-size: 26px; line-height: 1">{{ a.icon }}</span>
            <div style="min-width: 0">
              <div style="font-size: 14.5px; font-weight: 650">{{ a.name }}</div>
              <div style="font-size: 12px; color: var(--muted); margin-top: 2px">{{ a.cat }} · {{ a.desc }}</div>
            </div>
          </div>

          <div v-if="a.done" style="margin-top: 10px">
            <span
              class="pill"
              :style="{ background: CAT_COLORS[a.cat] + '33', color: CAT_COLORS[a.cat] }"
            >
              ✓ 已达成
            </span>
          </div>

          <div v-else style="margin-top: 10px">
            <div style="display: flex; justify-content: space-between; gap: 8px; font-size: 12px; color: var(--muted)">
              <span>{{ progressText(a) }}</span>
              <span>{{ Math.round(a.ratio * 100) }}%</span>
            </div>
            <div class="progress" style="height: 6px; margin: 6px 0 0">
              <div
                class="progress-bar"
                :style="{ width: a.ratio * 100 + '%', background: CAT_COLORS[a.cat] }"
              ></div>
            </div>
          </div>
        </div>
      </div>

      <p class="hint">
        刚玩完游戏的话，点右上角「刷新记录」即可看到最新进度。部分成就是只读统计，不会影响游戏存档。
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const CAT_COLORS = {
  游戏: '#8fa9bd',
  效率: '#9eb3a6',
  探索: '#a79bba'
}

const categories = ['全部', '游戏', '效率', '探索']
const cat = ref('全部')

function readRaw(key) {
  try {
    return localStorage.getItem(key)
  } catch (e) {
    return null
  }
}

function readNumber(key) {
  const raw = readRaw(key)
  if (raw === null) return 0
  const n = Number(raw)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function readJSON(key, fallback) {
  const raw = readRaw(key)
  if (!raw) return fallback
  try {
    const v = JSON.parse(raw)
    if (Array.isArray(fallback)) return Array.isArray(v) ? v : fallback
    if (fallback && typeof fallback === 'object') return v && typeof v === 'object' ? v : fallback
    return v
  } catch (e) {
    return fallback
  }
}

function readAll() {
  let typing = 0
  const typingMap = readJSON('typing-best-v1', {})
  if (typingMap && typeof typingMap === 'object') {
    for (const langKey of Object.keys(typingMap)) {
      const row = typingMap[langKey]
      if (!row || typeof row !== 'object') continue
      for (const k of Object.keys(row)) {
        const n = Number(row[k])
        if (Number.isFinite(n) && n > typing) typing = n
      }
    }
  }

  const ttt = readJSON('ttt-score', {})
  const tttWin = Math.max(0, Math.floor(Number(ttt && ttt.win) || 0))

  const calc = readJSON('calc.history', [])
  const calcCount = Array.isArray(calc) ? calc.length : 0

  const todos = readJSON('todo.v1', [])
  let todoDone = 0
  if (Array.isArray(todos)) {
    for (const t of todos) {
      if (t && t.done) todoDone++
    }
  }

  const habits = readJSON('habits-v1', [])
  let habitChecks = 0
  if (Array.isArray(habits)) {
    for (const h of habits) {
      if (h && Array.isArray(h.days)) habitChecks += h.days.length
    }
  }

  return {
    g2048: readNumber('game2048-best'),
    snake: readNumber('snake-best'),
    tetris: readNumber('tetris-best'),
    breakout: readNumber('breakout-best'),
    memory6: readNumber('memory-best-6'),
    memory8: readNumber('memory-best-8'),
    memory10: readNumber('memory-best-10'),
    typing,
    tttWin,
    calcCount,
    todoDone,
    habitChecks
  }
}

const data = ref(readAll())

const ACHIEVEMENTS = [
  {
    id: 'game-2048-1',
    icon: '🧩',
    name: '数字萌芽',
    desc: '2048 最高分达到 512',
    cat: '游戏',
    target: 512,
    unit: ' 分',
    get: d => d.g2048
  },
  {
    id: 'game-2048-2',
    icon: '🔢',
    name: '合并大师',
    desc: '2048 最高分达到 2048',
    cat: '游戏',
    target: 2048,
    unit: ' 分',
    get: d => d.g2048
  },
  {
    id: 'game-snake-1',
    icon: '🐍',
    name: '初次蜕皮',
    desc: '贪吃蛇最高分达到 50',
    cat: '游戏',
    target: 50,
    unit: ' 分',
    get: d => d.snake
  },
  {
    id: 'game-snake-2',
    icon: '🌀',
    name: '蜿蜒高手',
    desc: '贪吃蛇最高分达到 150',
    cat: '游戏',
    target: 150,
    unit: ' 分',
    get: d => d.snake
  },
  {
    id: 'game-tetris-1',
    icon: '🧱',
    name: '方块学徒',
    desc: '俄罗斯方块最高分达到 1000',
    cat: '游戏',
    target: 1000,
    unit: ' 分',
    get: d => d.tetris
  },
  {
    id: 'game-tetris-2',
    icon: '🏗️',
    name: '消除专家',
    desc: '俄罗斯方块最高分达到 5000',
    cat: '游戏',
    target: 5000,
    unit: ' 分',
    get: d => d.tetris
  },
  {
    id: 'game-breakout-1',
    icon: '🧨',
    name: '第一块砖',
    desc: '打砖块最高分达到 100',
    cat: '游戏',
    target: 100,
    unit: ' 分',
    get: d => d.breakout
  },
  {
    id: 'game-breakout-2',
    icon: '🏓',
    name: '反弹达人',
    desc: '打砖块最高分达到 300',
    cat: '游戏',
    target: 300,
    unit: ' 分',
    get: d => d.breakout
  },
  {
    id: 'game-memory-1',
    icon: '🃏',
    name: '翻牌新手',
    desc: '完成一局 6 对记忆配对',
    cat: '游戏',
    target: 1,
    get: d => d.memory6
  },
  {
    id: 'game-memory-2',
    icon: '🧠',
    name: '过目不忘',
    desc: '8 对记忆配对用不超过 20 步完成',
    cat: '游戏',
    target: 20,
    lower: true,
    get: d => d.memory8
  },
  {
    id: 'game-memory-3',
    icon: '🎴',
    name: '记忆宫殿',
    desc: '10 对记忆配对用不超过 26 步完成',
    cat: '游戏',
    target: 26,
    lower: true,
    get: d => d.memory10
  },
  {
    id: 'game-ttt-1',
    icon: '⭕',
    name: '三子连珠',
    desc: '井字棋累计获胜 1 局',
    cat: '游戏',
    target: 1,
    unit: ' 胜',
    get: d => d.tttWin
  },
  {
    id: 'game-ttt-2',
    icon: '❌',
    name: '常胜将军',
    desc: '井字棋累计获胜 10 局',
    cat: '游戏',
    target: 10,
    unit: ' 胜',
    get: d => d.tttWin
  },
  {
    id: 'game-typing-1',
    icon: '⌨️',
    name: '指尖热身',
    desc: '打字测试速度达到 40',
    cat: '游戏',
    target: 40,
    unit: ' 分',
    get: d => d.typing
  },
  {
    id: 'game-typing-2',
    icon: '⚡',
    name: '键盘飞人',
    desc: '打字测试速度达到 75',
    cat: '游戏',
    target: 75,
    unit: ' 分',
    get: d => d.typing
  },
  {
    id: 'eff-calc-1',
    icon: '🧮',
    name: '算术起步',
    desc: '计算器历史记录达到 10 条',
    cat: '效率',
    target: 10,
    unit: ' 条',
    get: d => d.calcCount
  },
  {
    id: 'eff-calc-2',
    icon: '📐',
    name: '计算常客',
    desc: '计算器历史记录达到 50 条',
    cat: '效率',
    target: 50,
    unit: ' 条',
    get: d => d.calcCount
  },
  {
    id: 'eff-todo-1',
    icon: '✅',
    name: '完成任务',
    desc: '累计完成 10 条待办',
    cat: '效率',
    target: 10,
    unit: ' 条',
    get: d => d.todoDone
  },
  {
    id: 'eff-todo-2',
    icon: '🗂️',
    name: '效率达人',
    desc: '累计完成 30 条待办',
    cat: '效率',
    target: 30,
    unit: ' 条',
    get: d => d.todoDone
  },
  {
    id: 'eff-habit-1',
    icon: '🌱',
    name: '习惯萌芽',
    desc: '习惯打卡累计 7 次',
    cat: '效率',
    target: 7,
    unit: ' 次',
    get: d => d.habitChecks
  },
  {
    id: 'eff-habit-2',
    icon: '🌳',
    name: '坚持成林',
    desc: '习惯打卡累计 30 次',
    cat: '效率',
    target: 30,
    unit: ' 次',
    get: d => d.habitChecks
  },
  {
    id: 'explore-all-round',
    icon: '🌟',
    name: '全能选手',
    desc: '解锁 10 个其他成就',
    cat: '探索',
    target: 10,
    meta: true,
    get: d => d.baseUnlocked
  },
  {
    id: 'explore-collector',
    icon: '🏅',
    name: '成就收藏家',
    desc: '解锁 15 个其他成就',
    cat: '探索',
    target: 15,
    meta: true,
    get: d => d.baseUnlocked
  }
]

function makeRow(def, d) {
  let value = 0
  try {
    value = Math.max(0, Number(def.get(d)) || 0)
  } catch (e) {
    value = 0
  }
  const done = def.lower ? value > 0 && value <= def.target : value >= def.target
  const ratio = def.lower
    ? value > 0
      ? Math.min(1, def.target / value)
      : 0
    : Math.min(1, value / def.target)
  return { ...def, value, done, ratio }
}

const baseRows = computed(() => ACHIEVEMENTS.filter(a => !a.meta).map(a => makeRow(a, data.value)))
const baseUnlocked = computed(() => baseRows.value.filter(a => a.done).length)

const rows = computed(() => {
  const metaData = { baseUnlocked: baseUnlocked.value }
  const metaRows = ACHIEVEMENTS.filter(a => a.meta).map(a => makeRow(a, metaData))
  return [...baseRows.value, ...metaRows]
})

const totalCount = computed(() => rows.value.length)
const unlockedCount = computed(() => rows.value.filter(a => a.done).length)
const percent = computed(() =>
  totalCount.value ? Math.round((unlockedCount.value / totalCount.value) * 100) : 0
)

const filtered = computed(() => {
  const list = cat.value === '全部' ? rows.value : rows.value.filter(a => a.cat === cat.value)
  return [...list].sort((a, b) => Number(b.done) - Number(a.done))
})

function refresh() {
  data.value = readAll()
}

function cardStyle(a) {
  const color = CAT_COLORS[a.cat] || '#b9a58f'
  if (!a.done) {
    return {
      border: '1px solid var(--border)',
      background: 'var(--panel2)',
      borderRadius: '12px',
      padding: '13px 14px',
      filter: 'grayscale(0.9)',
      opacity: '0.66',
      transition: 'all 0.2s ease'
    }
  }
  return {
    border: '1px solid ' + color,
    background: 'linear-gradient(135deg, ' + color + '26, ' + color + '0d)',
    borderRadius: '12px',
    padding: '13px 14px',
    boxShadow: '0 8px 18px -14px ' + color,
    transition: 'all 0.2s ease'
  }
}

function progressText(a) {
  const unit = a.unit || ''
  if (a.lower) {
    if (a.value > 0) return '当前最少 ' + a.value + ' 步 / 目标 ≤ ' + a.target + ' 步'
    return '尚未完成 · 目标 ≤ ' + a.target + ' 步'
  }
  return '当前 ' + a.value + unit + ' / 目标 ' + a.target + unit
}
</script>
