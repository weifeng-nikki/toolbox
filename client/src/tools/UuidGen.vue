<template>
  <div>
    <div class="panel">
      <div class="row">
        <div class="field inline">
          <label>数量</label>
          <input v-model.number="count" type="number" min="1" max="100" style="width: 80px" />
        </div>
        <label class="check"><input v-model="upper" type="checkbox" />大写</label>
        <label class="check"><input v-model="noHyphen" type="checkbox" />去连字符</label>
        <button class="btn primary" @click="generate">生成</button>
      </div>
    </div>
    <div class="panel">
      <div class="panel-title">结果（{{ list.length }} 个）</div>
      <textarea :value="list.join('\n')" readonly class="mono"></textarea>
      <div class="row" style="margin-top: 10px">
        <CopyButton :text="list.join('\n')" label="复制全部" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue'
import CopyButton from '../components/CopyButton.vue'

const count = ref(5)
const upper = ref(false)
const noHyphen = ref(false)
const list = ref([])

function fallbackV4() {
  const b = crypto.getRandomValues(new Uint8Array(16))
  b[6] = (b[6] & 0x0f) | 0x40
  b[8] = (b[8] & 0x3f) | 0x80
  const h = [...b].map(x => x.toString(16).padStart(2, '0')).join('')
  return `${h.slice(0, 8)}-${h.slice(8, 12)}-${h.slice(12, 16)}-${h.slice(16, 20)}-${h.slice(20)}`
}

function generate() {
  const n = Math.max(1, Math.min(100, parseInt(count.value) || 1))
  count.value = n
  list.value = Array.from({ length: n }, () => {
    let u = crypto.randomUUID ? crypto.randomUUID() : fallbackV4()
    if (noHyphen.value) u = u.replaceAll('-', '')
    if (upper.value) u = u.toUpperCase()
    return u
  })
}

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

.mono {
  font-family: var(--mono);
  font-size: 13px;
}
</style>
