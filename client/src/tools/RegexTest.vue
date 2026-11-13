<template>
  <div>
    <div class="panel">
      <div class="row">
        <div class="field" style="flex: 1; min-width: 220px">
          <label>正则表达式</label>
          <input v-model="pattern" class="mono" placeholder="例：1[3-9]\d{9}" style="width: 100%" />
        </div>
        <div class="field">
          <label>常用正则</label>
          <select @change="applyPreset($event)">
            <option value="">选择…</option>
            <option v-for="p in presets" :key="p.n" :value="p.p">{{ p.n }}</option>
          </select>
        </div>
      </div>
      <div class="row">
        <label v-for="f in ['g', 'i', 'm', 's', 'u']" :key="f" class="check">
          <input v-model="flagObj[f]" type="checkbox" />{{ f }}
        </label>
      </div>
      <p v-if="compileError" class="err">{{ compileError }}</p>
    </div>
    <div class="panel">
      <div class="field">
        <label>测试文本</label>
        <textarea v-model="text" style="min-height: 100px" placeholder="粘贴要匹配的文本…"></textarea>
      </div>
      <div v-if="highlightHtml" class="hl mono" v-html="highlightHtml"></div>
      <p v-if="matches.length" class="hint">共 {{ matches.length }} 处匹配（最多显示 50 条）</p>
    </div>
    <div v-if="matches.length" class="panel">
      <div class="panel-title">匹配详情</div>
      <div v-for="(m, i) in matches.slice(0, 50)" :key="i" class="kv">
        <span>#{{ i + 1 }} @{{ m.index }}</span>
        <b>{{ m.text }}<template v-if="m.groups.length"> （分组：{{ m.groups.map(g => g === undefined ? '∅' : g).join(' | ') }}）</template></b>
      </div>
    </div>
    <div class="panel">
      <div class="field">
        <label>替换为（支持 $1、$&amp; 等引用）</label>
        <input v-model="repl" placeholder="例：[$1]" />
      </div>
      <div class="field">
        <label>替换预览</label>
        <textarea :value="replaced" readonly style="min-height: 70px"></textarea>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue'

const pattern = ref('')
const text = ref('')
const repl = ref('')
const flagObj = reactive({ g: true, i: false, m: false, s: false, u: false })

const presets = [
  { n: '手机号', p: '1[3-9]\\d{9}' },
  { n: '邮箱', p: '[\\w.+-]+@[\\w-]+\\.[\\w.]+' },
  { n: 'URL', p: 'https?:\\/\\/[^\\s]+' },
  { n: 'IPv4', p: '\\d{1,3}(\\.\\d{1,3}){3}' },
  { n: '日期', p: '\\d{4}-\\d{2}-\\d{2}' },
  { n: '中文字符', p: '[\\u4e00-\\u9fff]+' }
]

function applyPreset(e) {
  if (e.target.value) pattern.value = e.target.value
}

const flagStr = computed(() => Object.keys(flagObj).filter(k => flagObj[k]).join(''))

const compiled = computed(() => {
  if (!pattern.value) return { re: null, error: '' }
  try {
    return { re: new RegExp(pattern.value, flagStr.value), error: '' }
  } catch (e) {
    return { re: null, error: e.message }
  }
})

const compileError = computed(() => compiled.value.error)

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const matches = computed(() => {
  if (!compiled.value.re) return []
  const re = new RegExp(pattern.value, (flagStr.value.includes('g') ? flagStr.value : flagStr.value + 'g'))
  const out = []
  let m
  let guard = 0
  while ((m = re.exec(text.value)) && guard++ < 2000) {
    if (m[0] === '') re.lastIndex++
    out.push({ index: m.index, text: m[0], groups: m.slice(1) })
    if (out.length >= 2000) break
  }
  return out
})

const highlightHtml = computed(() => {
  const src = text.value
  if (!src || !compiled.value.re) return ''
  const ms = matches.value
  if (!ms.length) return escapeHtml(src).replace(/\n/g, '<br>')
  let html = ''
  let pos = 0
  for (const m of ms) {
    html += escapeHtml(src.slice(pos, m.index)) + `<mark>${escapeHtml(m.text)}</mark>`
    pos = m.index + m.text.length
  }
  html += escapeHtml(src.slice(pos))
  return html.replace(/\n/g, '<br>')
})

const replaced = computed(() => {
  if (!compiled.value.re) return ''
  try {
    return text.value.replace(new RegExp(pattern.value, flagStr.value), repl.value)
  } catch {
    return ''
  }
})
</script>

<style scoped>
.check {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 13px;
  font-family: var(--mono);
  cursor: pointer;
}

.check input {
  width: auto;
}

.mono {
  font-family: var(--mono);
}

.hl {
  margin-top: 10px;
  padding: 10px 12px;
  background: var(--panel2);
  border-radius: 8px;
  line-height: 1.7;
  word-break: break-all;
  max-height: 260px;
  overflow: auto;
}

.hl :deep(mark) {
  background: var(--accent);
  color: #fff;
  border-radius: 3px;
  padding: 0 1px;
}
</style>
