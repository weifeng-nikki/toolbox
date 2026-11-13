<template>
  <div>
    <div class="panel">
      <div class="row cat-row">
        <button
          v-for="c in cats"
          :key="c.id"
          class="btn small"
          :class="{ primary: c.id === cat.id }"
          @click="switchCat(c)"
        >
          {{ c.name }}
        </button>
      </div>
      <div class="row" style="margin-top: 14px">
        <div class="field" style="flex: 1; min-width: 140px">
          <label>数值</label>
          <input v-model="value" type="number" style="width: 100%" />
        </div>
        <div class="field" style="min-width: 120px">
          <label>从</label>
          <select v-model="from">
            <option v-for="u in cat.units" :key="u.name" :value="u.name">{{ u.name }}</option>
          </select>
        </div>
        <button class="btn swap" title="交换单位" @click="swap">⇄</button>
        <div class="field" style="min-width: 120px">
          <label>到</label>
          <select v-model="to">
            <option v-for="u in cat.units" :key="u.name" :value="u.name">{{ u.name }}</option>
          </select>
        </div>
      </div>
    </div>
    <div class="panel center">
      <div class="result-val">{{ result }}</div>
      <div class="result-unit">{{ from }} → {{ to }}</div>
      <CopyButton :text="result" />
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import CopyButton from '../components/CopyButton.vue'

const cats = [
  {
    id: 'length',
    name: '长度',
    units: [
      { name: '毫米', f: 0.001 },
      { name: '厘米', f: 0.01 },
      { name: '米', f: 1 },
      { name: '千米', f: 1000 },
      { name: '英寸', f: 0.0254 },
      { name: '英尺', f: 0.3048 },
      { name: '英里', f: 1609.344 }
    ]
  },
  {
    id: 'weight',
    name: '重量',
    units: [
      { name: '毫克', f: 1e-6 },
      { name: '克', f: 0.001 },
      { name: '千克', f: 1 },
      { name: '吨', f: 1000 },
      { name: '盎司', f: 0.0283495231 },
      { name: '磅', f: 0.45359237 }
    ]
  },
  {
    id: 'area',
    name: '面积',
    units: [
      { name: '平方米', f: 1 },
      { name: '平方千米', f: 1e6 },
      { name: '公顷', f: 1e4 },
      { name: '亩', f: 666.6667 },
      { name: '平方英尺', f: 0.09290304 }
    ]
  },
  {
    id: 'temp',
    name: '温度',
    special: true,
    units: [{ name: '摄氏度' }, { name: '华氏度' }, { name: '开尔文' }]
  }
]

const cat = ref(cats[0])
const from = ref('米')
const to = ref('千米')
const value = ref('1')

function switchCat(c) {
  cat.value = c
  from.value = c.units[0].name
  to.value = c.units[1].name
}

function swap() {
  ;[from.value, to.value] = [to.value, from.value]
}

function findUnit(name) {
  return cat.value.units.find(u => u.name === name)
}

function convert(v, fromU, toU) {
  if (cat.value.special) {
    // 先统一转为摄氏度
    const c = fromU === '摄氏度' ? v : fromU === '华氏度' ? ((v - 32) * 5) / 9 : v - 273.15
    return toU === '摄氏度' ? c : toU === '华氏度' ? (c * 9) / 5 + 32 : c + 273.15
  }
  return (v * fromU.f) / toU.f
}

function fmtNum(n) {
  if (!isFinite(n)) return '-'
  return String(parseFloat(n.toPrecision(12)))
}

const result = computed(() => {
  const v = parseFloat(value.value)
  const fu = findUnit(from.value)
  const tu = findUnit(to.value)
  if (isNaN(v) || !fu || !tu) return '-'
  return fmtNum(convert(v, fu, tu))
})
</script>

<style scoped>
.cat-row {
  gap: 8px;
}

.swap {
  align-self: flex-end;
  margin-bottom: 10px;
}

.result-val {
  font-size: 34px;
  font-weight: 600;
  font-variant-numeric: tabular-nums;
  word-break: break-all;
}

.result-unit {
  font-size: 13px;
  color: var(--muted);
  margin-bottom: 10px;
}
</style>
