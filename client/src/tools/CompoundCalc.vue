<template>
  <div>
    <div class="panel">
      <div class="row">
        <div class="field">
          <label>初始本金（元）</label>
          <input v-model.number="principal" type="number" min="0" step="1000" style="width: 150px" />
        </div>
        <div class="field">
          <label>每月追加投入（元）</label>
          <input v-model.number="monthly" type="number" min="0" step="100" style="width: 150px" />
        </div>
        <div class="field">
          <label>年化收益率（%）</label>
          <input v-model.number="rate" type="number" step="0.1" style="width: 120px" />
        </div>
        <div class="field">
          <label>年限（年）</label>
          <input v-model.number="years" type="number" min="1" max="80" style="width: 100px" />
        </div>
        <div class="field">
          <label>计息方式</label>
          <select v-model="mode">
            <option value="month">按月复利</option>
            <option value="year">按年复利</option>
          </select>
        </div>
      </div>
      <p class="hint">
        按月复利：每月月初追加投入，月末按「月利率 = 年化收益率 ÷ 12」计息，公式 余额 =（余额 + 月投）×（1 + 月利率）。
        按年复利：每年年初把当年 12 个月的追加额一次性计入，年末按年利率计息一次，公式 余额 =（余额 + 月投 × 12）×（1 + 年利率）。
      </p>
    </div>

    <template v-if="result">
      <div class="panel">
        <div class="stats-grid">
          <div class="stat"><b>{{ money(result.end) }}</b><span>期末总资产（元）</span></div>
          <div class="stat"><b>{{ money(result.invested) }}</b><span>总投入本金（元）</span></div>
          <div class="stat"><b>{{ money(result.profit) }}</b><span>总收益（元）</span></div>
          <div class="stat"><b>{{ result.rateText }}</b><span>收益率</span></div>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">逐年明细（共 {{ result.rows.length }} 年）</div>
        <div class="table-wrap">
          <table>
            <thead>
              <tr><th>年份</th><th>年末本金累计</th><th>年末资产</th></tr>
            </thead>
            <tbody>
              <tr v-for="row in result.rows" :key="row.year">
                <td>第 {{ row.year }} 年</td>
                <td>{{ money(row.invested) }}</td>
                <td>{{ money(row.balance) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </template>
    <div v-else class="panel">
      <p class="hint" style="margin: 0">请输入有效的本金、收益率与年限（年限需大于 0，收益率需大于 -100%）。</p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const principal = ref(100000)
const monthly = ref(2000)
const rate = ref(5)
const years = ref(20)
const mode = ref('month')

function money(n) {
  return Number(n).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
}

const result = computed(() => {
  const p = Number(principal.value)
  const m = Number(monthly.value)
  const r = Number(rate.value)
  const y = Math.floor(Number(years.value))
  if (!Number.isFinite(p) || p < 0) return null
  if (!Number.isFinite(m) || m < 0) return null
  if (!Number.isFinite(r) || r <= -100) return null
  if (!Number.isFinite(y) || y <= 0) return null

  const rows = []
  let balance = p
  if (mode.value === 'month') {
    const i = r / 100 / 12
    for (let year = 1; year <= y; year++) {
      for (let k = 0; k < 12; k++) balance = (balance + m) * (1 + i)
      rows.push({ year, invested: p + m * 12 * year, balance })
    }
  } else {
    const R = r / 100
    for (let year = 1; year <= y; year++) {
      balance = (balance + m * 12) * (1 + R)
      rows.push({ year, invested: p + m * 12 * year, balance })
    }
  }

  const invested = p + m * 12 * y
  const profit = balance - invested
  const rateText = invested > 0 ? `${((profit / invested) * 100).toFixed(2)}%` : '—'
  return { end: balance, invested, profit, rateText, rows }
})
</script>

<style scoped>
.table-wrap {
  max-height: 360px;
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
