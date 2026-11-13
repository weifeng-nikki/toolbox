<template>
  <div>
    <div class="panel">
      <div class="panel-title">随机数</div>
      <div class="row">
        <div class="field inline">
          <label>最小</label>
          <input v-model.number="min" type="number" style="width: 90px" />
        </div>
        <div class="field inline">
          <label>最大</label>
          <input v-model.number="max" type="number" style="width: 90px" />
        </div>
        <div class="field inline">
          <label>个数</label>
          <input v-model.number="randCount" type="number" min="1" max="50" style="width: 70px" />
        </div>
        <label class="check"><input v-model="unique" type="checkbox" />不重复</label>
        <button class="btn primary" @click="genRandom">生成</button>
      </div>
      <p v-if="randResult.length" class="rand-out mono">{{ randResult.join('，') }}</p>
      <p v-if="randError" class="err">{{ randError }}</p>
    </div>
    <div class="panel">
      <div class="panel-title">抽奖转盘</div>
      <div class="field">
        <label>名单（每行一个）</label>
        <textarea v-model="names" style="min-height: 90px"></textarea>
      </div>
      <div class="wheel-row">
        <div class="wheel-box">
          <div class="pointer">▼</div>
          <canvas
            ref="wheelCanvas"
            width="300"
            height="300"
            class="wheel"
            :style="{ transform: `rotate(${rotation}deg)` }"
          ></canvas>
        </div>
        <div class="wheel-side">
          <button class="btn primary" :disabled="spinning || list.length < 2" @click="spin">
            {{ spinning ? '转动中…' : '开始抽奖' }}
          </button>
          <div v-if="winner" class="winner">🎉 {{ winner }}</div>
          <div class="records" v-if="records.length">
            <div class="panel-title" style="margin-top: 12px">已抽中（{{ records.length }}）</div>
            <div v-for="(r, i) in records" :key="i" class="kv"><span>#{{ i + 1 }}</span><b>{{ r }}</b></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onMounted, ref, watch } from 'vue'

// —— 随机数 ——
const min = ref(1)
const max = ref(100)
const randCount = ref(1)
const unique = ref(false)
const randResult = ref([])
const randError = ref('')

function rand(n) {
  const a = new Uint32Array(1)
  crypto.getRandomValues(a)
  return a[0] % n
}

function genRandom() {
  randError.value = ''
  const lo = Math.ceil(min.value)
  const hi = Math.floor(max.value)
  const cnt = Math.max(1, Math.min(50, randCount.value || 1))
  if (!(hi >= lo)) {
    randError.value = '最大值需不小于最小值'
    randResult.value = []
    return
  }
  if (unique.value && hi - lo + 1 < cnt) {
    randError.value = '范围内整数不足，无法不重复抽取'
    randResult.value = []
    return
  }
  if (unique.value) {
    const pool = []
    for (let i = lo; i <= hi; i++) pool.push(i)
    for (let i = pool.length - 1; i > 0; i--) {
      const j = rand(i + 1)
      ;[pool[i], pool[j]] = [pool[j], pool[i]]
    }
    randResult.value = pool.slice(0, cnt)
  } else {
    randResult.value = Array.from({ length: cnt }, () => lo + rand(hi - lo + 1))
  }
}

// —— 转盘 ——
const COLORS = [
  '#0e9f6e', '#3b82f6', '#f59e0b', '#e5484d', '#8b5cf6', '#14b8a6',
  '#f97316', '#6366f1', '#ec4899', '#84cc16', '#06b6d4', '#a855f7'
]
const names = ref('')
const rotation = ref(0)
const spinning = ref(false)
const winner = ref('')
const records = ref([])
const wheelCanvas = ref(null)

const list = computed(() => names.value.split('\n').map(s => s.trim()).filter(Boolean))

watch(list, () => nextTick(drawWheel), { deep: true })

onMounted(drawWheel)

function drawWheel() {
  const canvas = wheelCanvas.value
  if (!canvas) return
  const ctx = canvas.getContext('2d')
  const size = 300
  const cx = size / 2
  const cy = size / 2
  const radius = size / 2 - 6
  ctx.clearRect(0, 0, size, size)
  const items = list.value
  if (items.length < 2) {
    ctx.beginPath()
    ctx.arc(cx, cy, radius, 0, Math.PI * 2)
    ctx.fillStyle = 'var(--panel2)'
    ctx.fill()
    return
  }
  const per = (Math.PI * 2) / items.length
  for (let i = 0; i < items.length; i++) {
    const start = -Math.PI / 2 + i * per
    ctx.beginPath()
    ctx.moveTo(cx, cy)
    ctx.arc(cx, cy, radius, start, start + per)
    ctx.closePath()
    ctx.fillStyle = COLORS[i % COLORS.length]
    ctx.fill()
    ctx.strokeStyle = 'rgba(255,255,255,0.6)'
    ctx.stroke()
    // 文字沿半径方向绘制
    ctx.save()
    ctx.translate(cx, cy)
    ctx.rotate(start + per / 2)
    ctx.textAlign = 'right'
    ctx.fillStyle = '#fff'
    ctx.font = '600 13px system-ui, sans-serif'
    const label = items[i].length > 8 ? items[i].slice(0, 8) + '…' : items[i]
    ctx.fillText(label, radius - 10, 5)
    ctx.restore()
  }
  ctx.beginPath()
  ctx.arc(cx, cy, 26, 0, Math.PI * 2)
  ctx.fillStyle = '#fff'
  ctx.fill()
  ctx.strokeStyle = '#ddd'
  ctx.stroke()
}

function spin() {
  const items = list.value
  if (spinning.value || items.length < 2) return
  spinning.value = true
  winner.value = ''
  const extra = 360 * (5 + Math.floor(rand(3))) + rand(360)
  rotation.value += extra
}

function onSpinEnd() {
  spinning.value = false
  const items = list.value
  if (items.length < 2) return
  const per = 360 / items.length
  // 指针在正上方（屏幕 270°），反推画布角度所在扇区
  const pointer = ((270 - rotation.value) % 360 + 360) % 360
  const idx = Math.floor(pointer / per) % items.length
  winner.value = items[idx]
  records.value = [items[idx], ...records.value].slice(0, 30)
}

watch(rotation, v => {
  const el = wheelCanvas.value
  if (!el) return
  const onEnd = () => {
    el.removeEventListener('transitionend', onEnd)
    onSpinEnd()
  }
  el.addEventListener('transitionend', onEnd)
})
</script>

<style scoped>
.check {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
  cursor: pointer;
}

.check input {
  width: auto;
}

.mono {
  font-family: var(--mono);
}

.rand-out {
  margin: 10px 0 0;
  font-size: 18px;
  font-weight: 600;
  color: var(--accent);
}

.wheel-row {
  display: flex;
  gap: 20px;
  align-items: flex-start;
  flex-wrap: wrap;
}

.wheel-box {
  position: relative;
  width: 300px;
  flex-shrink: 0;
}

.pointer {
  position: absolute;
  top: -6px;
  left: 50%;
  transform: translateX(-50%);
  z-index: 2;
  font-size: 22px;
  color: var(--danger);
}

.wheel {
  border-radius: 50%;
  transition: transform 4s cubic-bezier(0.15, 0.9, 0.25, 1);
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.15);
}

.wheel-side {
  flex: 1;
  min-width: 200px;
}

.winner {
  margin-top: 14px;
  font-size: 24px;
  font-weight: 700;
  color: var(--accent);
}
</style>
