<template>
  <div>
    <div class="panel">
      <div class="panel-title">文本 ↔ Base64（UTF-8 安全）</div>
      <div class="field">
        <textarea v-model="text" placeholder="输入文本…"></textarea>
      </div>
      <div class="row">
        <button class="btn primary" @click="encB64">编码 →</button>
        <button class="btn" @click="decB64">← 解码</button>
      </div>
      <div class="field" style="margin-top: 10px">
        <textarea v-model="b64" class="mono" placeholder="Base64 结果…"></textarea>
      </div>
      <div class="row">
        <CopyButton :text="b64" />
        <p v-if="b64Error" class="err">{{ b64Error }}</p>
      </div>
    </div>
    <div class="panel">
      <div class="panel-title">URL 编解码</div>
      <div class="field">
        <textarea v-model="urlText" class="mono" placeholder="输入 URL 或编码串…"></textarea>
      </div>
      <div class="row">
        <button class="btn primary" @click="urlEnc">编码 →</button>
        <button class="btn" @click="urlDec">← 解码</button>
      </div>
      <div class="field" style="margin-top: 10px">
        <textarea v-model="urlOut" class="mono" readonly placeholder="结果…"></textarea>
      </div>
      <div class="row">
        <CopyButton :text="urlOut" />
      </div>
    </div>
    <div class="panel">
      <div class="panel-title">文件 → Base64（Data URL）</div>
      <div class="field">
        <input type="file" @change="onFile" />
      </div>
      <template v-if="dataUrl">
        <div class="kv"><span>文件大小</span><b>{{ fmtSize(fileSize) }}</b></div>
        <div class="kv"><span>Data URL 长度</span><b>{{ dataUrl.length }} 字符</b></div>
        <div class="field" style="margin-top: 10px">
          <textarea v-model="dataUrl" class="mono" readonly style="min-height: 80px"></textarea>
        </div>
        <div class="row">
          <CopyButton :text="dataUrl" />
        </div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'
import CopyButton from '../components/CopyButton.vue'

const text = ref('')
const b64 = ref('')
const b64Error = ref('')
const urlText = ref('')
const urlOut = ref('')
const dataUrl = ref('')
const fileSize = ref(0)

function encodeB64(s) {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  for (const byte of bytes) bin += String.fromCharCode(byte)
  return btoa(bin)
}

function decodeB64(s) {
  const bin = atob(s.trim())
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0))
  return new TextDecoder().decode(bytes)
}

function encB64() {
  b64Error.value = ''
  try {
    b64.value = encodeB64(text.value)
  } catch (e) {
    b64Error.value = `编码失败：${e.message}`
  }
}

function decB64() {
  b64Error.value = ''
  try {
    text.value = decodeB64(b64.value)
  } catch {
    b64Error.value = '解码失败：不是合法的 Base64 字符串'
  }
}

function urlEnc() {
  urlOut.value = encodeURIComponent(urlText.value)
}

function urlDec() {
  try {
    urlOut.value = decodeURIComponent(urlText.value)
  } catch {
    urlOut.value = '（解码失败：含有无效的百分号编码）'
  }
}

function onFile(e) {
  const f = e.target.files[0]
  if (!f) return
  fileSize.value = f.size
  const reader = new FileReader()
  reader.onload = () => (dataUrl.value = String(reader.result || ''))
  reader.readAsDataURL(f)
}

function fmtSize(n) {
  if (n < 1024) return `${n} B`
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1048576).toFixed(2)} MB`
}
</script>

<style scoped>
.mono {
  font-family: var(--mono);
  font-size: 13px;
}
</style>
