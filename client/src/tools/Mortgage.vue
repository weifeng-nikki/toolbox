<template>
  <div>
    <div class="panel">
      <div class="row">
        <div class="field">
          <label>贷款金额（万元）</label>
          <input v-model.number="amount" type="number" min="1" style="width: 130px" />
        </div>
        <div class="field">
          <label>年限（年）</label>
          <input v-model.number="years" type="number" min="1" max="50" style="width: 90px" />
        </div>
        <div class="field">
          <label>年利率（%）</label>
          <input v-model.number="rate" type="number" min="0" step="0.01" style="width: 100px" />
        </div>
        <div class="field">
          <label>还款方式</label>
          <select v-model="method">
            <option value="bx">等额本息</option>
            <option value="bj">等额本金</option>
          </select>
        </div>
      </div>
    </div>
    <template v-if="result">
      <div class="panel">
        <div class="stats-grid">
          <div class="stat">
            <b>{{ money(result.first) }}</b>
            <span>{{ method === 'bx' ? '每月月供' : '首月月供' }}</span>
          </div>
          <div v-if="method === 'bj'" class="stat">
            <b>{{ money(result.last) }}</b>
            <span>末月月供</span>
          </div>
          <div class="stat"><b>{{ money(result.interest) }}</b><span>总利息</span></div>
          <div class="stat"><b>{{ money(result.total) }}</b><span>还款总额</span></div>
        </div>
        <p class="hint" v-if="method === 'bj'">等额本金每月还款额逐月递减，每月固定递减 {{ money(result.dec) }}。</p>
      </div>
      <div class="panel">
        <div class="panel-title">还款明细（共 {{ result.rows.length }} 期）</div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>期数</th><th>月供</th><th>本金</th><th>利息</th><th>剩余本金</th></tr>
            </thead>
            <tbody>
              <tr v-for="row in result.rows" :key="row.i">
                <td>{{ row.i }}</td>
                <td>{{ money(row.pay) }}</td>
                <td>{{ money(row.principal) }}</td>
                <td>{{ money(row.interest) }}</td>
                <td>{{ money(row.remain) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div class="row" style="margin-top: 10px">
          <CopyButton :text="csv" label="复制明细 CSV" />
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import CopyButton from '../components/CopyButton.vue'

const amount = ref(100)
const years = ref(30)
const rate = ref(3.6)
const method = ref('bx')

function money(n) {
  return n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

const result = computed(() => {
  const P = amount.value * 10000
  const n = Math.round(years.value * 12)
  const r = rate.value / 100 / 12
  if (!(P > 0) || !(n > 0) || r < 0) return null

  if (method.value === 'bx') {
    const pow = Math.pow(1 + r, n)
    const monthly = r === 0 ? P / n : (P * r * pow) / (pow - 1)
    const rows = []
    let remain = P
    for (let i = 1; i <= n; i++) {
      const interest = remain * r
      const principal = monthly - interest
      remain -= principal
      rows.push({ i, pay: monthly, principal, interest, remain: Math.max(0, remain) })
    }
    return { first: monthly, last: monthly, dec: 0, total: monthly * n, interest: monthly * n - P, rows }
  }

  const principal = P / n
  const rows = []
  let remain = P
  let interestSum = 0
  for (let i = 1; i <= n; i++) {
    const interest = remain * r
    interestSum += interest
    rows.push({ i, pay: principal + interest, principal, interest, remain: Math.max(0, remain - principal) })
    remain -= principal
  }
  return {
    first: rows[0].pay,
    last: rows[n - 1].pay,
    dec: principal * r,
    total: P + interestSum,
    interest: interestSum,
    rows
  }
})

const csv = computed(() => {
  if (!result.value) return ''
  const head = '期数,月供,本金,利息,剩余本金'
  const body = result.value.rows
    .map(r => [r.i, r.pay.toFixed(2), r.principal.toFixed(2), r.interest.toFixed(2), r.remain.toFixed(2)].join(','))
    .join('\n')
  return `${head}\n${body}`
})
</script>

<style scoped>
.table-wrap {
  max-height: 320px;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: 8px;
}

table {
  width: 100%;
  border-collapse: collapse;
  font-size: 13px;
}

th,
td {
  padding: 6px 10px;
  text-align: right;
  border-bottom: 1px solid var(--border);
  font-variant-numeric: tabular-nums;
}

th {
  position: sticky;
  top: 0;
  background: var(--panel2);
  font-weight: 600;
}

td:first-child,
th:first-child {
  text-align: left;
}
</style>
