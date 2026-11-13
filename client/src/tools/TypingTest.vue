<template>
  <div>
    <div class="panel">
      <div class="row">
        <div class="field inline">
          <label>时长</label>
          <select v-model.number="duration" @change="reset">
            <option :value="30">30 秒</option>
            <option :value="60">60 秒</option>
            <option :value="120">120 秒</option>
          </select>
        </div>
        <div class="field inline">
          <label>语言</label>
          <select v-model="lang" @change="reset">
            <option value="en">英文</option>
            <option value="zh">中文</option>
          </select>
        </div>
        <button class="btn primary" @click="reset">{{ running ? '重新开始' : '换一句' }}</button>
        <span class="pill">⏱ {{ remain }}s</span>
        <span class="pill">最佳 {{ bestText }}</span>
      </div>
      <p class="hint">点击下方输入框开始，从第一次输入起计时。正确字符显示绿色，错误显示红色。</p>
    </div>

    <div class="panel">
      <div class="text-display" @click="focusInput">
        <span
          v-for="(ch, i) in targetChars"
          :key="i"
          class="ch"
          :class="charClass(i)"
        >{{ ch === ' ' ? '\u00a0' : ch }}</span>
        <span
          v-for="(ch, i) in extraChars"
          :key="'x' + i"
          class="ch wrong"
        >{{ ch === ' ' ? '\u00a0' : ch }}</span>
      </div>
      <textarea
        ref="input"
        v-model="typed"
        class="type-input"
        :disabled="finished"
        placeholder="在此输入…"
        spellcheck="false"
        autocomplete="off"
        @paste.prevent
      ></textarea>

      <div class="stats-grid" style="margin-top: 12px">
        <div class="stat">
          <b>{{ speed }}</b>
          <span>{{ lang === 'en' ? 'WPM' : '字/分钟' }}</span>
        </div>
        <div class="stat">
          <b>{{ accuracy }}%</b>
          <span>正确率</span>
        </div>
        <div class="stat">
          <b>{{ errors }}</b>
          <span>错误字符</span>
        </div>
        <div class="stat">
          <b>{{ usedSec }}s</b>
          <span>已用时间</span>
        </div>
      </div>
      <p v-if="finished" class="ok">本次成绩已记录，历史最佳会保存在本机。</p>
    </div>
  </div>
</template>

<script setup>
import { computed, nextTick, onBeforeUnmount, ref, watch } from 'vue'

const BEST_KEY = 'typing-best-v1'

const SENTENCES = {
  en: [
    'The morning light slipped through the curtains and settled on the wooden floor, where a half-finished book and a cup of tea waited patiently. Outside the window, the city was waking up one small sound at a time, and for a moment everything felt calm, simple, and entirely possible.',
    'A good habit is built in the quiet moments when nobody is watching. It is the small choice repeated again and again, until the choice becomes a path and the path becomes a direction. Progress is rarely loud, but it is always moving, one careful step after another.',
    'She opened the notebook and wrote down three things she wanted to remember: the smell of rain on warm stone, the sound of a friend laughing, and the feeling of finishing something difficult. None of them were expensive, yet all of them were worth keeping.',
    'Technology should make the difficult feel ordinary and the ordinary feel effortless. When a tool disappears into the flow of work, it has done its job well. The best designs are the ones we stop noticing, because they quietly remove friction and leave us with more time to think.',
    'The road climbed slowly through the hills, past fields that had turned gold in the late summer sun. Every few minutes a farmhouse appeared, then vanished behind a bend, and the only sound left was the wind moving through the trees like a long, patient breath.'
  ],
  zh: [
    '清晨的光从窗帘边缘漏进来，落在木地板上。桌上摊着一本读到一半的书，茶杯还冒着热气。窗外城市慢慢醒来，声音一点一点变得清晰，那一刻世界安静而完整。',
    '好的习惯往往不是在掌声里养成的，而是在无人注意的时刻一点点积累。每天重复一个小小的选择，时间久了，它就成了一条路，带着你走向更远的地方。',
    '雨停以后，石阶上还留着薄薄的水光。巷子深处传来饭菜的香气，有人推着自行车慢慢走过。生活里真正让人安心的，多半就是这些细碎而具体的小事。',
    '设计一件工具，最重要的不是它看起来多么复杂，而是使用者能否忘记它的存在。当操作变得自然流畅，人的注意力就能回到真正重要的事情上。',
    '山间的路一直向上延伸，两旁的稻田在夕阳里泛着金黄色。偶尔出现一座小屋，很快又被转弯遮住，只剩下风穿过树林的声音，像一次缓慢而悠长的呼吸。'
  ]
}

const duration = ref(60)
const lang = ref('en')
const target = ref('')
const typed = ref('')
const running = ref(false)
const finished = ref(false)
const elapsedMs = ref(0)
const remain = ref(60)
const input = ref(null)

let timer = null
let startedAt = 0
let endAt = 0

const bestMap = ref(loadBest())

const targetChars = computed(() => Array.from(target.value))
const extraChars = computed(() =>
  typed.value.length > target.value.length ? Array.from(typed.value.slice(target.value.length)) : []
)

const correctCount = computed(() => {
  let n = 0
  for (let i = 0; i < typed.value.length && i < target.value.length; i++) {
    if (typed.value[i] === target.value[i]) n++
  }
  return n
})

const errors = computed(() => typed.value.length - correctCount.value)

const accuracy = computed(() =>
  typed.value.length ? Math.round((correctCount.value / typed.value.length) * 100) : 100
)

const speed = computed(() => {
  if (!running.value && !finished.value) return 0
  const minutes = Math.max(elapsedMs.value, 1000) / 60000
  if (lang.value === 'en') return Math.round(typed.value.length / 5 / minutes)
  return Math.round(typed.value.length / minutes)
})

const usedSec = computed(() => Math.min(duration.value, Math.round(elapsedMs.value / 1000)))

const best = computed(() => bestMap.value?.[lang.value]?.[duration.value] || 0)
const bestText = computed(() => {
  if (!best.value) return '—'
  return lang.value === 'en' ? `${best.value} WPM` : `${best.value} 字/分`
})

function loadBest() {
  try {
    const raw = JSON.parse(localStorage.getItem(BEST_KEY) || '{}')
    return raw && typeof raw === 'object' ? raw : {}
  } catch {
    return {}
  }
}

function saveBest() {
  if (elapsedMs.value < 1000) return
  try {
    const map = loadBest()
    if (!map[lang.value]) map[lang.value] = {}
    const prev = map[lang.value][duration.value] || 0
    if (speed.value > prev) {
      map[lang.value][duration.value] = speed.value
      localStorage.setItem(BEST_KEY, JSON.stringify(map))
      bestMap.value = map
    }
  } catch {
    // 本地存储不可用时忽略
  }
}

function pickSentence(language) {
  const pool = SENTENCES[language]
  if (!pool || !pool.length) return ''
  const options = pool.length > 1 ? pool.filter(s => s !== target.value) : pool
  return options[Math.floor(Math.random() * options.length)]
}

function charClass(i) {
  if (i < typed.value.length) {
    return typed.value[i] === target.value[i] ? 'right' : 'wrong'
  }
  if (i === typed.value.length && !finished.value) return 'current'
  return ''
}

function focusInput() {
  if (input.value && !finished.value) input.value.focus({ preventScroll: true })
}

function startTimer() {
  stopTimer()
  timer = setInterval(() => {
    const now = Date.now()
    elapsedMs.value = Math.min(now - startedAt, duration.value * 1000)
    remain.value = Math.max(0, Math.ceil((endAt - now) / 1000))
    if (now >= endAt) finish()
  }, 100)
}

function stopTimer() {
  if (timer) {
    clearInterval(timer)
    timer = null
  }
}

function finish() {
  if (finished.value) return
  finished.value = true
  running.value = false
  stopTimer()
  if (startedAt) elapsedMs.value = Math.min(Date.now() - startedAt, duration.value * 1000)
  remain.value = Math.max(0, Math.ceil((endAt - Date.now()) / 1000))
  saveBest()
  if (input.value) input.value.blur()
}

function reset() {
  stopTimer()
  running.value = false
  finished.value = false
  typed.value = ''
  elapsedMs.value = 0
  remain.value = duration.value
  startedAt = 0
  endAt = 0
  target.value = pickSentence(lang.value)
  nextTick(() => focusInput())
}

watch(typed, () => {
  if (finished.value) return
  if (!running.value) {
    if (!typed.value.length) return
    running.value = true
    startedAt = Date.now()
    endAt = startedAt + duration.value * 1000
    startTimer()
  }
  if (typed.value.length >= target.value.length) finish()
})

onBeforeUnmount(stopTimer)

target.value = pickSentence(lang.value)
</script>

<style scoped>
.text-display {
  min-height: 130px;
  padding: 14px 16px;
  border: 1px solid var(--border);
  border-radius: var(--radius-sm);
  background: var(--panel2);
  font-family: var(--mono);
  font-size: 19px;
  line-height: 2;
  letter-spacing: 0.2px;
  white-space: pre-wrap;
  word-break: break-word;
  user-select: none;
  cursor: text;
}

.ch {
  border-bottom: 2px solid transparent;
  border-radius: 2px;
}

.ch.right {
  color: var(--accent-ink);
}

.ch.wrong {
  color: var(--danger);
  background: var(--rose-soft);
}

.ch.current {
  border-bottom-color: var(--tint);
  background: var(--tint-soft);
  animation: caret-blink 1s steps(2, start) infinite;
}

.type-input {
  min-height: 92px;
  margin-top: 12px;
  font-family: var(--mono);
}

@keyframes caret-blink {
  50% {
    border-bottom-color: transparent;
  }
}
</style>
