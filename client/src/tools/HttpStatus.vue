<template>
  <div>
    <div class="panel">
      <div class="panel-title">HTTP 状态码速查</div>
      <div class="stats-grid" style="margin-bottom: 14px">
        <div class="stat">
          <b>{{ codes.length }}</b>
          <span>收录总数</span>
        </div>
        <div class="stat">
          <b>{{ filtered.length }}</b>
          <span>当前筛选</span>
        </div>
      </div>
      <div class="field">
        <label>搜索</label>
        <input
          v-model="query"
          placeholder="按状态码或名称搜索，如 404、timeout、重定向"
        />
      </div>
      <div class="row">
        <button
          v-for="g in groups"
          :key="g.key"
          class="btn small"
          :class="{ primary: category === g.key }"
          @click="selectCategory(g.key)"
        >{{ g.label }}</button>
      </div>
    </div>

    <div class="panel">
      <div class="panel-title">状态码列表</div>
      <div
        v-for="c in filtered"
        :key="c.code"
        style="border-bottom: 1px dashed var(--border); padding: 10px 0"
      >
        <div class="row" style="cursor: pointer" @click="toggle(c.code)">
          <span class="pill">{{ c.code }}</span>
          <b class="mono" style="font-size: 14px">{{ c.phrase }}</b>
          <span style="color: var(--muted); font-size: 14px">{{ c.zh }}</span>
          <span style="margin-left: auto; color: var(--muted); font-size: 12.5px">
            {{ expanded === c.code ? '收起' : '详情' }}
          </span>
        </div>
        <div
          v-if="expanded === c.code"
          style="margin-top: 8px; padding: 10px 12px; background: var(--panel2); border-radius: 9px; font-size: 14px; line-height: 1.65"
        >
          <b>常见原因：</b>{{ c.reason }}
        </div>
      </div>
      <p v-if="!filtered.length" class="hint">没有匹配的状态码。</p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const codes = [
  { code: 100, phrase: 'Continue', zh: '继续', reason: '服务器已收到请求头，客户端可以继续发送请求体。' },
  { code: 101, phrase: 'Switching Protocols', zh: '切换协议', reason: '客户端请求升级协议（如 WebSocket），服务器同意切换。' },
  { code: 103, phrase: 'Early Hints', zh: '早期提示', reason: '服务器在最终响应前返回资源预加载提示，用于加速页面加载。' },
  { code: 200, phrase: 'OK', zh: '成功', reason: '请求已成功处理，响应体包含正常结果。' },
  { code: 201, phrase: 'Created', zh: '已创建', reason: '请求成功并创建了新资源，通常会在 Location 头返回新资源地址。' },
  { code: 202, phrase: 'Accepted', zh: '已接受', reason: '请求已受理但尚未处理完成，适合异步任务场景。' },
  { code: 203, phrase: 'Non-Authoritative Information', zh: '非权威信息', reason: '响应来自缓存或代理，元信息可能与源站不完全一致。' },
  { code: 204, phrase: 'No Content', zh: '无内容', reason: '请求成功但响应体为空，常用于 DELETE 或 PUT 操作。' },
  { code: 205, phrase: 'Reset Content', zh: '重置内容', reason: '请求成功，客户端应重置表单或视图状态。' },
  { code: 206, phrase: 'Partial Content', zh: '部分内容', reason: '服务器返回了 Range 范围请求中的一部分数据，用于断点续传。' },
  { code: 301, phrase: 'Moved Permanently', zh: '永久重定向', reason: '资源已永久迁移到新地址，客户端应更新书签并缓存跳转结果。' },
  { code: 302, phrase: 'Found', zh: '临时重定向', reason: '资源临时位于另一地址，后续请求仍应使用原 URL。' },
  { code: 303, phrase: 'See Other', zh: '查看其他位置', reason: '应使用 GET 访问 Location 指定的结果地址，常用于 POST 后跳转。' },
  { code: 304, phrase: 'Not Modified', zh: '未修改', reason: '带条件请求命中缓存，服务器未返回实体内容，客户端可继续使用缓存。' },
  { code: 305, phrase: 'Use Proxy', zh: '使用代理', reason: '必须通过 Location 指定的代理访问资源，该状态码已被弃用。' },
  { code: 307, phrase: 'Temporary Redirect', zh: '临时重定向', reason: '与 302 类似，但要求客户端保持原请求方法不变。' },
  { code: 308, phrase: 'Permanent Redirect', zh: '永久重定向', reason: '与 301 类似，但要求客户端保持原请求方法不变。' },
  { code: 400, phrase: 'Bad Request', zh: '请求错误', reason: '请求语法、参数或报文格式不合法，服务器无法解析。' },
  { code: 401, phrase: 'Unauthorized', zh: '未授权', reason: '缺少或提供了无效的身份凭证，需要先完成认证。' },
  { code: 402, phrase: 'Payment Required', zh: '需要付费', reason: '预留状态码，常用于付费服务或配额限制场景。' },
  { code: 403, phrase: 'Forbidden', zh: '禁止访问', reason: '服务器理解请求但拒绝执行，当前身份没有访问权限。' },
  { code: 404, phrase: 'Not Found', zh: '未找到', reason: '请求的资源不存在，或请求路径拼写有误。' },
  { code: 405, phrase: 'Method Not Allowed', zh: '方法不允许', reason: '资源不支持该 HTTP 方法，响应通常包含 Allow 头列出可用方法。' },
  { code: 406, phrase: 'Not Acceptable', zh: '不可接受', reason: '服务器无法按 Accept 头指定的格式返回内容。' },
  { code: 407, phrase: 'Proxy Authentication Required', zh: '需要代理认证', reason: '需要先通过 Proxy-Authenticate 指定的代理完成身份认证。' },
  { code: 408, phrase: 'Request Timeout', zh: '请求超时', reason: '客户端在服务器等待时间内未完成请求发送。' },
  { code: 409, phrase: 'Conflict', zh: '冲突', reason: '请求与资源当前状态冲突，例如并发写入或版本号不一致。' },
  { code: 410, phrase: 'Gone', zh: '已删除', reason: '资源已被永久移除，且服务器不再提供该资源。' },
  { code: 411, phrase: 'Length Required', zh: '需要长度', reason: '服务器要求请求必须携带 Content-Length 头。' },
  { code: 412, phrase: 'Precondition Failed', zh: '前置条件失败', reason: 'If-Match、If-Unmodified-Since 等条件头不满足。' },
  { code: 413, phrase: 'Payload Too Large', zh: '负载过大', reason: '请求体超过服务器允许的大小上限。' },
  { code: 414, phrase: 'URI Too Long', zh: 'URI 过长', reason: '请求的 URL 长度超过服务器可处理的范围。' },
  { code: 415, phrase: 'Unsupported Media Type', zh: '不支持的媒体类型', reason: '请求体的 Content-Type 不被服务端支持。' },
  { code: 416, phrase: 'Range Not Satisfiable', zh: '范围不可满足', reason: 'Range 请求头指定的字节范围无效或超出文件大小。' },
  { code: 418, phrase: "I'm a teapot", zh: '我是茶壶', reason: '愚人节彩蛋状态码，表示服务器拒绝煮咖啡。' },
  { code: 421, phrase: 'Misdirected Request', zh: '请求指向错误', reason: '请求被发送到无法生成响应的服务器，常见于 SNI 或连接复用不匹配。' },
  { code: 422, phrase: 'Unprocessable Entity', zh: '无法处理的实体', reason: '语法正确但语义校验失败，常见于表单字段校验不通过。' },
  { code: 424, phrase: 'Failed Dependency', zh: '依赖失败', reason: '因前置请求失败导致当前操作无法执行，常见于 WebDAV 批量操作。' },
  { code: 425, phrase: 'Too Early', zh: '过早', reason: '服务器拒绝处理可能被重放的过早请求，用于防重放攻击。' },
  { code: 426, phrase: 'Upgrade Required', zh: '需要升级', reason: '客户端需要升级到协议的新版本，如 TLS 或 HTTP/2。' },
  { code: 428, phrase: 'Precondition Required', zh: '需要前置条件', reason: '服务器要求请求携带条件头，以避免并发更新造成数据丢失。' },
  { code: 429, phrase: 'Too Many Requests', zh: '请求过多', reason: '触发限流，需要降低请求频率，并参考 Retry-After 头重试。' },
  { code: 431, phrase: 'Request Header Fields Too Large', zh: '请求头过大', reason: '请求头总大小超过服务器限制，常见于过大的 Cookie。' },
  { code: 451, phrase: 'Unavailable For Legal Reasons', zh: '因法律原因不可用', reason: '资源因法律或政策要求被限制访问。' },
  { code: 500, phrase: 'Internal Server Error', zh: '内部服务器错误', reason: '服务器遇到未预期错误，无法完成请求，需查看服务端日志。' },
  { code: 501, phrase: 'Not Implemented', zh: '未实现', reason: '服务器不支持该请求方法或所需功能。' },
  { code: 502, phrase: 'Bad Gateway', zh: '网关错误', reason: '作为网关或代理的服务器从上游收到无效响应。' },
  { code: 503, phrase: 'Service Unavailable', zh: '服务不可用', reason: '服务器暂时过载或处于维护状态，请稍后重试。' },
  { code: 504, phrase: 'Gateway Timeout', zh: '网关超时', reason: '网关或代理等待上游服务器响应超时。' },
  { code: 505, phrase: 'HTTP Version Not Supported', zh: 'HTTP 版本不支持', reason: '服务器不支持请求所使用的 HTTP 协议版本。' },
  { code: 506, phrase: 'Variant Also Negotiates', zh: '变体协商失败', reason: '内容协商配置错误，导致变体选择出现循环引用。' },
  { code: 507, phrase: 'Insufficient Storage', zh: '存储不足', reason: '服务器无法完成请求所需的存储空间，常见于 WebDAV。' },
  { code: 508, phrase: 'Loop Detected', zh: '检测到循环', reason: '处理请求时检测到无限循环，常见于 WebDAV 目录遍历。' },
  { code: 510, phrase: 'Not Extended', zh: '未扩展', reason: '需要对请求进行更多扩展才能被服务器满足。' },
  { code: 511, phrase: 'Network Authentication Required', zh: '需要网络认证', reason: '需要先在网络层完成认证，例如公共 Wi-Fi 的登录页。' }
]

const groups = [
  { key: 'all', label: '全部' },
  { key: 1, label: '1xx 信息' },
  { key: 2, label: '2xx 成功' },
  { key: 3, label: '3xx 重定向' },
  { key: 4, label: '4xx 客户端错误' },
  { key: 5, label: '5xx 服务端错误' }
]

const query = ref('')
const category = ref('all')
const expanded = ref(0)

function selectCategory(key) {
  category.value = key
}

function toggle(code) {
  expanded.value = expanded.value === code ? 0 : code
}

const filtered = computed(() => {
  const q = query.value.trim().toLowerCase()
  return codes.filter(c => {
    if (category.value !== 'all' && Math.floor(c.code / 100) !== category.value) return false
    if (!q) return true
    return (
      String(c.code).includes(q) ||
      c.phrase.toLowerCase().includes(q) ||
      c.zh.includes(q)
    )
  })
})
</script>
