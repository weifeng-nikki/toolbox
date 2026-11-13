<template>
  <div>
    <div class="panel">
      <div class="panel-title">哈希计算（SHA 系列）</div>
      <div class="field">
        <label>文本</label>
        <textarea
          v-model="text"
          placeholder="输入要计算哈希的文本…"
          @input="reset"
        ></textarea>
      </div>
      <div class="field">
        <label>或选择文件（选中后优先计算文件内容）</label>
        <div class="row">
          <input ref="fileEl" type="file" @change="onFile" />
          <button v-if="file" class="btn small" @click="clearFile">清除文件</button>
          <span v-if="file" class="pill">{{ file.name }} · {{ fmtSize(file.size) }}</span>
        </div>
      </div>
      <div class="row">
        <button class="btn primary" :disabled="loading" @click="compute">
          {{ loading ? '计算中…' : '计算' }}
        </button>
        <span v-if="sourceLabel" class="hint" style="margin: 0">来源：{{ sourceLabel }}</span>
      </div>
      <p v-if="error" class="err">{{ error }}</p>
      <p class="hint">
        浏览器原生 crypto.subtle 不提供 MD5，因此仅支持 SHA-1 / SHA-256 / SHA-384 / SHA-512。
        HTTP 非安全环境下 Web Crypto 可能不可用。
      </p>
    </div>

    <div v-if="results.length" class="panel">
      <div class="panel-title">十六进制摘要</div>
      <div v-for="r in results" :key="r.alg" class="kv">
        <span>{{ r.label }}</span>
        <b class="mono">{{ r.hex }}</b>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const ALGS = [
  { alg: 'SHA-1', label: 'SHA-1' },
  { alg: 'SHA-256', label: 'SHA-256' },
  { alg: 'SHA-384', label: 'SHA-384' },
  { alg: 'SHA-512', label: 'SHA-512' }
]

const text = ref('')
const file = ref(null)
const fileEl = ref(null)
const results = ref([])
const loading = ref(false)
const error = ref('')
const sourceLabel = ref('')

function reset() {
  results.value = []
  error.value = ''
  sourceLabel.value = ''
}

function onFile(e) {
  file.value = e.target.files[0] || null
  reset()
}

function clearFile() {
  file.value = null
  if (fileEl.value) fileEl.value.value = ''
  reset()
}

function fmtSize(n) {
  if (n < 1024) return `${n} B`
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1048576).toFixed(2)} MB`
}

function toHex(buf) {
  return Array.from(new Uint8Array(buf))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('')
}

async function compute() {
  reset()
  if (!window.crypto || !window.crypto.subtle) {
    error.value = '当前环境不支持 Web Crypto（crypto.subtle），请使用 HTTPS 或 localhost 访问。'
    return
  }
  if (!file.value && !text.value) {
    error.value = '请输入文本或选择文件'
    return
  }

  loading.value = true
  try {
    const data = file.value
      ? await file.value.arrayBuffer()
      : new TextEncoder().encode(text.value)
    sourceLabel.value = file.value
      ? `文件 ${file.value.name}（${fmtSize(file.value.size)}）`
      : `文本（${text.value.length} 字符）`

    const out = []
    for (const a of ALGS) {
      const buf = await crypto.subtle.digest(a.alg, data)
      out.push({ alg: a.alg, label: a.label, hex: toHex(buf) })
    }
    results.value = out
  } catch (e) {
    error.value = `计算失败：${e.message}`
  } finally {
    loading.value = false
  }
}
</script>

<style scoped>
.kv b {
  font-size: 12.5px;
  line-height: 1.55;
}
</style>
