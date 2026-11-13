<template>
  <div>
    <div class="panel">
      <div class="panel-title">添加习惯</div>
      <div class="row">
        <input
          v-model="newName"
          maxlength="12"
          placeholder="习惯名称，如：早起、读书"
          style="flex: 1; min-width: 160px"
          @keyup.enter="addHabit"
        />
        <input v-model="newColor" type="color" class="color-pick" title="选择颜色" />
        <button class="btn primary" :disabled="!newName.trim()" @click="addHabit">添加</button>
      </div>
      <p class="hint">每个习惯记录最近 30 天，点击日期格子切换打卡状态。数据保存在本机浏览器。</p>
    </div>

    <div v-if="!habits.length" class="panel">
      <p class="hint">还没有习惯，先在上方添加一个吧。</p>
    </div>

    <div v-for="h in habits" :key="h.id" class="panel">
      <div class="habit-head">
        <span class="dot" :style="{ background: h.color }"></span>
        <template v-if="editingId === h.id">
          <input
            v-model="editName"
            maxlength="12"
            class="rename"
            @keyup.enter="saveRename(h)"
            @keyup.esc="cancelRename"
          />
          <button class="btn small primary" @click="saveRename(h)">保存</button>
          <button class="btn small" @click="cancelRename">取消</button>
        </template>
        <template v-else>
          <b class="habit-name">{{ h.name }}</b>
          <span class="pill">连续 {{ streak(h) }} 天</span>
          <span class="pill">本月 {{ monthCount(h) }} 次</span>
          <span class="spacer"></span>
          <button class="btn small" @click="startRename(h)">重命名</button>
          <button class="btn small" @click="removeHabit(h.id)">删除</button>
        </template>
      </div>

      <div class="days-grid">
        <button
          v-for="d in last30"
          :key="d.date"
          type="button"
          class="day"
          :class="{ checked: has(h, d.date), today: d.isToday }"
          :style="has(h, d.date) ? { background: h.color, borderColor: h.color } : {}"
          :title="d.date"
          @click="toggle(h, d.date)"
        >
          <span class="dow">{{ d.dow }}</span>
          <span class="num">{{ d.day }}</span>
        </button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const STORAGE_KEY = 'habits-v1'
const PALETTE = ['#5f7d6a', '#8fa9bd', '#a79bba', '#c89ba4', '#c9a36a', '#7fa8a0']

const habits = ref(loadHabits())
const newName = ref('')
const newColor = ref(PALETTE[0])
const editingId = ref(null)
const editName = ref('')

const last30 = computed(() => {
  const list = []
  const now = new Date()
  const dows = ['日', '一', '二', '三', '四', '五', '六']
  for (let i = 29; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth(), now.getDate() - i)
    list.push({
      date: toDateStr(d),
      day: d.getDate(),
      dow: dows[d.getDay()],
      isToday: i === 0
    })
  }
  return list
})

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function toDateStr(d) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

function loadHabits() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    if (!Array.isArray(raw)) return []
    return raw
      .filter(h => h && typeof h.name === 'string' && Array.isArray(h.days))
      .map(h => ({
        id: typeof h.id === 'string' ? h.id : uid(),
        name: h.name,
        color: typeof h.color === 'string' ? h.color : PALETTE[0],
        days: h.days.filter(d => typeof d === 'string')
      }))
  } catch {
    return []
  }
}

function saveHabits() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(habits.value))
  } catch {
    // 本地存储不可用时忽略
  }
}

watch(habits, saveHabits, { deep: true })

function has(h, date) {
  return h.days.includes(date)
}

function toggle(h, date) {
  const i = h.days.indexOf(date)
  if (i >= 0) h.days.splice(i, 1)
  else h.days.push(date)
}

function streak(h) {
  const set = new Set(h.days)
  const d = new Date()
  if (!set.has(toDateStr(d))) d.setDate(d.getDate() - 1)
  let n = 0
  while (set.has(toDateStr(d))) {
    n++
    d.setDate(d.getDate() - 1)
  }
  return n
}

function monthCount(h) {
  const prefix = toDateStr(new Date()).slice(0, 7)
  return h.days.filter(d => d.startsWith(prefix)).length
}

function addHabit() {
  const name = newName.value.trim()
  if (!name) return
  habits.value.push({
    id: uid(),
    name: name.slice(0, 12),
    color: newColor.value,
    days: []
  })
  newName.value = ''
  newColor.value = PALETTE[habits.value.length % PALETTE.length]
}

function removeHabit(id) {
  const h = habits.value.find(x => x.id === id)
  if (!h) return
  if (!window.confirm(`确定删除习惯「${h.name}」吗？记录将一并清除。`)) return
  habits.value = habits.value.filter(x => x.id !== id)
}

function startRename(h) {
  editingId.value = h.id
  editName.value = h.name
}

function saveRename(h) {
  const name = editName.value.trim()
  if (name) h.name = name.slice(0, 12)
  editingId.value = null
}

function cancelRename() {
  editingId.value = null
}
</script>

<style scoped>
.color-pick {
  width: 46px;
  height: 38px;
  padding: 3px;
  flex-shrink: 0;
}

.habit-head {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
  margin-bottom: 12px;
}

.dot {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  flex-shrink: 0;
}

.habit-name {
  font-size: 15.5px;
}

.spacer {
  flex: 1;
}

.rename {
  width: 160px;
  padding: 6px 9px;
}

.days-grid {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  gap: 6px;
}

.day {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1px;
  padding: 5px 0;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--panel2);
  color: var(--muted);
  font-family: inherit;
  cursor: pointer;
  transition: transform 0.1s ease, background 0.15s ease, border-color 0.15s ease;
}

.day:hover {
  border-color: var(--tint);
}

.day.checked {
  color: #fff;
}

.day.checked .dow {
  opacity: 0.85;
}

.day.today {
  outline: 2px solid var(--tint);
  outline-offset: 1px;
}

.dow {
  font-size: 10.5px;
  line-height: 1.2;
}

.num {
  font-size: 13.5px;
  font-weight: 600;
  line-height: 1.2;
  font-variant-numeric: tabular-nums;
}

@media (max-width: 520px) {
  .days-grid {
    gap: 4px;
  }

  .day {
    padding: 4px 0;
  }
}
</style>
