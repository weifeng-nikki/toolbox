<template>
  <div>
    <div class="panel">
      <div class="row">
        <div class="field">
          <label>税前月薪（元）</label>
          <input v-model.number="salary" type="number" min="0" />
        </div>
        <div class="field">
          <label>社保公积金（元/月）</label>
          <input v-model.number="insurance" type="number" min="0" />
        </div>
        <div class="field">
          <label>专项附加扣除（元/月）</label>
          <input v-model.number="deduction" type="number" min="0" />
        </div>
        <div class="field">
          <label>年终奖（元，可选）</label>
          <input v-model.number="bonus" type="number" min="0" />
        </div>
      </div>
      <p class="hint">按月度税率表测算，未考虑累计预扣法与地方差异，结果仅供参考。</p>
    </div>

    <div class="stats-grid">
      <div class="stat">
        <b>{{ fmt(monthTax) }}</b>
        <span>月度个税</span>
      </div>
      <div class="stat">
        <b>{{ fmt(monthNet) }}</b>
        <span>月到手</span>
      </div>
      <div class="stat">
        <b>{{ fmt(bonusTax) }}</b>
        <span>年终奖个税</span>
      </div>
      <div class="stat">
        <b>{{ fmt(totalNet) }}</b>
        <span>合计到手</span>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">计算明细</div>
      <div class="kv">
        <span>应纳税所得额</span><b>{{ fmt(taxable) }} 元</b>
      </div>
      <div class="kv">
        <span>适用税率</span><b>{{ rate }}%（速算扣除 {{ fmt(quick) }}）</b>
      </div>
      <div class="kv">
        <span>年终奖计税方式</span><b>单独计税（奖金 ÷ 12 查表）</b>
      </div>
      <div class="kv">
        <span>年终奖到手</span><b>{{ fmt(bonusNet) }} 元</b>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const BRACKETS = [
  [3000, 0.03, 0],
  [12000, 0.1, 210],
  [25000, 0.2, 1410],
  [35000, 0.25, 2660],
  [55000, 0.3, 4410],
  [80000, 0.35, 7160],
  [Infinity, 0.45, 15160]
]

function lookup(amount) {
  for (const [limit, rate, quick] of BRACKETS) {
    if (amount <= limit) return { rate, quick }
  }
  return { rate: 0.45, quick: 15160 }
}

const salary = ref(20000)
const insurance = ref(3000)
const deduction = ref(0)
const bonus = ref(0)

const taxable = computed(() =>
  Math.max(0, (salary.value || 0) - (insurance.value || 0) - 5000 - (deduction.value || 0))
)

const month = computed(() => lookup(taxable.value))

const monthTax = computed(() => Math.max(0, taxable.value * month.value.rate - month.value.quick))

const monthNet = computed(() =>
  Math.max(0, (salary.value || 0) - (insurance.value || 0) - monthTax.value)
)

const bonusTax = computed(() => {
  const b = bonus.value || 0
  if (b <= 0) return 0
  const { rate, quick } = lookup(b / 12)
  return Math.max(0, b * rate - quick)
})

const bonusNet = computed(() => Math.max(0, (bonus.value || 0) - bonusTax.value))

const totalNet = computed(() => monthNet.value + bonusNet.value)

const rate = computed(() => (month.value.rate * 100).toFixed(0))
const quick = computed(() => month.value.quick)

const fmt = n => (Number(n) || 0).toLocaleString('zh-CN', { maximumFractionDigits: 2 })
</script>
