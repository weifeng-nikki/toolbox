<template>
  <div>
    <div class="panel">
      <div class="panel-title">参与人员（{{ participants.length }} 人）</div>
      <div
        v-for="(p, idx) in participants"
        :key="p.id"
        class="row"
        style="margin-bottom: 8px; align-items: center"
      >
        <span class="hint" style="margin: 0; width: 24px">{{ idx + 1 }}</span>
        <input v-model="p.name" maxlength="12" placeholder="姓名" style="flex: 1; min-width: 120px" />
        <input
          v-model="p.adj"
          type="number"
          step="0.01"
          placeholder="调整 ±元"
          title="正数=多付，负数=少付，留空为 0"
          style="width: 120px"
        />
        <button class="btn small" :disabled="participants.length <= 1" @click="removeParticipant(idx)">删除</button>
      </div>
      <div class="row" style="margin-top: 10px">
        <button class="btn small" @click="addParticipant">+ 添加成员</button>
        <input v-model.number="genCount" type="number" min="2" max="30" style="width: 80px" title="按人数生成" />
        <button class="btn small" @click="generateParticipants">按人数生成</button>
        <span class="hint" style="margin: 0">「调整」留空即可；正数表示该成员多付，负数表示少付。</span>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">简单 AA</div>
      <div class="row" style="margin-bottom: 10px">
        <div class="field" style="margin-bottom: 0">
          <label>总金额（元）</label>
          <input v-model="total" type="number" min="0" step="0.01" style="width: 180px" />
        </div>
        <span class="pill">共 {{ participants.length }} 人</span>
      </div>
      <p v-if="simpleResult.error" class="err">{{ simpleResult.error }}</p>
      <template v-else>
        <div class="stats-grid" style="margin-bottom: 12px">
          <div class="stat"><b>¥{{ yuan(simpleResult.totalCents) }}</b><span>总金额</span></div>
          <div class="stat"><b>{{ participants.length }}</b><span>参与人数</span></div>
          <div class="stat"><b>¥{{ yuan(simpleAverage) }}</b><span>人均参考</span></div>
        </div>
        <table :style="tableStyle">
          <thead>
            <tr>
              <th :style="thStyle">成员</th>
              <th :style="thNumStyle">调整</th>
              <th :style="thNumStyle">应付金额</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in simpleResult.rows" :key="row.id">
              <td :style="tdStyle">{{ row.name }}</td>
              <td :style="tdNumStyle">{{ row.adj ? (row.adj > 0 ? '+' : '') + yuan(row.adj) : '—' }}</td>
              <td :style="tdNumStyle"><b>¥{{ yuan(row.cents) }}</b></td>
            </tr>
          </tbody>
        </table>
        <p class="hint">除不尽时按「分」分摊，前几位多 1 分，合计与总金额完全一致。</p>
        <div class="row" style="margin-top: 10px">
          <CopyButton :text="simpleCopy" label="复制分摊结果" />
        </div>
      </template>
    </div>

    <div class="panel">
      <div class="panel-title">多笔消费分账</div>
      <div class="row" style="margin-bottom: 12px">
        <input v-model="draftName" maxlength="20" placeholder="消费名称，如：晚餐" style="flex: 1; min-width: 140px" />
        <input v-model="draftAmount" type="number" min="0" step="0.01" placeholder="金额" style="width: 120px" />
        <select v-model="draftPayer" style="width: 140px" title="付款人">
          <option value="">选择付款人</option>
          <option v-for="(p, i) in participants" :key="p.id" :value="p.id">{{ displayName(p, i) }}</option>
        </select>
        <button class="btn primary" :disabled="!canAddExpense" @click="addExpense">添加</button>
      </div>

      <div v-if="!expenses.length" class="hint">还没有消费记录，添加后会自动计算每人应付、已付与转账方案。</div>
      <template v-else>
        <table :style="tableStyle">
          <thead>
            <tr>
              <th :style="thStyle">消费名称</th>
              <th :style="thNumStyle">金额</th>
              <th :style="thStyle">付款人</th>
              <th :style="thNumStyle">操作</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="e in expenses" :key="e.id">
              <td :style="tdStyle">{{ e.name }}</td>
              <td :style="tdNumStyle">¥{{ yuan(e.cents) }}</td>
              <td :style="tdStyle">{{ payerName(e.payerId) }}</td>
              <td :style="tdNumStyle">
                <button class="btn small" @click="removeExpense(e.id)">删除</button>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="row" style="margin-top: 14px; margin-bottom: 6px">
          <b>每人结算</b>
          <span class="pill">合计 ¥{{ yuan(advanced.totalCents) }}</span>
        </div>
        <table :style="tableStyle">
          <thead>
            <tr>
              <th :style="thStyle">成员</th>
              <th :style="thNumStyle">已付</th>
              <th :style="thNumStyle">应付</th>
              <th :style="thNumStyle">差额</th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="row in advanced.rows" :key="row.id">
              <td :style="tdStyle">{{ row.name }}</td>
              <td :style="tdNumStyle">¥{{ yuan(row.paid) }}</td>
              <td :style="tdNumStyle">¥{{ yuan(row.owed) }}</td>
              <td :style="tdNumStyle">
                <span
                  :style="{
                    color: row.diff > 0 ? 'var(--accent-ink)' : row.diff < 0 ? 'var(--danger)' : 'var(--muted)'
                  }"
                >
                  {{ row.diff > 0 ? '应收 +' : row.diff < 0 ? '应付 -' : '' }}{{ row.diff ? '¥' + yuan(Math.abs(row.diff)) : '¥0.00' }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>

        <div class="row" style="margin-top: 14px; margin-bottom: 6px">
          <b>转账方案</b>
          <span class="hint" style="margin: 0">按差额贪心撮合，笔数尽量少</span>
        </div>
        <div v-if="!advanced.settlements.length" class="ok">账目已平，无需转账。</div>
        <div v-else>
          <div v-for="(s, i) in advanced.settlements" :key="i" class="kv">
            <span>{{ s.from }} → {{ s.to }}</span>
            <b>¥{{ yuan(s.cents) }}</b>
          </div>
          <div class="row" style="margin-top: 10px">
            <CopyButton :text="settlementCopy" label="复制转账方案" />
          </div>
        </div>
      </template>
    </div>

    <div class="panel">
      <div class="row" style="justify-content: space-between">
        <span class="hint" style="margin: 0">金额均保留两位小数，内部按「分」计算避免浮点误差。</span>
        <button class="btn" @click="resetAll">重置</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import CopyButton from '../components/CopyButton.vue'

const participants = ref([
  { id: uid(), name: '我', adj: '' },
  { id: uid(), name: '小明', adj: '' },
  { id: uid(), name: '小红', adj: '' }
])
const total = ref(300)
const genCount = ref(4)
const expenses = ref([])
const draftName = ref('')
const draftAmount = ref('')
const draftPayer = ref('')

const tableStyle = { width: '100%', borderCollapse: 'collapse', fontSize: '14px' }
const thStyle = {
  textAlign: 'left',
  padding: '6px 8px',
  borderBottom: '1px solid var(--border)',
  color: 'var(--muted)',
  fontWeight: '500',
  fontSize: '13px'
}
const thNumStyle = { ...thStyle, textAlign: 'right' }
const tdStyle = { padding: '7px 8px', borderBottom: '1px dashed var(--border)' }
const tdNumStyle = {
  padding: '7px 8px',
  borderBottom: '1px dashed var(--border)',
  textAlign: 'right',
  fontVariantNumeric: 'tabular-nums',
  fontFamily: 'var(--mono)'
}

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function displayName(p, i) {
  const name = p && typeof p.name === 'string' ? p.name.trim() : ''
  return name || `成员${i + 1}`
}

function yuan(cents) {
  return (Number(cents || 0) / 100).toFixed(2)
}

const simpleResult = computed(() => {
  const list = participants.value
  const n = list.length
  if (!n) return { error: '请至少添加一位参与者', rows: [], totalCents: 0 }
  const totalNum = Number(total.value)
  if (!isFinite(totalNum) || totalNum <= 0) {
    return { error: '请输入大于 0 的总金额', rows: [], totalCents: 0 }
  }
  const totalCents = Math.round(totalNum * 100)
  const adjCents = []
  for (let i = 0; i < n; i++) {
    const p = list[i]
    const raw = p.adj === '' || p.adj === null || p.adj === undefined ? 0 : Number(p.adj)
    if (!isFinite(raw)) {
      return { error: `「${displayName(p, i)}」的调整金额不是有效数字`, rows: [], totalCents: 0 }
    }
    adjCents.push(Math.round(raw * 100))
  }
  const adjSum = adjCents.reduce((s, x) => s + x, 0)
  const baseCents = totalCents - adjSum
  if (baseCents < 0) return { error: '调整金额合计超过总金额，请检查', rows: [], totalCents: 0 }
  const base = Math.floor(baseCents / n)
  const rem = baseCents - base * n
  const rows = list.map((p, i) => ({
    id: p.id,
    name: displayName(p, i),
    adj: adjCents[i],
    cents: base + (i < rem ? 1 : 0) + adjCents[i]
  }))
  if (rows.some(r => r.cents < 0)) {
    return { error: '分摊后存在负数金额，请调整「多付 / 少付」设置', rows: [], totalCents: 0 }
  }
  return { error: '', rows, totalCents }
})

const simpleAverage = computed(() => {
  const r = simpleResult.value
  if (r.error || !r.rows.length) return 0
  return Math.round(r.totalCents / r.rows.length)
})

const simpleCopy = computed(() => {
  if (simpleResult.value.error) return ''
  return simpleResult.value.rows.map(r => `${r.name}：¥${yuan(r.cents)}`).join('\n')
})

const advanced = computed(() => {
  const list = participants.value
  const n = list.length
  const valid = expenses.value.filter(e => list.some(p => p.id === e.payerId))
  const totalCents = valid.reduce((s, e) => s + e.cents, 0)
  if (!n) return { rows: [], settlements: [], totalCents: 0 }

  const paid = {}
  for (const p of list) paid[p.id] = 0
  for (const e of valid) paid[e.payerId] += e.cents

  const base = Math.floor(totalCents / n)
  const rem = totalCents - base * n
  const rows = list.map((p, i) => {
    const owed = base + (i < rem ? 1 : 0)
    const paidCents = paid[p.id] || 0
    return { id: p.id, name: displayName(p, i), paid: paidCents, owed, diff: paidCents - owed }
  })

  const debtors = rows
    .filter(r => r.diff < 0)
    .map(r => ({ name: r.name, cents: -r.diff }))
    .sort((a, b) => b.cents - a.cents)
  const creditors = rows
    .filter(r => r.diff > 0)
    .map(r => ({ name: r.name, cents: r.diff }))
    .sort((a, b) => b.cents - a.cents)

  const settlements = []
  let di = 0
  let ci = 0
  while (di < debtors.length && ci < creditors.length) {
    const d = debtors[di]
    const c = creditors[ci]
    const pay = Math.min(d.cents, c.cents)
    if (pay > 0) settlements.push({ from: d.name, to: c.name, cents: pay })
    d.cents -= pay
    c.cents -= pay
    if (d.cents === 0) di++
    if (c.cents === 0) ci++
  }
  return { rows, settlements, totalCents }
})

const settlementCopy = computed(() =>
  advanced.value.settlements.map(s => `${s.from} → ${s.to}：¥${yuan(s.cents)}`).join('\n')
)

const canAddExpense = computed(() => {
  const amount = Number(draftAmount.value)
  return (
    !!draftName.value.trim() &&
    isFinite(amount) &&
    amount > 0 &&
    participants.value.some(p => p.id === draftPayer.value)
  )
})

function payerName(id) {
  const p = participants.value.find(x => x.id === id)
  if (!p) return '（已移除）'
  return p.name.trim() || '未命名'
}

function addExpense() {
  if (!canAddExpense.value) return
  const amount = Number(draftAmount.value)
  expenses.value.push({
    id: uid(),
    name: draftName.value.trim().slice(0, 20),
    cents: Math.round(amount * 100),
    payerId: draftPayer.value
  })
  draftName.value = ''
  draftAmount.value = ''
}

function removeExpense(id) {
  expenses.value = expenses.value.filter(e => e.id !== id)
}

function addParticipant() {
  participants.value.push({ id: uid(), name: `成员${participants.value.length + 1}`, adj: '' })
}

function removeParticipant(idx) {
  if (participants.value.length <= 1) return
  const p = participants.value[idx]
  if (!p) return
  const linked = expenses.value.filter(e => e.payerId === p.id).length
  if (linked && !window.confirm(`「${displayName(p, idx)}」有 ${linked} 条消费记录，删除后将一并移除，确定吗？`)) {
    return
  }
  participants.value = participants.value.filter((_, i) => i !== idx)
  expenses.value = expenses.value.filter(e => e.payerId !== p.id)
}

function generateParticipants() {
  let count = Math.floor(Number(genCount.value))
  if (!isFinite(count)) count = 2
  count = Math.min(30, Math.max(2, count))
  genCount.value = count
  if (expenses.value.length && !window.confirm('按人数重新生成将清空已有消费记录，确定吗？')) return
  const list = []
  for (let i = 1; i <= count; i++) list.push({ id: uid(), name: `成员${i}`, adj: '' })
  participants.value = list
  expenses.value = []
  draftPayer.value = ''
}

function resetAll() {
  participants.value = [
    { id: uid(), name: '我', adj: '' },
    { id: uid(), name: '小明', adj: '' },
    { id: uid(), name: '小红', adj: '' }
  ]
  total.value = 300
  genCount.value = 4
  expenses.value = []
  draftName.value = ''
  draftAmount.value = ''
  draftPayer.value = ''
}
</script>
