<template>
  <div>
    <div class="panel">
      <div class="panel-title">当前时间戳</div>
      <div class="kv">
        <span>秒</span><b>{{ nowS }}</b>
        <CopyButton :text="nowS" />
      </div>
      <div class="kv">
        <span>毫秒</span><b>{{ nowMs }}</b>
        <CopyButton :text="nowMs" />
      </div>
    </div>
    <div class="panel">
      <div class="panel-title">时间戳 → 日期</div>
      <div class="field">
        <input v-model="ts" placeholder="粘贴秒或毫秒级时间戳，自动识别" />
      </div>
      <template v-if="tsResult">
        <div class="kv"><span>本地时间</span><b>{{ tsResult.local }} 周{{ tsResult.week }}</b></div>
        <div class="kv"><span>毫秒值</span><b>{{ tsResult.ms }}</b></div>
        <div class="kv"><span>ISO (UTC)</span><b>{{ tsResult.iso }}</b></div>
      </template>
      <p v-else-if="ts.trim()" class="err">无法解析，请输入纯数字时间戳。</p>
    </div>
    <div class="panel">
      <div class="panel-title">日期 → 时间戳</div>
      <div class="row">
        <input v-model="dt" type="datetime-local" style="width: 240px" />
      </div>
      <template v-if="dtResult">
        <div class="kv"><span>秒</span><b>{{ dtResult.s }}</b><CopyButton :text="String(dtResult.s)" /></div>
        <div class="kv"><span>毫秒</span><b>{{ dtResult.ms }}</b><CopyButton :text="String(dtResult.ms)" /></div>
      </template>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, ref } from 'vue'
import CopyButton from '../components/CopyButton.vue'

const nowMs = ref(Date.now())
const nowS = computed(() => Math.floor(nowMs.value / 1000))
const timer = setInterval(() => (nowMs.value = Date.now()), 250)
onBeforeUnmount(() => clearInterval(timer))

const ts = ref('')
const tsResult = computed(() => {
  const raw = ts.value.trim()
  if (!/^-?\d+$/.test(raw)) return null
  let ms = Number(raw)
  if (Math.abs(ms) < 1e12) ms *= 1000 // 秒级自动升为毫秒
  const d = new Date(ms)
  if (isNaN(d.getTime())) return null
  return {
    ms,
    local: d.toLocaleString('zh-CN', { hour12: false }),
    week: '日一二三四五六'[d.getDay()],
    iso: d.toISOString()
  }
})

const dt = ref('')
const dtResult = computed(() => {
  if (!dt.value) return null
  const d = new Date(dt.value)
  if (isNaN(d.getTime())) return null
  return { s: Math.floor(d.getTime() / 1000), ms: d.getTime() }
})
</script>
