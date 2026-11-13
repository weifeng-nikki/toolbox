<template>
  <button class="btn small" :class="{ ok }" @click="copy">{{ ok ? '已复制' : label }}</button>
</template>

<script setup>
import { onBeforeUnmount, ref } from 'vue'

const props = defineProps({
  text: { type: String, default: '' },
  label: { type: String, default: '复制' }
})

const ok = ref(false)
let timer = null

async function copy() {
  try {
    await navigator.clipboard.writeText(props.text)
  } catch {
    // 非安全上下文（如局域网 HTTP）下的兜底方案
    const ta = document.createElement('textarea')
    ta.value = props.text
    document.body.appendChild(ta)
    ta.select()
    document.execCommand('copy')
    ta.remove()
  }
  ok.value = true
  clearTimeout(timer)
  timer = setTimeout(() => (ok.value = false), 1200)
}

onBeforeUnmount(() => clearTimeout(timer))
</script>
