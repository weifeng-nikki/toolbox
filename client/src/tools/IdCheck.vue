<template>
  <div>
    <div class="panel">
      <div class="panel-title">身份证号校验（18 位）</div>
      <div class="field">
        <label>身份证号</label>
        <input
          :value="idInput"
          class="mono"
          maxlength="30"
          placeholder="输入 18 位身份证号，空格与连字符会自动去除"
          @input="onIdInput"
        />
      </div>
      <p v-if="idResult && idResult.ok" class="ok">校验通过：该身份证号合法</p>
      <p v-else-if="idResult" class="err">{{ idResult.msg }}</p>
      <template v-if="idResult && idResult.ok">
        <div class="kv"><span>出生日期</span><b>{{ idResult.birthday }}</b></div>
        <div class="kv"><span>性别</span><b>{{ idResult.gender }}</b></div>
        <div class="kv"><span>年龄</span><b>{{ idResult.age }} 岁</b></div>
        <div class="kv"><span>地区码（前 6 位）</span><b>{{ idResult.region }}</b></div>
      </template>
      <p class="hint">按 GB 11643 加权因子与校验码映射校验，并检查出生日期是否真实存在。</p>
    </div>

    <div class="panel">
      <div class="panel-title">银行卡号校验（Luhn）</div>
      <div class="field">
        <label>银行卡号</label>
        <input
          :value="bankInput"
          class="mono"
          maxlength="30"
          placeholder="输入银行卡号，空格与连字符会自动去除"
          @input="onBankInput"
        />
      </div>
      <p v-if="bankResult && bankResult.ok" class="ok">校验通过：Luhn 算法验证成功</p>
      <p v-else-if="bankResult" class="err">{{ bankResult.msg }}</p>
      <template v-if="bankResult">
        <div class="kv"><span>卡组织</span><b>{{ bankResult.brand }}</b></div>
        <div class="kv"><span>卡号长度</span><b>{{ bankResult.length }} 位</b></div>
        <div class="kv"><span>Luhn 校验</span><b>{{ bankResult.luhn ? '通过' : '未通过' }}</b></div>
      </template>
      <p class="hint">卡组织按前缀粗判：4=Visa、51-55/2221-2720=MasterCard、62=银联、34/37=Amex、35=JCB、6011/65=Discover。</p>
    </div>

    <div class="panel">
      <div class="panel-title">手机号校验</div>
      <div class="field">
        <label>中国大陆手机号</label>
        <input
          :value="phoneInput"
          class="mono"
          maxlength="24"
          placeholder="输入 11 位手机号，空格与连字符会自动去除"
          @input="onPhoneInput"
        />
      </div>
      <p v-if="phoneResult && phoneResult.ok" class="ok">校验通过：号码格式合法</p>
      <p v-else-if="phoneResult" class="err">{{ phoneResult.msg }}</p>
      <template v-if="phoneResult && phoneResult.ok">
        <div class="kv"><span>号段</span><b>{{ phoneResult.prefix }}</b></div>
        <div class="kv"><span>运营商（粗判）</span><b>{{ phoneResult.carrier }}</b></div>
      </template>
      <p class="hint">支持常见及 2024 年前后新号段；运营商按号段粗判，携号转网后可能不准确。</p>
    </div>
  </div>
</template>

<script setup>
import { computed, ref } from 'vue'

const idInput = ref('')
const bankInput = ref('')
const phoneInput = ref('')

const ID_WEIGHTS = [7, 9, 10, 5, 8, 4, 2, 1, 6, 3, 7, 9, 10, 5, 8, 4, 2]
const ID_CODES = ['1', '0', 'X', '9', '8', '7', '6', '5', '4', '3', '2']

function stripSeparators(raw) {
  return String(raw || '').replace(/[\s\-－—–]/g, '')
}

function onIdInput(e) {
  idInput.value = stripSeparators(e.target.value).toUpperCase()
}

function onBankInput(e) {
  bankInput.value = stripSeparators(e.target.value)
}

function onPhoneInput(e) {
  let s = stripSeparators(e.target.value)
  if (/^\+?86\d{11}$/.test(s)) s = s.replace(/^\+?86/, '')
  phoneInput.value = s
}

function validateId(raw) {
  const s = String(raw || '').trim().toUpperCase()
  if (!s) return null
  if (s.length !== 18) return { ok: false, msg: `长度应为 18 位，当前 ${s.length} 位` }
  if (!/^\d{17}[\dX]$/.test(s)) {
    return { ok: false, msg: '格式错误：前 17 位必须是数字，最后一位为数字或 X' }
  }

  const year = Number(s.slice(6, 10))
  const month = Number(s.slice(10, 12))
  const day = Number(s.slice(12, 14))
  const now = new Date()
  if (year < 1900 || year > now.getFullYear()) {
    return { ok: false, msg: `出生日期非法：年份 ${year} 超出合理范围` }
  }
  if (month < 1 || month > 12) {
    return { ok: false, msg: '出生日期非法：月份不正确' }
  }
  const date = new Date(year, month - 1, day)
  if (day < 1 || date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    return { ok: false, msg: '出生日期非法：该日期不存在' }
  }
  if (date > now) return { ok: false, msg: '出生日期非法：不能晚于今天' }

  let sum = 0
  for (let i = 0; i < 17; i++) sum += Number(s[i]) * ID_WEIGHTS[i]
  const expected = ID_CODES[sum % 11]
  if (s[17] !== expected) {
    return { ok: false, msg: `校验码错误：按前 17 位计算末位应为「${expected}」` }
  }

  let age = now.getFullYear() - year
  if (now.getMonth() + 1 < month || (now.getMonth() + 1 === month && now.getDate() < day)) age--
  const birthday = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`

  return {
    ok: true,
    msg: '',
    birthday,
    gender: Number(s[16]) % 2 === 1 ? '男' : '女',
    age: Math.max(0, age),
    region: s.slice(0, 6)
  }
}

function cardBrand(s) {
  if (/^4/.test(s)) return 'Visa'
  const p4 = Number(s.slice(0, 4))
  if (p4 >= 2221 && p4 <= 2720) return 'MasterCard'
  const p2 = Number(s.slice(0, 2))
  if (p2 >= 51 && p2 <= 55) return 'MasterCard'
  if (p2 === 34 || p2 === 37) return 'American Express'
  if (p2 === 35) return 'JCB'
  if (p4 === 6011 || p2 === 65) return 'Discover'
  if (p2 === 62) return '银联'
  return '未知卡组织'
}

function validateBank(raw) {
  const s = String(raw || '').trim()
  if (!s) return null
  if (!/^\d+$/.test(s)) return { ok: false, msg: '只能包含数字（空格与连字符已自动去除）' }
  if (s.length < 12 || s.length > 19) {
    return { ok: false, msg: `卡号长度应为 12-19 位，当前 ${s.length} 位` }
  }
  let sum = 0
  let double = false
  for (let i = s.length - 1; i >= 0; i--) {
    let d = Number(s[i])
    if (double) {
      d *= 2
      if (d > 9) d -= 9
    }
    sum += d
    double = !double
  }
  const luhn = sum % 10 === 0
  return {
    ok: luhn,
    msg: luhn ? '' : 'Luhn 校验失败，卡号可能输错',
    brand: cardBrand(s),
    length: s.length,
    luhn
  }
}

const CARRIER_RANGES = [
  {
    name: '移动',
    ranges: [[134, 139], [147, 148], [150, 152], [157, 159], [165, 165], [172, 172], [178, 178], [182, 184], [187, 188], [195, 195], [197, 198]]
  },
  {
    name: '联通',
    ranges: [[130, 132], [145, 146], [155, 156], [166, 167], [171, 171], [175, 176], [185, 186], [196, 196]]
  },
  {
    name: '电信',
    ranges: [[133, 133], [149, 149], [153, 153], [162, 162], [173, 174], [177, 177], [180, 181], [189, 191], [193, 193], [199, 199]]
  },
  {
    name: '广电',
    ranges: [[192, 192]]
  }
]

function carrierOf(s) {
  const p3 = Number(s.slice(0, 3))
  for (const item of CARRIER_RANGES) {
    for (const range of item.ranges) {
      if (p3 >= range[0] && p3 <= range[1]) return item.name
    }
  }
  return '未知或新号段'
}

function validatePhone(raw) {
  let s = String(raw || '').trim()
  if (!s) return null
  if (/^\+?86\d{11}$/.test(s)) s = s.replace(/^\+?86/, '')
  if (!/^\d+$/.test(s)) return { ok: false, msg: '只能包含数字（空格与连字符已自动去除）' }
  if (s.length !== 11) return { ok: false, msg: `手机号应为 11 位，当前 ${s.length} 位` }
  if (!/^1[3-9]\d{9}$/.test(s)) return { ok: false, msg: '号码格式不正确：应为 1 开头的 11 位手机号' }
  return { ok: true, msg: '', carrier: carrierOf(s), prefix: s.slice(0, 3) }
}

const idResult = computed(() => validateId(idInput.value))
const bankResult = computed(() => validateBank(bankInput.value))
const phoneResult = computed(() => validatePhone(phoneInput.value))
</script>
