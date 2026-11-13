<template>
  <div>
    <div class="panel">
      <div class="row">
        <div class="field" style="flex: 1; min-width: 180px">
          <label>数值</label>
          <input v-model="input" placeholder="例：255 或 0-9a-z 组合" style="width: 100%" />
        </div>
        <div class="field">
          <label>原进制</label>
          <select v-model.number="fromBase">
            <option v-for="b in bases" :key="b" :value="b">{{ b }} 进制</option>
          </select>
        </div>
        <div class="field">
          <label>额外目标进制</label>
          <select v-model.number="toBase">
            <option v-for="b in bases" :key="b" :value="b">{{ b }} 进制</option>
          </select>
        </div>
      </div>
      <p v-if="error" class="err">输入包含 {{ fromBase }} 进制之外的字符，无法解析。</p>
    </div>
    <div v-if="results" class="panel">
      <div v-for="r in results" :key="r.base" class="kv">
        <span>{{ r.base }} 进制</span>
        <b>{{ r.value }}</b>
        <CopyButton :text="r.value" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import CopyButton from '../components/CopyButton.vue'

const input = ref('')
const fromBase = ref(10)
const toBase = ref(16)
const bases = Array.from({ length: 35 }, (_, i) => i + 2)
const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz'

function parse(str, base) {
  let s = str.trim().toLowerCase()
  const neg = s.startsWith('-')
  if (neg) s = s.slice(1)
  if (!s) return null
  let v = 0n
  const big = BigInt(base)
  for (const ch of s) {
    const d = DIGITS.indexOf(ch)
    if (d < 0 || d >= base) return null
    v = v * big + BigInt(d)
  }
  return neg ? -v : v
}

function format(v, base) {
  if (v === 0n) return '0'
  const neg = v < 0n
  let n = neg ? -v : v
  let out = ''
  const big = BigInt(base)
  while (n > 0n) {
    out = DIGITS[Number(n % big)] + out
    n /= big
  }
  return (neg ? '-' : '') + out
}

const value = computed(() => parse(input.value, fromBase.value))
const error = computed(() => input.value.trim() !== '' && value.value === null)
const results = computed(() => {
  if (value.value === null) return null
  const targets = [...new Set([2, 8, 10, 16, toBase.value])]
  return targets.map(base => ({ base, value: format(value.value, base) }))
})
</script>
