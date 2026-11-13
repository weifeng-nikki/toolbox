<template>
  <div>
    <div class="panel">
      <div class="row">
        <button class="btn primary" @click="restart">重新开始</button>
        <select v-model.number="pairs" @change="restart">
          <option :value="6">6 对（12 张）</option>
          <option :value="8">8 对（16 张）</option>
          <option :value="10">10 对（20 张）</option>
        </select>
        <span class="pill">步数 {{ moves }}</span>
        <span class="pill">用时 {{ time }}s</span>
        <span class="pill">最少步数 {{ best || '—' }}</span>
      </div>
      <p class="hint">翻开两张相同图案即配对成功，全部配对后计时结束。</p>
      <p v-if="won" class="ok">🎉 全部配对！共 {{ moves }} 步、{{ time }} 秒。</p>
    </div>

    <div class="cards" :style="{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }">
      <button
        v-for="(card, i) in cards"
        :key="card.key"
        type="button"
        class="card"
        :class="{ flipped: card.flipped || card.done, done: card.done }"
        @click="flip(i)"
      >
        <span class="face">{{ card.flipped || card.done ? card.emoji : '❓' }}</span>
      </button>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'

const POOL = ['🍎', '🍇', '🍊', '🍋', '🍉', '🍓', '🥑', '🍑', '🍍', '🥝', '🍒', '🥕']

const pairs = ref(8)
const cards = ref([])
const moves = ref(0)
const time = ref(0)
const best = ref(0)
const won = ref(false)
const locked = ref(false)

let picked = []
let timer = null
let lockTimer = null

const cols = computed(() => (pairs.value === 10 ? 5 : 4))

function restart() {
  stopTimer()
  clearTimeout(lockTimer)
  picked = []
  locked.value = false
  moves.value = 0
  time.value = 0
  won.value = false
  const chosen = POOL.slice(0, pairs.value)
  const deck = [...chosen, ...chosen].map((emoji, i) => ({
    key: `${i}-${emoji}-${Math.random().toString(36).slice(2)}`,
    emoji,
    flipped: false,
    done: false
  }))
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[deck[i], deck[j]] = [deck[j], deck[i]]
  }
  cards.value = deck
  best.value = Number(localStorage.getItem(`memory-best-${pairs.value}`) || 0)
}

function flip(i) {
  const card = cards.value[i]
  if (!card || card.flipped || card.done || locked.value) return
  if (!timer) startTimer()
  card.flipped = true
  picked.push(i)
  if (picked.length < 2) return
  moves.value++
  const [a, b] = picked
  const first = cards.value[a]
  const second = cards.value[b]
  if (first.emoji === second.emoji) {
    first.done = true
    second.done = true
    picked = []
    checkWin()
    return
  }
  locked.value = true
  lockTimer = setTimeout(() => {
    first.flipped = false
    second.flipped = false
    picked = []
    locked.value = false
  }, 700)
}

function checkWin() {
  if (!cards.value.every(c => c.done)) return
  won.value = true
  stopTimer()
  const key = `memory-best-${pairs.value}`
  const saved = Number(localStorage.getItem(key) || 0)
  if (!saved || moves.value < saved) {
    localStorage.setItem(key, String(moves.value))
    best.value = moves.value
  }
}

function startTimer() {
  stopTimer()
  timer = setInterval(() => {
    time.value++
  }, 1000)
}

function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

onBeforeUnmount(() => {
  stopTimer()
  clearTimeout(lockTimer)
})

restart()
</script>

<style scoped>
.cards {
  display: grid;
  gap: 10px;
  max-width: 520px;
  margin: 0 auto;
}

.card {
  aspect-ratio: 1;
  display: grid;
  place-items: center;
  padding: 0;
  border: 1px solid var(--border);
  border-radius: 12px;
  background: linear-gradient(180deg, var(--panel), var(--panel2));
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
  transition: transform 0.2s ease, background 0.2s ease, border-color 0.2s ease;
}

.card:hover:not(.flipped) {
  border-color: var(--tint);
  transform: translateY(-2px);
}

.card.flipped {
  background: var(--tint-soft);
  border-color: var(--tint);
}

.card.done {
  opacity: 0.72;
  cursor: default;
}

.face {
  user-select: none;
}
</style>
