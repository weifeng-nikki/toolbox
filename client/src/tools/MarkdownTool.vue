<template>
  <div>
    <div class="md-wrap">
      <div class="field">
        <label>Markdown 源文</label>
        <textarea v-model="src" style="min-height: 420px" placeholder="# 标题&#10;&#10;支持 **加粗**、*斜体*、`行内代码`、[链接](https://…)、列表、表格、引用与代码块"></textarea>
      </div>
      <div class="field">
        <label>预览</label>
        <div class="md-body" v-html="html"></div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const src = ref('')

function escapeHtml(s) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')
}

function safeUrl(u) {
  return /^(https?:|mailto:|#|\/)/i.test(u)
}

// 行内元素：先提取行内代码为占位符，避免其内容被二次处理
function inline(s) {
  const codes = []
  let out = s.replace(/`([^`]+)`/g, (_, c) => {
    codes.push(c)
    return `\x00${codes.length - 1}\x00`
  })
  out = out.replace(/!\[([^\]]*)\]\(([^)\s]+)\)/g, (_, alt, u) =>
    safeUrl(u) ? `<img src="${u}" alt="${alt}">` : alt
  )
  out = out.replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, t, u) =>
    safeUrl(u) ? `<a href="${u}" target="_blank" rel="noopener">${t}</a>` : t
  )
  out = out.replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
  out = out.replace(/\*([^*]+)\*/g, '<i>$1</i>')
  out = out.replace(/~~([^~]+)~~/g, '<del>$1</del>')
  return out.replace(/\x00(\d+)\x00/g, (_, i) => `<code>${codes[+i]}</code>`)
}

function renderMd(source) {
  const lines = source.split('\n')
  let html = ''
  let i = 0
  while (i < lines.length) {
    const line = lines[i]
    if (/^```/.test(line.trim())) {
      const buf = []
      i++
      while (i < lines.length && !/^```/.test(lines[i].trim())) buf.push(lines[i++])
      i++
      html += `<pre><code>${escapeHtml(buf.join('\n'))}</code></pre>`
      continue
    }
    const h = /^(#{1,6})\s+(.*)$/.exec(line)
    if (h) {
      const lv = h[1].length
      html += `<h${lv}>${inline(escapeHtml(h[2]))}</h${lv}>`
      i++
      continue
    }
    if (/^(-{3,}|\*{3,})\s*$/.test(line.trim())) {
      html += '<hr>'
      i++
      continue
    }
    if (/^>\s?/.test(line)) {
      const buf = []
      while (i < lines.length && /^>\s?/.test(lines[i])) buf.push(lines[i++].replace(/^>\s?/, ''))
      html += `<blockquote>${inline(escapeHtml(buf.join(' ')))}</blockquote>`
      continue
    }
    if (
      line.includes('|') &&
      i + 1 < lines.length &&
      /^\s*\|?[\s:|-]+\|?\s*$/.test(lines[i + 1]) &&
      lines[i + 1].includes('-')
    ) {
      const cells = r => r.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map(c => c.trim())
      const head = cells(line)
      i += 2
      const body = []
      while (i < lines.length && lines[i].includes('|')) body.push(cells(lines[i++]))
      html +=
        '<table><thead><tr>' +
        head.map(c => `<th>${inline(escapeHtml(c))}</th>`).join('') +
        '</tr></thead><tbody>' +
        body.map(r => `<tr>${r.map(c => `<td>${inline(escapeHtml(c))}</td>`).join('')}</tr>`).join('') +
        '</tbody></table>'
      continue
    }
    const ul = /^\s*[-*]\s+(.*)$/.exec(line)
    const ol = /^\s*\d+\.\s+(.*)$/.exec(line)
    if (ul || ol) {
      const isOl = !!ol
      const re = isOl ? /^\s*\d+\.\s+(.*)$/ : /^\s*[-*]\s+(.*)$/
      const items = []
      while (i < lines.length) {
        const m2 = re.exec(lines[i])
        if (!m2) break
        items.push(m2[1])
        i++
      }
      html +=
        (isOl ? '<ol>' : '<ul>') +
        items.map(it => `<li>${inline(escapeHtml(it))}</li>`).join('') +
        (isOl ? '</ol>' : '</ul>')
      continue
    }
    if (line.trim() === '') {
      i++
      continue
    }
    const buf = [line]
    i++
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !/^(```|#{1,6}\s|>\s|(-{3,}|\*{3,})\s*$|\s*[-*]\s|\s*\d+\.\s)/.test(lines[i])
    ) {
      buf.push(lines[i++])
    }
    html += `<p>${buf.map(l => inline(escapeHtml(l))).join('<br>')}</p>`
  }
  return html
}

const html = computed(() => (src.value.trim() ? renderMd(src.value) : '<p class="tip">输入 Markdown 开始预览…</p>'))
</script>

<style scoped>
.md-wrap {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 760px) {
  .md-wrap {
    grid-template-columns: 1fr;
  }
}

.md-body {
  min-height: 420px;
  max-height: 70vh;
  overflow: auto;
  background: var(--panel);
  border: 1px solid var(--border);
  border-radius: var(--radius);
  padding: 16px;
  line-height: 1.7;
  word-break: break-word;
}

.md-body :deep(h1) { font-size: 26px; margin: 0.4em 0; }
.md-body :deep(h2) { font-size: 22px; margin: 0.5em 0; }
.md-body :deep(h3) { font-size: 18px; margin: 0.5em 0; }
.md-body :deep(h4), .md-body :deep(h5), .md-body :deep(h6) { font-size: 16px; margin: 0.5em 0; }
.md-body :deep(p) { margin: 0.6em 0; }
.md-body :deep(a) { color: var(--accent); }
.md-body :deep(blockquote) {
  margin: 0.6em 0;
  padding: 4px 12px;
  border-left: 3px solid var(--accent);
  color: var(--muted);
  background: var(--panel2);
  border-radius: 0 6px 6px 0;
}
.md-body :deep(pre) {
  background: var(--panel2);
  border: 1px solid var(--border);
  border-radius: 8px;
  padding: 12px;
  overflow: auto;
  font-family: var(--mono);
  font-size: 13px;
}
.md-body :deep(code) {
  font-family: var(--mono);
  font-size: 13px;
  background: var(--panel2);
  border-radius: 4px;
  padding: 1px 5px;
}
.md-body :deep(pre code) { background: transparent; padding: 0; }
.md-body :deep(table) { border-collapse: collapse; margin: 0.6em 0; }
.md-body :deep(th), .md-body :deep(td) { border: 1px solid var(--border); padding: 5px 12px; }
.md-body :deep(img) { max-width: 100%; border-radius: 6px; }
.md-body :deep(hr) { border: none; border-top: 1px solid var(--border); margin: 1em 0; }
.md-body :deep(.tip) { color: var(--muted); }
</style>
