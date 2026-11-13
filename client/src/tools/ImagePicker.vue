<template>
  <div>
    <div class="panel">
      <div class="field">
        <label>选择图片</label>
        <input type="file" accept="image/*" @change="onFile" />
      </div>
      <p class="hint">打开图片后，在图上点击或移动鼠标即可取色。</p>
    </div>
    <div v-if="imgLoaded" class="panel">
      <div class="pick-row">
        <canvas ref="mainCanvas" class="main-canvas" @mousemove="onMove" @click="onClick"></canvas>
        <div class="pick-side">
          <canvas ref="zoomCanvas" width="120" height="120" class="zoom"></canvas>
          <div class="swatch-big" :style="{ background: current }"></div>
          <div class="kv"><span>HEX</span><b>{{ current }}</b></div>
          <div class="kv"><span>RGB</span><b>{{ rgbText }}</b></div>
          <div class="kv"><span>坐标</span><b>{{ pos.x }}, {{ pos.y }}</b></div>
          <div class="row" style="margin-top: 10px">
            <CopyButton :text="current" />
            <button class="btn small" @click="saveToPalette">存入色板</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, ref } from 'vue'
import CopyButton from '../components/CopyButton.vue'
import { loadStore, saveStore } from '../api/storage.js'

const mainCanvas = ref(null)
const zoomCanvas = ref(null)
const imgLoaded = ref(false)
const current = ref('#000000')
const rgbText = ref('0, 0, 0')
const pos = ref({ x: 0, y: 0 })

let img = null
let scale = 1

function onFile(e) {
  const f = e.target.files[0]
  if (!f) return
  const url = URL.createObjectURL(f)
  img = new Image()
  img.onload = () => {
    imgLoaded.value = true
    nextTickDraw()
  }
  img.src = url
}

function nextTickDraw() {
  requestAnimationFrame(() => {
    const canvas = mainCanvas.value
    if (!canvas || !img) return
    const maxW = 560
    scale = Math.min(1, maxW / img.naturalWidth)
    canvas.width = Math.round(img.naturalWidth * scale)
    canvas.height = Math.round(img.naturalHeight * scale)
    canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height)
  })
}

function pickAt(x, y) {
  const canvas = mainCanvas.value
  if (!canvas || !img) return
  const rect = canvas.getBoundingClientRect()
  const px = Math.max(0, Math.min(canvas.width - 1, Math.round(x - rect.left)))
  const py = Math.max(0, Math.min(canvas.height - 1, Math.round(y - rect.top)))
  pos.value = { x: px, y: py }
  const ctx = canvas.getContext('2d')
  const d = ctx.getImageData(px, py, 1, 1).data
  const hex = `#${[d[0], d[1], d[2]].map(v => v.toString(16).padStart(2, '0')).join('')}`
  current.value = hex
  rgbText.value = `${d[0]}, ${d[1]}, ${d[2]}`
  drawZoom(px, py)
}

function drawZoom(px, py) {
  const zoom = zoomCanvas.value
  if (!zoom || !img) return
  const ctx = zoom.getContext('2d')
  ctx.imageSmoothingEnabled = false
  ctx.fillStyle = '#000'
  ctx.fillRect(0, 0, 120, 120)
  // 以图片原始坐标为中心取 24x24 像素区域放大
  const nx = Math.round(px / scale)
  const ny = Math.round(py / scale)
  const half = 12
  ctx.drawImage(img, nx - half, ny - half, half * 2, half * 2, 0, 0, 120, 120)
}

function onMove(e) {
  pickAt(e.clientX, e.clientY)
}

function onClick(e) {
  pickAt(e.clientX, e.clientY)
}

async function saveToPalette() {
  const data = (await loadStore('palette')) || []
  if (!Array.isArray(data)) return
  if (data.includes(current.value)) return
  await saveStore('palette', [current.value, ...data].slice(0, 60))
}

onBeforeUnmount(() => {})
</script>

<style scoped>
.pick-row {
  display: flex;
  gap: 16px;
  flex-wrap: wrap;
  align-items: flex-start;
}

.main-canvas {
  max-width: 100%;
  border-radius: 8px;
  border: 1px solid var(--border);
  cursor: crosshair;
}

.pick-side {
  width: 160px;
}

.zoom {
  width: 120px;
  height: 120px;
  border-radius: 8px;
  border: 1px solid var(--border);
  image-rendering: pixelated;
}

.swatch-big {
  width: 120px;
  height: 44px;
  border-radius: 8px;
  border: 1px solid var(--border);
  margin: 10px 0;
}
</style>
