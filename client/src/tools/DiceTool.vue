<template>
  <div>
    <div class="panel">
      <div class="panel-title">掷骰子</div>
      <div class="row">
        <div class="field inline">
          <label>骰子数量</label>
          <select v-model.number="diceCount" :disabled="rolling">
            <option v-for="n in 5" :key="n" :value="n">{{ n }} 颗</option>
          </select>
        </div>
        <button class="btn primary" :disabled="rolling" @click="roll">
          {{ rolling ? '掷出中…' : '掷骰子' }}
        </button>
        <span class="pill">总点数 {{ total }}</span>
        <span class="pill">已掷 {{ rollTimes }} 次</span>
      </div>

      <div class="dice-row">
        <div v-for="(face, i) in faces" :key="i" class="die" :class="{ rolling }">
          <span
            v-for="p in 9"
            :key="p"
            class="pip"
            :class="{ on: PIP[face].includes(p - 1) }"
          ></span>
        </div>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">随机抽签</div>
      <div class="field">
        <label>名单（每行一个名字）</label>
        <textarea v-model="names" style="min-height: 110px" placeholder="小明&#10;小红&#10;小刚"></textarea>
      </div>
      <div class="row">
        <div class="field inline">
          <label>抽取人数</label>
          <input v-model.number="pickCount" type="number" min="1" style="width: 80px" />
        </div>
        <button class="btn primary" :disabled="!nameList.length" @click="draw">抽取</button>
        <button class="btn" @click="resetDraw">重置</button>
        <span class="pill">名单 {{ nameList.length }} 人</span>
        <span class="pill">已抽 {{ picked.length }} 人</span>
        <span class="pill">抽签 {{ drawTimes }} 次</span>
      </div>
      <p v-if="drawError" class="err">{{ drawError }}</p>
      <div v-if="picked.length" class="picked">
        <span v-for="(n, i) in picked" :key="i" class="picked-chip">{{ n }}</span>
      </div>
      <p v-else class="hint">输入名单后点击「抽取」，每次随机且不重复。</p>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref, watch } from 'vue'

const PIP = {
  1: [4],
  2: [0, 8],
  3: [0, 4, 8],
  4: [0, 2, 6, 8],
  5: [0, 2, 4, 6, 8],
  6: [0, 2, 3, 5, 6, 8]
}

const diceCount = ref(2)
const faces = ref([1, 1])
const rolling = ref(false)
const rollTimes = ref(0)

let rollTimer = null

const total = computed(() => faces.value.reduce((sum, v) => sum + v, 0))

watch(diceCount, n => {
  faces.value = Array.from({ length: n }, () => 1)
})

function roll() {
  if (rolling.value) return
  rolling.value = true
  let ticks = 0
  rollTimer = setInterval(() => {
    faces.value = faces.value.map(() => 1 + Math.floor(Math.random() * 6))
    ticks++
    if (ticks >= 8) {
      clearInterval(rollTimer)
      rollTimer = null
      rolling.value = false
      rollTimes.value++
    }
  }, 80)
}

const names = ref('')
const pickCount = ref(1)
const picked = ref([])
const drawTimes = ref(0)
const drawError = ref('')

const nameList = computed(() => {
  const seen = new Set()
  const list = []
  for (const raw of names.value.split('\n')) {
    const name = raw.trim()
    if (!name || seen.has(name)) continue
    seen.add(name)
    list.push(name)
  }
  return list
})

function draw() {
  drawError.value = ''
  const list = nameList.value
  if (!list.length) {
    drawError.value = '请先在名单中输入名字。'
    return
  }
  let n = Math.floor(Number(pickCount.value))
  if (!Number.isFinite(n) || n < 1) n = 1
  if (n > list.length) {
    drawError.value = `最多只能抽 ${list.length} 人。`
    return
  }
  const pool = list.slice()
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[pool[i], pool[j]] = [pool[j], pool[i]]
  }
  picked.value = pool.slice(0, n)
  drawTimes.value++
}

function resetDraw() {
  picked.value = []
  drawError.value = ''
}

onBeforeUnmount(() => {
  if (rollTimer) {
    clearInterval(rollTimer)
    rollTimer = null
  }
})
</script>

<style scoped>
.dice-row {
  display: flex;
  flex-wrap: wrap;
  gap: 14px;
  margin-top: 16px;
}

.die {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  grid-template-rows: repeat(3, 1fr);
  width: 62px;
  height: 62px;
  padding: 7px;
  border: 1px solid var(--border-strong);
  border-radius: var(--radius-sm);
  background: linear-gradient(145deg, var(--panel), var(--panel2));
  box-shadow: 0 4px 12px -6px rgba(56, 51, 47, 0.55);
}

.die.rolling {
  animation: dice-shake 0.24s linear infinite;
}

.pip {
  width: 9px;
  height: 9px;
  margin: auto;
  border-radius: 50%;
  background: transparent;
}

.pip.on {
  background: var(--text);
}

.picked {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-top: 14px;
}

.picked-chip {
  padding: 8px 16px;
  border-radius: 999px;
  background: var(--tint);
  color: var(--on-tint);
  font-size: 15px;
  font-weight: 700;
  animation: chip-pop 0.25s ease;
}

@keyframes dice-shake {
  0% {
    transform: rotate(0deg) scale(1);
  }
  25% {
    transform: rotate(-8deg) scale(1.04);
  }
  50% {
    transform: rotate(6deg) scale(0.98);
  }
  75% {
    transform: rotate(-4deg) scale(1.03);
  }
  100% {
    transform: rotate(0deg) scale(1);
  }
}

@keyframes chip-pop {
  from {
    transform: scale(0.8);
    opacity: 0;
  }
  to {
    transform: scale(1);
    opacity: 1;
  }
}
</style>
