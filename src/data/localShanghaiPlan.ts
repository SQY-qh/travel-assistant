import { selectOutfitsForTrip } from '@/data/outfits'
import { createEmptyProfile, type BookingComparison, type ContingencyPlan, type DayPlan, type SpotRecommendation, type TravelPlan, type TravelProfile } from '@/types/travel'

const shanghaiImages = {
  bund: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Bund_at_night_%28with_Bund_Financial_Center%29.jpg/1280px-Bund_at_night_%28with_Bund_Financial_Center%29.jpg',
  wukang: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Wukang_Mansion%2C_Shanghai%2C_May_2016_01.JPG/1280px-Wukang_Mansion%2C_Shanghai%2C_May_2016_01.JPG',
  disney: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Shanghai_disneyland_castle.jpg/1280px-Shanghai_disneyland_castle.jpg',
  jingan: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/2014.11.17.121529_Jing%27an_Temple_Shanghai.jpg/1280px-2014.11.17.121529_Jing%27an_Temple_Shanghai.jpg',
  radisson: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Radisson_Hotel_Shanghai.jpg/1280px-Radisson_Hotel_Shanghai.jpg',
  peaceHotel: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Peace_Hotel_%26_Bank_of_China_Building%2C_Shanghai.jpg/1280px-Peace_Hotel_%26_Bank_of_China_Building%2C_Shanghai.jpg',
  astorLobby: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Astor_house_hotel_lobby.jpg/1280px-Astor_house_hotel_lobby.jpg',
}

const shanghaiRecommendation = {
  id: 'local-shanghai-2026-07-01',
  city: '上海',
  country: '中国',
  score: 99,
  bestWindow: '2026 年 7 月 1 日至 7 月 5 日，按 4 晚 5 天规划',
  highlights: ['深圳直达上海交通选择多', '情侣城市漫游与夜景体验强', '预算 1 万可覆盖舒适住宿与重点门票'],
  reasons: ['从深圳出发航班和高铁都稳定，适合做前后一天比价。', '上海 5 天游可以把外滩、武康路、迪士尼、苏河湾和展馆分层安排。', '夏季天气多变，室内外替换方案成熟。'],
  matchReason: '已根据“深圳到上海 / 7 月 1 日出发 / 5 天 / 情侣 / 预算 1 万”生成完整方案，重点兼顾外滩夜景、衡复街区、迪士尼、苏河湾和前后一天预订比价。',
  coverImage: shanghaiImages.bund,
  weatherSummary: '7 月上海偏湿热，午后可能阵雨；建议上午户外、午后室内、傍晚夜景。',
  mapCenter: [121.4737, 31.2304] as [number, number],
}

const dayPlans: DayPlan[] = [
  {
    day: 1,
    title: '抵达上海与外滩夜景开场',
    routeSummary: '深圳 -> 上海虹桥 / 浦东 -> 人民广场酒店 -> 南京东路 -> 外滩 -> 北外滩',
    spots: [
      { time: '08:20', name: '深圳宝安机场 / 深圳北站出发', type: '交通', note: '优先选上午抵达上海的航班；若选高铁，建议 G100/G818 类早班，抵达后直接进市区。情侣行李控制在 20 寸箱，地铁转场更轻。', cost: 2100 },
      { time: '12:30', name: '人民广场 / 南京东路酒店入住', address: '人民广场、南京东路、苏州河沿线', type: '酒店', note: '建议住人民广场到南京东路之间，去外滩、武康路、迪士尼和虹桥都比较均衡；预算按 4 晚 ¥3000-3600 控制。', imageUrl: shanghaiImages.radisson, lat: 31.2355, lng: 121.4752, cost: 3200 },
      { time: '15:30', name: '南京东路步行街', type: '景点', note: '首日下午只做轻量城市适应，逛第一食品商店、和平饭店外观、外滩源一带；人多时走支路到圆明园路更舒服。', imageUrl: shanghaiImages.peaceHotel, lat: 31.2397, lng: 121.4902, cost: 0 },
      { time: '18:00', name: '外滩日落到蓝调时刻', type: '景点', note: '情侣照建议 18:30 前到黄浦公园附近占位，先拍万国建筑群，再等陆家嘴亮灯；晚餐不要排太远，避免错过夜景。', imageUrl: shanghaiImages.bund, lat: 31.2405, lng: 121.4909, cost: 0 },
      { time: '20:00', name: '北外滩滨江 / 乍浦路桥', type: '景点', note: '外滩人多时转去北外滩，机位更开阔；乍浦路桥适合拍东方明珠和苏州河夜色。', imageUrl: shanghaiImages.bund, lat: 31.2503, lng: 121.4985, cost: 0 },
    ],
  },
  {
    day: 2,
    title: '武康路、衡复风貌与徐汇约会线',
    routeSummary: '武康大楼 -> 安福路 -> 湖南路 -> 徐家汇书院 -> 衡山路晚餐',
    spots: [
      { time: '09:00', name: '武康大楼', type: '景点', note: '早上 9 点前人相对少，拍完经典转角不要久停；之后沿武康路向安福路走，街区比单点更值得慢逛。', imageUrl: shanghaiImages.wukang, lat: 31.2103, lng: 121.4376, cost: 0 },
      { time: '10:30', name: '安福路与话剧艺术中心周边', type: '景点', note: '适合咖啡、买小众香氛和拍街景；如果太阳太晒，就把户外压缩到 60 分钟，转进店内休息。', imageUrl: shanghaiImages.wukang, lat: 31.2152, lng: 121.4442, cost: 120 },
      { time: '13:00', name: '湖南路 / 永福路午餐', type: '餐饮', note: '推荐选 brunch 或本帮菜小馆，避开热门网红店长队；两人午餐按 ¥220-300 预算。', lat: 31.2114, lng: 121.4446, cost: 260 },
      { time: '15:00', name: '徐家汇书院', type: '景点', note: '下午最热时放室内，书院空间好拍，也能休整；若遇雨可延长到 2 小时。', imageUrl: shanghaiImages.wukang, lat: 31.1919, lng: 121.4399, cost: 0 },
      { time: '18:30', name: '衡山路 / 建国西路晚餐', type: '餐饮', note: '晚上选有露台或低照度氛围的餐厅，适合情侣约会；晚餐按 ¥380-520 控制。', lat: 31.2041, lng: 121.4476, cost: 460 },
    ],
  },
  {
    day: 3,
    title: '迪士尼一日或浦东替代线',
    routeSummary: '上海迪士尼度假区；若天气/体力变化则改陆家嘴 + 前滩太古里',
    spots: [
      { time: '07:15', name: '出发前往上海迪士尼', type: '交通', note: '从市中心到迪士尼约 60-80 分钟。想玩热门项目建议早到；不追求全项目则 9:30 后入园更轻松。', cost: 80 },
      { time: '09:00', name: '上海迪士尼乐园', type: '景点', note: '情侣优先顺序：疯狂动物城热力追踪、创极速光轮、加勒比海盗、七个小矮人矿山车。只选 4-5 个重点，不必硬刷全园。', imageUrl: shanghaiImages.disney, lat: 31.144, lng: 121.657, cost: 1180 },
      { time: '13:30', name: '园内午餐与降温休息', type: '餐饮', note: '中午避开排队和暴晒，选室内餐厅；带小风扇、雨衣和水杯，预算两人 ¥180-260。', lat: 31.144, lng: 121.657, cost: 220 },
      { time: '18:30', name: '城堡烟花 / 夜间巡游', type: '景点', note: '如果当日烟花开放，提前 45 分钟找位置；若雨天取消，改去迪士尼小镇晚餐后回酒店。', imageUrl: shanghaiImages.disney, lat: 31.144, lng: 121.657, cost: 0 },
      { time: '21:30', name: '返回市区酒店', type: '交通', note: '回程排队明显，提前约车或接受地铁人流；第二天上午安排轻松一点。', cost: 120 },
    ],
  },
  {
    day: 4,
    title: '博物馆、苏河湾与静安精致收尾',
    routeSummary: '上海博物馆东馆 / 人民广场馆 -> 苏河湾万象天地 -> 静安寺 -> 巨鹿路',
    spots: [
      { time: '09:30', name: '上海博物馆', type: '景点', note: '按开放预约选择人民广场馆或东馆；重点看青铜、陶瓷、书画，不建议每层都硬逛。', lat: 31.2304, lng: 121.4707, cost: 0 },
      { time: '12:30', name: '人民广场周边本帮菜', type: '餐饮', note: '可以安排上海菜午餐：响油鳝糊、葱油拌面、红烧肉少量尝试；两人预算 ¥220-320。', lat: 31.232, lng: 121.475, cost: 280 },
      { time: '15:00', name: '苏河湾万象天地 / 天后宫桥', type: '景点', note: '下午走苏州河沿线，商场、河岸、历史建筑组合稳定；雨天也能在室内完成大部分体验。', imageUrl: shanghaiImages.jingan, lat: 31.2468, lng: 121.4716, cost: 0 },
      { time: '17:30', name: '静安寺外观与久光商圈', type: '景点', note: '傍晚去静安寺外观更有城市反差感；如果想购物，久光、芮欧、晶品都在步行范围。', imageUrl: shanghaiImages.jingan, lat: 31.223, lng: 121.4452, cost: 100 },
      { time: '19:30', name: '巨鹿路 / 富民路晚餐小酒', type: '餐饮', note: '最后一晚安排轻松约会，不建议再跨浦东；可选 bistro、日料或酒吧，预算 ¥450-650。', lat: 31.2216, lng: 121.454, cost: 560 },
    ],
  },
  {
    day: 5,
    title: '愚园路慢逛与返程',
    routeSummary: '愚园路 -> 中山公园 / 龙之梦 -> 虹桥 / 浦东返程',
    spots: [
      { time: '09:30', name: '愚园路城市更新街区', type: '景点', note: '最后一天不排重景点，适合咖啡、买伴手礼、补拍街景；比外滩更适合作为轻松收尾。', imageUrl: shanghaiImages.wukang, lat: 31.2209, lng: 121.4317, cost: 80 },
      { time: '12:00', name: '中山公园 / 龙之梦午餐', type: '餐饮', note: '午餐选靠近地铁的商场，方便带行李转场；两人预算 ¥180-260。', lat: 31.2182, lng: 121.4165, cost: 220 },
      { time: '14:00', name: '回酒店取行李', type: '酒店', note: '建议提前确认酒店能否寄存行李到 14:00-15:00；若返程较晚，可把苏河湾或静安补购物放到下午。', cost: 0 },
      { time: '16:00', name: '前往虹桥机场 / 虹桥站', type: '交通', note: '优先从虹桥返深圳，市区到虹桥更稳定；去浦东需额外预留 40-60 分钟。', lat: 31.1979, lng: 121.3363, cost: 120 },
    ],
  },
]

export const shenzhenShanghaiBookingComparison: BookingComparison = {
  title: '深圳到上海前后一天整体比价',
  baseline: '按 2 人、4 晚、上海市中心舒适型酒店估算；实际下单前请以航司、铁路和酒店平台价格为准。',
  cheapestOptionId: 'early',
  recommendedOptionId: 'baseline',
  summary: '纯价格最低是 6 月 30 日提前一天出发，但会多请一天假；综合体验推荐仍选 7 月 1 日上午出发，航班和酒店价格接近低位，行程完整度最好。',
  insights: [
    '机票最低：6/30-7/4，两人往返约 ¥1880。',
    '酒店最低：6/30-7/4，4 晚约 ¥3040。',
    '机酒合计最低：6/30-7/4，约 ¥4920。',
    '综合推荐：7/1-7/5，少请假且首日外滩夜景更完整。',
  ],
  options: [
    {
      id: 'early',
      label: '早一天：6/30-7/4',
      departDate: '2026-06-30',
      returnDate: '2026-07-04',
      hotelNights: 4,
      flightTotal: 1880,
      trainTotal: 1780,
      hotelTotal: 3040,
      totalByFlight: 4920,
      totalByTrain: 4820,
      recommendation: '价格最低，适合能提前请假、想避开 7 月 1 日出行小高峰的情侣。',
      bookingTips: ['航班优先看 08:00-11:00 深圳宝安 -> 上海虹桥。', '酒店可锁人民广场 / 南京东路 4 晚连住，避免换酒店。', '高铁耗时较长，除非想省预算，否则舒适度不如飞机。'],
    },
    {
      id: 'baseline',
      label: '原计划：7/1-7/5',
      departDate: '2026-07-01',
      returnDate: '2026-07-05',
      hotelNights: 4,
      flightTotal: 2060,
      trainTotal: 1880,
      hotelTotal: 3280,
      totalByFlight: 5340,
      totalByTrain: 5160,
      recommendation: '综合最推荐：不额外占用假期，首日可完整安排外滩夜景，预算仍能控制在 1 万内。',
      bookingTips: ['机票选择上午去程、下午返程，别选过晚抵达。', '酒店选南京东路 / 人民广场 / 苏州河沿线，交通效率最高。', '迪士尼票和博物馆预约要比交通更早锁定。'],
    },
    {
      id: 'late',
      label: '晚一天：7/2-7/6',
      departDate: '2026-07-02',
      returnDate: '2026-07-06',
      hotelNights: 4,
      flightTotal: 2240,
      trainTotal: 1960,
      hotelTotal: 3440,
      totalByFlight: 5680,
      totalByTrain: 5400,
      recommendation: '价格略高，但周一返程票可能更稳；适合想把周末完整留在上海的人。',
      bookingTips: ['周末酒店可能抬价，建议缩小到苏州河 / 静安非核心段。', '返程尽量选虹桥，少承受浦东远距离转场。', '若迪士尼放在周五，排队压力可能比周末低。'],
    },
  ],
  hotelOptions: [
    {
      name: '人民广场 / 南京东路舒适型酒店',
      area: '人民广场、南京东路、苏州河沿线',
      priceHint: '4 晚约 ¥3280，适合首晚外滩与返程转场',
      reason: '去外滩、武康路、静安和虹桥都比较均衡，情侣 5 天游可以减少换乘焦虑。',
      imageUrl: shanghaiImages.radisson,
      imageCredit: 'Wikimedia Commons',
    },
    {
      name: '外滩历史建筑风格酒店',
      area: '外滩源 / 南京东路东段',
      priceHint: '4 晚约 ¥3600-4400，适合想把夜景体验拉满',
      reason: '首晚和最后一晚都能步行看江景，适合展示时做“氛围感住宿”参考。',
      imageUrl: shanghaiImages.peaceHotel,
      imageCredit: 'Wikimedia Commons',
    },
    {
      name: '苏州河沿线设计感酒店',
      area: '北苏州路 / 天潼路 / 静安边界',
      priceHint: '4 晚约 ¥3000-3400，性价比和城市感更平衡',
      reason: '离苏河湾、北外滩和人民广场都近，预算更稳，雨天也容易切到商场和展馆。',
      imageUrl: shanghaiImages.astorLobby,
      imageCredit: 'Wikimedia Commons',
    },
  ],
}

const spotRecommendations: SpotRecommendation[] = [
  {
    title: '外滩 + 北外滩',
    area: '黄浦 / 虹口滨江',
    bestTime: '18:20-20:30',
    duration: '2-3 小时',
    reservation: '无需预约，晚高峰注意人流',
    why: '这是情侣上海首晚最稳的氛围点，外滩看经典，北外滩更适合避开人群拍合照。',
    nearbyFood: '南京东路简餐、外滩源咖啡、北外滩来福士晚餐',
    fallback: '暴雨时改为外滩源室内餐厅 + 和平饭店外观短停。',
    imageUrl: shanghaiImages.bund,
    imageCredit: 'Wikimedia Commons',
  },
  {
    title: '武康路 - 安福路 - 湖南路',
    area: '徐汇衡复风貌区',
    bestTime: '09:00-13:00',
    duration: '半天',
    reservation: '无需预约，咖啡店热门时段需排队',
    why: '比单点打卡更适合情侣慢逛，街景、咖啡、买手店和梧桐树氛围连续。',
    nearbyFood: '湖南路 brunch、安福路咖啡、永福路西餐',
    fallback: '高温时压缩户外，改徐家汇书院 + 港汇恒隆。',
    imageUrl: shanghaiImages.wukang,
    imageCredit: 'Wikimedia Commons',
  },
  {
    title: '上海迪士尼',
    area: '浦东川沙',
    bestTime: '整天，7:15 出发更稳',
    duration: '10-12 小时',
    reservation: '门票需提前买，热门项目可考虑尊享卡',
    why: '情侣 5 天游里最强主题体验，但要接受体力消耗；建议只抓 4-5 个重点项目。',
    nearbyFood: '园内餐厅、迪士尼小镇',
    fallback: '雨天或不想排队时改陆家嘴三件套 + 前滩太古里。',
    imageUrl: shanghaiImages.disney,
    imageCredit: 'Wikimedia Commons',
  },
  {
    title: '苏河湾 + 静安寺',
    area: '静安 / 苏州河',
    bestTime: '15:00-19:00',
    duration: '3-4 小时',
    reservation: '上海博物馆需留意预约，其余无需',
    why: '室内商场、河岸步道、历史建筑和夜景之间切换顺，适合夏季不确定天气。',
    nearbyFood: '苏河湾万象天地、静安寺商圈、巨鹿路 bistro',
    fallback: '遇雨直接转入苏河湾万象天地和静安商场。',
    imageUrl: shanghaiImages.jingan,
    imageCredit: 'Wikimedia Commons',
  },
]

const contingencyPlans: ContingencyPlan[] = [
  {
    trigger: 'Day 3 迪士尼遇到暴雨或临时闭园项目多',
    strategy: '不要硬去排队，把迪士尼整体后移到 Day 4，Day 3 改成陆家嘴 + 前滩太古里室内线。',
    nextPlan: 'Day 4 原博物馆与苏河湾压缩为上午博物馆 + 傍晚静安，取消苏河湾长时间停留。',
    tradeoff: '保留主题乐园体验，但会减少一个城市慢逛下午。',
  },
  {
    trigger: '首日航班延误，18:00 后才到酒店',
    strategy: '取消南京东路慢逛，直接酒店放行李后去北外滩或外滩源，晚餐选择酒店附近。',
    nextPlan: '把南京东路和外滩源补到 Day 5 上午，愚园路缩短为咖啡和伴手礼。',
    tradeoff: '首日晚景保住，但首日步行量降低。',
  },
  {
    trigger: '预算临时收紧到 8000 左右',
    strategy: '交通优先保留飞机，酒店从南京东路核心换到苏州河 / 中山公园，迪士尼尊享卡不买。',
    nextPlan: '餐饮从两顿约会餐压缩到一顿，午餐多用商圈简餐。',
    tradeoff: '住宿位置略远、排队时间增加，但主体验不被砍掉。',
  },
  {
    trigger: '临时想加购物或想减少景点',
    strategy: '保留 Day 2 衡复街区和 Day 4 静安商圈，把上海博物馆从 2.5 小时缩到 1.5 小时。',
    nextPlan: 'Day 5 返程前改中山公园 / 静安补购物，避免跨浦东。',
    tradeoff: '文化密度下降，但更符合情侣轻松购物节奏。',
  },
]

export const isShenzhenShanghaiPresetProfile = (profile: TravelProfile) => {
  const departure = profile.departureCity.replace(/市/g, '')
  const destination = profile.destinationCity.replace(/市/g, '')
  const text = [profile.dateRange, profile.travelers, profile.budgetLevel, profile.notes, profile.travelStyle.join(' ')].join(' ')
  return departure === '深圳' && destination === '上海' && /7月|7\/1|2026-07-01|7月1/.test(text) && /5天/.test(profile.dateRange) && /情侣/.test(text)
}

export function buildShenzhenShanghaiLocalPlan(profile: TravelProfile): TravelPlan {
  return {
    source: 'local-preset',
    localOnly: true,
    recommendations: [shanghaiRecommendation],
    selectedRecommendation: shanghaiRecommendation,
    dayPlans,
    budget: {
      total: 9640,
      flight: 2060,
      hotel: 3280,
      food: 1850,
      transportation: 650,
      tickets: 1380,
      insurance: 120,
      flexible: 300,
    },
    policyCards: [
      { title: '行程定位', summary: '方案围绕深圳往返上海的 5 天情侣出游设计，兼顾外滩夜景、城市街区、迪士尼主题体验和前后一天预订比价。', level: '重要' },
      { title: '上海 7 月天气', summary: '湿热、午后阵雨概率高。上午安排户外街区，下午安排展馆 / 商场，傍晚再去夜景点。', level: '建议' },
      { title: '预约优先级', summary: '优先锁定迪士尼门票、博物馆预约、酒店可取消房；交通票价若接近推荐价可直接下单。', level: '提醒' },
    ],
    monitors: [
      { id: 'local-shanghai-flight', category: '机票', target: '深圳 SZX -> 上海 SHA/PVG 往返 2 人', currentPrice: 2060, expectedPrice: 1900, trend: [2380, 2240, 2160, 2060, 1980, 2060], status: '接近低价', enabled: true },
      { id: 'local-shanghai-hotel', category: '酒店', target: '人民广场 / 南京东路 4 晚', currentPrice: 3280, expectedPrice: 3000, trend: [3560, 3440, 3360, 3280, 3180, 3280], status: '接近低价', enabled: true },
    ],
    packingGroups: [
      { title: '上海 7 月必带', items: ['轻便雨伞', '防晒霜', '小风扇', '透气短袖', '薄外套', '舒适步行鞋'] },
      { title: '情侣出片', items: ['浅色上衣', '深色约会装', '备用发夹', '小三脚架', '香水小样'] },
      { title: '效率装备', items: ['身份证', '充电宝', '地铁乘车码', '迪士尼门票截图', '酒店确认单'] },
    ],
    outfitSuggestions: selectOutfitsForTrip({ ...createEmptyProfile(), ...profile, travelStyle: ['城市', '情侣'] }, '上海'),
    insuranceRecommendations: [
      { title: '国内短途旅行险', focus: '交通意外、航班延误、急性肠胃或中暑就医', suitableFor: '深圳往返上海 5 天情侣出游', tips: ['选择含航延和行李延误的基础款即可', '若买迪士尼票，可看是否覆盖突发医疗和意外'] },
    ],
    notes: [
      '该方案预算按两人计算，目标控制在 ¥10000 内。',
      '机票、火车票、酒店价格为攻略估算，用于展示和决策；实际库存和退改规则以下单平台为准。',
      shenzhenShanghaiBookingComparison.summary,
    ],
    spotRecommendations,
    bookingComparison: shenzhenShanghaiBookingComparison,
    contingencyPlans,
  }
}
