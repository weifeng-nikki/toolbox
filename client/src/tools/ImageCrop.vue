<template>
  <div>
    <div class="panel">
      <div class="row">
        <div class="field">
          <label>选择图片</label>
          <input type="file" accept="image/*" @change="onFile" />
        </div>
        <div class="field">
          <label>比例锁定</label>
          <select v-model="ratio">
            <option value="0">自由</option>
            <option value="1">1 : 1</option>
            <option value="1.3333">4 : 3</option>
            <option value="0.75">3 : 4</option>
            <option value="1.7778">16 : 9</option>
          </select>
        </div>
      </div>
      <p class="hint">在图上按住鼠标拖出选区，松开后点击"裁剪并导出"。</p>
    </div>
    <div v-if="imgLoaded" class="panel">
      <canvas
        ref="viewCanvas"
        class="view"
        @mousedown="onDown"
        @mousemove="onMove"
        @mouseup="onUp"
        @mouseleave="onUp"
      ></canvas>
      <div class="row" style="margin-top: 12px">
        <button class="btn primary" :disabled="!sel.w" @click="crop">裁剪并导出</button>
        <span v-if="sel.w" class="hint" style="margin: 0">
          选区 {{ Math.round(sel.w / scale) }}×{{ Math.round(sel.h / scale) }} px
        </span>
      </div>
    </div>
    <div v-if="outUrl" class="panel center">
      <div class="panel-title">裁剪结果</div>
      <img :src="outUrl" class="result" alt="裁剪结果" />
      <div class="row" style="justify-content: center; margin-top: 10px">
        <a class="btn primary" :href="outUrl" download="cropped.png">下载 PNG</a>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref } from 'vue'

const viewCanvas = ref(null)
const imgLoaded = ref(false)
const ratio = ref('0')
const outUrl = ref('')
const sel = ref({ x: 0, y: 0, w: 0, h: 0 })

let img = null
let scale = 1
let dragging = false
let startX = 0
let startY = 0

function onFile(e) {
  const f = e.target.files[0]
  if (!f) return
  const url = URL.createObjectURL(f)
  img = new Image()
  img.onload = () => {
    imgLoaded.value = true
    outUrl.value = ''
    sel.value = { x: 0, y: 0, w: 0, h: 0 }
    requestAnimationFrame(() => {
      const canvas = viewCanvas.value
      if (!canvas) return
      const maxW = 600
      scale = Math.min(1, maxW / img.naturalWidth)
      canvas.width = Math.round(img.naturalWidth * scale)
      canvas.height = Math.round(img.naturalHeight * scale)
      redraw()
    })
  }
  img.src = url
}

function redraw() {
  const canvas = viewCanvas.value
  if (!canvas || !img) return
  const ctx = canvas.getContext('2d')
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
  const s = sel.value
  if (s.w > 0 && s.h > 0) {
    // 选区外加深色遮罩
    ctx.fillStyle = 'rgba(0,0,0,0.45)'
    ctx.beginPath()
    ctx.rect(0, 0, canvas.width, canvas.height)
    ctx.rect(s.x, s.y, s.w, s.h)
    ctx.fill('evenodd')
    ctx.strokeStyle = '#0e9f6e'
    ctx.lineWidth = 2
    ctx.strokeRect(s.x, s.y, s.w, s.h)
  }
}

function onDown(e) {
  const rect = viewCanvas.value.getBoundingClientRect()
  dragging = true
  startX = e.clientX - rect.left
  startY = e.clientY - rect.top
  sel.value = { x: startX, y: startY, w: 0, h: 0 }
}

function onMove(e) {
  if (!dragging) return
  const rect = viewCanvas.value.getBoundingClientRect()
  const canvas = viewCanvas.value
  let w = e.clientX - rect.left - startX
  let h = e.clientY - rect.top - startY
  const r = parseFloat(ratio.value)
  if (r > 0) {
    // 按比例约束：以宽度为主导
    h = Math.sign(h || 1) * Math.abs(w) / r
  }
  let x = startX
  let y = startY
  if (w < 0) {
    x = startX + w
    w = -w
  }
  if (h < 0) {
    y = startY + h
    h = -h
  }
  // 越界裁断
  if (x + w > canvas.width) w = canvas.width - x
  if (y + h > canvas.height) h = canvas.height - y
  sel.value = { x, y, w, h }
  redraw()
}

function onUp() {
  dragging = false
}

function crop() {
  const s = sel.value
  if (!img || s.w < 2 || s.h < 2) return
  const canvas = document.createElement('canvas')
  canvas.width = Math.max(1, Math.round(s.w / scale))
  canvas.height = Math.max(1, Math.round(s.h / scale))
  canvas
    .getContext('2d')
    .drawImage(img, Math.round(s.x / scale), Math.round(s.y / scale), canvas.width, canvas.height, 0, 0, canvas.width, canvas.height)
  if (outUrl.value) URL.revokeObjectURL(outUrl.value)
  canvas.toBlob(blob => {
    outUrl.value = URL.createObjectURL(blob)
  }, 'image/png')
}
</script>

<style scoped>
.view {
  max-width: 100%;
  border-radius: 8px;
  border: 1px solid var(--border);
  cursor: crosshair;
  touch-action: none;
}

.result {
  max-width: 100%;
  max-height: 300px;
  border-radius: 8px;
  border: 1px solid var(--border);
}

a.btn {
  text-decoration: none;
  display: inline-block;
}
</style>
