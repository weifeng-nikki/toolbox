<template>
  <div>
    <div class="panel">
      <div class="field">
        <label>朗读文本</label>
        <textarea v-model="text" placeholder="输入要朗读的文字…"></textarea>
      </div>
      <div class="row">
        <div class="field" style="min-width: 220px">
          <label>音色</label>
          <select v-model="voiceName">
            <option value="">系统默认</option>
            <option v-for="v in voices" :key="v.name" :value="v.name">{{ v.label }}</option>
          </select>
        </div>
        <div class="field">
          <label>语速 {{ rate.toFixed(1) }}x</label>
          <input v-model.number="rate" type="range" min="0.5" max="2" step="0.1" style="width: 130px" />
        </div>
        <div class="field">
          <label>音调 {{ pitch.toFixed(1) }}</label>
          <input v-model.number="pitch" type="range" min="0.5" max="2" step="0.1" style="width: 130px" />
        </div>
      </div>
      <div class="row">
        <button class="btn primary" :disabled="!text.trim()" @click="speak">朗读</button>
        <button class="btn" :disabled="!speaking || paused" @click="pause">暂停</button>
        <button class="btn" :disabled="!speaking || !paused" @click="resume">继续</button>
        <button class="btn" :disabled="!speaking" @click="stop">停止</button>
      </div>
      <p class="hint">使用浏览器内置 Web Speech API，离线可用；可选音色取决于系统安装的语音包。</p>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue'

const text = ref('')
const voices = ref([])
const voiceName = ref('')
const rate = ref(1)
const pitch = ref(1)
const speaking = ref(false)
const paused = ref(false)

function refreshVoices() {
  const list = speechSynthesis.getVoices().map(v => ({
    name: v.name,
    label: `${v.name}（${v.lang}）`,
    zh: v.lang.toLowerCase().startsWith('zh')
  }))
  list.sort((a, b) => Number(b.zh) - Number(a.zh))
  voices.value = list
}

onMounted(() => {
  refreshVoices()
  speechSynthesis.onvoiceschanged = refreshVoices
})

onBeforeUnmount(() => {
  speechSynthesis.cancel()
  speechSynthesis.onvoiceschanged = null
})

function speak() {
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text.value)
  const v = voices.value.find(x => x.name === voiceName.value)
  if (v) {
    const raw = speechSynthesis.getVoices().find(x => x.name === v.name)
    if (raw) u.voice = raw
  }
  u.rate = rate.value
  u.pitch = pitch.value
  u.onend = () => {
    speaking.value = false
    paused.value = false
  }
  u.onerror = () => {
    speaking.value = false
    paused.value = false
  }
  speaking.value = true
  paused.value = false
  speechSynthesis.speak(u)
}

function pause() {
  speechSynthesis.pause()
  paused.value = true
}

function resume() {
  speechSynthesis.resume()
  paused.value = false
}

function stop() {
  speechSynthesis.cancel()
  speaking.value = false
  paused.value = false
}
</script>
