<template>
  <div>
    <div class="panel">
      <div class="panel-title">
        每日一卦
        <span class="pill" style="background: #c89ba4; color: #fff">仅供娱乐，请勿当真</span>
      </div>

      <div class="row">
        <div class="field inline">
          <label>昵称</label>
          <input
            v-model="nickname"
            maxlength="12"
            placeholder="留空按「有缘人」"
            style="width: 170px"
          />
        </div>
        <span class="pill">{{ dateLabel }}</span>
        <span class="pill">同一天同一昵称，卦象固定</span>
      </div>

      <p class="hint">
        卦象由「日期 + 昵称」生成的本地伪随机数决定，每天零点自动换一卦，不会上传任何信息。
      </p>
    </div>

    <div
      class="panel"
      :style="{
        transform: shaking ? 'rotate(-0.9deg) scale(0.997)' : 'none',
        transition: 'transform 0.13s ease'
      }"
    >
      <div class="panel-title">今日卦象</div>

      <div class="center">
        <div style="font-size: 12.5px; color: var(--muted)">{{ dateLabel }} · {{ nickLabel }}</div>
        <div style="font-size: 34px; font-weight: 700; letter-spacing: 0.1em; margin-top: 8px">
          {{ fortune.gua }}
        </div>
        <div style="margin-top: 10px">
          <span
            class="pill"
            :style="{ background: fortune.levelColor + '33', color: fortune.levelColor, fontSize: '14px' }"
          >
            {{ fortune.level }}
          </span>
        </div>
      </div>

      <p style="font-size: 14.5px; line-height: 1.95; margin: 16px 0 4px; text-align: center">
        {{ fortune.text }}
      </p>

      <div class="kv">
        <span>今日宜</span>
        <b>{{ fortune.yi.join(' · ') }}</b>
      </div>
      <div class="kv">
        <span>今日忌</span>
        <b>{{ fortune.ji.join(' · ') }}</b>
      </div>
      <div class="kv">
        <span>幸运色</span>
        <b>
          <span
            style="
              display: inline-block;
              width: 12px;
              height: 12px;
              border-radius: 3px;
              margin-right: 6px;
              vertical-align: -1px;
              border: 1px solid rgba(0, 0, 0, 0.08);
            "
            :style="{ background: fortune.color.hex }"
          ></span>
          {{ fortune.color.name }}
        </b>
      </div>
      <div class="kv">
        <span>幸运数字</span>
        <b>{{ fortune.number }}</b>
      </div>

      <div class="row" style="margin-top: 14px">
        <button class="btn primary" @click="reroll">再摇一次</button>
        <span class="hint" style="margin: 0">
          再摇也只返回当天同一结果，换个昵称或等明天再来吧。
        </span>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">
        许愿瓶
        <span class="pill">{{ wishes.length }} 个愿望</span>
      </div>

      <div class="row">
        <input
          v-model="wishText"
          maxlength="60"
          placeholder="写下一句愿望…"
          style="flex: 1; min-width: 180px"
          @keyup.enter="addWish"
        />
        <button class="btn primary" :disabled="!wishText.trim()" @click="addWish">投入瓶中</button>
      </div>

      <p class="hint">愿望只保存在本机浏览器，不会上传到任何地方。</p>

      <div v-if="!wishes.length" class="hint">瓶子还是空的，许个愿吧。</div>
      <div
        v-for="w in wishes"
        :key="w.id"
        style="
          display: flex;
          align-items: flex-start;
          gap: 10px;
          padding: 10px 0;
          border-bottom: 1px dashed var(--border);
        "
      >
        <span style="font-size: 18px; line-height: 1.4">🍾</span>
        <div style="flex: 1; min-width: 0">
          <div style="font-size: 14.5px; line-height: 1.6">{{ w.text }}</div>
          <div style="font-size: 12px; color: var(--muted); margin-top: 2px">{{ w.at }}</div>
        </div>
        <button class="btn small" @click="removeWish(w.id)">删除</button>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue'

const WISH_KEY = 'wish.v1'

const GUAS = [
  '乾为天',
  '坤为地',
  '地天泰',
  '天泽履',
  '风天小畜',
  '水天需',
  '地山谦',
  '火地晋',
  '地风升',
  '雷风恒',
  '泽山咸',
  '风山渐',
  '风泽中孚',
  '山雷颐',
  '水风井',
  '山泽损',
  '泽地萃',
  '火天大有'
]

const SIGN_TEXTS = [
  '慢一点也没关系，你今天走过的每一步都算数。',
  '不必急着证明什么，安静地做好手边的小事就好。',
  '今天的运气藏在细节里，留意那些微小的好意。',
  '适合把心里的话说给信任的人听，说完会轻松很多。',
  '有些答案会自己浮现，先给自己泡一杯热茶。',
  '你比自己以为的更有耐心，遇到问题不妨再试一次。',
  '今天的节奏刚刚好，顺着它走，不必勉强加速。',
  '好消息可能来得很轻，记得留一只耳朵听。',
  '整理一下桌面，也整理一下心情，会很舒服。',
  '适合做一点新的尝试，不必宏大，有趣就好。',
  '有人正在默默记挂你，今天可以主动打个招呼。',
  '遇到小小的不顺时换个角度，它可能只是提醒你休息。',
  '今天适合温柔地对待自己，别把标准定得太高。',
  '一件搁置很久的小事，今天做起来会意外顺利。',
  '保持好奇，路上会遇到让你会心一笑的瞬间。',
  '不必解释太多，懂你的人自然会懂。',
  '今晚早点休息，明天的你会感谢今天的自己。',
  '适合把注意力放回当下，风吹过来的时候记得感受一下。',
  '小小的坚持正在悄悄生效，继续就好。',
  '无论结果如何，你已经做得很好了，记得夸夸自己。'
]

const YI = [
  '早睡',
  '读书',
  '散步',
  '整理房间',
  '联系朋友',
  '尝试新事物',
  '喝一杯热茶',
  '写下计划',
  '听音乐',
  '晒太阳',
  '慢跑',
  '收拾桌面',
  '认真吃饭',
  '复盘小结',
  '学习新技能'
]

const JI = [
  '熬夜',
  '久坐',
  '冲动购物',
  '与人生气',
  '拖延',
  '吃太撑',
  '刷手机太久',
  '独自 emo',
  '匆忙赶路',
  '忘记喝水',
  '过度比较',
  '说消极的话'
]

const LEVELS = [
  { name: '大吉', color: '#c89ba4' },
  { name: '中吉', color: '#a79bba' },
  { name: '小吉', color: '#9eb3a6' },
  { name: '平', color: '#8fa9bd' },
  { name: '小凶', color: '#b9a58f' }
]

const COLORS = [
  { name: '薄雾粉', hex: '#c89ba4' },
  { name: '薰衣草灰', hex: '#a79bba' },
  { name: '雾霭蓝', hex: '#8fa9bd' },
  { name: '鼠尾草绿', hex: '#9eb3a6' },
  { name: '燕麦棕', hex: '#b9a58f' },
  { name: '灰紫', hex: '#9a9ab5' },
  { name: '陶土粉', hex: '#c0a8a0' }
]

function dateKey(d) {
  const date = d || new Date()
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return y + '-' + m + '-' + day
}

function formatDate(key) {
  const parts = key.split('-')
  return parts[0] + ' 年 ' + Number(parts[1]) + ' 月 ' + Number(parts[2]) + ' 日'
}

function hashSeed(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i)
    h = Math.imul(h, 16777619)
  }
  return h >>> 0
}

function mulberry32(seed) {
  let a = seed >>> 0
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

function sample(arr, count, rand) {
  const copy = arr.slice()
  const out = []
  for (let i = 0; i < count && copy.length; i++) {
    out.push(copy.splice(Math.floor(rand() * copy.length), 1)[0])
  }
  return out
}

function buildFortune(dayKey, nick) {
  const rand = mulberry32(hashSeed(dayKey + '|' + nick))
  const gua = GUAS[Math.floor(rand() * GUAS.length)]
  const text = SIGN_TEXTS[Math.floor(rand() * SIGN_TEXTS.length)]

  const levelRoll = rand()
  let levelIndex = 0
  if (levelRoll < 0.18) levelIndex = 0
  else if (levelRoll < 0.48) levelIndex = 1
  else if (levelRoll < 0.78) levelIndex = 2
  else if (levelRoll < 0.94) levelIndex = 3
  else levelIndex = 4
  const level = LEVELS[levelIndex]

  const yiCount = rand() < 0.45 ? 3 : 2
  const jiCount = rand() < 0.45 ? 3 : 2
  const yi = sample(YI, yiCount, rand)
  const ji = sample(JI, jiCount, rand)
  const color = COLORS[Math.floor(rand() * COLORS.length)]
  const number = 1 + Math.floor(rand() * 99)

  return {
    gua,
    text,
    level: level.name,
    levelColor: level.color,
    yi,
    ji,
    color,
    number
  }
}

const today = ref(dateKey())
const nickname = ref('')
const wishText = ref('')
const shaking = ref(false)

let shakeTimer = null
let dayTimer = null

const fortune = computed(() => buildFortune(today.value, nickname.value.trim() || '有缘人'))
const dateLabel = computed(() => formatDate(today.value))
const nickLabel = computed(() => nickname.value.trim() || '有缘人')

function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7)
}

function nowLabel() {
  const d = new Date()
  const hh = String(d.getHours()).padStart(2, '0')
  const mm = String(d.getMinutes()).padStart(2, '0')
  return formatDate(dateKey(d)) + ' ' + hh + ':' + mm
}

function loadWishes() {
  try {
    const raw = JSON.parse(localStorage.getItem(WISH_KEY) || '[]')
    if (!Array.isArray(raw)) return []
    return raw
      .filter(w => w && typeof w.text === 'string')
      .map(w => ({
        id: typeof w.id === 'string' ? w.id : uid(),
        text: w.text,
        at: typeof w.at === 'string' ? w.at : ''
      }))
  } catch (e) {
    return []
  }
}

const wishes = ref(loadWishes())

watch(
  wishes,
  v => {
    try {
      localStorage.setItem(WISH_KEY, JSON.stringify(v))
    } catch (e) {
      // 本地存储不可用时忽略
    }
  },
  { deep: true }
)

function reroll() {
  if (shaking.value) return
  shaking.value = true
  if (shakeTimer) clearTimeout(shakeTimer)
  shakeTimer = setTimeout(() => {
    shaking.value = false
    shakeTimer = null
  }, 150)
}

function addWish() {
  const text = wishText.value.trim()
  if (!text) return
  wishes.value.unshift({ id: uid(), text: text.slice(0, 60), at: nowLabel() })
  wishText.value = ''
}

function removeWish(id) {
  wishes.value = wishes.value.filter(w => w.id !== id)
}

onMounted(() => {
  dayTimer = setInterval(() => {
    const key = dateKey()
    if (key !== today.value) today.value = key
  }, 30000)
})

onBeforeUnmount(() => {
  if (shakeTimer) {
    clearTimeout(shakeTimer)
    shakeTimer = null
  }
  if (dayTimer) {
    clearInterval(dayTimer)
    dayTimer = null
  }
})
</script>
