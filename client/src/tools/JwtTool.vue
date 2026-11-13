<template>
  <div>
    <div class="panel">
      <div class="panel-title">JWT 解码器</div>
      <div class="field">
        <label>粘贴 JWT</label>
        <textarea
          v-model="input"
          class="mono"
          placeholder="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NSJ9.c2lnbmF0dXJl"
        ></textarea>
      </div>
      <p class="hint">仅解码 header 与 payload，不校验签名，不能用于安全验证。</p>
      <p v-if="decoded && decoded.error" class="err">{{ decoded.error }}</p>
    </div>

    <template v-if="decoded && !decoded.error">
      <div class="panel">
        <div class="panel-title">
          Header
          <CopyButton :text="decoded.headerText" />
        </div>
        <pre class="mono json">{{ decoded.headerText }}</pre>
      </div>

      <div class="panel">
        <div class="panel-title">
          Payload
          <CopyButton :text="decoded.payloadText" />
        </div>
        <pre class="mono json">{{ decoded.payloadText }}</pre>
        <div class="row" style="margin-top: 10px">
          <span class="pill">签名 {{ decoded.sigLen }} 字符 · 未校验签名</span>
        </div>
      </div>

      <div class="panel">
        <div class="panel-title">时间字段</div>
        <template v-if="decoded.times.length">
          <div v-for="t in decoded.times" :key="t.key" class="kv">
            <span>{{ t.label }}（{{ t.key }}）</span>
            <b>
              {{ t.time }}
              <span class="status" :class="t.cls">· {{ t.text }}</span>
            </b>
          </div>
        </template>
        <p v-else class="hint">payload 中没有 exp / iat / nbf 时间字段。</p>
      </div>
    </template>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import CopyButton from '../components/CopyButton.vue'

const input = ref('')

function b64urlDecode(seg) {
  let s = seg.replace(/-/g, '+').replace(/_/g, '/')
  const pad = s.length % 4
  if (pad === 1) throw new Error('Base64URL 长度非法')
  if (pad) s += '='.repeat(4 - pad)
  const bin = atob(s)
  const bytes = Uint8Array.from(bin, c => c.charCodeAt(0))
  return new TextDecoder('utf-8', { fatal: true }).decode(bytes)
}

function fmtTime(d) {
  const p = n => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())} ${p(d.getHours())}:${p(
    d.getMinutes()
  )}:${p(d.getSeconds())}`
}

function fmtSpan(ms) {
  const m = Math.max(0, Math.floor(ms / 60000))
  if (m < 60) return `${m} 分钟`
  const h = Math.floor(m / 60)
  if (h < 24) return `${h} 小时 ${m % 60} 分钟`
  return `${Math.floor(h / 24)} 天 ${h % 24} 小时`
}

const decoded = computed(() => {
  const raw = input.value.trim()
  if (!raw) return null

  const parts = raw.split('.')
  if (parts.length !== 3) {
    return { error: `格式错误：JWT 应由 3 段组成（当前 ${parts.length} 段）` }
  }

  let header
  let payload
  try {
    header = JSON.parse(b64urlDecode(parts[0]))
    payload = JSON.parse(b64urlDecode(parts[1]))
  } catch {
    return { error: '解码失败：header 或 payload 不是合法的 Base64URL 编码 JSON' }
  }
  if (!header || typeof header !== 'object' || !payload || typeof payload !== 'object') {
    return { error: '解码失败：header 或 payload 不是 JSON 对象' }
  }

  const now = Date.now()
  const times = []
  const defs = [
    ['exp', '过期时间'],
    ['iat', '签发时间'],
    ['nbf', '生效时间']
  ]
  for (const [key, label] of defs) {
    const v = payload[key]
    if (typeof v !== 'number') continue
    const d = new Date(v * 1000)
    if (Number.isNaN(d.getTime())) continue

    let text = '已签发'
    let cls = ''
    if (key === 'exp') {
      if (d.getTime() <= now) {
        text = '已过期'
        cls = 'bad'
      } else {
        text = `未过期，剩余 ${fmtSpan(d.getTime() - now)}`
        cls = 'good'
      }
    } else if (key === 'nbf') {
      if (d.getTime() > now) {
        text = '尚未生效'
        cls = 'bad'
      } else {
        text = '已生效'
        cls = 'good'
      }
    }
    times.push({ key, label, time: fmtTime(d), text, cls })
  }

  return {
    error: '',
    headerText: JSON.stringify(header, null, 2),
    payloadText: JSON.stringify(payload, null, 2),
    sigLen: parts[2].length,
    times
  }
})
</script>

<style scoped>
.json {
  margin: 0;
  padding: 12px;
  background: var(--panel2);
  border: 1px solid var(--border);
  border-radius: 9px;
  max-height: 340px;
  overflow: auto;
  font-size: 13px;
  line-height: 1.6;
  white-space: pre-wrap;
  word-break: break-all;
}

.status.good {
  color: var(--accent);
}

.status.bad {
  color: var(--danger);
}
</style>
