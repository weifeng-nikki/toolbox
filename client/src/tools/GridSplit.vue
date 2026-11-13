<template>
  <div>
    <div class="panel">
      <div class="row">
        <input type="file" accept="image/*" @change="onFile" />
        <select v-model.number="grid">
          <option :value="2">2 × 2</option>
          <option :value="3">3 × 3</option>
          <option :value="4">4 × 4</option>
        </select>
        <button class="btn primary" :disabled="!source" @click="split">重新切图</button>
        <button class="btn" :disabled="!tiles.length" @click="downloadAll">全部下载</button>
      </div>
      <p class="hint">按原图尺寸等比切成 {{ grid }}×{{ grid }} 块，导出为 PNG。</p>
      <p v-if="error" class="err">{{ error }}</p>
    </div>

    <div v-if="source" class="panel">
      <div class="panel-title">原图预览</div>
      <div class="preview">
        <img :src="source.url" alt="原图" />
        <div
          v-for="(l, i) in lines"
          :key="i"
          class="guide"
          :class="l.vertical ? 'v' : 'h'"
          :style="l.vertical ? { left: l.pos } : { top: l.pos }"
        ></div>
      </div>
    </div>

    <div v-if="tiles.length" class="panel">
      <div class="panel-title">切片结果</div>
      <div class="tiles" :style="{ gridTemplateColumns: `repeat(${grid}, 1fr)` }">
        <figure v-for="(t, i) in tiles" :key="t.url" class="tile">
          <img :src="t.url" :alt="`切片 ${i + 1}`" />
          <a class="btn small" :href="t.url" :download="t.name">下载</a>
        </figure>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const grid = ref(3)
const source = ref(null)
const tiles = ref([])
const error = ref('')

const lines = computed(() => {
  const out = []
  for (let i = 1; i < grid.value; i++) {
    const pos = `${(i * 100) / grid.value}%`
    out.push({ vertical: true, pos })
    out.push({ vertical: false, pos })
  }
  return out
})

function clearTiles() {
  tiles.value.forEach(t => URL.revokeObjectURL(t.url))
  tiles.value = []
}

function onFile(e) {
  const file = e.target.files && e.target.files[0]
  if (!file) return
  clearTiles()
  if (source.value) URL.revokeObjectURL(source.value.url)
  source.value = null
  error.value = ''
  const url = URL.createObjectURL(file)
  const img = new Image()
  img.onload = () => {
    source.value = { el: img, width: img.naturalWidth, height: img.naturalHeight, url }
    split()
  }
  img.onerror = () => {
    URL.revokeObjectURL(url)
    error.value = '图片读取失败，请换一张试试。'
  }
  img.src = url
}

async function split() {
  if (!source.value) return
  clearTiles()
  const n = grid.value
  const { el, width, height } = source.value
  const cw = Math.floor(width / n)
  const ch = Math.floor(height / n)
  if (cw < 1 || ch < 1) {
    error.value = '图片太小，切不出这么多块。'
    return
  }
  error.value = ''
  const canvas = document.createElement('canvas')
  const ctx = canvas.getContext('2d')
  const out = []
  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {
      canvas.width = cw
      canvas.height = ch
      ctx.clearRect(0, 0, cw, ch)
      ctx.drawImage(el, c * cw, r * ch, cw, ch, 0, 0, cw, ch)
      const blob = await new Promise(res => canvas.toBlob(res, 'image/png'))
      out.push({ url: URL.createObjectURL(blob), name: `slice-${r + 1}-${c + 1}.png` })
    }
  }
  tiles.value = out
}

function downloadAll() {
  tiles.value.forEach((t, i) => {
    setTimeout(() => {
      const a = document.createElement('a')
      a.href = t.url
      a.download = t.name
      document.body.appendChild(a)
      a.click()
      a.remove()
    }, i * 260)
  })
}

watch(grid, () => split())

onBeforeUnmount(() => {
  clearTiles()
  if (source.value) URL.revokeObjectURL(source.value.url)
})
</script>

<style scoped>
.preview {
  position: relative;
  display: inline-block;
  max-width: 100%;
  line-height: 0;
  border-radius: 10px;
  overflow: hidden;
  border: 1px solid var(--border);
  margin-top: 4px;
}

.preview img {
  max-width: 100%;
  max-height: 420px;
  display: block;
}

.guide {
  position: absolute;
  background: rgba(255, 255, 255, 0.92);
  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.3);
  pointer-events: none;
}

.guide.v {
  top: 0;
  bottom: 0;
  width: 1px;
}

.guide.h {
  left: 0;
  right: 0;
  height: 1px;
}

.tiles {
  display: grid;
  gap: 10px;
  margin-top: 10px;
}

.tile {
  margin: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.tile img {
  width: 100%;
  display: block;
  border-radius: 8px;
  border: 1px solid var(--border);
}

.tile .btn {
  justify-content: center;
  text-decoration: none;
}
</style>
