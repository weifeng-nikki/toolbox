<template>
  <div>
    <div class="panel">
      <div class="panel-title">图片 → Base64</div>
      <div class="field">
        <label>选择图片文件</label>
        <input type="file" accept="image/*" @change="onFile" />
      </div>
      <p v-if="readError" class="err">{{ readError }}</p>
      <template v-if="dataUrl">
        <div class="row" style="align-items: flex-start; gap: 16px">
          <img
            :src="dataUrl"
            alt="预览"
            style="max-width: 180px; max-height: 140px; border: 1px solid var(--border); border-radius: 8px; background: var(--panel2)"
          />
          <div style="flex: 1; min-width: 200px">
            <div class="kv"><span>文件名</span><b>{{ fileName }}</b></div>
            <div class="kv"><span>原始大小</span><b>{{ fmtSize(fileSize) }}</b></div>
            <div class="kv"><span>Base64 长度</span><b>{{ base64.length }} 字符</b></div>
            <div class="kv"><span>体积增幅</span><b>{{ overhead }}</b></div>
          </div>
        </div>
        <div class="field" style="margin-top: 10px">
          <label>Base64 字符串{{ expandedA ? '' : '（过长已截断）' }}</label>
          <textarea
            :value="base64Display"
            readonly
            class="mono"
            style="min-height: 130px; font-size: 12px"
          ></textarea>
        </div>
        <div class="row">
          <CopyButton :text="base64" />
          <CopyButton :text="cssA" label="复制 CSS" />
          <button v-if="base64.length > 6000" class="btn small" @click="expandedA = !expandedA">
            {{ expandedA ? '收起' : '展开全部' }}
          </button>
          <button class="btn small" @click="downloadTxt">下载 .txt</button>
        </div>
      </template>
      <p class="hint">文件只在本机浏览器中读取，不会上传到任何服务器。</p>
    </div>

    <div class="panel">
      <div class="panel-title">Base64 → 图片</div>
      <div class="field">
        <label>粘贴 Base64 或 data:image/...;base64,...</label>
        <textarea
          v-model="b64Input"
          class="mono"
          style="min-height: 120px; font-size: 12px"
          placeholder="data:image/png;base64,iVBORw0KGgo..."
        ></textarea>
      </div>
      <p v-if="b64Error" class="err">{{ b64Error }}</p>
      <template v-if="parsed">
        <div class="row" style="align-items: flex-start; gap: 16px; margin-top: 10px">
          <img
            :src="previewUrl"
            alt="预览"
            style="max-width: 180px; max-height: 140px; border: 1px solid var(--border); border-radius: 8px; background: var(--panel2)"
            @error="onPreviewError"
          />
          <div style="flex: 1; min-width: 200px">
            <div class="kv"><span>MIME 类型</span><b>{{ parsed.mime }}</b></div>
            <div class="kv"><span>解码后大小</span><b>{{ fmtSize(parsed.size) }}</b></div>
            <div class="kv"><span>Base64 长度</span><b>{{ parsed.base64.length }} 字符</b></div>
          </div>
        </div>
        <div class="row" style="margin-top: 10px">
          <button class="btn small primary" @click="downloadImage">下载原图</button>
          <CopyButton :text="parsed.dataUrl" label="复制 Data URL" />
          <CopyButton :text="cssB" label="复制 CSS" />
          <button class="btn small" @click="expandedB = !expandedB">
            {{ expandedB ? '收起 Base64' : '展开全部' }}
          </button>
        </div>
        <div v-if="expandedB" class="field" style="margin-top: 10px">
          <textarea :value="parsed.base64" readonly class="mono" style="min-height: 120px; font-size: 12px"></textarea>
        </div>
      </template>
      <p class="hint">支持纯 Base64 或 Data URL；缺少前缀时按 image/png 处理，非法内容会给出提示。</p>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import CopyButton from '../components/CopyButton.vue'

const fileName = ref('')
const fileSize = ref(0)
const dataUrl = ref('')
const mime = ref('image/png')
const base64 = ref('')
const readError = ref('')
const expandedA = ref(false)

const b64Input = ref('')
const b64Error = ref('')
const parsed = ref(null)
const previewUrl = ref('')
const expandedB = ref(false)

let previewObjectUrl = ''
let tempObjectUrl = ''

const MAX_PREVIEW = 6000

const base64Display = computed(() => {
  if (expandedA.value || base64.value.length <= MAX_PREVIEW) return base64.value
  return base64.value.slice(0, MAX_PREVIEW) + '\n…（已截断，点击「展开全部」查看完整内容）'
})

const overhead = computed(() => {
  if (!fileSize.value) return '—'
  return ((base64.value.length - fileSize.value) / fileSize.value * 100).toFixed(1) + '%'
})

const cssA = computed(() => `url("data:${mime.value};base64,${base64.value}")`)
const cssB = computed(() => (parsed.value ? `url("${parsed.value.dataUrl}")` : ''))

function fmtSize(n) {
  if (!n && n !== 0) return '—'
  if (n < 1024) return `${n} B`
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1048576).toFixed(2)} MB`
}

function extOf(mimeType) {
  const m = String(mimeType || '').toLowerCase()
  const map = {
    'image/jpeg': 'jpg',
    'image/jpg': 'jpg',
    'image/png': 'png',
    'image/gif': 'gif',
    'image/webp': 'webp',
    'image/bmp': 'bmp',
    'image/svg+xml': 'svg',
    'image/x-icon': 'ico',
    'image/vnd.microsoft.icon': 'ico',
    'image/avif': 'avif'
  }
  if (map[m]) return map[m]
  const sub = /^image\/([a-z0-9]+)$/.exec(m)
  return sub ? sub[1] : 'png'
}

function base64ToBlob(b64, mimeType) {
  const bin = atob(b64)
  const bytes = new Uint8Array(bin.length)
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
  return new Blob([bytes], { type: mimeType })
}

function revokePreview() {
  if (previewObjectUrl) {
    URL.revokeObjectURL(previewObjectUrl)
    previewObjectUrl = ''
  }
  previewUrl.value = ''
}

function saveBlob(blob, name) {
  if (tempObjectUrl) URL.revokeObjectURL(tempObjectUrl)
  tempObjectUrl = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = tempObjectUrl
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
}

function parseB64() {
  b64Error.value = ''
  revokePreview()
  parsed.value = null
  expandedB.value = false
  const raw = b64Input.value.trim()
  if (!raw) return

  let payload = ''
  let mimeType = 'image/png'
  if (/^data:/i.test(raw)) {
    const comma = raw.indexOf(',')
    if (comma < 0) {
      b64Error.value = 'Data URL 格式错误：缺少逗号分隔符'
      return
    }
    const meta = raw.slice(5, comma)
    const parts = meta.split(';')
    const hasBase64 = parts.some(p => p.trim().toLowerCase() === 'base64')
    if (!hasBase64) {
      b64Error.value = '仅支持 base64 编码的 Data URL'
      return
    }
    mimeType = (parts[0] || '').trim() || 'image/png'
    payload = raw.slice(comma + 1)
  } else {
    payload = raw
  }

  payload = payload.replace(/\s+/g, '').replace(/-/g, '+').replace(/_/g, '/')
  if (!payload) {
    b64Error.value = 'Base64 内容为空'
    return
  }
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(payload)) {
    b64Error.value = 'Base64 含有非法字符，请检查粘贴内容'
    return
  }
  const clean = payload.replace(/=+$/, '')
  if (clean.length % 4 === 1) {
    b64Error.value = 'Base64 长度不合法'
    return
  }
  const padded = clean + '='.repeat((4 - (clean.length % 4)) % 4)

  let bin = ''
  try {
    bin = atob(padded)
  } catch {
    b64Error.value = 'Base64 解码失败，内容可能已损坏'
    return
  }
  if (!bin.length) {
    b64Error.value = 'Base64 解码结果为空'
    return
  }

  try {
    const blob = base64ToBlob(padded, mimeType)
    previewObjectUrl = URL.createObjectURL(blob)
    previewUrl.value = previewObjectUrl
    parsed.value = {
      mime: mimeType,
      base64: padded,
      dataUrl: `data:${mimeType};base64,${padded}`,
      size: bin.length,
      ext: extOf(mimeType)
    }
  } catch {
    b64Error.value = '无法生成图片预览，请确认内容是图片的 Base64'
  }
}

function onFile(e) {
  readError.value = ''
  const file = e.target.files && e.target.files[0]
  if (!file) return
  if (file.type && !file.type.startsWith('image/')) {
    readError.value = '请选择图片文件（当前文件类型：' + file.type + '）'
    e.target.value = ''
    return
  }
  fileName.value = file.name
  fileSize.value = file.size
  dataUrl.value = ''
  base64.value = ''
  mime.value = 'image/png'
  expandedA.value = false

  const reader = new FileReader()
  reader.onload = () => {
    try {
      const res = String(reader.result || '')
      const m = /^data:([^;,]+);base64,([\s\S]*)$/.exec(res)
      if (!m) throw new Error('文件内容不是有效的 Data URL')
      mime.value = m[1]
      base64.value = m[2]
      dataUrl.value = res
    } catch (err) {
      readError.value = '读取失败：' + (err && err.message ? err.message : '未知错误')
    }
  }
  reader.onerror = () => {
    readError.value = '读取文件失败，请重试或更换文件'
  }
  reader.onabort = () => {
    readError.value = '读取已取消'
  }
  try {
    reader.readAsDataURL(file)
  } catch (err) {
    readError.value = '读取文件失败：' + (err && err.message ? err.message : '浏览器不支持')
  }
}

function downloadTxt() {
  if (!base64.value) return
  const base = fileName.value.replace(/\.[^.]+$/, '') || 'image'
  saveBlob(new Blob([base64.value], { type: 'text/plain;charset=utf-8' }), base + '.base64.txt')
}

function downloadImage() {
  if (!parsed.value || !previewUrl.value) return
  const a = document.createElement('a')
  a.href = previewUrl.value
  a.download = 'image.' + parsed.value.ext
  document.body.appendChild(a)
  a.click()
  a.remove()
}

function onPreviewError() {
  b64Error.value = '内容无法作为图片显示，可能已损坏或不是图片格式'
}

watch(b64Input, parseB64, { immediate: true })

onBeforeUnmount(() => {
  revokePreview()
  if (tempObjectUrl) {
    URL.revokeObjectURL(tempObjectUrl)
    tempObjectUrl = ''
  }
})
</script>
