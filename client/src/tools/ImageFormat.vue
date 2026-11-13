<template>
  <div>
    <div class="panel">
      <div class="row">
        <div class="field">
          <label>选择图片</label>
          <input type="file" accept="image/*" @change="onFile" />
        </div>
        <div class="field">
          <label>输出格式</label>
          <select v-model="format">
            <option value="png">PNG</option>
            <option value="jpeg">JPEG</option>
            <option value="webp">WebP</option>
          </select>
        </div>
        <div class="field">
          <label>质量：{{ Math.round(quality * 100) }}%</label>
          <input
            v-model.number="quality"
            type="range"
            min="0.1"
            max="1"
            step="0.01"
            :disabled="format === 'png'"
            style="width: 150px"
          />
        </div>
      </div>
      <div class="row">
        <div class="field">
          <label>最大宽度（px，留空不缩放）</label>
          <input v-model="maxW" type="number" min="1" placeholder="留空不缩放" style="width: 150px" />
        </div>
        <div class="field">
          <label>最大高度（px，留空不缩放）</label>
          <input v-model="maxH" type="number" min="1" placeholder="留空不缩放" style="width: 150px" />
        </div>
      </div>
      <p class="hint">按最大宽高等比缩放（只缩小不放大）。JPEG 不支持透明，透明区域会自动填充为白色。</p>
      <p v-if="error" class="err">{{ error }}</p>
    </div>

    <template v-if="srcInfo">
      <div class="panel">
        <div class="panel-title">图片信息</div>
        <div class="kv"><span>原始尺寸</span><b>{{ srcInfo.w }} × {{ srcInfo.h }} px</b></div>
        <div class="kv"><span>原始大小</span><b>{{ (srcInfo.size / 1024).toFixed(1) }} KB</b></div>
        <template v-if="outInfo">
          <div class="kv"><span>输出格式</span><b>{{ format === 'jpeg' ? 'JPEG' : format.toUpperCase() }}</b></div>
          <div class="kv"><span>输出尺寸</span><b>{{ outInfo.w }} × {{ outInfo.h }} px</b></div>
          <div class="kv"><span>输出大小</span><b>{{ (outInfo.size / 1024).toFixed(1) }} KB</b></div>
        </template>
      </div>

      <div v-if="outUrl" class="panel center">
        <div class="panel-title">输出预览</div>
        <img :src="outUrl" class="result" alt="转换结果" />
        <div class="row" style="justify-content: center; margin-top: 12px">
          <a class="btn primary" :href="outUrl" :download="fileName">下载图片</a>
        </div>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const format = ref('png')
const quality = ref(0.9)
const maxW = ref('')
const maxH = ref('')
const srcInfo = ref(null)
const outInfo = ref(null)
const outUrl = ref('')
const error = ref('')

const typeMap = { png: 'image/png', jpeg: 'image/jpeg', webp: 'image/webp' }
const extMap = { png: 'png', jpeg: 'jpg', webp: 'webp' }

let img = null
let srcUrl = ''
let timer = null
let seq = 0

const fileName = computed(() => {
  const base = (srcInfo.value?.name || 'image').replace(/\.[^.]+$/, '')
  return `${base}.${extMap[format.value]}`
})

function toNum(v) {
  const n = Number(v)
  return Number.isFinite(n) && n > 0 ? n : 0
}

function onFile(e) {
  const f = e.target.files?.[0]
  e.target.value = ''
  if (!f) return
  if (!f.type.startsWith('image/')) {
    error.value = '请选择图片文件'
    return
  }
  if (srcUrl) URL.revokeObjectURL(srcUrl)
  srcUrl = URL.createObjectURL(f)
  if (outUrl.value) URL.revokeObjectURL(outUrl.value)
  outUrl.value = ''
  outInfo.value = null
  const image = new Image()
  image.onload = () => {
    img = image
    error.value = ''
    srcInfo.value = { name: f.name, w: image.naturalWidth, h: image.naturalHeight, size: f.size }
    convert()
  }
  image.onerror = () => {
    img = null
    srcInfo.value = null
    error.value = '图片读取失败'
  }
  image.src = srcUrl
}

function convert() {
  if (!img) return
  const my = ++seq
  const w0 = img.naturalWidth
  const h0 = img.naturalHeight
  const mw = toNum(maxW.value)
  const mh = toNum(maxH.value)
  let scale = 1
  if (mw > 0) scale = Math.min(scale, mw / w0)
  if (mh > 0) scale = Math.min(scale, mh / h0)
  const w = Math.max(1, Math.round(w0 * scale))
  const h = Math.max(1, Math.round(h0 * scale))

  const c = document.createElement('canvas')
  c.width = w
  c.height = h
  const ctx = c.getContext('2d')
  if (format.value === 'jpeg') {
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, w, h)
  }
  ctx.drawImage(img, 0, 0, w, h)

  const type = typeMap[format.value]
  const q = format.value === 'png' ? undefined : quality.value
  c.toBlob(
    blob => {
      if (my !== seq) return
      if (!blob) {
        error.value = '转换失败，当前浏览器可能不支持该输出格式'
        return
      }
      if (outUrl.value) URL.revokeObjectURL(outUrl.value)
      outUrl.value = URL.createObjectURL(blob)
      outInfo.value = { w, h, size: blob.size }
      error.value = ''
    },
    type,
    q
  )
}

function schedule() {
  clearTimeout(timer)
  timer = setTimeout(convert, 200)
}

watch([format, quality, maxW, maxH], schedule)

onBeforeUnmount(() => {
  clearTimeout(timer)
  if (outUrl.value) URL.revokeObjectURL(outUrl.value)
  if (srcUrl) URL.revokeObjectURL(srcUrl)
})
</script>

<style scoped>
.result {
  max-width: 100%;
  max-height: 320px;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: #fff;
}

a.btn {
  text-decoration: none;
}
</style>
