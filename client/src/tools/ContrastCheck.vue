<template>
  <div>
    <div class="panel">
      <div class="panel-title">颜色设置</div>
      <div class="row" style="gap: 24px; align-items: flex-start">
        <div class="field" style="flex: 1; min-width: 180px">
          <label>前景色（文字）</label>
          <div class="row" style="flex-wrap: nowrap">
            <input
              type="color"
              :value="fgColor || '#ffffff'"
              style="width: 52px; padding: 3px"
              @input="onFgPick"
            />
            <input
              v-model="fg"
              class="mono"
              placeholder="#5f7d6a"
              style="flex: 1; min-width: 0"
              @input="clearFix"
            />
          </div>
          <p v-if="!fgColor" class="err">请输入合法的十六进制颜色，如 #5f7d6a</p>
        </div>
        <div class="field" style="flex: 1; min-width: 180px">
          <label>背景色</label>
          <div class="row" style="flex-wrap: nowrap">
            <input
              type="color"
              :value="bgColor || '#ffffff'"
              style="width: 52px; padding: 3px"
              @input="onBgPick"
            />
            <input
              v-model="bg"
              class="mono"
              placeholder="#ffffff"
              style="flex: 1; min-width: 0"
              @input="clearFix"
            />
          </div>
          <p v-if="!bgColor" class="err">请输入合法的十六进制颜色，如 #ffffff</p>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">对比度</div>
      <div class="big-num" :style="{ color: ratioColor }">{{ ratioText }}</div>
      <div class="kv"><span>前景相对亮度</span><b>{{ fgLumText }}</b></div>
      <div class="kv"><span>背景相对亮度</span><b>{{ bgLumText }}</b></div>
      <div class="row" style="justify-content: center; gap: 8px; margin-top: 14px">
        <span
          v-for="c in checks"
          :key="c.label"
          class="pill"
          :class="c.pass ? 'ok' : 'err'"
          :style="c.pass ? 'margin: 0' : 'margin: 0; background: var(--rose-soft)'"
        >{{ c.label }}（{{ c.pass ? '通过' : '未通过' }}）</span>
      </div>
      <div class="row" style="margin-top: 14px">
        <button class="btn primary" @click="fixForeground">自动修正前景色</button>
      </div>
      <p v-if="suggestMsg" class="ok">{{ suggestMsg }}</p>
      <p v-if="failMsg" class="err">{{ failMsg }}</p>
      <p class="hint">自动修正会保持色相与饱和度不变，只调整亮度直到对比度刚好达到 4.5。</p>
    </div>

    <div class="panel">
      <div class="panel-title">预览</div>
      <div :style="previewStyle">
        <p style="font-size: 24px; font-weight: 700; margin: 0 0 8px; line-height: 1.4">
          大字号示例：清晰易读的标题
        </p>
        <p style="font-size: 15px; margin: 0; line-height: 1.6">
          正常字号示例：The quick brown fox jumps over the lazy dog，用于检查正文可读性。
        </p>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const fg = ref('#5f7d6a')
const bg = ref('#ffffff')
const suggested = ref('')
const failMsg = ref('')

function normalizeHex(input) {
  const t = String(input).trim().replace(/^#/, '')
  if (/^[0-9a-fA-F]{3}$/.test(t)) {
    return '#' + t.split('').map(c => c + c).join('').toLowerCase()
  }
  if (/^[0-9a-fA-F]{6}$/.test(t)) return '#' + t.toLowerCase()
  return null
}

function hexToRgb(hex) {
  const t = hex.slice(1)
  return [0, 2, 4].map(i => parseInt(t.slice(i, i + 2), 16))
}

function toLinear(v) {
  const s = v / 255
  return s <= 0.04045 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4)
}

function luminance(hex) {
  const [r, g, b] = hexToRgb(hex).map(toLinear)
  return 0.2126 * r + 0.7152 * g + 0.0722 * b
}

function contrastRatio(a, b) {
  const l1 = luminance(a)
  const l2 = luminance(b)
  const hi = Math.max(l1, l2)
  const lo = Math.min(l1, l2)
  return (hi + 0.05) / (lo + 0.05)
}

function hexToHsl(hex) {
  const [r0, g0, b0] = hexToRgb(hex).map(v => v / 255)
  const max = Math.max(r0, g0, b0)
  const min = Math.min(r0, g0, b0)
  const l = (max + min) / 2
  let h = 0
  let s = 0
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    if (max === r0) h = (g0 - b0) / d + (g0 < b0 ? 6 : 0)
    else if (max === g0) h = (b0 - r0) / d + 2
    else h = (r0 - g0) / d + 4
    h /= 6
  }
  return { h: h * 360, s, l }
}

function hslToHex(h, s, l) {
  const hue = (((h % 360) + 360) % 360) / 360
  let r
  let g
  let b
  if (s === 0) {
    r = l
    g = l
    b = l
  } else {
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s
    const p = 2 * l - q
    const hue2rgb = t => {
      let x = t
      if (x < 0) x += 1
      if (x > 1) x -= 1
      if (x < 1 / 6) return p + (q - p) * 6 * x
      if (x < 1 / 2) return q
      if (x < 2 / 3) return p + (q - p) * (2 / 3 - x) * 6
      return p
    }
    r = hue2rgb(hue + 1 / 3)
    g = hue2rgb(hue)
    b = hue2rgb(hue - 1 / 3)
  }
  const toHex = v => Math.round(v * 255).toString(16).padStart(2, '0')
  return '#' + toHex(r) + toHex(g) + toHex(b)
}

const fgColor = computed(() => normalizeHex(fg.value))
const bgColor = computed(() => normalizeHex(bg.value))

const contrast = computed(() => {
  if (!fgColor.value || !bgColor.value) return 0
  return contrastRatio(fgColor.value, bgColor.value)
})

const ratioText = computed(() =>
  fgColor.value && bgColor.value ? contrast.value.toFixed(2) : '—'
)

const fgLumText = computed(() => (fgColor.value ? luminance(fgColor.value).toFixed(2) : '—'))
const bgLumText = computed(() => (bgColor.value ? luminance(bgColor.value).toFixed(2) : '—'))

const ratioColor = computed(() => {
  if (!fgColor.value || !bgColor.value) return 'var(--muted)'
  return contrast.value >= 4.5 ? 'var(--accent-ink)' : 'var(--danger)'
})

const checks = computed(() => {
  const r = contrast.value
  return [
    { label: 'AA 普通文本 ≥ 4.5', pass: r >= 4.5 },
    { label: 'AAA 普通文本 ≥ 7', pass: r >= 7 },
    { label: 'AA 大字号 ≥ 3', pass: r >= 3 },
    { label: 'AAA 大字号 ≥ 4.5', pass: r >= 4.5 }
  ]
})

const previewStyle = computed(() => ({
  background: bgColor.value || '#ffffff',
  color: fgColor.value || '#000000',
  padding: '18px',
  borderRadius: '10px',
  border: '1px solid var(--border)'
}))

const suggestMsg = computed(() => {
  if (!suggested.value) return ''
  if (fgColor.value !== suggested.value) return ''
  if (contrast.value < 4.5) return ''
  return `已调整为 ${suggested.value}，当前对比度 ${contrast.value.toFixed(2)}，满足 AA 普通文本要求。`
})

function clearFix() {
  suggested.value = ''
  failMsg.value = ''
}

function onFgPick(e) {
  fg.value = e.target.value
  clearFix()
}

function onBgPick(e) {
  bg.value = e.target.value
  clearFix()
}

function searchLightness(h, s, l0, bgHex, up) {
  const endL = up ? 1 : 0
  if (contrastRatio(hslToHex(h, s, endL), bgHex) < 4.5) return null
  let lo = up ? l0 : 0
  let hi = up ? 1 : l0
  for (let i = 0; i < 24; i++) {
    const mid = (lo + hi) / 2
    const ratio = contrastRatio(hslToHex(h, s, mid), bgHex)
    if (up) {
      if (ratio >= 4.5) hi = mid
      else lo = mid
    } else if (ratio >= 4.5) {
      lo = mid
    } else {
      hi = mid
    }
  }
  const out = hslToHex(h, s, up ? hi : lo)
  return contrastRatio(out, bgHex) >= 4.5 ? out : null
}

function fixForeground() {
  clearFix()
  const f = fgColor.value
  const b = bgColor.value
  if (!f || !b) {
    failMsg.value = '请先输入合法的前景色与背景色'
    return
  }
  const hsl = hexToHsl(f)
  const preferUp = luminance(f) >= luminance(b)
  let result = searchLightness(hsl.h, hsl.s, hsl.l, b, preferUp)
  if (!result) result = searchLightness(hsl.h, hsl.s, hsl.l, b, !preferUp)
  if (!result) {
    failMsg.value = '保持色相与饱和度时无法达到 4.5，请手动更换颜色'
    return
  }
  fg.value = result
  suggested.value = result
}
</script>
