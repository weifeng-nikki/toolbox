<template>
  <div>
    <div class="panel">
      <div class="field">
        <label>输入文本（按行处理）</label>
        <textarea v-model="input" placeholder="每行一条…"></textarea>
      </div>
      <div class="row">
        <label class="check"><input v-model="dedup" type="checkbox" />去重</label>
        <label class="check"><input v-model="removeEmpty" type="checkbox" />去空行</label>
        <label class="check"><input v-model="trim" type="checkbox" />去首尾空格</label>
        <select v-model="sortMode">
          <option value="none">不排序</option>
          <option value="asc">正序（A → Z / 拼音）</option>
          <option value="desc">倒序</option>
          <option value="length">按长度</option>
        </select>
      </div>
    </div>
    <div class="panel">
      <div class="panel-title">
        结果
        <span class="count" v-if="input">{{ input.split('\n').length }} 行 → {{ result.length }} 行</span>
      </div>
      <textarea :value="result.join('\n')" readonly></textarea>
      <div class="row" style="margin-top: 10px">
        <CopyButton :text="result.join('\n')" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import CopyButton from '../components/CopyButton.vue'

const input = ref('')
const dedup = ref(true)
const removeEmpty = ref(true)
const trim = ref(true)
const sortMode = ref('none')

const result = computed(() => {
  let lines = input.value.split('\n')
  if (trim.value) lines = lines.map(l => l.trim())
  if (removeEmpty.value) lines = lines.filter(l => l !== '')
  if (dedup.value) {
    const seen = new Set()
    lines = lines.filter(l => {
      if (seen.has(l)) return false
      seen.add(l)
      return true
    })
  }
  if (sortMode.value === 'asc') lines = [...lines].sort((a, b) => a.localeCompare(b, 'zh'))
  else if (sortMode.value === 'desc') lines = [...lines].sort((a, b) => b.localeCompare(a, 'zh'))
  else if (sortMode.value === 'length') lines = [...lines].sort((a, b) => a.length - b.length)
  return lines
})
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

.count {
  font-size: 12px;
  font-weight: 400;
  color: var(--muted);
  margin-left: 8px;
}
</style>
