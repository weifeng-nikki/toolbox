<template>
  <div>
    <div class="panel">
      <div class="panel-title">JSON / YAML / CSV 互转</div>
      <div class="row">
        <div class="field" style="margin-bottom: 0">
          <label>源格式</label>
          <select v-model="source">
            <option value="json">JSON</option>
            <option value="yaml">YAML</option>
            <option value="csv">CSV</option>
          </select>
        </div>
        <button class="btn small" title="交换源格式与目标格式" @click="swapFormats" style="margin-top: 20px">
          ⇄ 交换
        </button>
        <div class="field" style="margin-bottom: 0">
          <label>目标格式</label>
          <select v-model="target">
            <option value="json">JSON</option>
            <option value="yaml">YAML</option>
            <option value="csv">CSV</option>
          </select>
        </div>
        <button class="btn small" style="margin-top: 20px" @click="loadSample">载入示例</button>
        <button class="btn small" style="margin-top: 20px" @click="clearAll">清空</button>
      </div>
      <div class="row" style="margin-top: 12px">
        <span class="hint" style="margin: 0">快捷组合</span>
        <button class="btn small" @click="quick('json', 'yaml')">JSON → YAML</button>
        <button class="btn small" @click="quick('json', 'csv')">JSON → CSV</button>
        <button class="btn small" @click="quick('yaml', 'json')">YAML → JSON</button>
        <button class="btn small" @click="quick('csv', 'json')">CSV → JSON</button>
        <button class="btn small" @click="quick('yaml', 'csv')">YAML → CSV</button>
        <button class="btn small" @click="quick('csv', 'yaml')">CSV → YAML</button>
      </div>
    </div>

    <div class="panel">
      <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 12px">
        <div class="field" style="margin-bottom: 0">
          <label>输入（{{ labelOf(source) }}）</label>
          <textarea
            v-model="input"
            class="mono"
            style="min-height: 240px; font-size: 13px"
            :placeholder="placeholderOf(source)"
          ></textarea>
        </div>
        <div class="field" style="margin-bottom: 0">
          <label>输出（{{ labelOf(target) }}）</label>
          <textarea
            :value="output"
            readonly
            class="mono"
            style="min-height: 240px; font-size: 13px"
            placeholder="转换结果显示在这里"
          ></textarea>
          <p v-if="error" class="err" style="margin: 2px 0 0">转换失败：{{ error }}{{ output ? '（已保留上一次成功结果）' : '' }}</p>
        </div>
      </div>
      <div class="row" style="margin-top: 12px">
        <CopyButton :text="output" />
        <span class="hint" style="margin: 0" v-if="output && !error">共 {{ output.split('\n').length }} 行</span>
        <span class="hint" style="margin: 0" v-if="output && !error">输入 {{ input.length }} 字符</span>
      </div>
      <p class="hint">零依赖转换：YAML 支持对象、数组、字符串、数字、布尔、null 与 2 空格缩进嵌套；CSV 以首行为表头。</p>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue'
import CopyButton from '../components/CopyButton.vue'

const source = ref('json')
const target = ref('yaml')
const input = ref('')
const output = ref('')
const error = ref('')

const LABELS = { json: 'JSON', yaml: 'YAML', csv: 'CSV' }

function labelOf(fmt) {
  return LABELS[fmt] || fmt
}

function placeholderOf(fmt) {
  if (fmt === 'json') return '粘贴 JSON，如 {"name":"demo","tags":[1,2]}'
  if (fmt === 'yaml') return '粘贴 YAML，如 name: demo 换行 tags: 换行   - 1'
  return '粘贴 CSV，首行为表头，如 name,age 换行 demo,18'
}

function swapFormats() {
  const s = source.value
  source.value = target.value
  target.value = s
  const old = output.value
  if (old) {
    input.value = old
    output.value = ''
  }
}

function quick(from, to) {
  source.value = from
  target.value = to
  if (!input.value.trim()) loadSample()
}

function clearAll() {
  input.value = ''
  output.value = ''
  error.value = ''
}

function isPlainObject(v) {
  return v !== null && typeof v === 'object' && !Array.isArray(v)
}

function quoteYamlString(s) {
  if (s === '') return '""'
  const needQuote =
    /^\s|\s$/.test(s) ||
    /[\n\r\t]/.test(s) ||
    /^(true|false|null|~|yes|no|on|off)$/i.test(s) ||
    /^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/.test(s) ||
    "-?:,[]{}#&*!|>'\"%@`".includes(s[0]) ||
    s.includes(': ') ||
    s.includes(' #') ||
    s.endsWith(':') ||
    s === '---' ||
    s === '...'
  if (!needQuote) return s
  return JSON.stringify(s)
}

function scalarToYaml(v) {
  if (v === null || v === undefined) return 'null'
  if (typeof v === 'number') return Number.isFinite(v) ? String(v) : 'null'
  if (typeof v === 'boolean') return v ? 'true' : 'false'
  if (typeof v === 'string') return quoteYamlString(v)
  return JSON.stringify(v)
}

function yamlLines(v, indent) {
  const pad = ' '.repeat(indent)
  if (Array.isArray(v)) {
    if (!v.length) return [pad + '[]']
    const lines = []
    for (const item of v) {
      const complex = Array.isArray(item) || isPlainObject(item)
      if (!complex) {
        lines.push(pad + '- ' + scalarToYaml(item))
      } else if (Array.isArray(item) && !item.length) {
        lines.push(pad + '- []')
      } else if (isPlainObject(item) && !Object.keys(item).length) {
        lines.push(pad + '- {}')
      } else {
        const sub = yamlLines(item, indent + 2)
        lines.push(pad + '- ' + sub[0].slice(indent + 2))
        for (let i = 1; i < sub.length; i++) lines.push(sub[i])
      }
    }
    return lines
  }
  if (isPlainObject(v)) {
    const keys = Object.keys(v)
    if (!keys.length) return [pad + '{}']
    const lines = []
    for (const key of keys) {
      const k = quoteYamlString(String(key))
      const val = v[key]
      if (Array.isArray(val) || isPlainObject(val)) {
        if (Array.isArray(val) && !val.length) lines.push(pad + k + ': []')
        else if (isPlainObject(val) && !Object.keys(val).length) lines.push(pad + k + ': {}')
        else {
          lines.push(pad + k + ':')
          lines.push(...yamlLines(val, indent + 2))
        }
      } else {
        lines.push(pad + k + ': ' + scalarToYaml(val))
      }
    }
    return lines
  }
  return [pad + scalarToYaml(v)]
}

function toYaml(v) {
  return yamlLines(v, 0).join('\n')
}

function stripYamlComment(line) {
  let inSingle = false
  let inDouble = false
  for (let i = 0; i < line.length; i++) {
    const c = line[i]
    if (inDouble) {
      if (c === '\\') i++
      else if (c === '"') inDouble = false
    } else if (inSingle) {
      if (c === "'") {
        if (line[i + 1] === "'") i++
        else inSingle = false
      }
    } else if (c === '"') {
      inDouble = true
    } else if (c === "'") {
      inSingle = true
    } else if (c === '#' && (i === 0 || /\s/.test(line[i - 1]))) {
      return line.slice(0, i)
    }
  }
  return line
}

function isYamlKeyLine(text) {
  if (text.startsWith('"') || text.startsWith("'")) {
    const q = readYamlQuote(text, 0, 1)
    return q !== null && text.slice(q.end).trim().startsWith(':')
  }
  for (let i = 0; i < text.length; i++) {
    if (text[i] === ':' && (i === text.length - 1 || text[i + 1] === ' ')) return i > 0
  }
  return false
}

function readYamlQuote(text, start, lineNo) {
  const quote = text[start]
  let out = ''
  for (let i = start + 1; i < text.length; i++) {
    const c = text[i]
    if (quote === "'") {
      if (c === "'") {
        if (text[i + 1] === "'") {
          out += "'"
          i++
        } else {
          return { value: out, end: i + 1 }
        }
      } else {
        out += c
      }
    } else {
      if (c === '\\') {
        if (i + 1 >= text.length) break
        const n = text[i + 1]
        const map = { n: '\n', t: '\t', r: '\r', '"': '"', '\\': '\\', '/': '/' }
        if (n === 'u' && /^[0-9a-fA-F]{4}$/.test(text.slice(i + 2, i + 6))) {
          out += String.fromCharCode(parseInt(text.slice(i + 2, i + 6), 16))
          i += 5
        } else {
          out += map[n] !== undefined ? map[n] : n
          i++
        }
      } else if (c === '"') {
        return { value: out, end: i + 1 }
      } else {
        out += c
      }
    }
  }
  throw new Error(`第 ${lineNo} 行：引号没有闭合`)
}

function parseYamlScalar(text, lineNo) {
  const s = text.trim()
  if (!s) return null
  if (s.startsWith('"') || s.startsWith("'")) {
    const q = readYamlQuote(s, 0, lineNo)
    if (q === null || s.slice(q.end).trim() !== '') {
      throw new Error(`第 ${lineNo} 行：引号内容后存在多余字符`)
    }
    return q.value
  }
  if (s === '[]') return []
  if (s === '{}') return {}
  if (/^(null|~|Null|NULL)$/.test(s)) return null
  if (/^(true|True|TRUE)$/.test(s)) return true
  if (/^(false|False|FALSE)$/.test(s)) return false
  if (/^[-+]?(?:\d+\.?\d*|\.\d+)(?:[eE][-+]?\d+)?$/.test(s)) return Number(s)
  return s
}

function splitYamlKeyValue(text, lineNo) {
  if (text.startsWith('"') || text.startsWith("'")) {
    const q = readYamlQuote(text, 0, lineNo)
    const rest = text.slice(q.end).trim()
    if (!rest.startsWith(':')) throw new Error(`第 ${lineNo} 行：键后缺少冒号`)
    return { key: q.value, value: rest.slice(1).trim() }
  }
  for (let i = 0; i < text.length; i++) {
    if (text[i] === ':' && (i === text.length - 1 || text[i + 1] === ' ')) {
      const key = text.slice(0, i).trim()
      if (!key) throw new Error(`第 ${lineNo} 行：冒号前缺少键名`)
      return { key, value: text.slice(i + 1).trim() }
    }
  }
  throw new Error(`第 ${lineNo} 行：无法解析「${text}」，缺少冒号`)
}



function parseYaml(text) {
  const raw = String(text).replace(/\r\n?/g, '\n').split('\n')
  const lines = []
  for (let i = 0; i < raw.length; i++) {
    if (/^\t/.test(raw[i])) throw new Error(`第 ${i + 1} 行：请使用空格缩进，不要使用 Tab`)
    const stripped = stripYamlComment(raw[i])
    if (!stripped.trim()) continue
    const indent = stripped.length - stripped.trimStart().length
    lines.push({ indent, text: stripped.trim(), no: i + 1 })
  }
  if (!lines.length) return null
  if (lines.length === 1) {
    const t = lines[0].text
    if (!(t === '-' || t.startsWith('- ') || isYamlKeyLine(t))) {
      return parseYamlScalar(t, lines[0].no)
    }
  }
  const result = parseYamlBlock(lines, 0, lines[0].indent)
  if (result.next < lines.length) {
    throw new Error(`第 ${lines[result.next].no} 行：缩进层级不正确`)
  }
  return result.value
}

function parseYamlBlock(lines, start, indent) {
  const t = lines[start].text
  if (t === '-' || t.startsWith('- ')) return parseYamlArray(lines, start, indent)
  return parseYamlObject(lines, start, indent)
}

function parseYamlObject(lines, start, indent) {
  const obj = {}
  let i = start
  while (i < lines.length) {
    const line = lines[i]
    if (line.indent < indent) break
    if (line.indent > indent) throw new Error(`第 ${line.no} 行：缩进过多`)
    if (line.text === '-' || line.text.startsWith('- ')) {
      throw new Error(`第 ${line.no} 行：对象中不应出现列表项`)
    }
    const kv = splitYamlKeyValue(line.text, line.no)
    if (kv.key === '__proto__') throw new Error(`第 ${line.no} 行：不允许使用 __proto__ 作为键`)
    if (kv.value === '') {
      i++
      if (
        i < lines.length &&
        (lines[i].indent > indent ||
          (lines[i].indent === indent && (lines[i].text === '-' || lines[i].text.startsWith('- '))))
      ) {
        const child = parseYamlBlock(lines, i, lines[i].indent)
        obj[kv.key] = child.value
        i = child.next
      } else {
        obj[kv.key] = null
      }
    } else {
      obj[kv.key] = parseYamlScalar(kv.value, line.no)
      i++
    }
  }
  return { value: obj, next: i }
}

function parseYamlArray(lines, start, indent) {
  const arr = []
  let i = start
  while (i < lines.length) {
    const line = lines[i]
    if (line.indent < indent) break
    if (line.indent > indent) throw new Error(`第 ${line.no} 行：缩进过多`)
    if (!(line.text === '-' || line.text.startsWith('- '))) break
    const rest = line.text === '-' ? '' : line.text.slice(2).trim()
    if (rest === '') {
      i++
      if (i < lines.length && lines[i].indent > indent) {
        const child = parseYamlBlock(lines, i, lines[i].indent)
        arr.push(child.value)
        i = child.next
      } else {
        arr.push(null)
      }
    } else if (rest === '-' || rest.startsWith('- ') || isYamlKeyLine(rest)) {
      const copy = lines.slice()
      copy[i] = { indent: indent + 2, text: rest, no: line.no }
      const child = parseYamlBlock(copy, i, indent + 2)
      arr.push(child.value)
      i = child.next
    } else {
      arr.push(parseYamlScalar(rest, line.no))
      i++
    }
  }
  return { value: arr, next: i }
}

function csvEscape(v) {
  if (v === null || v === undefined) return ''
  let s
  if (typeof v === 'string') s = v
  else if (typeof v === 'object') s = JSON.stringify(v)
  else s = String(v)
  if (/[",\n\r]/.test(s)) return '"' + s.replace(/"/g, '""') + '"'
  return s
}

function toCsv(data) {
  if (Array.isArray(data)) {
    if (!data.length) return ''
    if (data.every(item => isPlainObject(item))) {
      const headers = []
      for (const item of data) {
        for (const k of Object.keys(item)) {
          if (!headers.includes(k)) headers.push(k)
        }
      }
      if (!headers.length) return ''
      const rows = [headers.map(csvEscape).join(',')]
      for (const item of data) {
        rows.push(headers.map(h => csvEscape(item[h])).join(','))
      }
      return rows.join('\n')
    }
    const rows = ['value']
    for (const item of data) {
      if (isPlainObject(item) || Array.isArray(item)) rows.push(csvEscape(JSON.stringify(item)))
      else rows.push(csvEscape(item))
    }
    return rows.join('\n')
  }
  if (isPlainObject(data)) {
    const rows = ['key,value']
    for (const k of Object.keys(data)) {
      const v = data[k]
      rows.push(csvEscape(k) + ',' + csvEscape(isPlainObject(v) || Array.isArray(v) ? JSON.stringify(v) : v))
    }
    return rows.join('\n')
  }
  return 'value\n' + csvEscape(data)
}

function parseCsv(text) {
  const src = String(text).replace(/^\uFEFF/, '').replace(/\r\n?/g, '\n')
  const rows = []
  let row = []
  let field = ''
  let inQuotes = false
  let fieldStart = true
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (inQuotes) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += c
      }
    } else if (c === '"' && fieldStart) {
      inQuotes = true
      fieldStart = false
    } else if (c === ',') {
      row.push(field)
      field = ''
      fieldStart = true
    } else if (c === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
      fieldStart = true
    } else {
      field += c
      fieldStart = false
    }
  }
  if (field !== '' || row.length) {
    row.push(field)
    rows.push(row)
  }
  if (inQuotes) throw new Error('CSV 解析失败：存在未闭合的双引号')
  const records = rows.filter(r => !(r.length === 1 && r[0].trim() === ''))
  if (!records.length) return []
  const headers = records[0].map(h => h.trim())
  const body = records.slice(1)
  if (headers.length === 1 && headers[0] === 'value') {
    return body.map(r => r[0] || '')
  }
  return body.map(r => {
    const obj = {}
    for (let i = 0; i < headers.length; i++) {
      const key = headers[i] || `列${i + 1}`
      if (key === '__proto__') continue
      obj[key] = r[i] === undefined ? '' : r[i]
    }
    return obj
  })
}

function convert() {
  error.value = ''
  const text = input.value
  if (!text.trim()) {
    output.value = ''
    return
  }
  try {
    let data
    if (source.value === 'json') {
      try {
        data = JSON.parse(text)
      } catch (e) {
        throw new Error(`JSON 解析失败：${e.message}`)
      }
    } else if (source.value === 'yaml') {
      data = parseYaml(text)
    } else {
      data = parseCsv(text)
    }

    if (target.value === 'json') output.value = JSON.stringify(data, null, 2)
    else if (target.value === 'yaml') output.value = toYaml(data)
    else output.value = toCsv(data)
  } catch (e) {
    error.value = e && e.message ? e.message : '未知错误'
  }
}

function loadSample() {
  const sample = {
    name: '工具箱',
    version: 1.2,
    enabled: true,
    tags: ['JSON', 'YAML', 'CSV'],
    owner: { name: '小明', email: 'demo@example.com' },
    items: [
      { id: 1, title: '写文档', done: false, score: 8.5 },
      { id: 2, title: '带, 逗号的标题', done: true, score: null }
    ],
    note: '包含: 冒号与 # 井号的字符串'
  }
  if (source.value === 'json') input.value = JSON.stringify(sample, null, 2)
  else if (source.value === 'yaml') input.value = toYaml(sample)
  else input.value = toCsv(sample.items)
}

watch([input, source, target], convert, { immediate: true })
</script>
