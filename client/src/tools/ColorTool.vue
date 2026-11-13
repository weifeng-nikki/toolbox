<template>
  <div>
    <div class="panel">
      <div class="row">
        <div class="swatch" :style="{ background: validHex }"></div>
        <div class="col">
          <div class="field">
            <label>HEX</label>
            <div class="row">
              <input v-model="hex" class="mono" style="width: 130px" placeholder="#0e9f6e" />
              <input v-model="hex" type="color" style="width: 44px; padding: 2px; height: 38px" />
              <button v-if="hasEyeDropper" class="btn small" @click="pickScreen">屏幕取色</button>
            </div>
          </div>
        </div>
      </div>
      <div class="row" style="margin-top: 12px">
        <div class="field inline">
          <label>R</label>
          <input v-model.number="r" type="number" min="0" max="255" style="width: 70px" />
        </div>
        <div class="field inline">
          <label>G</label>
          <input v-model.number="g" type="number" min="0" max="255" style="width: 70px" />
        </div>
        <div class="field inline">
          <label>B</label>
          <input v-model.number="b" type="number" min="0" max="255" style="width: 70px" />
        </div>
        <div class="field inline">
          <label>H</label>
          <input v-model.number="h" type="number" min="0" max="360" style="width: 70px" />
        </div>
        <div class="field inline">
          <label>S%</label>
          <input v-model.number="s" type="number" min="0" max="100" style="width: 64px" />
        </div>
        <div class="field inline">
          <label>L%</label>
          <input v-model.number="l" type="number" min="0" max="100" style="width: 64px" />
        </div>
      </div>
      <p v-if="!validHex" class="err">HEX 格式不正确，示例：#0e9f6e 或 #0f9</p>
    </div>
    <div class="panel">
      <div class="panel-title">色板收藏 <button class="btn small" :disabled="!validHex" @click="addToPalette">收藏当前颜色</button></div>
      <div v-if="palette.length" class="pal-grid">
        <div v-for="(c, i) in palette" :key="c + i" class="pal-item">
          <button class="pal" :style="{ background: c }" :title="c" @click="applyHex(c)"></button>
          <span class="pal-hex mono">{{ c }}</span>
          <button class="pal-del" title="删除" @click="delPalette(i)">×</button>
        </div>
      </div>
      <p v-else class="hint">暂无收藏。取色后点击"收藏当前颜色"保存（数据存后端 JSON）。</p>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch } from 'vue'
import { loadStore, saveStore } from '../api/storage.js'

const hasEyeDropper = typeof window !== 'undefined' && 'EyeDropper' in window

const hex = ref('#0e9f6e')
const r = ref(14)
const g = ref(159)
const b = ref(110)
const h = ref(0)
const s = ref(0)
const l = ref(0)
const palette = ref([])
let lock = false

// —— 颜色换算 ——
function hexToRgb(str) {
  let t = str.trim().replace('#', '')
  if (/^[0-9a-f]{3}$/i.test(t)) t = t.split('').map(c => c + c).join('')
  if (!/^[0-9a-f]{6}$/i.test(t)) return null
  const n = parseInt(t, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

function rgbToHex(rr, gg, bb) {
  const p = v => Math.max(0, Math.min(255, Math.round(v))).toString(16).padStart(2, '0')
  return `#${p(rr)}${p(gg)}${p(bb)}`
}

function rgbToHsl(rr, gg, bb) {
  const rn = rr / 255, gn = gg / 255, bn = bb / 255
  const max = Math.max(rn, gn, bn), min = Math.min(rn, gn, bn)
  let hh = 0, ss = 0
  const ll = (max + min) / 2
  if (max !== min) {
    const d = max - min
    ss = ll > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === rn) hh = (gn - bn) / d + (gn < bn ? 6 : 0)
    else if (max === gn) hh = (bn - rn) / d + 2
    else hh = (rn - gn) / d + 4
    hh *= 60
  }
  return [Math.round(hh), Math.round(ss * 100), Math.round(ll * 100)]
}

function hslToRgb(hh, ss, ll) {
  const sn = ss / 100, ln = ll / 100
  const k = n => (n + hh / 30) % 12
  const a = sn * Math.min(ln, 1 - ln)
  const f = n => ln - a * Math.max(-1, Math.min(k(n) - 3, Math.min(9 - k(n), 1)))
  return [Math.round(f(0) * 255), Math.round(f(8) * 255), Math.round(f(4) * 255)]
}

function syncFromRgb() {
  const [hh, ss, ll] = rgbToHsl(r.value, g.value, b.value)
  h.value = hh
  s.value = ss
  l.value = ll
  hex.value = rgbToHex(r.value, g.value, b.value)
}

watch([r, g, b], () => {
  if (lock) return
  lock = true
  syncFromRgb()
  lock = false
})

watch([h, s, l], () => {
  if (lock) return
  lock = true
  ;[r.value, g.value, b.value] = hslToRgb(h.value, s.value, l.value)
  hex.value = rgbToHex(r.value, g.value, b.value)
  lock = false
})

watch(hex, () => {
  if (lock) return
  const rgb = hexToRgb(hex.value)
  if (!rgb) return
  lock = true
  ;[r.value, g.value, b.value] = rgb
  const [hh, ss, ll] = rgbToHsl(...rgb)
  h.value = hh
  s.value = ss
  l.value = ll
  lock = false
})

const validHex = computed(() => {
  const rgb = hexToRgb(hex.value)
  return rgb ? rgbToHex(...rgb) : ''
})

function applyHex(c) {
  hex.value = c
}

async function pickScreen() {
  try {
    const d = new window.EyeDropper()
    const res = await d.open()
    hex.value = res.sRGBHex
  } catch {
    /* 用户取消 */
  }
}

onMounted(async () => {
  const data = await loadStore('palette')
  if (Array.isArray(data)) palette.value = data
})

async function addToPalette() {
  if (!validHex.value || palette.value.includes(validHex.value)) return
  palette.value = [validHex.value, ...palette.value].slice(0, 60)
  await saveStore('palette', palette.value)
}

async function delPalette(i) {
  palette.value = palette.value.filter((_, idx) => idx !== i)
  await saveStore('palette', palette.value)
}
</script>

<style scoped>
.swatch {
  width: 84px;
  height: 84px;
  border-radius: var(--radius);
  border: 1px solid var(--border);
  flex-shrink: 0;
}

.col {
  flex: 1;
}

.mono {
  font-family: var(--mono);
}

.pal-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(96px, 1fr));
  gap: 10px;
}

.pal-item {
  position: relative;
  text-align: center;
}

.pal {
  width: 100%;
  height: 56px;
  border-radius: 8px;
  border: 1px solid var(--border);
  cursor: pointer;
  padding: 0;
}

.pal-hex {
  display: block;
  font-size: 11px;
  color: var(--muted);
  margin-top: 3px;
}

.pal-del {
  position: absolute;
  top: 4px;
  right: 4px;
  width: 18px;
  height: 18px;
  line-height: 16px;
  border-radius: 50%;
  border: none;
  background: rgba(0, 0, 0, 0.45);
  color: #fff;
  cursor: pointer;
  font-size: 12px;
  padding: 0;
}
</style>
