<template>
  <div>
    <div class="panel">
      <div class="field">
        <label>选择图片</label>
        <input type="file" accept="image/*" @change="onFile" />
      </div>
      <div v-if="src" class="row" style="align-items: flex-start">
        <img :src="src" class="preview" alt="原图预览" />
        <div class="stats-grid" style="flex: 1; min-width: 220px">
          <div class="stat"><b>{{ fmtSize(fileSize) }}</b><span>原始大小</span></div>
          <div class="stat"><b>{{ imgW }}×{{ imgH }}</b><span>原始尺寸</span></div>
          <div class="stat"><b>{{ outSize ? fmtSize(outSize) : '-' }}</b><span>处理后大小</span></div>
          <div class="stat"><b>{{ sizeChange }}</b><span>体积变化</span></div>
        </div>
      </div>
    </div>
    <div v-if="src" class="panel">
      <div class="panel-title">处理选项（压缩 + 格式转换）</div>
      <div class="row">
        <div class="field">
          <label>输出格式</label>
          <select v-model="outType">
            <option value="image/jpeg">JPEG</option>
            <option value="image/webp">WebP</option>
            <option value="image/png">PNG</option>
          </select>
        </div>
        <div v-if="outType !== 'image/png'" class="field">
          <label>质量 {{ Math.round(quality * 100) }}%</label>
          <input v-model.number="quality" type="range" min="0.1" max="1" step="0.05" style="width: 150px" />
        </div>
        <div class="field">
          <label>最大宽度（0 = 不缩放）</label>
          <input v-model.number="maxWidth" type="number" min="0" style="width: 120px" />
        </div>
        <button class="btn primary" @click="process">开始处理</button>
      </div>
      <p class="hint">PNG 为无损格式，不使用质量参数；透明通道仅在 PNG / WebP 下保留。</p>
    </div>
    <div v-if="outUrl" class="panel center">
      <div class="panel-title">处理结果</div>
      <img :src="outUrl" class="preview" alt="结果预览" />
      <div class="row center-row">
        <a class="btn primary" :href="outUrl" :download="outName">下载（{{ outName }}）</a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const fileSize = ref(0)
const src = ref('')
const imgW = ref(0)
const imgH = ref(0)
const outType = ref('image/jpeg')
const quality = ref(0.8)
const maxWidth = ref(0)
const outUrl = ref('')
const outSize = ref(0)
const outName = ref('')
let imgEl = null

function extOf(mime) {
  return mime === 'image/png' ? '.png' : mime === 'image/webp' ? '.webp' : '.jpg'
}

function fmtSize(n) {
  if (n < 1024) return `${n} B`
  if (n < 1048576) return `${(n / 1024).toFixed(1)} KB`
  return `${(n / 1048576).toFixed(2)} MB`
}

const sizeChange = computed(() => {
  if (!outSize.value || !fileSize.value) return '-'
  const pct = Math.round((1 - outSize.value / fileSize.value) * 100)
  return pct >= 0 ? `-${pct}%` : `+${-pct}%`
})

function onFile(e) {
  const f = e.target.files[0]
  if (!f) return
  fileSize.value = f.size
  if (src.value) URL.revokeObjectURL(src.value)
  if (outUrl.value) {
    URL.revokeObjectURL(outUrl.value)
    outUrl.value = ''
    outSize.value = 0
  }
  src.value = URL.createObjectURL(f)
  const img = new Image()
  img.onload = () => {
    imgEl = img
    imgW.value = img.naturalWidth
    imgH.value = img.naturalHeight
  }
  img.src = src.value
}

async function process() {
  if (!imgEl) return
  const scale = maxWidth.value > 0 ? Math.min(1, maxWidth.value / imgW.value) : 1
  const w = Math.max(1, Math.round(imgW.value * scale))
  const h = Math.max(1, Math.round(imgH.value * scale))
  const canvas = document.createElement('canvas')
  canvas.width = w
  canvas.height = h
  canvas.getContext('2d').drawImage(imgEl, 0, 0, w, h)
  const blob = await new Promise(res => canvas.toBlob(res, outType.value, quality.value))
  if (!blob) return
  if (outUrl.value) URL.revokeObjectURL(outUrl.value)
  outUrl.value = URL.createObjectURL(blob)
  outSize.value = blob.size
  outName.value = 'converted' + extOf(outType.value)
}
</script>

<style scoped>
.preview {
  max-width: 260px;
  max-height: 200px;
  border-radius: 8px;
  border: 1px solid var(--border);
}

.center-row {
  justify-content: center;
}

a.btn {
  text-decoration: none;
  display: inline-block;
}
</style>
