<template>
  <div>
    <div class="panel">
      <div class="row">
        <div class="field inline">
          <label>数量</label>
          <input v-model.number="count" type="number" min="1" max="200" style="width: 80px" />
        </div>
        <label class="check"><input v-model="incName" type="checkbox" />姓名</label>
        <label class="check"><input v-model="incPhone" type="checkbox" />手机号</label>
        <label class="check"><input v-model="incId" type="checkbox" />身份证号</label>
        <button class="btn primary" @click="generate">生成</button>
        <button class="btn" :disabled="!rows.length" @click="downloadCsv">下载 CSV</button>
      </div>
      <p class="hint">数据为随机虚构生成，仅用于开发测试填充，不对应任何真实个人信息。</p>
    </div>
    <div class="panel">
      <div class="panel-title">结果（{{ rows.length }} 条）</div>
      <textarea :value="rowsText" class="mono" readonly style="min-height: 200px"></textarea>
      <div class="row" style="margin-top: 10px">
        <CopyButton :text="rowsText" label="复制全部" />
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue'
import CopyButton from '../components/CopyButton.vue'

const count = ref(10)
const incName = ref(true)
const incPhone = ref(true)
const incId = ref(true)
const rows = ref([])

const SURNAMES = '王李张刘陈杨黄赵吴周徐孙马朱胡郭何林罗高郑梁谢宋唐许韩冯邓曹彭曾肖田董潘袁蒋蔡余杜叶程苏魏吕丁任沈姚卢姜崔钟谭陆汪范金石廖贾夏韦付方白邹孟熊秦邱江尹薛闫段雷侯龙史陶黎贺顾毛郝龚邵万钱严覃武戴莫孔向汤'.split('')

const GIVEN = '伟芳娜敏静丽强磊军洋勇艳杰娟涛明超霞平刚华文博思远志晓春燕惠东俊欣怡子涵浩然宇轩雨桐琪梦瑶泽岚晨悦彤嘉诗慧巧美玉凤洁梅琳素云莲雪荣爱香月媛瑞凡佳琼勤珍贞莉桂娣叶璐娅琦晶妍茜秋珊莎锦青倩婷婉娴瑾颖露怡雁蓓仪荷丹蓉君琴蕊薇菁苑馨韵园艺卿聪澜纯毓昭冰爽琬茗羽希宁欣飘滢筠柔竹凝欢霄枫芸菲寒伊亚宜可舒影荔枝丽'.split('')

const PHONE_PREFIX = [
  '130', '131', '132', '133', '134', '135', '136', '137', '138', '139',
  '150', '151', '152', '153', '155', '156', '157', '158', '159', '166',
  '170', '176', '177', '178', '180', '181', '182', '183', '184', '185',
  '186', '187', '188', '189', '191', '193', '198', '199'
]

const AREAS = [
  '110101', '110105', '120101', '130102', '140105', '150102',
  '210102', '220102', '230102', '310101', '310104', '320102',
  '330102', '340102', '350102', '360103', '370102', '410102',
  '420102', '430102', '440103', '440304', '450102', '460100',
  '500103', '510104', '520102', '530102', '610102', '620102'
]

const WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
const CHECK_CODES = '10X98765432'

function rand(n) {
  const a = new Uint32Array(1)
  crypto.getRandomValues(a)
  return a[0] % n
}

function pick(arr) {
  return arr[rand(arr.length)]
}

function fakeName() {
  let given = pick(GIVEN)
  if (rand(10) < 6) given += pick(GIVEN)
  return pick(SURNAMES) + given
}

function fakePhone() {
  let tail = ''
  for (let i = 0; i < 8; i++) tail += rand(10)
  return pick(PHONE_PREFIX) + tail
}

function fakeId() {
  const year = 1960 + rand(46)
  const month = String(1 + rand(12)).padStart(2, '0')
  const day = String(1 + rand(28)).padStart(2, '0')
  const seq = String(1 + rand(998)).padStart(3, '0')
  const base = pick(AREAS) + year + month + day + seq
  let sum = 0
  for (let i = 0; i < 17; i++) sum += Number(base[i]) * WEIGHTS[i]
  return base + CHECK_CODES[sum % 11]
}

function generate() {
  const n = Math.max(1, Math.min(200, parseInt(count.value) || 10))
  count.value = n
  rows.value = Array.from({ length: n }, () => ({
    name: fakeName(),
    phone: fakePhone(),
    id: fakeId()
  }))
}

const rowsText = computed(() =>
  rows.value
    .map(r => [incName.value ? r.name : null, incPhone.value ? r.phone : null, incId.value ? r.id : null].filter(Boolean).join(','))
    .join('\n')
)

function downloadCsv() {
  const header = [incName.value && '姓名', incPhone.value && '手机号', incId.value && '身份证号'].filter(Boolean).join(',')
  const blob = new Blob(['\ufeff' + header + '\n' + rowsText.value], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = 'fake-data.csv'
  a.click()
  URL.revokeObjectURL(a.href)
}

onMounted(generate)
</script>

<style scoped>
.check {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  font-size: 14px;
  cursor: pointer;
}

.check input {
  width: auto;
}

.mono {
  font-family: var(--mono);
  font-size: 13px;
}
</style>
