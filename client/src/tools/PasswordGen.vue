<template>
  <div>
    <div class="panel">
      <div class="field">
        <label>长度：{{ length }}</label>
        <input v-model.number="length" type="range" min="6" max="64" />
      </div>
      <div class="row">
        <label class="check"><input v-model="upper" type="checkbox" />大写 A-Z</label>
        <label class="check"><input v-model="lower" type="checkbox" />小写 a-z</label>
        <label class="check"><input v-model="digit" type="checkbox" />数字 0-9</label>
        <label class="check"><input v-model="symbol" type="checkbox" />符号</label>
      </div>
      <div class="row" style="margin-top: 14px">
        <button class="btn primary" @click="generate">生成密码</button>
        <span v-if="strength" class="pill" :class="strength.cls">{{ strength.name }}</span>
      </div>
      <p v-if="error" class="err">请至少选择一种字符类型。</p>
    </div>
    <div class="panel center">
      <div class="pwd">{{ pwd }}</div>
      <div class="row center-row">
        <CopyButton :text="pwd" />
        <button class="btn small" @click="generate">再生成一个</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import CopyButton from '../components/CopyButton.vue'

const length = ref(16)
const upper = ref(true)
const lower = ref(true)
const digit = ref(true)
const symbol = ref(true)
const pwd = ref('')
const error = ref(false)

const SETS = {
  upper: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ',
  lower: 'abcdefghijklmnopqrstuvwxyz',
  digit: '0123456789',
  symbol: '!@#$%^&*()-_=+[]{}?'
}

function randomInts(n) {
  const a = new Uint32Array(n)
  crypto.getRandomValues(a)
  return a
}

function generate() {
  const enabled = enabledKeys.value
  const len = Math.max(6, Math.min(64, length.value || 16))
  length.value = len
  if (!enabled.length) {
    error.value = true
    pwd.value = ''
    return
  }
  error.value = false
  // 每种选中的字符类型至少包含一个
  const chars = enabled.map(k => SETS[k][randomInts(1)[0] % SETS[k].length])
  const pool = enabled.map(k => SETS[k]).join('')
  for (const r of randomInts(len - chars.length)) chars.push(pool[r % pool.length])
  // Fisher-Yates 洗牌
  const rs = randomInts(chars.length)
  for (let i = chars.length - 1; i > 0; i--) {
    const j = rs[i] % (i + 1)
    ;[chars[i], chars[j]] = [chars[j], chars[i]]
  }
  pwd.value = chars.join('')
}

const flags = { upper, lower, digit, symbol }
const enabledKeys = computed(() => Object.keys(SETS).filter(k => flags[k].value))

const strength = computed(() => {
  if (!pwd.value) return null
  const poolSize = enabledKeys.value.reduce((sum, k) => sum + SETS[k].length, 0)
  const entropy = pwd.value.length * Math.log2(poolSize)
  if (entropy < 40) return { name: '弱', cls: 'w-weak' }
  if (entropy < 60) return { name: '中', cls: 'w-mid' }
  if (entropy < 80) return { name: '强', cls: 'w-strong' }
  return { name: '极强', cls: 'w-super' }
})

onMounted(generate)
</script>

<style scoped>
.check {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
  cursor: pointer;
}

.check input {
  width: auto;
}

.center-row {
  justify-content: center;
  margin-top: 10px;
}

.pwd {
  font-family: var(--mono);
  font-size: 20px;
  font-weight: 600;
  word-break: break-all;
  background: var(--panel2);
  border-radius: 8px;
  padding: 14px;
  margin-bottom: 12px;
}

.w-weak {
  background: #fde8e8;
  color: var(--danger);
}

.w-mid {
  background: #fef3e0;
  color: #d97706;
}

.w-strong {
  background: var(--accent-soft);
  color: var(--accent);
}

.w-super {
  background: #e8f0fe;
  color: #1a73e8;
}

:root[data-theme='dark'] .w-mid {
  background: #43301a;
  color: #f5b04c;
}

:root[data-theme='dark'] .w-weak {
  background: #4e1f20;
  color: #f28b82;
}

:root[data-theme='dark'] .w-super {
  background: #1a2c4e;
  color: #8ab4f8;
}
</style>
