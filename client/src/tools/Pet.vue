<template>
  <div>
    <div class="panel">
      <div class="panel-title">
        我的电子宠物
        <span class="pill">Lv.{{ level }}</span>
      </div>

      <div class="field">
        <label>宠物名字</label>
        <input
          v-model="state.name"
          maxlength="12"
          placeholder="给它起个名字"
          style="max-width: 260px"
          @blur="ensureName"
        />
      </div>

      <div class="center" style="position: relative; padding: 6px 0 2px">
        <div
          style="
            font-size: 92px;
            line-height: 1.1;
            transition: transform 0.3s ease, filter 0.3s ease;
          "
          :style="{ transform: state.sleeping ? 'scale(0.94)' : 'scale(1)' }"
        >
          {{ stage.emoji }}
        </div>
        <div v-if="state.sleeping" class="pill" style="margin-top: 4px">💤 呼…呼…睡着啦</div>
        <div
          v-else-if="alerts.length"
          class="pill"
          :style="{ background: '#c89ba433', color: '#8a5f66', marginTop: '4px' }"
        >
          {{ alerts[0].icon }} {{ alerts[0].text }}
        </div>
        <div v-else class="pill" style="margin-top: 4px">✨ 状态不错，继续保持</div>
      </div>

      <div class="row" style="justify-content: center; margin-top: 8px">
        <span class="pill">{{ stage.label }}</span>
        <span class="pill">经验 {{ state.exp }}</span>
        <span class="pill">🕒 {{ clockText }}</span>
      </div>

      <div style="margin-top: 12px">
        <div style="display: flex; justify-content: space-between; font-size: 12.5px; color: var(--muted)">
          <span>{{ level >= 12 ? '已达到最高等级' : '距离 Lv.' + (level + 1) + ' 还差' }}</span>
          <span>{{ level >= 12 ? '继续互动也很开心' : toNext + ' 经验' }}</span>
        </div>
        <div class="progress" style="height: 7px; margin: 6px 0 0">
          <div class="progress-bar" :style="{ width: levelProgress + '%' }"></div>
        </div>
      </div>

      <p v-if="offlineNote" class="ok">{{ offlineNote }}</p>
      <p v-if="toast" class="ok">{{ toast }}</p>
    </div>

    <div class="panel">
      <div class="panel-title">状态与互动</div>

      <div
        v-for="s in statRows"
        :key="s.key"
        style="margin-bottom: 13px"
      >
        <div style="display: flex; justify-content: space-between; align-items: baseline; font-size: 13.5px">
          <span>{{ s.icon }} {{ s.label }}</span>
          <b class="mono">{{ state[s.key] }}</b>
        </div>
        <div class="progress" style="height: 8px; margin: 5px 0 0">
          <div
            class="progress-bar"
            :style="{ width: state[s.key] + '%', background: barColor(state[s.key]) }"
          ></div>
        </div>
      </div>

      <div class="row" style="margin-top: 14px">
        <button class="btn primary" :disabled="state.sleeping" @click="feed">🍚 喂食</button>
        <button class="btn" :disabled="state.sleeping" @click="play">🎾 陪玩</button>
        <button class="btn" :disabled="state.sleeping" @click="bath">🛁 洗澡</button>
        <button class="btn" @click="toggleSleep">
          {{ state.sleeping ? '⏰ 叫醒它' : '😴 哄它睡觉' }}
        </button>
      </div>

      <p v-if="alerts.length" class="hint">
        需要关注：{{ alerts.map(a => a.icon + a.text).join('；') }}
      </p>
      <p class="hint">
        关闭页面后宠物仍会成长：大约每小时饱食度、心情、精力、清洁各下降 6 点；睡觉期间只恢复精力，其他状态不衰减。
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const STORAGE_KEY = 'pet.v1'
const DEFAULT = {
  name: '小球',
  hunger: 80,
  mood: 80,
  energy: 80,
  clean: 80,
  exp: 0,
  sleeping: false
}

function clamp(v) {
  return Math.max(0, Math.min(100, Math.round(v)))
}

function numOr(v, d) {
  const n = Number(v)
  return Number.isFinite(n) ? n : d
}

function durationText(hours) {
  if (hours >= 24) return Math.round(hours / 24) + ' 天'
  if (hours >= 1) return Math.round(hours) + ' 小时'
  return Math.max(1, Math.round(hours * 60)) + ' 分钟'
}

function loadPet() {
  let note = ''
  const st = { ...DEFAULT }
  let raw = null
  try {
    raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null')
  } catch (e) {
    raw = null
  }
  if (!raw || typeof raw !== 'object') return { state: st, note }

  if (typeof raw.name === 'string' && raw.name.trim()) st.name = raw.name.slice(0, 12)
  st.hunger = clamp(numOr(raw.hunger, DEFAULT.hunger))
  st.mood = clamp(numOr(raw.mood, DEFAULT.mood))
  st.energy = clamp(numOr(raw.energy, DEFAULT.energy))
  st.clean = clamp(numOr(raw.clean, DEFAULT.clean))
  st.exp = Math.max(0, Math.floor(numOr(raw.exp, 0)))
  st.sleeping = !!raw.sleeping

  const last = numOr(raw.lastTick, 0)
  if (last > 0) {
    const hours = (Date.now() - last) / 3600000
    if (hours >= 0.1) {
      const text = durationText(hours)
      if (st.sleeping) {
        const gain = Math.max(1, Math.round(hours * 12))
        st.energy = clamp(st.energy + gain)
        note = '你离开了约 ' + text + '，它睡了一觉，精力恢复了 ' + gain + ' 点。'
      } else {
        const loss = Math.max(1, Math.round(hours * 6))
        st.hunger = clamp(st.hunger - loss)
        st.mood = clamp(st.mood - loss)
        st.energy = clamp(st.energy - loss)
        st.clean = clamp(st.clean - loss)
        note = '你离开了约 ' + text + '，饱食度、心情、精力、清洁各下降了 ' + loss + ' 点。'
      }
    }
  }
  return { state: st, note }
}

const loaded = loadPet()
const state = ref(loaded.state)
const offlineNote = ref(loaded.note)
const toast = ref('')
const clock = ref(Date.now())

let tickTimer = null
let toastTimer = null

const statRows = [
  { key: 'hunger', label: '饱食度', icon: '🍚' },
  { key: 'mood', label: '心情', icon: '💗' },
  { key: 'energy', label: '精力', icon: '⚡' },
  { key: 'clean', label: '清洁', icon: '🫧' }
]

const level = computed(() => Math.min(12, 1 + Math.floor(state.value.exp / 25)))
const levelProgress = computed(() => Math.min(100, ((state.value.exp % 25) / 25) * 100))
const toNext = computed(() => Math.max(0, 25 - (state.value.exp % 25)))

const stage = computed(() => {
  if (level.value >= 6) return { emoji: '🐥', label: '精神小黄鸡' }
  if (level.value >= 3) return { emoji: '🐤', label: '圆滚滚小鸡' }
  return { emoji: '🐣', label: '破壳幼崽' }
})

const alerts = computed(() => {
  const list = []
  const s = state.value
  if (s.hunger < 25) list.push({ icon: '🍖', text: '肚子咕咕叫，想吃饭啦' })
  if (s.mood < 25) list.push({ icon: '😢', text: '有点不开心，陪它玩一会儿吧' })
  if (s.energy < 25) list.push({ icon: '😴', text: '眼皮打架，想睡觉了' })
  if (s.clean < 25) list.push({ icon: '💩', text: '身上脏脏的，想洗澡' })
  return list
})

const clockText = computed(() => {
  const d = new Date(clock.value)
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  const ss = String(d.getSeconds()).padStart(2, '0')
  return hh + ':' + mm + ':' + ss
})

watch(
  state,
  v => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ ...v, lastTick: Date.now() }))
    } catch (e) {
      // 本地存储不可用时忽略
    }
  },
  { deep: true }
)

function save() {
  try {
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ ...state.value, lastTick: Date.now() })
    )
  } catch (e) {
    // 本地存储不可用时忽略
  }
}

function say(msg) {
  toast.value = msg
  if (toastTimer) clearTimeout(toastTimer)
  toastTimer = setTimeout(() => {
    toast.value = ''
    toastTimer = null
  }, 2400)
}

function gainExp(exp, msg) {
  const before = level.value
  state.value.exp += exp
  if (level.value > before) {
    say('升级啦！现在是 Lv.' + level.value + ' · ' + stage.value.label)
  } else {
    say(msg)
  }
}

function feed() {
  if (state.value.sleeping) return say('它正在睡觉，先叫醒它吧。')
  state.value.hunger = clamp(state.value.hunger + 25)
  state.value.mood = clamp(state.value.mood + 3)
  state.value.energy = clamp(state.value.energy - 2)
  gainExp(6, '吃饱啦，满足地打了个小嗝～')
}

function play() {
  if (state.value.sleeping) return say('它正在睡觉，先叫醒它吧。')
  state.value.mood = clamp(state.value.mood + 22)
  state.value.energy = clamp(state.value.energy - 12)
  state.value.hunger = clamp(state.value.hunger - 4)
  state.value.clean = clamp(state.value.clean - 3)
  gainExp(8, '玩得很开心，尾巴摇个不停！')
}

function bath() {
  if (state.value.sleeping) return say('它正在睡觉，先叫醒它吧。')
  state.value.clean = clamp(state.value.clean + 30)
  state.value.mood = clamp(state.value.mood + 4)
  gainExp(5, '洗得香喷喷的，毛都蓬松了～')
}

function toggleSleep() {
  if (state.value.sleeping) {
    state.value.sleeping = false
    say('宠物醒来了，伸了个大大的懒腰。')
  } else {
    state.value.sleeping = true
    gainExp(2, '宠物蜷成一团睡着了，期间其他状态不会下降。')
  }
}

function ensureName() {
  const name = String(state.value.name || '').trim()
  state.value.name = name ? name.slice(0, 12) : DEFAULT.name
}

function barColor(v) {
  if (v >= 60) return '#9eb3a6'
  if (v >= 25) return '#b9a58f'
  return '#c89ba4'
}

onMounted(() => {
  save()
  tickTimer = setInterval(() => {
    clock.value = Date.now()
    if (state.value.sleeping) {
      state.value.energy = clamp(state.value.energy + 1)
      if (state.value.energy >= 100) {
        state.value.sleeping = false
        say('睡饱啦，宠物自己醒来了。')
      }
    }
  }, 1000)
})

onBeforeUnmount(() => {
  if (tickTimer) {
    clearInterval(tickTimer)
    tickTimer = null
  }
  if (toastTimer) {
    clearTimeout(toastTimer)
    toastTimer = null
  }
  save()
})
</script>
