<template>
  <div>
    <div class="panel">
      <div class="field">
        <label>输入文本</label>
        <textarea v-model="input" placeholder="输入要转换的文本…"></textarea>
      </div>
      <div class="row">
        <button v-for="a in actions" :key="a.key" class="btn small" @click="apply(a)">
          {{ a.name }}
        </button>
      </div>
    </div>
    <div class="panel">
      <div class="panel-title">转换结果</div>
      <textarea v-model="output" readonly></textarea>
      <div class="row" style="margin-top: 10px">
        <CopyButton :text="output" />
        <button class="btn small" :disabled="!output" @click="swap">结果 ← 输入</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import CopyButton from '../components/CopyButton.vue'

const input = ref('')
const output = ref('')

const fns = {
  upper: s => s.toUpperCase(),
  lower: s => s.toLowerCase(),
  camel2snake: s =>
    s
      .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1_$2')
      .toLowerCase(),
  snake2camel: s => s.toLowerCase().replace(/[_-]([a-z])/g, (_, c) => c.toUpperCase()),
  full2half: s =>
    s.replace(/[\uFF01-\uFF5E\u3000]/g, ch =>
      ch === '\u3000' ? ' ' : String.fromCharCode(ch.charCodeAt(0) - 0xfee0)
    ),
  half2full: s =>
    s.replace(/[!-~ ]/g, ch => (ch === ' ' ? '\u3000' : String.fromCharCode(ch.charCodeAt(0) + 0xfee0)))
}

const actions = [
  { key: 'upper', name: '全部大写' },
  { key: 'lower', name: '全部小写' },
  { key: 'camel2snake', name: '驼峰 → 下划线' },
  { key: 'snake2camel', name: '下划线 → 驼峰' },
  { key: 'full2half', name: '全角 → 半角' },
  { key: 'half2full', name: '半角 → 全角' }
]

function apply(a) {
  output.value = fns[a.key](input.value)
}

function swap() {
  input.value = output.value
}
</script>
