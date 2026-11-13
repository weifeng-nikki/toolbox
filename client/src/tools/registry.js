import { defineAsyncComponent } from 'vue'

const lazy = loader => defineAsyncComponent(loader)

export const categories = [
  {
    id: 'time',
    name: '时间日期',
    tools: [
      { id: 'stopwatch', name: '秒表', icon: '⏱️', component: lazy(() => import('./Stopwatch.vue')) },
      { id: 'countdown', name: '倒计时', icon: '⏳', component: lazy(() => import('./Countdown.vue')) },
      { id: 'pomodoro', name: '番茄钟', icon: '🍅', component: lazy(() => import('./Pomodoro.vue')) },
      { id: 'worldclock', name: '世界时钟', icon: '🌍', component: lazy(() => import('./WorldClock.vue')) },
      { id: 'datecalc', name: '日期计算器', icon: '📅', component: lazy(() => import('./DateCalc.vue')) },
      { id: 'habit', name: '习惯打卡', icon: '📆', component: lazy(() => import('./HabitTracker.vue')) },
      { id: 'todo', name: '待办清单', icon: '✅', component: lazy(() => import('./TodoList.vue')) }
    ]
  },
  {
    id: 'calc',
    name: '计算换算',
    tools: [
      { id: 'calculator', name: '科学计算器', icon: '🧮', component: lazy(() => import('./Calculator.vue')) },
      { id: 'bmi', name: 'BMI 计算器', icon: '⚖️', component: lazy(() => import('./Bmi.vue')) },
      { id: 'radix', name: '进制转换', icon: '🔢', component: lazy(() => import('./RadixConvert.vue')) },
      { id: 'unit', name: '单位换算', icon: '📏', component: lazy(() => import('./UnitConvert.vue')) },
      { id: 'color', name: '颜色工具', icon: '🎨', component: lazy(() => import('./ColorTool.vue')) },
      { id: 'mortgage', name: '房贷计算器', icon: '🏠', component: lazy(() => import('./Mortgage.vue')) },
      { id: 'taxcalc', name: '个税计算', icon: '💰', component: lazy(() => import('./TaxCalc.vue')) },
      { id: 'compound', name: '复利/定投', icon: '📈', component: lazy(() => import('./CompoundCalc.vue')) },
      { id: 'splitbill', name: 'AA 分账', icon: '💸', component: lazy(() => import('./SplitBill.vue')) },
      { id: 'idcheck', name: '证件校验', icon: '🪪', component: lazy(() => import('./IdCheck.vue')) }
    ]
  },
  {
    id: 'text',
    name: '文本处理',
    tools: [
      { id: 'json', name: 'JSON 格式化', icon: '🧾', component: lazy(() => import('./JsonTool.vue')) },
      { id: 'base64', name: 'Base64/URL', icon: '🔀', component: lazy(() => import('./Base64Tool.vue')) },
      { id: 'textstats', name: '字数统计', icon: '📊', component: lazy(() => import('./TextStats.vue')) },
      { id: 'caseconvert', name: '大小写/全半角', icon: '🔠', component: lazy(() => import('./CaseConvert.vue')) },
      { id: 'dedup', name: '文本去重排序', icon: '🧹', component: lazy(() => import('./TextDedup.vue')) },
      { id: 'timestamp', name: '时间戳转换', icon: '⏰', component: lazy(() => import('./TimestampConvert.vue')) },
      { id: 'regex', name: '正则测试', icon: '🔍', component: lazy(() => import('./RegexTest.vue')) },
      { id: 'diff', name: '文本对比', icon: '📑', component: lazy(() => import('./TextDiff.vue')) },
      { id: 'markdown', name: 'Markdown 预览', icon: '📝', component: lazy(() => import('./MarkdownTool.vue')) }
    ]
  },
  {
    id: 'dev',
    name: '开发辅助',
    tools: [
      { id: 'jwt', name: 'JWT 解码', icon: '🎫', component: lazy(() => import('./JwtTool.vue')) },
      { id: 'hash', name: '哈希计算', icon: '🔐', component: lazy(() => import('./HashTool.vue')) },
      { id: 'cron', name: 'Cron 解析', icon: '⏲️', component: lazy(() => import('./CronTool.vue')) },
      { id: 'sql', name: 'SQL 格式化', icon: '🗄️', component: lazy(() => import('./SqlFormat.vue')) },
      { id: 'unicode', name: 'Unicode 转换', icon: '🔤', component: lazy(() => import('./UnicodeTool.vue')) },
      { id: 'dataconvert', name: 'JSON/YAML/CSV', icon: '🧾', component: lazy(() => import('./DataConvert.vue')) },
      { id: 'urlparams', name: 'URL 参数解析', icon: '🔗', component: lazy(() => import('./UrlParams.vue')) },
      { id: 'curl', name: 'cURL 转代码', icon: '🧬', component: lazy(() => import('./CurlConvert.vue')) },
      { id: 'contrast', name: '颜色对比度', icon: '🌗', component: lazy(() => import('./ContrastCheck.vue')) },
      { id: 'httpstatus', name: 'HTTP 状态码', icon: '📡', component: lazy(() => import('./HttpStatus.vue')) }
    ]
  },
  {
    id: 'gen',
    name: '生成器',
    tools: [
      { id: 'password', name: '密码生成器', icon: '🔑', component: lazy(() => import('./PasswordGen.vue')) },
      { id: 'uuid', name: 'UUID 生成器', icon: '🆔', component: lazy(() => import('./UuidGen.vue')) },
      { id: 'fakedata', name: '假数据生成', icon: '🧪', component: lazy(() => import('./FakeData.vue')) },
      { id: 'wheel', name: '抽奖转盘', icon: '🎡', component: lazy(() => import('./WheelTool.vue')) }
    ]
  },
  {
    id: 'media',
    name: '文件/媒体',
    tools: [
      { id: 'image', name: '图片处理', icon: '🖼️', component: lazy(() => import('./ImageTool.vue')) },
      { id: 'speech', name: '文字朗读', icon: '🔊', component: lazy(() => import('./SpeechTool.vue')) },
      { id: 'imagepicker', name: '图片取色', icon: '🎯', component: lazy(() => import('./ImagePicker.vue')) },
      { id: 'imagecrop', name: '图片裁剪', icon: '✂️', component: lazy(() => import('./ImageCrop.vue')) },
      { id: 'mediatest', name: '摄像头/麦克风', icon: '📷', component: lazy(() => import('./MediaTest.vue')) },
      { id: 'gridsplit', name: '九宫格切图', icon: '🔲', component: lazy(() => import('./GridSplit.vue')) },
      { id: 'qrcode', name: '二维码生成', icon: '🔳', component: lazy(() => import('./QrCode.vue')) },
      { id: 'watermark', name: '图片加水印', icon: '💧', component: lazy(() => import('./Watermark.vue')) },
      { id: 'imgformat', name: '格式转换', icon: '🔄', component: lazy(() => import('./ImageFormat.vue')) },
      { id: 'stitch', name: '长图拼接', icon: '🧵', component: lazy(() => import('./StitchImage.vue')) },
      { id: 'base64img', name: 'Base64 图片', icon: '📎', component: lazy(() => import('./Base64Image.vue')) }
    ]
  },
  {
    id: 'game',
    name: '小游戏',
    tools: [
      { id: 'game2048', name: '2048', icon: '🎮', component: lazy(() => import('./Game2048.vue')) },
      { id: 'snake', name: '贪吃蛇', icon: '🐍', component: lazy(() => import('./SnakeGame.vue')) },
      { id: 'minesweeper', name: '扫雷', icon: '💣', component: lazy(() => import('./Minesweeper.vue')) },
      { id: 'memory', name: '记忆翻牌', icon: '🃏', component: lazy(() => import('./MemoryGame.vue')) },
      { id: 'sudoku', name: '数独', icon: '🧩', component: lazy(() => import('./Sudoku.vue')) },
      { id: 'gomoku', name: '五子棋', icon: '⚫', component: lazy(() => import('./Gomoku.vue')) },
      { id: 'typing', name: '打字测试', icon: '⌨️', component: lazy(() => import('./TypingTest.vue')) },
      { id: 'dice', name: '骰子/抽签', icon: '🎲', component: lazy(() => import('./DiceTool.vue')) },
      { id: 'tetris', name: '俄罗斯方块', icon: '🧱', component: lazy(() => import('./Tetris.vue')) },
      { id: 'breakout', name: '打砖块', icon: '🧨', component: lazy(() => import('./Breakout.vue')) },
      { id: 'tictactoe', name: '井字棋', icon: '⭕', component: lazy(() => import('./TicTacToe.vue')) },
      { id: 'flappy', name: '像素小鸟', icon: '🐤', component: lazy(() => import('./FlappyBird.vue')) },
      { id: 'whack', name: '打地鼠', icon: '🔨', component: lazy(() => import('./WhackAMole.vue')) },
      { id: 'pong', name: '双人乒乓', icon: '🏓', component: lazy(() => import('./PongGame.vue')) },
      { id: 'sokoban', name: '推箱子', icon: '📦', component: lazy(() => import('./Sokoban.vue')) },
      { id: 'match', name: '连连看', icon: '🀄', component: lazy(() => import('./LianLianKan.vue')) },
      { id: 'slide', name: '数字华容道', icon: '🔃', component: lazy(() => import('./SlidePuzzle.vue')) },
      { id: 'merge', name: '合成大西瓜', icon: '🍉', component: lazy(() => import('./MergeFruit.vue')) },
      { id: 'reversi', name: '黑白棋', icon: '⚪', component: lazy(() => import('./Reversi.vue')) },
      { id: 'achievement', name: '成就殿堂', icon: '🏆', component: lazy(() => import('./Achievement.vue')) },
      { id: 'spider', name: '蜘蛛纸牌', icon: '🕷️', component: lazy(() => import('./Spider.vue')) },
      { id: 'freecell', name: '空当接龙', icon: '♠️', component: lazy(() => import('./FreeCell.vue')) },
      { id: 'klondike', name: '经典接龙', icon: '♥️', component: lazy(() => import('./Klondike.vue')) }
    ]
  },
  {
    id: 'fun',
    name: '休闲娱乐',
    tools: [
      { id: 'gacha', name: '抽卡模拟', icon: '🎰', component: lazy(() => import('./Gacha.vue')) },
      { id: 'pet', name: '电子宠物', icon: '🐣', component: lazy(() => import('./Pet.vue')) },
      { id: 'fortune', name: '每日一卦', icon: '🔮', component: lazy(() => import('./Fortune.vue')) }
    ]
  }
]

export const allTools = categories.flatMap(c => c.tools)
