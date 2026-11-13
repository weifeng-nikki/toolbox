<template>
  <div>
    <div class="panel">
      <div class="panel-title">
        抽卡模拟器
        <span class="pill">🎫 {{ stats.tickets }} 券</span>
      </div>

      <p class="hint" style="margin: 0 0 12px">
        纯本地模拟，无任何真实消费。所有结果由浏览器随机数生成，仅用于娱乐。
      </p>

      <div class="stats-grid">
        <div class="stat">
          <b>{{ stats.total }}</b>
          <span>总抽数</span>
        </div>
        <div class="stat">
          <b>{{ stats.ssr }}</b>
          <span>SSR</span>
        </div>
        <div class="stat">
          <b>{{ stats.sr }}</b>
          <span>SR</span>
        </div>
        <div class="stat">
          <b>{{ stats.r }}</b>
          <span>R</span>
        </div>
        <div class="stat">
          <b>{{ stats.pity }}</b>
          <span>保底计数 / 90</span>
        </div>
      </div>

      <div class="progress" style="margin: 14px 0 6px">
        <div class="progress-bar" :style="{ width: pityPercent + '%' }"></div>
      </div>
      <div class="row" style="justify-content: space-between">
        <span class="hint" style="margin: 0">累计 {{ stats.pity }} 抽未出 SSR，第 90 抽必出</span>
        <span class="pill">距保底还差 {{ pityLeft }} 抽</span>
      </div>

      <div class="row" style="margin-top: 14px">
        <button class="btn primary" :disabled="busy || stats.tickets < 10" @click="drawSingle">
          单抽（10 券）
        </button>
        <button class="btn primary" :disabled="busy || stats.tickets < 100" @click="drawTen">
          十连（100 券）
        </button>
        <button class="btn" @click="claimTickets">补充券 +500</button>
        <span v-if="busy" class="pill">翻牌中…</span>
      </div>

      <p v-if="notice.text" :class="notice.kind">{{ notice.text }}</p>

      <div
        v-if="results.length"
        style="
          display: grid;
          grid-template-columns: repeat(auto-fill, minmax(102px, 1fr));
          gap: 10px;
          margin-top: 16px;
        "
      >
        <div v-for="r in results" :key="r.uid" :style="cardOuterStyle(r)">
          <div :style="cardInnerStyle(r)">
            <div :style="cardBackStyle">
              <span>✦</span>
            </div>
            <div :style="cardFrontStyle(r)">
              <span
                style="font-size: 11px; font-weight: 700; letter-spacing: 0.08em"
                :style="{ color: RARITY[r.rarity].color }"
              >
                {{ r.rarity }}
              </span>
              <span style="font-size: 14px; font-weight: 650; text-align: center; line-height: 1.35">
                {{ r.name }}
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">概率公示与保底规则</div>
      <div class="kv">
        <span>SSR</span>
        <b>0.6%</b>
      </div>
      <div class="kv">
        <span>SR</span>
        <b>5.1%</b>
      </div>
      <div class="kv">
        <span>R</span>
        <b>94.3%</b>
      </div>
      <div class="kv">
        <span>十连保底</span>
        <b>至少 1 张 SR 及以上</b>
      </div>
      <div class="kv">
        <span>SSR 保底</span>
        <b>90 抽内必出</b>
      </div>
      <p class="hint">
        每抽独立按概率判定；若连续 89 抽没有 SSR，则第 90 抽强制为 SSR，之后保底计数归零。十连若全部为 R，会把最后一张替换为 SR 或 SSR。
      </p>
    </div>

    <div class="panel">
      <div class="panel-title">
        最近抽卡记录
        <span class="pill">{{ stats.history.length }} / 20</span>
      </div>
      <div v-if="!stats.history.length" class="hint">还没有抽卡记录，先来一发单抽吧。</div>
      <div v-else style="display: flex; flex-wrap: wrap; gap: 7px">
        <span
          v-for="(h, i) in stats.history"
          :key="i"
          class="pill"
          :title="historyTitle(h)"
          :style="{ background: RARITY[h.rarity].soft, color: RARITY[h.rarity].color }"
        >
          {{ h.rarity }} · {{ h.name }}
        </span>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">
        卡池编辑
        <span class="pill">共 {{ pool.length }} 张</span>
      </div>

      <div class="row">
        <input
          v-model="newName"
          maxlength="8"
          placeholder="角色名字"
          style="flex: 1; min-width: 150px"
          @keyup.enter="addCard"
        />
        <select v-model="newRarity" style="width: 100px">
          <option value="SSR">SSR</option>
          <option value="SR">SR</option>
          <option value="R">R</option>
        </select>
        <button class="btn primary" :disabled="!newName.trim()" @click="addCard">添加</button>
        <span class="pill">SSR {{ poolCount('SSR') }}</span>
        <span class="pill">SR {{ poolCount('SR') }}</span>
        <span class="pill">R {{ poolCount('R') }}</span>
      </div>

      <p class="hint">卡池保存在本机浏览器。若某个稀有度没有卡片，抽到时会自动降级到其他稀有度。</p>

      <div v-if="!pool.length" class="hint">卡池空空如也，添加几张卡再抽吧。</div>
      <div
        v-for="c in pool"
        :key="c.id"
        style="
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 9px 0;
          border-bottom: 1px dashed var(--border);
        "
      >
        <span
          class="pill"
          :style="{ background: RARITY[c.rarity].soft, color: RARITY[c.rarity].color }"
        >
          {{ c.rarity }}
        </span>
        <span style="flex: 1; min-width: 0; font-size: 14.5px">{{ c.name }}</span>
        <button class="btn small" @click="removeCard(c)">删除</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const POOL_KEY = 'gacha-pool'
const STATS_KEY = 'gacha-stats'

const RARITY = {
  SSR: { label: 'SSR', color: '#a8786f', soft: '#f0e2dc' },
  SR: { label: 'SR', color: '#8b7fa8', soft: '#e9e3f0' },
  R: { label: 'R', color: '#7d9889', soft: '#e4ece5' }
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function numOr(v, d) {
  const n = Number(v)
  return Number.isFinite(n) ? n : d
}

function defaultPool() {
  return [
    { id: uid(), name: '月下白鹭', rarity: 'SSR' },
    { id: uid(), name: '星海旅人', rarity: 'SSR' },
    { id: uid(), name: '雾林鹿', rarity: 'SR' },
    { id: uid(), name: '青柠汽水', rarity: 'SR' },
    { id: uid(), name: '旧书店长', rarity: 'SR' },
    { id: uid(), name: '打盹的猫', rarity: 'R' },
    { id: uid(), name: '路过的风', rarity: 'R' },
    { id: uid(), name: '小石灯', rarity: 'R' },
    { id: uid(), name: '纸飞机', rarity: 'R' },
    { id: uid(), name: '橡皮鸭', rarity: 'R' },
    { id: uid(), name: '麦田守望', rarity: 'R' },
    { id: uid(), name: '晴天云', rarity: 'R' }
  ]
}

function loadPool() {
  try {
    const raw = JSON.parse(localStorage.getItem(POOL_KEY) || 'null')
    if (!Array.isArray(raw)) return defaultPool()
    return raw
      .filter(x => x && typeof x.name === 'string' && RARITY[x.rarity])
      .map(x => ({
        id: typeof x.id === 'string' ? x.id : uid(),
        name: x.name.slice(0, 8),
        rarity: x.rarity
      }))
  } catch (e) {
    return defaultPool()
  }
}

function loadStats() {
  const fallback = { total: 0, ssr: 0, sr: 0, r: 0, pity: 0, tickets: 1000, history: [] }
  try {
    const raw = JSON.parse(localStorage.getItem(STATS_KEY) || 'null')
    if (!raw || typeof raw !== 'object') return fallback
    const history = Array.isArray(raw.history)
      ? raw.history
          .filter(h => h && RARITY[h.rarity] && typeof h.name === 'string')
          .slice(0, 20)
          .map(h => ({ name: h.name, rarity: h.rarity, at: Number(h.at) || 0 }))
      : []
    return {
      total: Math.max(0, Math.floor(numOr(raw.total, 0))),
      ssr: Math.max(0, Math.floor(numOr(raw.ssr, 0))),
      sr: Math.max(0, Math.floor(numOr(raw.sr, 0))),
      r: Math.max(0, Math.floor(numOr(raw.r, 0))),
      pity: Math.min(89, Math.max(0, Math.floor(numOr(raw.pity, 0)))),
      tickets: Math.max(0, Math.floor(numOr(raw.tickets, 1000))),
      history
    }
  } catch (e) {
    return fallback
  }
}

const pool = ref(loadPool())
const stats = ref(loadStats())
const newName = ref('')
const newRarity = ref('SR')
const results = ref([])
const busy = ref(false)
const notice = ref({ text: '', kind: 'ok' })

let revealTimers = []

watch(
  pool,
  v => {
    try {
      localStorage.setItem(POOL_KEY, JSON.stringify(v))
    } catch (e) {
      // 本地存储不可用时忽略
    }
  },
  { deep: true }
)

watch(
  stats,
  v => {
    try {
      localStorage.setItem(STATS_KEY, JSON.stringify(v))
    } catch (e) {
      // 本地存储不可用时忽略
    }
  },
  { deep: true }
)

const pityLeft = computed(() => Math.max(1, 90 - stats.value.pity))
const pityPercent = computed(() => Math.min(100, Math.round((stats.value.pity / 90) * 100)))

function poolCount(rarity) {
  return pool.value.filter(c => c.rarity === rarity).length
}

function pickItem(want) {
  const order = want === 'SSR' ? ['SSR', 'SR', 'R'] : want === 'SR' ? ['SR', 'SSR', 'R'] : ['R', 'SR', 'SSR']
  for (const r of order) {
    const list = pool.value.filter(c => c.rarity === r)
    if (list.length) return list[Math.floor(Math.random() * list.length)]
  }
  return { name: '空白卡牌', rarity: 'R' }
}

function nextRarity() {
  let rarity
  if (stats.value.pity >= 89) {
    rarity = 'SSR'
  } else {
    const r = Math.random()
    rarity = r < 0.006 ? 'SSR' : r < 0.057 ? 'SR' : 'R'
  }
  stats.value.pity = rarity === 'SSR' ? 0 : stats.value.pity + 1
  return rarity
}

function makeResult(rarity) {
  const item = pickItem(rarity)
  return { uid: uid(), name: item.name, rarity: item.rarity, flipped: false }
}

function clearRevealTimers() {
  for (const t of revealTimers) clearTimeout(t)
  revealTimers = []
}

function summary(list) {
  const ssr = list.filter(x => x.rarity === 'SSR').length
  const sr = list.filter(x => x.rarity === 'SR').length
  if (ssr) return '获得 ' + ssr + ' 张 SSR、' + sr + ' 张 SR'
  if (sr) return '获得 ' + sr + ' 张 SR'
  return '本次全是 R 卡，下次一定'
}

function commit(list, label) {
  const s = stats.value
  for (const r of list) {
    s.total++
    if (r.rarity === 'SSR') s.ssr++
    else if (r.rarity === 'SR') s.sr++
    else s.r++
    s.history.unshift({ name: r.name, rarity: r.rarity, at: Date.now() })
  }
  s.history = s.history.slice(0, 20)
  results.value = list
  notice.value = { text: label + '完成：' + summary(list), kind: 'ok' }
  clearRevealTimers()
  busy.value = true
  list.forEach((r, i) => {
    revealTimers.push(
      setTimeout(() => {
        r.flipped = true
      }, 80 + i * 110)
    )
  })
  revealTimers.push(
    setTimeout(() => {
      busy.value = false
    }, 80 + list.length * 110 + 520)
  )
}

function fail(text) {
  notice.value = { text, kind: 'err' }
}

function drawSingle() {
  if (busy.value) return
  if (!pool.value.length) return fail('卡池是空的，请先添加至少一张卡。')
  if (stats.value.tickets < 10) return fail('抽卡券不足，先点「补充券」吧。')
  stats.value.tickets -= 10
  const result = makeResult(nextRarity())
  commit([result], '单抽')
}

function drawTen() {
  if (busy.value) return
  if (!pool.value.length) return fail('卡池是空的，请先添加至少一张卡。')
  if (stats.value.tickets < 100) return fail('抽卡券不足 100，先补充一些吧。')
  stats.value.tickets -= 100
  const list = []
  for (let i = 0; i < 10; i++) list.push(makeResult(nextRarity()))
  if (!list.some(x => x.rarity !== 'R')) {
    const forced = Math.random() < 0.1 ? 'SSR' : 'SR'
    list[9] = makeResult(forced)
    if (forced === 'SSR') stats.value.pity = 0
  }
  commit(list, '十连')
}

function claimTickets() {
  stats.value.tickets += 500
  notice.value = { text: '已补充 500 张抽卡券（本地模拟，无真实消费）。', kind: 'ok' }
}

function addCard() {
  const name = newName.value.trim()
  if (!name) return
  pool.value.push({ id: uid(), name: name.slice(0, 8), rarity: newRarity.value })
  newName.value = ''
}

function removeCard(card) {
  if (!window.confirm('确定从卡池删除「' + card.name + '」吗？')) return
  pool.value = pool.value.filter(c => c.id !== card.id)
}

function historyTitle(h) {
  if (!h.at) return h.name
  const d = new Date(h.at)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return h.name + ' · ' + hh + ':' + mm
}

const cardBackStyle = {
  position: 'absolute',
  inset: '0',
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
  backfaceVisibility: 'hidden',
  border: '1px dashed var(--border-strong)',
  borderRadius: '12px',
  background: 'linear-gradient(145deg, var(--panel2), var(--panel))',
  color: 'var(--muted)',
  fontSize: '22px',
  fontWeight: '700'
}

function cardOuterStyle(r) {
  return {
    perspective: '800px',
    height: '116px',
    transform: r.flipped && r.rarity === 'SSR' ? 'scale(1.05)' : 'scale(1)',
    transition: 'transform 0.45s cubic-bezier(0.2, 0.8, 0.3, 1)',
    zIndex: r.flipped && r.rarity === 'SSR' ? 2 : 1
  }
}

function cardInnerStyle(r) {
  return {
    position: 'relative',
    width: '100%',
    height: '100%',
    transformStyle: 'preserve-3d',
    transition: 'transform 0.55s cubic-bezier(0.2, 0.8, 0.3, 1)',
    transform: r.flipped ? 'rotateY(180deg)' : 'rotateY(0deg)'
  }
}

function cardFrontStyle(r) {
  const color = RARITY[r.rarity].color
  return {
    position: 'absolute',
    inset: '0',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    padding: '8px',
    backfaceVisibility: 'hidden',
    transform: 'rotateY(180deg)',
    border: '1px solid ' + color,
    borderRadius: '12px',
    background: 'linear-gradient(145deg, ' + color + '33, ' + color + '14)',
    boxShadow: r.rarity === 'SSR' ? '0 0 22px ' + color + 'aa' : '0 6px 14px -10px ' + color,
    color: '#4a4440'
  }
}

onBeforeUnmount(() => {
  clearRevealTimers()
})
</script>
