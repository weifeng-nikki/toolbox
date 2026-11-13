<template>
  <div>
    <div class="panel">
      <div class="field">
        <label>内容（文本 / 链接 / Wi-Fi 配置等）</label>
        <textarea v-model="text" rows="3" placeholder="https://example.com"></textarea>
      </div>
      <div class="row">
        <div class="field">
          <label>尺寸</label>
          <select v-model.number="size">
            <option :value="256">256 px</option>
            <option :value="384">384 px</option>
            <option :value="512">512 px</option>
          </select>
        </div>
        <div class="field">
          <label>纠错级别</label>
          <select v-model="level">
            <option value="L">L（约 7%）</option>
            <option value="M">M（约 15%）</option>
            <option value="Q">Q（约 25%）</option>
            <option value="H">H（约 30%）</option>
          </select>
        </div>
        <div class="field">
          <label>前景色</label>
          <input v-model="dark" type="color" />
        </div>
        <div class="field">
          <label>背景色</label>
          <input v-model="light" type="color" />
        </div>
      </div>
      <p class="hint">二维码库首次使用需联网加载约 40KB，之后浏览器会缓存；断网时无法生成。</p>
      <p v-if="error" class="err">{{ error }}</p>
    </div>

    <div class="panel center">
      <canvas ref="canvas" class="qr"></canvas>
      <div class="row center-row">
        <button class="btn primary" :disabled="!ready" @click="download">下载 PNG</button>
        <CopyButton :text="text" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref, watch } from 'vue'
import CopyButton from '../components/CopyButton.vue'

const CDN = 'https://cdn.jsdelivr.net/npm/qrcode@1.5.3/build/qrcode.min.js'

const text = ref('https://example.com')
const size = ref(384)
const level = ref('M')
const dark = ref('#38332f')
const light = ref('#fffdfb')
const canvas = ref(null)
const ready = ref(false)
const error = ref('')

let timer = null
let loading = null

function loadLib() {
  if (window.QRCode) return Promise.resolve()
  if (loading) return loading
  loading = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = CDN
    s.async = true
    s.onload = () => resolve()
    s.onerror = () => {
      loading = null
      reject(new Error('load failed'))
    }
    document.head.appendChild(s)
  })
  return loading
}

async function render() {
  if (!canvas.value) return
  const value = text.value.trim()
  if (!value) {
    ready.value = false
    error.value = ''
    canvas.value.getContext('2d').clearRect(0, 0, canvas.value.width, canvas.value.height)
    return
  }
  try {
    await loadLib()
    await window.QRCode.toCanvas(canvas.value, value, {
      width: size.value,
      margin: 2,
      errorCorrectionLevel: level.value,
      color: { dark: dark.value, light: light.value }
    })
    ready.value = true
    error.value = ''
  } catch (e) {
    ready.value = false
    error.value = '二维码库加载失败（可能处于离线状态），联网后会自动重试。'
  }
}

function schedule() {
  clearTimeout(timer)
  timer = setTimeout(render, 250)
}

function download() {
  const a = document.createElement('a')
  a.href = canvas.value.toDataURL('image/png')
  a.download = 'qrcode.png'
  a.click()
}

watch([text, size, level, dark, light], schedule)
onMounted(render)
onBeforeUnmount(() => clearTimeout(timer))
</script>

<style scoped>
.qr {
  max-width: 100%;
  border-radius: 10px;
  border: 1px solid var(--border);
  background: #fff;
}

.center-row {
  justify-content: center;
  margin-top: 12px;
}
</style>
