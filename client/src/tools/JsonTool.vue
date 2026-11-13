<template>
  <div>
    <div class="panel">
      <div class="field">
        <label>输入 JSON</label>
        <textarea v-model="input" class="mono" placeholder='{"name": "toolbox", "version": 1}'></textarea>
      </div>
      <div class="row">
        <button class="btn primary" :disabled="!check.ok" @click="format(2)">格式化</button>
        <button class="btn" :disabled="!check.ok" @click="format(0)">压缩</button>
        <span v-if="check.ok === true" class="pill ok-pill">✓ JSON 有效</span>
        <span v-else-if="check.ok === false" class="pill bad-pill">✗ 第 {{ check.line }} 行 第 {{ check.col }} 列：{{ check.msg }}</span>
      </div>
    </div>
    <div v-if="output" class="panel">
      <div class="panel-title">结果 <span class="size">（{{ output.length }} 字符）</span></div>
      <textarea v-model="output" class="mono" readonly></textarea>
      <div class="row" style="margin-top: 10px">
        <CopyButton :text="output" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import CopyButton from '../components/CopyButton.vue'

const input = ref('')
const output = ref('')

const check = computed(() => {
  const s = input.value.trim()
  if (!s) return { ok: null }
  try {
    JSON.parse(s)
    return { ok: true }
  } catch (e) {
    const m = /position (\d+)/.exec(e.message)
    let line = '?'
    let col = '?'
    if (m) {
      const pos = +m[1]
      const before = s.slice(0, pos)
      line = before.split('\n').length
      col = pos - before.lastIndexOf('\n')
    }
    return { ok: false, msg: e.message, line, col }
  }
})

function format(space) {
  if (!check.value.ok) return
  try {
    output.value = JSON.stringify(JSON.parse(input.value), null, space)
  } catch {
    /* 校验已拦截 */
  }
}
</script>

<style scoped>
.mono {
  font-family: var(--mono);
  font-size: 13px;
}

.ok-pill {
  background: var(--accent-soft);
  color: var(--accent);
}

.bad-pill {
  background: #fde8e8;
  color: var(--danger);
}

:root[data-theme='dark'] .bad-pill {
  background: #4e1f20;
  color: #f28b82;
}

.size {
  font-size: 12px;
  font-weight: 400;
  color: var(--muted);
}
</style>
