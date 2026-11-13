<template>
  <div>
    <div class="panel">
      <div class="panel-title">添加待办</div>
      <div class="row">
        <input
          v-model="newText"
          maxlength="80"
          placeholder="输入待办内容，回车即可添加"
          style="flex: 1; min-width: 180px"
          @keyup.enter="addTodo"
        />
        <select v-model="newPriority" style="width: 88px">
          <option value="high">高优先级</option>
          <option value="mid">中优先级</option>
          <option value="low">低优先级</option>
        </select>
        <input v-model="newDue" type="date" style="width: 150px" title="可选截止日期" />
        <button class="btn primary" :disabled="!newText.trim()" @click="addTodo">添加</button>
      </div>
      <p class="hint">双击条目文字也可进入编辑；数据保存在本机浏览器（todo.v1）。</p>
    </div>

    <div class="panel">
      <div class="row" style="justify-content: space-between; margin-bottom: 8px">
        <div class="row">
          <button
            v-for="f in filters"
            :key="f.key"
            class="btn small"
            :class="{ primary: filter === f.key }"
            @click="filter = f.key"
          >
            {{ f.label }}
          </button>
        </div>
        <span class="hint" style="margin: 0">{{ filtered.length }} 项显示中</span>
      </div>

      <div v-if="!todos.length" class="hint" style="padding: 18px 0">还没有待办，先添加一条吧。</div>
      <div v-else-if="!filtered.length" class="hint" style="padding: 18px 0">当前筛选条件下没有待办。</div>

      <div
        v-for="t in filtered"
        :key="t.id"
        class="row"
        style="align-items: flex-start; gap: 10px; padding: 10px 0; border-bottom: 1px dashed var(--border)"
      >
        <input
          type="checkbox"
          :checked="t.done"
          style="margin-top: 5px"
          :title="t.done ? '标记为未完成' : '标记为已完成'"
          @change="toggle(t)"
        />
        <div style="flex: 1; min-width: 0">
          <template v-if="editingId === t.id">
            <div class="row">
              <input v-model="editText" maxlength="80" style="flex: 1; min-width: 120px" @keyup.enter="saveEdit(t)" @keyup.esc="cancelEdit" />
              <button class="btn small primary" @click="saveEdit(t)">保存</button>
              <button class="btn small" @click="cancelEdit">取消</button>
            </div>
          </template>
          <template v-else>
            <div style="display: flex; align-items: center; gap: 8px; flex-wrap: wrap">
              <span
                :style="{
                  textDecoration: t.done ? 'line-through' : 'none',
                  color: t.done ? 'var(--muted)' : 'inherit',
                  wordBreak: 'break-word'
                }"
                @dblclick="startEdit(t)"
              >{{ t.text }}</span>
              <span class="pill" :style="priorityStyle(t.priority)">{{ priorityLabel(t.priority) }}</span>
              <span v-if="t.due" class="pill" :style="dueStyle(t)">{{ dueLabel(t) }}</span>
            </div>
          </template>
        </div>
        <div class="row" style="gap: 6px; flex-shrink: 0">
          <button v-if="editingId !== t.id" class="btn small" @click="startEdit(t)">编辑</button>
          <button class="btn small" @click="removeTodo(t.id)">删除</button>
        </div>
      </div>

      <div class="row" style="justify-content: space-between; margin-top: 14px">
        <span class="hint" style="margin: 0">共 {{ todos.length }} 项，已完成 {{ doneCount }} 项</span>
        <button class="btn small" :disabled="!doneCount" @click="clearDone">清除已完成</button>
      </div>
      <div class="progress" style="margin: 10px 0 4px">
        <div class="progress-bar" :style="{ width: percent + '%' }"></div>
      </div>
      <span class="hint" style="margin: 0">完成率 {{ percent }}%</span>
    </div>
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue'

const STORAGE_KEY = 'todo.v1'
const PRIORITY = {
  high: { label: '高', bg: 'var(--rose-soft)', color: 'var(--rose-ink)' },
  mid: { label: '中', bg: 'var(--lilac-soft)', color: 'var(--lilac-ink)' },
  low: { label: '低', bg: 'var(--sage-soft)', color: 'var(--sage-ink)' }
}
const filters = [
  { key: 'all', label: '全部' },
  { key: 'active', label: '未完成' },
  { key: 'done', label: '已完成' },
  { key: 'today', label: '今日到期' }
]

const todos = ref(loadTodos())
const newText = ref('')
const newPriority = ref('mid')
const newDue = ref('')
const filter = ref('all')
const editingId = ref(null)
const editText = ref('')

const todayStr = computed(() => toDateStr(new Date()))

const filtered = computed(() => {
  const list = todos.value
  if (filter.value === 'active') return list.filter(t => !t.done)
  if (filter.value === 'done') return list.filter(t => t.done)
  if (filter.value === 'today') return list.filter(t => !t.done && t.due && t.due <= todayStr.value)
  return list
})

const doneCount = computed(() => todos.value.filter(t => t.done).length)
const percent = computed(() => {
  if (!todos.value.length) return 0
  return Math.round(doneCount.value / todos.value.length * 100)
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

function loadTodos() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || '[]')
    if (!Array.isArray(raw)) return []
    return raw
      .filter(t => t && typeof t.text === 'string')
      .map(t => ({
        id: typeof t.id === 'string' ? t.id : uid(),
        text: t.text,
        done: !!t.done,
        priority: PRIORITY[t.priority] ? t.priority : 'mid',
        due: typeof t.due === 'string' ? t.due : ''
      }))
  } catch {
    return []
  }
}

function saveTodos() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(todos.value))
  } catch {
    // 本地存储不可用时忽略
  }
}

watch(todos, saveTodos, { deep: true })

function priorityLabel(p) {
  return PRIORITY[p] ? PRIORITY[p].label : '中'
}

function priorityStyle(p) {
  const item = PRIORITY[p] || PRIORITY.mid
  return { background: item.bg, color: item.color }
}

function isOverdue(t) {
  return !!t.due && !t.done && t.due < todayStr.value
}

function dueLabel(t) {
  if (isOverdue(t)) return `截止 ${t.due} · 已逾期`
  if (t.due === todayStr.value && !t.done) return '今天到期'
  return `截止 ${t.due}`
}

function dueStyle(t) {
  if (isOverdue(t)) return { background: 'var(--rose-soft)', color: 'var(--danger)' }
  if (t.due === todayStr.value && !t.done) return { background: 'var(--blue-soft)', color: 'var(--blue-ink)' }
  return { background: 'var(--panel2)', color: 'var(--muted)' }
}

function addTodo() {
  const text = newText.value.trim()
  if (!text) return
  todos.value.unshift({
    id: uid(),
    text: text.slice(0, 80),
    done: false,
    priority: newPriority.value,
    due: newDue.value || ''
  })
  newText.value = ''
  newDue.value = ''
}

function toggle(t) {
  t.done = !t.done
}

function removeTodo(id) {
  todos.value = todos.value.filter(t => t.id !== id)
  if (editingId.value === id) editingId.value = null
}

function startEdit(t) {
  editingId.value = t.id
  editText.value = t.text
}

function saveEdit(t) {
  const text = editText.value.trim()
  if (text) t.text = text.slice(0, 80)
  editingId.value = null
  editText.value = ''
}

function cancelEdit() {
  editingId.value = null
  editText.value = ''
}

function clearDone() {
  if (!doneCount.value) return
  if (!window.confirm(`确定清除 ${doneCount.value} 条已完成待办吗？`)) return
  todos.value = todos.value.filter(t => !t.done)
}
</script>
