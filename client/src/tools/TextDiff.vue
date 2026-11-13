<template>
  <div>
    <div class="panel">
      <div class="diff-inputs">
        <div class="field">
          <label>原文（左）</label>
          <textarea v-model="left" style="min-height: 150px"></textarea>
        </div>
        <div class="field">
          <label>新文本（右）</label>
          <textarea v-model="right" style="min-height: 150px"></textarea>
        </div>
      </div>
      <p v-if="tooLarge" class="err">文本过长（每侧最多 {{ LIMIT }} 行），请精简后再对比。</p>
    </div>
    <div v-if="ops.length" class="panel">
      <div class="panel-title">
        对比结果
        <span class="stat-inline">＋{{ adds }} 行</span>
        <span class="stat-inline del">−{{ dels }} 行</span>
        <span class="stat-inline same">＝{{ sames }} 行不变</span>
      </div>
      <div class="diff-view mono">
        <div
          v-for="(op, i) in ops"
          :key="i"
          class="diff-line"
          :class="op.t"
        >
          <span class="sign">{{ op.t === 'add' ? '+' : op.t === 'del' ? '−' : ' ' }}</span>
          <span class="content">{{ op.l || ' ' }}</span>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const left = ref('')
const right = ref('')
const LIMIT = 1500

function diffLines(a, b) {
  const n = a.length
  const m = b.length
  // LCS 动态规划
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1))
  for (let i = n - 1; i >= 0; i--) {
    for (let j = m - 1; j >= 0; j--) {
      dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1])
    }
  }
  const ops = []
  let i = 0
  let j = 0
  while (i < n && j < m) {
    if (a[i] === b[j]) {
      ops.push({ t: 'eq', l: a[i] })
      i++
      j++
    } else if (dp[i + 1][j] >= dp[i][j + 1]) {
      ops.push({ t: 'del', l: a[i] })
      i++
    } else {
      ops.push({ t: 'add', l: b[j] })
      j++
    }
  }
  while (i < n) ops.push({ t: 'del', l: a[i++] })
  while (j < m) ops.push({ t: 'add', l: b[j++] })
  return ops
}

const tooLarge = computed(
  () =>
    (left.value.split('\n').length > LIMIT || right.value.split('\n').length > LIMIT)
)

const ops = computed(() => {
  if (tooLarge.value) return []
  if (!left.value && !right.value) return []
  return diffLines(left.value.split('\n'), right.value.split('\n'))
})

const adds = computed(() => ops.value.filter(o => o.t === 'add').length)
const dels = computed(() => ops.value.filter(o => o.t === 'del').length)
const sames = computed(() => ops.value.filter(o => o.t === 'eq').length)
</script>

<style scoped>
.diff-inputs {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 12px;
}

@media (max-width: 700px) {
  .diff-inputs {
    grid-template-columns: 1fr;
  }
}

.mono {
  font-family: var(--mono);
}

.stat-inline {
  font-size: 12px;
  font-weight: 600;
  color: var(--accent);
  margin-left: 10px;
}

.stat-inline.del {
  color: var(--danger);
}

.stat-inline.same {
  color: var(--muted);
}

.diff-view {
  max-height: 420px;
  overflow: auto;
  border: 1px solid var(--border);
  border-radius: 8px;
  font-size: 13px;
}

.diff-line {
  display: flex;
  gap: 8px;
  padding: 1px 10px;
  white-space: pre-wrap;
  word-break: break-all;
}

.diff-line .sign {
  flex-shrink: 0;
  width: 12px;
  user-select: none;
}

.diff-line.add {
  background: var(--accent-soft);
  color: var(--accent);
}

.diff-line.del {
  background: #fde8e8;
  color: var(--danger);
  text-decoration: line-through;
  text-decoration-color: rgba(229, 72, 77, 0.4);
}

:root[data-theme='dark'] .diff-line.del {
  background: #4e1f20;
}
</style>
