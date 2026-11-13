<template>
  <div>
    <div class="panel">
      <div class="field">
        <label>输入文本</label>
        <textarea v-model="text" placeholder="粘贴或输入文本…"></textarea>
      </div>
      <div class="row">
        <button class="btn small" @click="text = ''">清空</button>
        <CopyButton :text="text" label="复制原文" />
      </div>
    </div>
    <div class="panel">
      <div class="panel-title">统计结果</div>
      <div class="stats-grid">
        <div v-for="s in stats" :key="s.label" class="stat">
          <b>{{ s.v }}</b>
          <span>{{ s.label }}</span>
        </div>
      </div>
    </div>
    <div v-if="freq.length" class="panel">
      <div class="panel-title">英文词频 Top 8</div>
      <div v-for="[word, count] in freq" :key="word" class="kv">
        <span>{{ word }}</span>
        <b>{{ count }}</b>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import CopyButton from '../components/CopyButton.vue'

const text = ref('')

const stats = computed(() => {
  const t = text.value
  return [
    { label: '总字符', v: t.length },
    { label: '不含空白', v: t.replace(/\s/g, '').length },
    { label: '中文字符', v: (t.match(/[\u4e00-\u9fff]/g) || []).length },
    { label: '英文单词', v: (t.match(/[a-zA-Z]+/g) || []).length },
    { label: '数字串', v: (t.match(/\d+/g) || []).length },
    { label: '行数', v: t === '' ? 0 : t.split('\n').length }
  ]
})

const freq = computed(() => {
  const words = text.value.toLowerCase().match(/[a-z]+/g) || []
  const map = {}
  for (const w of words) map[w] = (map[w] || 0) + 1
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
})
</script>
