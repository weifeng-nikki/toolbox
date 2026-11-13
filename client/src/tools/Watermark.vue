<template>
  <div>
    <div class="panel">
      <div class="row">
        <div class="field">
          <label>选择图片</label>
          <input type="file" accept="image/*" @change="onFile" />
        </div>
      </div>
      <div class="field">
        <label>水印文字</label>
        <input v-model="text" type="text" maxlength="60" placeholder="© 我的水印" />
      </div>
      <div class="row">
        <div class="field">
          <label>字号：{{ fontSize }} px</label>
          <input v-model.number="fontSize" type="range" min="12" max="72" step="1" style="width: 150px" />
        </div>
        <div class="field">
          <label>透明度：{{ Math.round(opacity * 100) }}%</label>
          <input v-model.number="opacity" type="range" min="0.05" max="1" step="0.01" style="width: 150px" />
        </div>
        <div class="field">
          <label>旋转角度：{{ rotate }}°</label>
          <input v-model.number="rotate" type="range" min="-90" max="90" step="1" style="width: 150px" />
        </div>
        <div class="field">
          <label>平铺间距：{{ gap }} px</label>
          <input v-model.number="gap" type="range" min="0" max="300" step="5" style="width: 150px" />
        </div>
      </div>
      <div class="row">
        <div class="field">
          <label>平铺模式</label>
          <select v-model="mode">
            <option value="single">单行居中</option>
            <option value="tile">平铺</option>
          </select>
        </div>
        <div class="field">
          <label>水印颜色</label>
          <input v-model="color" type="color" />
        </div>
      </div>
      <p v-if="loaded" class="hint">导出尺寸与原图一致 {{ dims.w }}×{{ dims.h }} px，预览仅做等比缩放显示。</p>
      <p v-else class="hint">上传图片后即可调整水印参数，导出 PNG 为原图分辨率。</p>
    </div>

    <div v-if="loaded" class="panel">
      <div class="panel-title">预览</div>
      <canvas ref="canvas" class="preview"></canvas>
      <div class="row" style="margin-top: 12px">
        <button class="btn primary" @click="exportPng">导出 PNG</button>
        <span v-if="outKb" class="ok" style="margin: 0">已导出，约 {{ outKb }} KB</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'

const canvas = ref(null)
const loaded = ref(false)
const text = ref('© 我的水印')
const fontSize = ref(36)
const color = ref('#ffffff')
const opacity = ref(0.4)
const rotate = ref(-25)
const gap = ref(80)
const mode = ref('tile')
const dims = ref({ w: 0, h: 0 })
const outKb = ref('')

let img = null
let srcUrl = ''
let outUrl = ''
let timer = null

function onFile(e) {
  const f = e.target.files?.[0]
  e.target.value = ''
  if (!f) return
  if (srcUrl) URL.revokeObjectURL(srcUrl)
  srcUrl = URL.createObjectURL(f)
  const image = new Image()
  image.onload = () => {
    img = image
    loaded.value = true
    outKb.value = ''
    dims.value = { w: image.naturalWidth, h: image.naturalHeight }
    requestAnimationFrame(draw)
  }
  image.onerror = () => {
    loaded.value = false
  }
  image.src = srcUrl
}

function draw() {
  const c = canvas.value
  if (!c || !img) return
  if (c.width !== img.naturalWidth) c.width = img.naturalWidth
  if (c.height !== img.naturalHeight) c.height = img.naturalHeight
  const ctx = c.getContext('2d')
  ctx.clearRect(0, 0, c.width, c.height)
  ctx.drawImage(img, 0, 0)

  const t = text.value.trim()
  if (!t) return
  const size = Math.max(12, Math.min(72, Number(fontSize.value) || 36))
  ctx.save()
  ctx.globalAlpha = Math.max(0.05, Math.min(1, Number(opacity.value) || 0.4))
  ctx.fillStyle = color.value
  ctx.font = `600 ${size}px system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif`
  ctx.textAlign = 'center'
  ctx.textBaseline = 'middle'
  const rad = ((Number(rotate.value) || 0) * Math.PI) / 180

  if (mode.value === 'single') {
    ctx.translate(c.width / 2, c.height / 2)
    ctx.rotate(rad)
    ctx.fillText(t, 0, 0)
  } else {
    const tw = ctx.measureText(t).width
    const g = Math.max(0, Number(gap.value) || 0)
    const stepX = Math.max(tw + g, 24)
    const stepY = Math.max(size + g, 16)
    const diag = Math.ceil(Math.sqrt(c.width * c.width + c.height * c.height))
    ctx.translate(c.width / 2, c.height / 2)
    ctx.rotate(rad)
    for (let y = -diag / 2; y <= diag / 2; y += stepY) {
      for (let x = -diag / 2; x <= diag / 2; x += stepX) {
        ctx.fillText(t, x, y)
      }
    }
  }
  ctx.restore()
}

function schedule() {
  clearTimeout(timer)
  timer = setTimeout(draw, 120)
}

function exportPng() {
  const c = canvas.value
  if (!c || !img) return
  draw()
  c.toBlob(blob => {
    if (!blob) return
    if (outUrl) URL.revokeObjectURL(outUrl)
    outUrl = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = outUrl
    a.download = 'watermark.png'
    document.body.appendChild(a)
    a.click()
    a.remove()
    outKb.value = (blob.size / 1024).toFixed(1)
  }, 'image/png')
}

watch([text, fontSize, color, opacity, rotate, gap, mode], schedule)

onBeforeUnmount(() => {
  clearTimeout(timer)
  if (outUrl) URL.revokeObjectURL(outUrl)
  if (srcUrl) URL.revokeObjectURL(srcUrl)
})
</script>

<style scoped>
.preview {
  display: block;
  max-width: 100%;
  height: auto;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: var(--panel2);
}
</style>
