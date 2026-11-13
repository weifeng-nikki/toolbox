<template>
  <div>
    <div class="panel">
      <div class="panel-title">解析完整 URL</div>
      <div class="field">
        <label>URL</label>
        <input
          v-model="urlInput"
          class="mono"
          placeholder="https://example.com/path?a=1&b=2#top"
          @keyup.enter="parseUrl"
        />
      </div>
      <div class="row">
        <button class="btn primary" @click="parseUrl">解析</button>
        <button class="btn" @click="fillExample">填入示例</button>
        <button class="btn" @click="resetAll">重置</button>
      </div>
      <p v-if="parseError" class="err">{{ parseError }}</p>
      <div v-if="parsed" style="margin-top: 14px">
        <div class="kv"><span>协议</span><b>{{ protocol || '（无）' }}</b></div>
        <div class="kv"><span>主机</span><b>{{ host || '（无）' }}</b></div>
        <div class="kv"><span>路径</span><b>{{ pathname || '（无）' }}</b></div>
        <div class="kv"><span>Hash</span><b>{{ hash || '（无）' }}</b></div>
      </div>
    </div>

    <div v-if="parsed" class="panel">
      <div class="panel-title">查询参数（编辑后实时生成）</div>
      <div
        v-for="p in params"
        :key="p.id"
        class="row"
        style="flex-wrap: nowrap; margin-bottom: 8px"
      >
        <input v-model="p.on" type="checkbox" title="启用该参数" />
        <input v-model="p.key" class="mono" placeholder="key" style="flex: 1; min-width: 0" />
        <input v-model="p.value" class="mono" placeholder="value" style="flex: 1; min-width: 0" />
        <button class="btn small" @click="removeParam(p.id)">删除</button>
      </div>
      <p v-if="!params.length" class="hint">当前没有查询参数。</p>
      <div class="row" style="margin-top: 10px">
        <button class="btn small" @click="addParam()">新增参数</button>
        <button class="btn small" @click="clearParams">全部清空</button>
      </div>
      <div class="field" style="margin-top: 14px">
        <label>生成结果</label>
        <a
          class="mono"
          :href="builtUrl"
          target="_blank"
          rel="noreferrer"
          style="word-break: break-all"
        >{{ builtUrl || '（暂无参数）' }}</a>
      </div>
      <div class="row">
        <CopyButton :text="builtUrl" label="复制 URL" />
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">从参数串构建 URL</div>
      <div class="field">
        <label>基础地址</label>
        <input v-model="baseInput" class="mono" placeholder="https://example.com/search" />
      </div>
      <div class="field">
        <label>参数串（支持 a=1&amp;b=2 或每行一个 key=value）</label>
        <textarea
          v-model="queryInput"
          class="mono"
          placeholder="q=vue&page=2&#10;sort=desc"
        ></textarea>
      </div>
      <p v-if="reverseResult.error" class="err">{{ reverseResult.error }}</p>
      <div class="field">
        <label>完整 URL</label>
        <a
          v-if="reverseResult.url"
          class="mono"
          :href="reverseResult.url"
          target="_blank"
          rel="noreferrer"
          style="word-break: break-all"
        >{{ reverseResult.url }}</a>
        <span v-else class="hint">输入参数后自动生成。</span>
      </div>
      <div class="row">
        <CopyButton :text="reverseResult.url" label="复制 URL" />
      </div>
      <div v-if="reverseResult.pairs.length" style="margin-top: 12px">
        <div style="font-size: 13.5px; color: var(--muted); margin-bottom: 4px">解码后的可读值</div>
        <div v-for="(p, i) in reverseResult.pairs" :key="i" class="kv">
          <span class="mono">{{ p.k }}</span>
          <b>{{ p.v || '（空）' }}</b>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import CopyButton from '../components/CopyButton.vue'

const urlInput = ref('')
const parsed = ref(false)
const parseError = ref('')
const protocol = ref('')
const host = ref('')
const pathname = ref('')
const hash = ref('')
const params = ref([])
let idSeq = 0

const baseInput = ref('https://example.com/search')
const queryInput = ref('')

function addParam(key = '', value = '') {
  params.value.push({ id: ++idSeq, on: true, key, value })
}

function removeParam(id) {
  params.value = params.value.filter(p => p.id !== id)
}

function clearParams() {
  params.value = []
}

function parseUrl() {
  parseError.value = ''
  const raw = urlInput.value.trim()
  if (!raw) {
    parseError.value = '请输入要解析的 URL'
    parsed.value = false
    return
  }
  let u
  try {
    u = new URL(raw)
  } catch {
    parseError.value = '解析失败：URL 格式不合法（请包含协议，例如 https://）'
    parsed.value = false
    return
  }
  protocol.value = u.protocol.replace(/:$/, '')
  host.value = u.host
  pathname.value = u.pathname
  hash.value = u.hash
  params.value = []
  u.searchParams.forEach((value, key) => addParam(key, value))
  parsed.value = true
}

function fillExample() {
  urlInput.value = 'https://example.com/products/list?page=2&sort=price&keyword=vue%20router#reviews'
  parseUrl()
}

function resetAll() {
  urlInput.value = ''
  parsed.value = false
  parseError.value = ''
  protocol.value = ''
  host.value = ''
  pathname.value = ''
  hash.value = ''
  params.value = []
}

const builtUrl = computed(() => {
  if (!parsed.value) return ''
  const qs = params.value
    .filter(p => p.on && p.key.trim() !== '')
    .map(p => `${encodeURIComponent(p.key.trim())}=${encodeURIComponent(p.value)}`)
    .join('&')
  const prefix = `${protocol.value}://${host.value}${pathname.value}`
  return prefix + (qs ? `?${qs}` : '') + hash.value
})

function safeDecode(s) {
  try {
    return decodeURIComponent(s.replace(/\+/g, ' '))
  } catch {
    return s
  }
}

const reverseResult = computed(() => {
  const raw = queryInput.value.trim()
  if (!raw) return { url: '', pairs: [], error: '' }
  const parts = raw
    .split(/[\n&]+/)
    .map(s => s.trim())
    .filter(Boolean)
  const pairs = []
  for (const part of parts) {
    const idx = part.indexOf('=')
    const k = safeDecode(idx === -1 ? part : part.slice(0, idx)).trim()
    const v = idx === -1 ? '' : safeDecode(part.slice(idx + 1))
    if (k) pairs.push({ k, v })
  }
  const base = baseInput.value.trim()
  if (base) {
    try {
      new URL(base)
    } catch {
      return { url: '', pairs, error: '基础地址不合法：需要包含协议的绝对 URL' }
    }
  }
  const qs = pairs.map(p => `${encodeURIComponent(p.k)}=${encodeURIComponent(p.v)}`).join('&')
  if (!qs) return { url: '', pairs, error: '' }
  if (!base) return { url: qs, pairs, error: '' }
  const hashIdx = base.indexOf('#')
  const hashPart = hashIdx >= 0 ? base.slice(hashIdx) : ''
  const main = hashIdx >= 0 ? base.slice(0, hashIdx) : base
  const sep = main.includes('?') ? '&' : '?'
  return { url: main + sep + qs + hashPart, pairs, error: '' }
})
</script>
