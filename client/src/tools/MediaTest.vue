<template>
  <div>
    <div class="panel">
      <div class="panel-title">摄像头测试</div>
      <div class="row">
        <button v-if="!camOn" class="btn primary" @click="startCam">打开摄像头</button>
        <template v-else>
          <button class="btn" @click="snapshot">拍照</button>
          <button class="btn" @click="stopCam">关闭摄像头</button>
        </template>
        <select v-if="camDevs.length > 1" v-model="camId" @change="startCam" style="max-width: 260px">
          <option v-for="(d, i) in camDevs" :key="d.deviceId" :value="d.deviceId">摄像头 {{ i + 1 }}：{{ d.label }}</option>
        </select>
      </div>
      <div v-if="camError" class="err" style="margin-top: 8px">{{ camError }}</div>
      <video ref="videoEl" v-show="camOn" autoplay playsinline muted class="video"></video>
      <div v-if="shot" class="row" style="margin-top: 12px">
        <img :src="shot" class="shot" alt="拍照结果" />
        <a class="btn small" :href="shot" download="snapshot.png">下载照片</a>
      </div>
    </div>
    <div class="panel">
      <div class="panel-title">麦克风测试</div>
      <div class="row">
        <button v-if="!micOn" class="btn primary" @click="startMic">打开麦克风</button>
        <button v-else class="btn" @click="stopMic">关闭麦克风</button>
        <span v-if="micOn" class="hint" style="margin: 0">对着麦克风说话，观察音量条：</span>
      </div>
      <div v-if="micOn" class="meter"><div class="meter-bar" :style="{ width: level + '%' }"></div></div>
      <div v-if="micError" class="err" style="margin-top: 8px">{{ micError }}</div>
      <p class="hint">需要浏览器授权；生产模式下局域网 HTTP 环境浏览器会禁用摄像头/麦克风，请使用 localhost 访问。</p>
    </div>
  </div>
</template>

<script setup>
import { onBeforeUnmount, ref } from 'vue'

const videoEl = ref(null)
const camOn = ref(false)
const camError = ref('')
const camId = ref('')
const camDevs = ref([])
const shot = ref('')

const micOn = ref(false)
const micError = ref('')
const level = ref(0)

let camStream = null
let micStream = null
let audioCtx = null
let rafId = 0

async function refreshDevices() {
  try {
    const devs = await navigator.mediaDevices.enumerateDevices()
    camDevs.value = devs.filter(d => d.kind === 'videoinput')
  } catch {
    /* 忽略 */
  }
}

async function startCam() {
  camError.value = ''
  stopCam(true)
  try {
    camStream = await navigator.mediaDevices.getUserMedia({
      video: camId.value ? { deviceId: { exact: camId.value } } : true
    })
    videoEl.value.srcObject = camStream
    camOn.value = true
    refreshDevices()
  } catch (e) {
    camError.value = describeErr(e)
  }
}

function stopCam(keepError = false) {
  if (camStream) {
    camStream.getTracks().forEach(t => t.stop())
    camStream = null
  }
  camOn.value = false
  if (!keepError) camError.value = ''
}

function snapshot() {
  const video = videoEl.value
  if (!video || !video.videoWidth) return
  const canvas = document.createElement('canvas')
  canvas.width = video.videoWidth
  canvas.height = video.videoHeight
  canvas.getContext('2d').drawImage(video, 0, 0)
  shot.value = canvas.toDataURL('image/png')
}

async function startMic() {
  micError.value = ''
  try {
    micStream = await navigator.mediaDevices.getUserMedia({ audio: true })
    audioCtx = new (window.AudioContext || window.webkitAudioContext)()
    const source = audioCtx.createMediaStreamSource(micStream)
    const analyser = audioCtx.createAnalyser()
    analyser.fftSize = 256
    source.connect(analyser)
    const data = new Uint8Array(analyser.frequencyBinCount)
    micOn.value = true
    const tick = () => {
      analyser.getByteFrequencyData(data)
      let sum = 0
      for (const v of data) sum += v
      level.value = Math.min(100, Math.round((sum / data.length / 140) * 100))
      rafId = requestAnimationFrame(tick)
    }
    tick()
  } catch (e) {
    micError.value = describeErr(e)
  }
}

function stopMic() {
  if (micStream) {
    micStream.getTracks().forEach(t => t.stop())
    micStream = null
  }
  if (audioCtx) {
    audioCtx.close()
    audioCtx = null
  }
  cancelAnimationFrame(rafId)
  micOn.value = false
  level.value = 0
  micError.value = ''
}

function describeErr(e) {
  if (e && (e.name === 'NotAllowedError' || e.name === 'PermissionDeniedError')) {
    return '权限被拒绝：请在浏览器地址栏允许摄像头/麦克风访问后重试。'
  }
  if (e && e.name === 'NotFoundError') return '未找到可用设备。'
  return `启动失败：${e && e.message ? e.message : e}`
}

onBeforeUnmount(() => {
  stopCam(true)
  stopMic()
})
</script>

<style scoped>
.video {
  width: 100%;
  max-width: 480px;
  border-radius: 8px;
  border: 1px solid var(--border);
  margin-top: 12px;
  background: #000;
}

.shot {
  max-width: 320px;
  border-radius: 8px;
  border: 1px solid var(--border);
}

.meter {
  height: 14px;
  background: var(--panel2);
  border-radius: 999px;
  overflow: hidden;
  margin-top: 12px;
  max-width: 480px;
}

.meter-bar {
  height: 100%;
  background: var(--accent);
  transition: width 0.08s linear;
}

a.btn {
  text-decoration: none;
  display: inline-block;
}
</style>
