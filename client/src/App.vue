<template>
  <div class="app">
    <div class="atmosphere" aria-hidden="true">
      <!-- 时间：指针扫动 -->
      <div v-if="fx === 'clock'" class="clock-face">
        <span class="clock-hand hour"></span>
        <span class="clock-hand minute"></span>
        <span class="clock-hand second"></span>
        <span class="clock-core"></span>
      </div>

      <!-- 计算：数字雨 -->
      <template v-else-if="fx === 'rain'">
        <span v-for="c in rainCols" :key="c.id" class="rain-col" :style="c.style">{{ c.digits }}</span>
      </template>

      <!-- 文本：字符行流动 -->
      <div v-else-if="fx === 'lines'" class="fx-lines">
        <span v-for="l in lines" :key="l.id" class="tline" :style="l.style"></span>
      </div>

      <!-- 生成器：星点闪烁 -->
      <template v-else-if="fx === 'stars'">
        <span v-for="s in stars" :key="s.id" class="star" :style="s.style"></span>
      </template>

      <!-- 小游戏：方块飘落 -->
      <template v-else-if="fx === 'pixels'">
        <span v-for="p in pixels" :key="p.id" class="pixel" :style="p.style"></span>
      </template>

      <!-- 媒体/默认：花瓣飞舞 -->
      <template v-else>
        <span v-for="p in petals" :key="p.id" class="petal" :style="p.style"></span>
      </template>
    </div>

    <aside class="sidebar">
      <div class="brand">
        <span class="brand-mark">🧰</span>
        <div class="brand-text">
          <b>本地工具箱</b>
          <small>{{ tools.length }} 个工具 · 全部本地运行</small>
        </div>
        <div class="brand-actions">
          <button
            class="theme-btn"
            :title="themeTitle"
            :aria-label="themeTitle"
            @click="cycleTheme"
          >
            {{ themeIcon }}
          </button>
          <button class="theme-btn" title="外观设置" aria-label="打开外观设置" @click="settingsOpen = true">
            ⚙️
          </button>
        </div>
      </div>
      <nav class="nav">
        <button class="tool-btn home-btn cat--home" :class="{ active: isHome }" @click="goHome">
          <span class="icon">🏠</span>首页
        </button>

        <div
          v-for="cat in categories"
          :key="cat.id"
          class="cat"
          :class="['cat--' + cat.id, { closed: !isOpen(cat.id) }]"
        >
          <button class="cat-name" :aria-expanded="isOpen(cat.id)" @click="toggleCat(cat.id)">
            <span class="cat-label">{{ cat.name }}</span>
            <span class="cat-line"></span>
            <span class="cat-count">{{ cat.tools.length }}</span>
            <span class="caret">▾</span>
          </button>
          <div class="cat-body">
            <div class="cat-tools">
              <button
                v-for="tool in cat.tools"
                :key="tool.id"
                class="tool-btn"
                :class="{ active: tool.id === viewId }"
                @click="openTool(tool.id)"
              >
                <span class="icon">{{ tool.icon }}</span>{{ tool.name }}
              </button>
            </div>
          </div>
        </div>
      </nav>
      <div class="foot">数据只存本机，断网也能用</div>
    </aside>

    <main class="main">
      <div class="wrap" :class="isHome ? 'cat--home' : 'cat--' + activeCat.id">
        <template v-if="isHome">
          <header class="tool-head">
            <div class="icon-tile">🏠</div>
            <div>
              <h2>全部工具</h2>
              <p class="tool-sub">
                {{ categories.length }} 个分类 · {{ tools.length }} 个工具 · 数据不出本机
              </p>
            </div>
          </header>

          <div class="home">
            <section v-for="cat in categories" :key="cat.id" class="home-cat" :class="'cat--' + cat.id">
              <div class="home-cat-name">
                {{ cat.name }}
                <span class="home-count">{{ cat.tools.length }}</span>
              </div>
              <div class="home-grid">
                <button
                  v-for="tool in cat.tools"
                  :key="tool.id"
                  class="home-card"
                  @click="openTool(tool.id)"
                >
                  <span class="home-icon">{{ tool.icon }}</span>
                  <span class="home-label">{{ tool.name }}</span>
                </button>
              </div>
            </section>
          </div>
        </template>

        <template v-else>
          <header class="tool-head">
            <div class="icon-tile">{{ active.icon }}</div>
            <div>
              <h2>{{ active.name }}</h2>
              <p class="tool-sub">{{ activeCat.name }}</p>
            </div>
          </header>
          <Transition name="fade" mode="out-in">
            <component :is="active.component" :key="active.id" />
          </Transition>
        </template>
      </div>
    </main>
  </div>

  <div v-if="settingsOpen" class="appearance-mask" @click.self="settingsOpen = false">
    <div class="appearance-card" role="dialog" aria-modal="true" aria-label="外观设置">
      <div class="appearance-head">
        <b>外观设置</b>
        <button class="appearance-close" aria-label="关闭" @click="settingsOpen = false">✕</button>
      </div>

      <p class="appearance-group-label">主题模式</p>
      <button
        v-for="opt in themeOptions"
        :key="opt.id"
        class="appearance-opt"
        :class="{ on: mode === opt.id }"
        @click="mode = opt.id"
      >
        <span class="ao-icon">{{ opt.icon }}</span>
        <span class="ao-text">
          <b>{{ opt.name }}</b>
          <small>{{ opt.desc }}</small>
        </span>
        <span v-if="mode === opt.id" class="ao-check">✓</span>
      </button>

      <p class="hint">
        <template v-if="mode === 'auto'">当前时段：{{ SKY_LABEL[sky] }}，天空色会随时间自动切换。</template>
        <template v-else>已固定为{{ mode === 'light' ? '亮色' : '暗色' }}，不再随时间变化。</template>
      </p>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watchEffect } from 'vue'
import { allTools as tools, categories } from './tools/registry.js'

const HOME = 'home'
const THEME_KEY = 'toolbox.theme'

// 时段划分：5-7 黎明 / 8-16 白天 / 17-19 黄昏 / 其余夜晚
function skyOf(hour) {
  if (hour >= 5 && hour < 8) return 'dawn'
  if (hour >= 8 && hour < 17) return 'day'
  if (hour >= 17 && hour < 20) return 'dusk'
  return 'night'
}

const SKY_LABEL = { dawn: '黎明', day: '白天', dusk: '黄昏', night: '夜晚' }
const SKY_META = { dawn: '#f3e2e6', day: '#eef3f7', dusk: '#ebcdbc', night: '#1d1729' }
const SKY_ICON = { dawn: '🌅', day: '☀️', dusk: '🌇', night: '🌙' }

const savedMode = (() => {
  try {
    const v = localStorage.getItem(THEME_KEY)
    return v === 'light' || v === 'dark' ? v : 'auto'
  } catch (e) {
    return 'auto'
  }
})()

const mode = ref(savedMode)
const now = ref(Date.now())
const settingsOpen = ref(false)

const themeOptions = [
  { id: 'auto', icon: '🕓', name: '跟随时间', desc: '按黎明 / 白天 / 黄昏 / 夜晚自动切换天空' },
  { id: 'light', icon: '☀️', name: '固定亮色', desc: '始终使用白天的淡蓝天空' },
  { id: 'dark', icon: '🌙', name: '固定暗色', desc: '始终使用深紫星空' }
]

const sky = computed(() => {
  if (mode.value === 'light') return 'day'
  if (mode.value === 'dark') return 'night'
  return skyOf(new Date(now.value).getHours())
})

const theme = computed(() => (sky.value === 'night' ? 'dark' : 'light'))

const themeIcon = computed(() => {
  if (mode.value === 'light') return '☀️'
  if (mode.value === 'dark') return '🌙'
  return SKY_ICON[sky.value]
})

const themeTitle = computed(() => {
  if (mode.value === 'auto') return `跟随时间 · 当前${SKY_LABEL[sky.value]}（点击改为固定亮色）`
  if (mode.value === 'light') return '固定亮色（点击改为固定暗色）'
  return '固定暗色（点击改为跟随时间）'
})

function cycleTheme() {
  mode.value = mode.value === 'auto' ? 'light' : mode.value === 'light' ? 'dark' : 'auto'
}

watchEffect(() => {
  const root = document.documentElement
  root.dataset.theme = theme.value
  root.dataset.sky = sky.value
  root.style.colorScheme = theme.value
  try {
    localStorage.setItem(THEME_KEY, mode.value)
  } catch (e) {}
  const meta = document.querySelector('meta[name="theme-color"]')
  if (meta) meta.setAttribute('content', SKY_META[sky.value])
})

let skyTimer = null

function onKeydown(e) {
  if (e.key === 'Escape' && settingsOpen.value) settingsOpen.value = false
}

onMounted(() => {
  // 每分钟检查一次，跨过时段边界时自动换天空
  skyTimer = setInterval(() => {
    now.value = Date.now()
  }, 60000)
  window.addEventListener('keydown', onKeydown)
})
onBeforeUnmount(() => {
  if (skyTimer) clearInterval(skyTimer)
  window.removeEventListener('keydown', onKeydown)
})

// 打开页面默认进首页
const viewId = ref(HOME)
const isHome = computed(() => viewId.value === HOME)
const active = computed(() => tools.find(t => t.id === viewId.value))

const activeCat = computed(
  () => categories.find(c => c.tools.some(t => t.id === viewId.value)) || { id: '', name: '' }
)

// 二级菜单展开状态：默认全部折叠
const openCats = ref(new Set())
const isOpen = id => openCats.value.has(id)

function toggleCat(id) {
  const next = new Set(openCats.value)
  if (next.has(id)) next.delete(id)
  else next.add(id)
  openCats.value = next
}

function openTool(id) {
  viewId.value = id
  const cat = categories.find(c => c.tools.some(t => t.id === id))
  if (cat && !openCats.value.has(cat.id)) {
    const next = new Set(openCats.value)
    next.add(cat.id)
    openCats.value = next
  }
}

function goHome() {
  viewId.value = HOME
}

const FX = {
  time: 'clock',
  calc: 'rain',
  text: 'lines',
  dev: 'rain',
  gen: 'stars',
  media: 'petals',
  game: 'pixels',
  fun: 'petals'
}
const fx = computed(() => FX[activeCat.value.id] || 'petals')

const COLORS = ['#e3bcc4', '#d3c7e2', '#b8d0e2', '#c3d7c9']
const rnd = n => Math.floor(Math.random() * n)

// 花瓣
const petals = Array.from({ length: 12 }, (_, i) => ({
  id: i,
  style: {
    left: ((i * 8.3 + 3) % 100).toFixed(2) + '%',
    width: 7 + (i % 5) + 'px',
    height: 10 + (i % 6) + 'px',
    background: COLORS[i % 4],
    animationDuration: 20 + (i % 7) * 3 + 's',
    animationDelay: '-' + ((i * 4.7) % 24).toFixed(1) + 's'
  }
}))

// 数字雨
const rainCols = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  digits: Array.from({ length: 12 + (i % 8) }, () => rnd(10)).join('\n'),
  style: {
    left: ((i * 5.6 + 1.5) % 100).toFixed(2) + '%',
    fontSize: 12 + (i % 3) * 2 + 'px',
    opacity: 0.3 + (i % 4) * 0.12,
    animationDuration: 7 + (i % 6) * 1.8 + 's',
    animationDelay: '-' + ((i * 1.7) % 12).toFixed(1) + 's'
  }
}))

// 文本行
const lines = Array.from({ length: 9 }, (_, i) => ({
  id: i,
  style: {
    width: 32 + ((i * 23) % 56) + '%',
    marginLeft: (i % 3) * 4 + '%',
    opacity: 0.3 + (i % 4) * 0.15,
    animationDelay: '-' + (i * 1.4).toFixed(1) + 's'
  }
}))

// 星点
const stars = Array.from({ length: 26 }, (_, i) => ({
  id: i,
  style: {
    left: ((i * 11.3 + 3) % 100).toFixed(2) + '%',
    top: ((i * 17.7 + 6) % 92).toFixed(2) + '%',
    width: 3 + (i % 4) + 'px',
    height: 3 + (i % 4) + 'px',
    background: COLORS[i % 4],
    animationDuration: 3 + (i % 5) * 1.2 + 's',
    animationDelay: '-' + ((i * 0.9) % 6).toFixed(1) + 's'
  }
}))

// 小游戏方块
const pixels = Array.from({ length: 16 }, (_, i) => ({
  id: i,
  style: {
    left: ((i * 6.4 + 2) % 100).toFixed(2) + '%',
    width: 6 + (i % 4) * 3 + 'px',
    height: 6 + (i % 4) * 3 + 'px',
    background: COLORS[i % 4],
    animationDuration: 12 + (i % 6) * 3 + 's',
    animationDelay: '-' + ((i * 2.1) % 20).toFixed(1) + 's'
  }
}))
</script>
