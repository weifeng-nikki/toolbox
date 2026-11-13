<template>
  <div>
    <div class="panel">
      <div class="panel-title">SQL 格式化 / 压缩</div>
      <div class="field">
        <label>输入 SQL</label>
        <textarea
          v-model="input"
          class="mono"
          placeholder="select id,name from users where age > 18 and city = '北京' order by id desc"
        ></textarea>
      </div>
      <div class="row">
        <button class="btn primary" @click="format">格式化</button>
        <button class="btn" @click="compress">压缩</button>
      </div>
      <p class="hint">格式化会大写主要关键字、关键字前换行并缩进 2 空格；字符串和注释内容保持不变。</p>
    </div>

    <div v-if="output" class="panel">
      <div class="panel-title">结果</div>
      <textarea v-model="output" class="mono" readonly></textarea>
      <div class="row" style="margin-top: 10px">
        <CopyButton :text="output" label="复制结果" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import CopyButton from '../components/CopyButton.vue'

const KEYWORDS = [
  'insert into',
  'left join',
  'right join',
  'inner join',
  'group by',
  'order by',
  'select',
  'from',
  'where',
  'having',
  'limit',
  'join',
  'on',
  'and',
  'or',
  'union',
  'update',
  'set',
  'delete',
  'values'
]

const KW_RE = new RegExp(
  '\\b(' +
    [...KEYWORDS]
      .sort((a, b) => b.length - a.length)
      .map(k => k.split(' ').join('\\s+'))
      .join('|') +
    ')\\b',
  'gi'
)

const input = ref('')
const output = ref('')

// 把字符串与注释替换成占位符，避免关键字替换破坏其内容
function protect(sql) {
  const store = []
  let out = ''
  let i = 0

  while (i < sql.length) {
    const ch = sql[i]

    if (ch === "'" || ch === '"' || ch === '`') {
      let j = i + 1
      while (j < sql.length) {
        if (sql[j] === ch) {
          if (sql[j + 1] === ch) {
            j += 2
            continue
          }
          j++
          break
        }
        j++
      }
      store.push(sql.slice(i, j))
      out += `\u0001${store.length - 1}\u0001`
      i = j
    } else if (ch === '-' && sql[i + 1] === '-') {
      let j = sql.indexOf('\n', i)
      if (j < 0) j = sql.length
      else j += 1
      store.push(sql.slice(i, j))
      out += `\u0001${store.length - 1}\u0001`
      i = j
    } else if (ch === '/' && sql[i + 1] === '*') {
      const j = sql.indexOf('*/', i + 2)
      const end = j < 0 ? sql.length : j + 2
      store.push(sql.slice(i, end))
      out += `\u0001${store.length - 1}\u0001`
      i = end
    } else {
      out += ch
      i++
    }
  }

  return { text: out, store }
}

function restore(s, store) {
  return s.replace(/\u0001(\d+)\u0001/g, (_, idx) => store[Number(idx)])
}

function breakCommas(s) {
  let out = ''
  let depth = 0
  for (const ch of s) {
    if (ch === '(') depth++
    else if (ch === ')') depth = Math.max(0, depth - 1)

    if (ch === ',' && depth === 0) {
      out += ',\n'
    } else {
      out += ch
    }
  }
  return out
}

function format() {
  const { text, store } = protect(input.value)
  const flat = text.replace(/\s+/g, ' ').trim()
  if (!flat) {
    output.value = ''
    return
  }

  let s = breakCommas(flat)
  s = s.replace(KW_RE, m => `\n${m.toUpperCase()}`)

  const lines = s
    .split('\n')
    .map(l => l.trim())
    .filter(Boolean)

  const formatted = lines.map((l, i) => (i === 0 ? l : `  ${l}`)).join('\n')
  output.value = restore(formatted, store)
}

function compress() {
  const { text, store } = protect(input.value)
  const flat = text.replace(/\s+/g, ' ').trim()
  output.value = restore(flat, store)
}
</script>

<style scoped>
textarea.mono {
  font-size: 13px;
}
</style>
