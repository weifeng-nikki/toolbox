<template>
  <div>
    <div class="panel">
      <div class="row">
        <div class="field">
          <label>选择图片（可多选，可多次追加）</label>
          <input type="file" accept="image/*" multiple @change="onFiles" />
        </div>
        <div class="field">
          <label>拼接宽度</label>
          <select v-model="mode">
            <option value="auto">统一宽度（取最宽）</option>
            <option value="fixed">统一定宽（手填）</option>
          </select>
        </div>
        <div v-if="mode === 'fixed'" class="field">
          <label>目标宽度（px）</label>
          <input v-model.number="fixedWidth" type="number" min="50" max="4000" style="width: 120px" />
        </div>
        <div class="field">
          <label>图片间距：{{ gap }} px</label>
          <input v-model.number="gap" type="range" min="0" max="40" step="1" style="width: 150px" />
        </div>
      </div>
      <p class="hint">所有图片等比缩放到统一宽度后，按列表顺序垂直拼接，间距区域填充白色。</p>
      <p v-if="loading" class="hint">正在加载图片…</p>
      <p v-if="error" class="err">{{ error }}</p>
    </div>

    <div v-if="items.length" class="panel">
      <div class="panel-title">
        图片列表（{{ items.length }} 张）
        <button class="btn small" @click="clearAll">清空</button>
      </div>
      <div class="list">
        <div v-for="(it, i) in items" :key="it.id" class="item">
          <img :src="it.url" class="thumb" alt="" />
          <div class="meta">
            <b>#{{ i + 1 }}</b>
            <span class="mono">{{ it.w }}×{{ it.h }}</span>
            <span class="name">{{ it.name }}</span>
          </div>
          <div class="ops">
            <button class="btn small" :disabled="i === 0" @click="move(i, -1)">上移</button>
            <button class="btn small" :disabled="i === items.length - 1" @click="move(i, 1)">下移</button>
            <button class="btn small" @click="remove(i)">删除</button>
          </div>
        </div>
      </div>
    </div>

    <div v-if="items.length" class="panel">
      <div class="panel-title">
        拼接结果
        <span v-if="resultSize" class="pill">{{ resultSize.w }}×{{ resultSize.h }} px</span>
      </div>
      <p v-if="loading" class="hint">正在加载图片…</p>
      <p v-else-if="building" class="hint">正在拼接…</p>
      <img v-else-if="resultUrl" :src="resultUrl" class="result" alt="拼接结果" />
      <div class="row" style="margin-top: 12px">
        <a v-if="resultUrl && !building" class="btn primary" :href="resultUrl" download="stitched.png">下载 PNG</a>
        <span v-if="resultSize" class="hint" style="margin: 0">文件约 {{ resultSize.kb }} KB</span>
      </div>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, ref, watch } from 'vue'

const items = ref([])
const mode = ref('auto')
const fixedWidth = ref(1000)
const gap = ref(0)
const loading = ref(false)
const building = ref(false)
const resultUrl = ref('')
const resultSize = ref(null)
const error = ref('')

let seqId = 0
let loadSeq = 0
let buildSeq = 0
let timer = null

function loadOne(file) {
  return new Promise(resolve => {
    const url = URL.createObjectURL(file)
    const img = new Image()
    img.onload = () =>
      resolve({
        id: ++seqId,
        name: file.name,
        url,
        img,
        w: img.naturalWidth,
        h: img.naturalHeight
      })
    img.onerror = () => {
      URL.revokeObjectURL(url)
      resolve(null)
    }
    img.src = url
  })
}

async function onFiles(e) {
  const files = Array.from(e.target.files || [])
  e.target.value = ''
  if (!files.length) return
  loading.value = true
  error.value = ''
  const my = ++loadSeq
  const loaded = await Promise.all(files.map(loadOne))
  if (my !== loadSeq) {
    loaded.forEach(it => it && URL.revokeObjectURL(it.url))
    return
  }
  const ok = loaded.filter(Boolean)
  if (ok.length < files.length) error.value = `${files.length - ok.length} 张图片读取失败，已跳过`
  items.value = items.value.concat(ok)
  loading.value = false
  scheduleBuild()
}

function remove(i) {
  const [it] = items.value.splice(i, 1)
  if (it) URL.revokeObjectURL(it.url)
  scheduleBuild()
}

function move(i, d) {
  const j = i + d
  if (j < 0 || j >= items.value.length) return
  const arr = items.value.slice()
  const t = arr[i]
  arr[i] = arr[j]
  arr[j] = t
  items.value = arr
  scheduleBuild()
}

function clearAll() {
  clearTimeout(timer)
  loadSeq++
  buildSeq++
  loading.value = false
  items.value.forEach(it => URL.revokeObjectURL(it.url))
  items.value = []
  if (resultUrl.value) URL.revokeObjectURL(resultUrl.value)
  resultUrl.value = ''
  resultSize.value = null
  error.value = ''
}

function scheduleBuild() {
  clearTimeout(timer)
  buildSeq++
  timer = setTimeout(build, 260)
}

async function build() {
  const my = buildSeq
  if (!items.value.length) {
    if (resultUrl.value) URL.revokeObjectURL(resultUrl.value)
    resultUrl.value = ''
    resultSize.value = null
    building.value = false
    return
  }
  building.value = true
  error.value = ''

  try {
    const imgs = await Promise.all(
      items.value.map(
        it =>
          new Promise((resolve, reject) => {
            if (it.img.complete && it.img.naturalWidth) resolve(it.img)
            else {
              it.img.onload = () => resolve(it.img)
              it.img.onerror = () => reject(new Error('load'))
            }
          })
      )
    )
    if (my !== buildSeq) return

    const g = Math.min(40, Math.max(0, Number(gap.value) || 0))
    const widest = Math.max(...imgs.map(im => im.naturalWidth))
    let target = mode.value === 'fixed' ? Math.round(Number(fixedWidth.value) || 0) : widest
    if (!(target > 0)) target = widest

    const heights = imgs.map(im => Math.max(1, Math.round((im.naturalHeight * target) / im.naturalWidth)))
    const total = heights.reduce((s, h) => s + h, 0) + g * (imgs.length - 1)

    const c = document.createElement('canvas')
    c.width = target
    c.height = total
    const ctx = c.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, c.width, c.height)
    let y = 0
    imgs.forEach((im, i) => {
      ctx.drawImage(im, 0, y, target, heights[i])
      y += heights[i] + g
    })

    c.toBlob(blob => {
      if (my !== buildSeq) return
      if (!blob) {
        error.value = '拼接失败，请减少图片数量或降低宽度'
        building.value = false
        return
      }
      if (resultUrl.value) URL.revokeObjectURL(resultUrl.value)
      resultUrl.value = URL.createObjectURL(blob)
      resultSize.value = { w: target, h: total, kb: (blob.size / 1024).toFixed(1) }
      building.value = false
    }, 'image/png')
  } catch {
    if (my !== buildSeq) return
    error.value = '部分图片加载失败，无法拼接'
    building.value = false
  }
}

watch([mode, gap, fixedWidth], scheduleBuild)

onBeforeUnmount(() => {
  clearTimeout(timer)
  if (resultUrl.value) URL.revokeObjectURL(resultUrl.value)
  items.value.forEach(it => URL.revokeObjectURL(it.url))
})
</script>

<style scoped>
.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 340px;
  overflow: auto;
}

.item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 8px;
  border: 1px solid var(--border);
  border-radius: 9px;
  background: var(--panel2);
}

.thumb {
  width: 64px;
  height: 48px;
  flex-shrink: 0;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid var(--border);
  background: #fff;
}

.meta {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: baseline;
  gap: 10px;
  font-size: 13px;
}

.meta b {
  flex-shrink: 0;
}

.meta .mono {
  flex-shrink: 0;
  color: var(--muted);
}

.meta .name {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: var(--muted);
}

.ops {
  flex-shrink: 0;
  display: flex;
  gap: 6px;
}

.result {
  display: block;
  max-width: 100%;
  max-height: 460px;
  margin: 0 auto;
  border-radius: 8px;
  border: 1px solid var(--border);
  background: #fff;
}

a.btn {
  text-decoration: none;
}
</style>
