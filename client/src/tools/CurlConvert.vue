<template>
  <div>
    <div class="panel">
      <div class="panel-title">cURL 命令</div>
      <div class="field">
        <label>粘贴 curl 命令</label>
        <textarea
          v-model="command"
          class="mono"
          placeholder="在此粘贴 curl 命令，支持 -X、-H、-d、-u、-A、-b、--compressed 等参数"
        ></textarea>
      </div>
      <div class="row">
        <button class="btn" @click="fillSample">填入示例</button>
        <button class="btn" @click="command = ''">清空</button>
        <CopyButton :text="command" label="复制命令" />
      </div>
      <p v-if="errorText" class="err">{{ errorText }}</p>
      <div v-else-if="showResult" style="margin-top: 14px">
        <div class="kv"><span>请求方法</span><b>{{ data.method }}</b></div>
        <div class="kv"><span>URL</span><b>{{ data.url }}</b></div>
        <div class="kv"><span>请求头</span><b>{{ data.headers.length }} 个</b></div>
        <div v-if="data.body" class="kv"><span>请求体</span><b>{{ data.body.length }} 字符</b></div>
      </div>
      <p v-if="showResult" class="hint">
        提示：以 @ 开头的请求体（如 -d @file.json）不会读取本地文件，会按原始文本输出。
      </p>
    </div>

    <div v-if="showResult" class="panel">
      <div class="panel-title">生成的代码</div>
      <div class="row" style="margin-bottom: 12px">
        <button
          class="btn small"
          :class="{ primary: tab === 'fetch' }"
          @click="tab = 'fetch'"
        >Fetch (JavaScript)</button>
        <button
          class="btn small"
          :class="{ primary: tab === 'axios' }"
          @click="tab = 'axios'"
        >Axios (JavaScript)</button>
        <button
          class="btn small"
          :class="{ primary: tab === 'python' }"
          @click="tab = 'python'"
        >Python requests</button>
      </div>
      <div class="field">
        <textarea
          class="mono"
          readonly
          :value="activeCode"
          style="min-height: 260px"
        ></textarea>
      </div>
      <div class="row">
        <CopyButton :text="activeCode" label="复制代码" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'
import CopyButton from '../components/CopyButton.vue'

const command = ref('')
const tab = ref('fetch')

const VALUE_OPTS = {
  '-X': 'method',
  '--request': 'method',
  '-H': 'header',
  '--header': 'header',
  '-d': 'data',
  '--data': 'data',
  '--data-raw': 'data',
  '--data-binary': 'data',
  '--data-ascii': 'data',
  '-u': 'user',
  '--user': 'user',
  '-A': 'userAgent',
  '--user-agent': 'userAgent',
  '-b': 'cookie',
  '--cookie': 'cookie',
  '-e': 'referer',
  '--referer': 'referer',
  '--url': 'url'
}

function tokenize(input) {
  const text = input.replace(/\\\r?\n/g, ' ')
  const tokens = []
  let cur = ''
  let quote = ''
  let hasContent = false
  let i = 0
  while (i < text.length) {
    const ch = text[i]
    if (quote) {
      if (ch === quote) {
        quote = ''
        i++
        continue
      }
      if (ch === '\\' && quote === '"' && i + 1 < text.length) {
        const next = text[i + 1]
        if (next === '"' || next === '\\') {
          cur += next
          i += 2
          continue
        }
      }
      cur += ch
      i++
      continue
    }
    if (ch === "'" || ch === '"') {
      quote = ch
      hasContent = true
      i++
      continue
    }
    if (ch === '\\' && i + 1 < text.length) {
      cur += text[i + 1]
      hasContent = true
      i += 2
      continue
    }
    if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
      if (hasContent || cur) {
        tokens.push(cur)
        cur = ''
        hasContent = false
      }
      i++
      continue
    }
    cur += ch
    hasContent = true
    i++
  }
  if (quote) throw new Error('引号未闭合，请检查命令是否完整')
  if (hasContent || cur) tokens.push(cur)
  return tokens
}

function toBase64(s) {
  const bytes = new TextEncoder().encode(s)
  let bin = ''
  for (const byte of bytes) bin += String.fromCharCode(byte)
  return btoa(bin)
}

function parseCurl(input) {
  const tokens = tokenize(input)
  if (!tokens.length) throw new Error('命令为空')
  const name = tokens[0].split(/[\\/]/).pop()
  if (name !== 'curl') throw new Error('未识别到 curl 命令')

  const headers = []
  const cookies = []
  let method = ''
  let url = ''
  let body = ''
  let user = ''
  let compressed = false

  let i = 1
  while (i < tokens.length) {
    const token = tokens[i]
    if (token === '--compressed') {
      compressed = true
      i++
      continue
    }
    let opt = token
    let inline = null
    const eq = token.indexOf('=')
    if (token.startsWith('--') && eq > 2) {
      opt = token.slice(0, eq)
      inline = token.slice(eq + 1)
    } else if (/^-[A-Za-z]./.test(token)) {
      opt = token.slice(0, 2)
      inline = token.slice(2)
    }
    const kind = VALUE_OPTS[opt]
    if (!kind) {
      if (!token.startsWith('-') && !url) url = token
      i++
      continue
    }
    let value = inline
    if (value === null) {
      if (i + 1 >= tokens.length) throw new Error(`参数 ${opt} 缺少取值`)
      value = tokens[i + 1]
      i++
    }
    i++
    if (kind === 'method') method = value.toUpperCase()
    else if (kind === 'header') headers.push(value)
    else if (kind === 'data') body = body ? `${body}&${value}` : value
    else if (kind === 'user') user = value
    else if (kind === 'userAgent') headers.push(`User-Agent: ${value}`)
    else if (kind === 'cookie') cookies.push(value)
    else if (kind === 'referer') headers.push(`Referer: ${value}`)
    else if (kind === 'url') url = value
  }

  if (user && !headers.some(h => /^authorization\s*:/i.test(h))) {
    headers.push(`Authorization: Basic ${toBase64(user)}`)
  }
  if (cookies.length && !headers.some(h => /^cookie\s*:/i.test(h))) {
    headers.push(`Cookie: ${cookies.join('; ')}`)
  }
  if (compressed && !headers.some(h => /^accept-encoding\s*:/i.test(h))) {
    headers.push('Accept-Encoding: gzip, deflate, br')
  }

  return {
    method: method || (body ? 'POST' : 'GET'),
    url,
    headers,
    body
  }
}

const parsedResult = computed(() => {
  const raw = command.value.trim()
  if (!raw) return { data: null, error: '' }
  try {
    return { data: parseCurl(raw), error: '' }
  } catch (e) {
    return { data: null, error: e instanceof Error ? e.message : '解析失败' }
  }
})

const data = computed(() => parsedResult.value.data)

const errorText = computed(() => {
  const r = parsedResult.value
  if (r.error) return r.error
  if (r.data && !r.data.url) return '未在命令中找到 URL'
  return ''
})

const showResult = computed(() => !errorText.value && !!data.value && !!data.value.url)

function fillSample() {
  command.value = `curl 'https://api.example.com/v1/users' \\
  -X POST \\
  -H 'Content-Type: application/json' \\
  -H 'Accept: application/json' \\
  -d '{"name":"张三","age":28}'`
}

function headerList(d) {
  return d.headers
    .map(raw => {
      const idx = raw.indexOf(':')
      return idx === -1
        ? { name: raw.trim(), value: '' }
        : { name: raw.slice(0, idx).trim(), value: raw.slice(idx + 1).trim() }
    })
    .filter(h => h.name)
}

function jsStr(s) {
  return (
    "'" +
    String(s)
      .replace(/\\/g, '\\\\')
      .replace(/'/g, "\\'")
      .replace(/\n/g, '\\n')
      .replace(/\r/g, '\\r') +
    "'"
  )
}

function pyStr(s) {
  return JSON.stringify(String(s))
}

function tryJson(text) {
  if (!text) return null
  try {
    return JSON.parse(text)
  } catch {
    return null
  }
}

function indentBlock(text, prefix) {
  return text
    .split('\n')
    .map((line, i) => (i === 0 ? line : prefix + line))
    .join('\n')
}

function toPython(value, indent) {
  const pad = '    '.repeat(indent)
  const innerPad = '    '.repeat(indent + 1)
  if (value === null) return 'None'
  if (typeof value === 'string') return JSON.stringify(value)
  if (typeof value === 'boolean') return value ? 'True' : 'False'
  if (typeof value === 'number') return String(value)
  if (Array.isArray(value)) {
    if (!value.length) return '[]'
    return '[\n' + value.map(v => innerPad + toPython(v, indent + 1)).join(',\n') + '\n' + pad + ']'
  }
  const keys = Object.keys(value)
  if (!keys.length) return '{}'
  return (
    '{\n' +
    keys
      .map(k => innerPad + JSON.stringify(k) + ': ' + toPython(value[k], indent + 1))
      .join(',\n') +
    '\n' +
    pad +
    '}'
  )
}

const fetchCode = computed(() => {
  const d = data.value
  if (!d || !d.url) return ''
  const headers = headerList(d)
  const lines = [`fetch(${jsStr(d.url)}, {`]
  lines.push(`  method: ${jsStr(d.method)},`)
  if (headers.length) {
    lines.push('  headers: {')
    for (const h of headers) lines.push(`    ${jsStr(h.name)}: ${jsStr(h.value)},`)
    lines.push('  },')
  }
  const json = tryJson(d.body)
  if (json !== null && typeof json === 'object') {
    lines.push(`  body: JSON.stringify(${indentBlock(JSON.stringify(json, null, 2), '  ')}),`)
  } else if (d.body) {
    lines.push(`  body: ${jsStr(d.body)},`)
  }
  lines.push('})')
  lines.push('  .then(r => r.json())')
  lines.push('  .then(data => console.log(data))')
  lines.push('  .catch(err => console.error(err))')
  return lines.join('\n')
})

const axiosCode = computed(() => {
  const d = data.value
  if (!d || !d.url) return ''
  const headers = headerList(d)
  const lines = ["import axios from 'axios'", '', 'const res = await axios({']
  lines.push(`  method: ${jsStr(d.method.toLowerCase())},`)
  lines.push(`  url: ${jsStr(d.url)},`)
  if (headers.length) {
    lines.push('  headers: {')
    for (const h of headers) lines.push(`    ${jsStr(h.name)}: ${jsStr(h.value)},`)
    lines.push('  },')
  }
  const json = tryJson(d.body)
  if (json !== null && typeof json === 'object') {
    lines.push(`  data: ${indentBlock(JSON.stringify(json, null, 2), '  ')},`)
  } else if (d.body) {
    lines.push(`  data: ${jsStr(d.body)},`)
  }
  lines.push('})')
  lines.push('console.log(res.data)')
  return lines.join('\n')
})

const HTTP_METHODS = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']

const pyCode = computed(() => {
  const d = data.value
  if (!d || !d.url) return ''
  const headers = headerList(d)
  const lines = ['import requests', '']
  lines.push(`url = ${pyStr(d.url)}`)
  if (headers.length) {
    lines.push('headers = {')
    for (const h of headers) lines.push(`    ${pyStr(h.name)}: ${pyStr(h.value)},`)
    lines.push('}')
  }
  const json = tryJson(d.body)
  const isJson = json !== null && typeof json === 'object'
  if (isJson) lines.push(`payload = ${toPython(json, 0)}`)
  else if (d.body) lines.push(`data = ${pyStr(d.body)}`)
  lines.push('')
  const args = ['url']
  if (headers.length) args.push('headers=headers')
  if (isJson) args.push('json=payload')
  else if (d.body) args.push('data=data')
  args.push('timeout=30')
  const m = d.method.toLowerCase()
  const call = HTTP_METHODS.includes(m)
    ? `requests.${m}(${args.join(', ')})`
    : `requests.request(${pyStr(d.method)}, ${args.join(', ')})`
  lines.push(`resp = ${call}`)
  lines.push('print(resp.status_code)')
  lines.push('print(resp.text)')
  return lines.join('\n')
})

const activeCode = computed(() => {
  if (!showResult.value) return ''
  if (tab.value === 'axios') return axiosCode.value
  if (tab.value === 'python') return pyCode.value
  return fetchCode.value
})
</script>
