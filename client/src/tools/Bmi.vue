<template>
  <div>
    <div class="panel">
      <div class="row">
        <div class="field inline">
          <label>身高 (cm)</label>
          <input v-model="height" type="number" min="50" max="250" style="width: 100px" />
        </div>
        <div class="field inline">
          <label>体重 (kg)</label>
          <input v-model="weight" type="number" min="10" max="300" style="width: 100px" />
        </div>
      </div>
    </div>
    <div v-if="bmi !== null" class="panel center">
      <div class="bmi-label">你的 BMI</div>
      <div class="big-num">{{ bmi }}</div>
      <span class="pill" :class="cat.cls">{{ cat.name }}</span>
      <p class="hint">理想体重范围：{{ ideal[0] }} ~ {{ ideal[1] }} kg</p>
    </div>
    <div class="panel">
      <div class="panel-title">参考标准（中国成人）</div>
      <div class="kv"><span>偏瘦</span><b>&lt; 18.5</b></div>
      <div class="kv"><span>正常</span><b>18.5 ~ 23.9</b></div>
      <div class="kv"><span>超重</span><b>24 ~ 27.9</b></div>
      <div class="kv"><span>肥胖</span><b>≥ 28</b></div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const height = ref('')
const weight = ref('')

const bmi = computed(() => {
  const hh = parseFloat(height.value) / 100
  const ww = parseFloat(weight.value)
  if (!(hh > 0.5 && hh < 2.5) || !(ww > 0)) return null
  return Math.round((ww / (hh * hh)) * 10) / 10
})

const cat = computed(() => {
  const b = bmi.value
  if (b === null) return { name: '', cls: '' }
  if (b < 18.5) return { name: '偏瘦', cls: 'thin' }
  if (b < 24) return { name: '正常', cls: 'normal' }
  if (b < 28) return { name: '超重', cls: 'over' }
  return { name: '肥胖', cls: 'obese' }
})

const ideal = computed(() => {
  const hh = parseFloat(height.value) / 100
  if (!(hh > 0)) return ['-', '-']
  return [(18.5 * hh * hh).toFixed(1), (23.9 * hh * hh).toFixed(1)]
})
</script>

<style scoped>
.bmi-label {
  font-size: 13px;
  color: var(--muted);
}

.pill.thin {
  background: #e8f0fe;
  color: #1a73e8;
}

.pill.normal {
  background: var(--accent-soft);
  color: var(--accent);
}

.pill.over {
  background: #fef3e0;
  color: #d97706;
}

.pill.obese {
  background: #fde8e8;
  color: var(--danger);
}

:root[data-theme='dark'] .pill.thin {
  background: #1a2c4e;
  color: #8ab4f8;
}

:root[data-theme='dark'] .pill.over {
  background: #43301a;
  color: #f5b04c;
}

:root[data-theme='dark'] .pill.obese {
  background: #4e1f20;
  color: #f28b82;
}
</style>
