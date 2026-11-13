<template>
  <div>
    <div class="panel">
      <div class="panel-title">文本 ↔ Unicode 转义</div>
      <div class="field">
        <label>输入</label>
        <textarea
          v-model="uniInput"
          placeholder="输入中文、emoji 等；ASCII 字符会保留原样"
        ></textarea>
      </div>
      <div class="row">
        <button class="btn primary" @click="toUnicode">转义 →</button>
        <button class="btn" @click="fromUnicode">← 还原</button>
      </div>
      <div class="field" style="margin-top: 12px">
        <label>结果</label>
        <textarea v-model="uniOutput" class="mono" readonly placeholder="结果…"></textarea>
      </div>
      <div class="row">
        <CopyButton :text="uniOutput" />
      </div>
      <p class="hint">非 ASCII 字符转为 \uXXXX（emoji 会输出两个代理项转义）；还原同时支持 \uXXXX 与 \u{XXXXX}。</p>
    </div>

    <div class="panel">
      <div class="panel-title">HTML 实体编码 / 解码</div>
      <div class="field">
        <label>输入</label>
        <textarea v-model="htmlInput" placeholder="输入文本或 HTML 实体，例如 &lt;div&gt; &amp; &#x4E2D;"></textarea>
      </div>
      <div class="row">
        <button class="btn primary" @click="htmlEncode">编码 →</button>
        <button class="btn" @click="htmlDecode">← 解码</button>
      </div>
      <div class="field" style="margin-top: 12px">
        <label>结果</label>
        <textarea v-model="htmlOutput" class="mono" readonly placeholder="结果…"></textarea>
      </div>
      <div class="row">
        <CopyButton :text="htmlOutput" />
      </div>
      <p class="hint">编码 &amp; &lt; &gt; &quot; ' 五个字符；解码支持 &#xxx;、&#xXXX; 及常见命名实体。</p>
    </div>

    <div class="panel">
      <div class="panel-title">零宽字符检测与清除</div>
      <div class="field">
        <label>输入</label>
        <textarea
          v-model="zwInput"
          placeholder="粘贴可能包含零宽字符的文本…"
        ></textarea>
      </div>

      <div v-if="zwInput" class="stats-grid" style="margin-bottom: 12px">
        <div v-for="s in zwStats" :key="s.tag" class="stat">
          <b>{{ s.count }}</b>
          <span>{{ s.name }}</span>
        </div>
        <div class="stat">
          <b>{{ zwTotal }}</b>
          <span>合计</span>
        </div>
      </div>

      <pre v-if="zwInput" class="mono preview"><template v-for="(seg, i) in zwSegments" :key="i"><span v-if="seg.zw" class="zw-mark">{{ seg.text }}</span><span v-else>{{ seg.text }}</span></template></pre>

      <div class="row" style="margin-top: 10px">
        <button class="btn primary" :disabled="!zwTotal" @click="clearZeroWidth">一键清除</button>
      </div>

      <div class="field" style="margin-top: 12px">
        <label>清除结果</label>
        <textarea v-model="zwOutput" class="mono" readonly placeholder="清除后的文本…"></textarea>
      </div>
      <div class="row">
        <CopyButton :text="zwOutput" />
      </div>
      <p class="hint">检测范围：\u200B-\u200D、\uFEFF、\u2060；预览中用 ⟨标记⟩ 高亮显示。</p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import CopyButton from '../components/CopyButton.vue'

// ---------- Unicode 转义 ----------
const uniInput = ref('')
const uniOutput = ref('')

function toUnicode() {
  let out = ''
  for (const ch of uniInput.value) {
    const cp = ch.codePointAt(0)
    if (cp < 0x80) {
      out += ch
    } else if (cp <= 0xffff) {
      out += '\\u' + cp.toString(16).toUpperCase().padStart(4, '0')
    } else {
      out += '\\u' + ch.charCodeAt(0).toString(16).toUpperCase().padStart(4, '0')
      out += '\\u' + ch.charCodeAt(1).toString(16).toUpperCase().padStart(4, '0')
    }
  }
  uniOutput.value = out
}

function fromUnicode() {
  const src = uniOutput.value || uniInput.value
  uniOutput.value = src.replace(
    /\\u\{([0-9a-fA-F]+)\}|\\u([0-9a-fA-F]{4})/g,
    (m, hex1, hex2) => {
      const cp = parseInt(hex1 || hex2, 16)
      if (!Number.isFinite(cp) || cp > 0x10ffff) return m
      try {
        return String.fromCodePoint(cp)
      } catch {
        return m
      }
    }
  )
}

// ---------- HTML 实体 ----------
const htmlInput = ref('')
const htmlOutput = ref('')

const NAMED_ENTITIES = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: '\u00A0',
  copy: '©',
  reg: '®',
  trade: '™',
  hellip: '…',
  mdash: '—',
  ndash: '–',
  laquo: '«',
  raquo: '»',
  times: '×',
  divide: '÷',
  deg: '°',
  plusmn: '±',
  middot: '·',
  bull: '•',
  euro: '€',
  pound: '£',
  yen: '¥',
  cent: '¢',
  sect: '§',
  para: '¶',
  heart: '♥',
  larr: '←',
  uarr: '↑',
  rarr: '→',
  darr: '↓'
}

function htmlEncode() {
  htmlOutput.value = htmlInput.value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function htmlDecode() {
  const src = htmlOutput.value || htmlInput.value
  htmlOutput.value = src.replace(
    /&(#x?[0-9a-fA-F]+|[a-zA-Z][a-zA-Z0-9]*);/g,
    (m, body) => {
      if (body[0] === '#') {
        const hex = body[1] === 'x' || body[1] === 'X'
        const cp = parseInt(body.slice(hex ? 2 : 1), hex ? 16 : 10)
        if (!Number.isFinite(cp) || cp < 0 || cp > 0x10ffff) return m
        try {
          return String.fromCodePoint(cp)
        } catch {
          return m
        }
      }
      const v = NAMED_ENTITIES[body.toLowerCase()]
      return v === undefined ? m : v
    }
  )
}

// ---------- 零宽字符 ----------
const ZW_CHARS = [
  { code: '\u200B', tag: 'ZWSP', name: 'ZWSP 零宽空格' },
  { code: '\u200C', tag: 'ZWNJ', name: 'ZWNJ 零宽不连字' },
  { code: '\u200D', tag: 'ZWJ', name: 'ZWJ 零宽连字' },
  { code: '\uFEFF', tag: 'BOM', name: 'BOM 零宽不换行空格' },
  { code: '\u2060', tag: 'WJ', name: 'WJ 词连接符' }
]

const ZW_RE = /[\u200B-\u200D\uFEFF\u2060]/g

const zwInput = ref('')
const zwOutput = ref('')

const zwStats = computed(() =>
  ZW_CHARS.map(z => ({
    tag: z.tag,
    name: z.name,
    count: Array.from(zwInput.value).filter(ch => ch === z.code).length
  }))
)

const zwTotal = computed(() => zwStats.value.reduce((sum, s) => sum + s.count, 0))

const zwSegments = computed(() => {
  const text = zwInput.value
  const segs = []
  let last = 0
  let m
  const re = new RegExp(ZW_RE.source, 'g')
  while ((m = re.exec(text))) {
    if (m.index > last) segs.push({ zw: false, text: text.slice(last, m.index) })
    const item = ZW_CHARS.find(z => z.code === m[0])
    segs.push({ zw: true, text: `⟨${item ? item.tag : 'ZW'}⟩` })
    last = m.index + m[0].length
  }
  if (last < text.length) segs.push({ zw: false, text: text.slice(last) })
  return segs
})

function clearZeroWidth() {
  zwInput.value = zwInput.value.replace(ZW_RE, '')
  zwOutput.value = zwInput.value
}
</script>

<style scoped>
textarea.mono,
.preview {
  font-size: 13px;
}

.preview {
  margin: 0;
  padding: 10px 12px;
  background: var(--panel2);
  border: 1px solid var(--border);
  border-radius: 9px;
  max-height: 240px;
  overflow: auto;
  white-space: pre-wrap;
  word-break: break-all;
  line-height: 1.7;
}

.zw-mark {
  background: var(--rose-soft);
  color: var(--rose-ink);
  border-radius: 4px;
  padding: 0 2px;
  font-weight: 600;
}
</style>
