import type {
  DayPlan,
  DestinationRecommendation,
  InsuranceRecommendation,
  OutfitSuggestion,
  PackingGroup,
  PolicyCard,
} from '@/types/travel'

const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`
const localTravelImages = [
  'outfits/wuhan-citywalk.png',
  'outfits/wuhan-evening-riverside.png',
  'outfits/wuhan-rainy-museum.png',
  'outfits/citywalk-women.jpg',
  'outfits/evening-dinner-men.jpg',
]
const imageFromPrompt = (prompt: string) => {
  const hash = Array.from(prompt).reduce((total, char) => total + char.charCodeAt(0), 0)
  return assetUrl(localTravelImages[hash % localTravelImages.length])
}

export const mascotImage = assetUrl('outfits/wuhan-citywalk.png')

export const quickPrompts = [
  '我想从上海出发，7 月去一个适合情侣放松的海边目的地，预算中等',
  '帮我做一个亲子 5 天行程，要轻松、干净、出片，还想看价格监控',
  '我想去历史文化感强的城市玩 4 天，预算 8000 左右，住精品酒店',
  '我需要一个出境旅行方案，顺便告诉我签证、打包和保险建议',
]

export type DestinationTemplate = {
  recommendation: Omit<DestinationRecommendation, 'score' | 'reasons' | 'matchReason'>
  keywordWeights: Record<string, number>
  dayPlans: DayPlan[]
  policyCards: PolicyCard[]
  packingGroups: PackingGroup[]
  outfitSuggestions: OutfitSuggestion[]
  insuranceRecommendations: InsuranceRecommendation[]
  notes: string[]
  baseBudget: {
    flight: number
    hotel: number
    food: number
    transportation: number
    tickets: number
    insurance: number
    flexible: number
  }
  flightTarget: string
  hotelTarget: string
}

export const destinationTemplates: DestinationTemplate[] = [
  {
    recommendation: {
      id: 'tokyo',
      city: '东京',
      country: '日本',
      bestWindow: '春樱与秋叶季最出片',
      highlights: ['城市节奏高级', '购物与美术馆兼顾', '线路成熟适合首刷'],
      coverImage: imageFromPrompt(
        'Tokyo travel destination, evening city lights, elegant streets, stylish travelers, premium editorial photography, warm cinematic color',
      ),
      weatherSummary: '适合城市漫游与夜景打卡，雨天也有室内替代方案。',
      mapCenter: [139.6917, 35.6895],
    },
    keywordWeights: {
      城市: 2,
      购物: 2,
      情侣: 2,
      出境: 2,
      动漫: 1,
      轻奢: 1,
      美食: 1,
    },
    dayPlans: [
      {
        day: 1,
        title: '浅草到银座的初见东京',
        routeSummary: '浅草寺 -> 隅田川步道 -> 银座晚餐',
        spots: [
          { time: '09:30', name: '浅草寺', type: '景点', note: '先感受江户氛围，再拍一组早晨人少的街景。', lat: 35.7148, lng: 139.7967, cost: 0 },
          { time: '12:00', name: '仲见世小吃街', type: '餐饮', note: '用人气铜锣烧和天妇罗开启城市味觉。', lat: 35.7127, lng: 139.7966, cost: 120 },
          { time: '15:00', name: 'teamLab Planets', type: '景点', note: '沉浸式艺术展适合情侣与出片需求。', lat: 35.649, lng: 139.7899, cost: 220 },
          { time: '19:00', name: '银座晚餐', type: '餐饮', note: '安排一顿预算可控但体验在线的怀石简餐。', lat: 35.6717, lng: 139.765, cost: 260 },
        ],
      },
      {
        day: 2,
        title: '明治神宫与表参道慢逛',
        routeSummary: '明治神宫 -> 表参道 -> 涩谷夜景',
        spots: [
          { time: '10:00', name: '明治神宫', type: '景点', note: '适合慢节奏旅行，上午光线舒适。', lat: 35.6764, lng: 139.6993, cost: 0 },
          { time: '13:00', name: '表参道 brunch', type: '餐饮', note: '选择设计感咖啡馆补足氛围值。', lat: 35.6667, lng: 139.7126, cost: 180 },
          { time: '16:00', name: '涩谷 Sky', type: '景点', note: '黄昏前后登顶，城市灯光层次最好。', lat: 35.6595, lng: 139.7005, cost: 190 },
          { time: '20:00', name: '涩谷酒店', type: '酒店', note: '返回酒店休整，便于夜间继续觅食。', lat: 35.658, lng: 139.7016, cost: 0 },
        ],
      },
      {
        day: 3,
        title: '上野博物馆与收尾采购',
        routeSummary: '上野公园 -> 博物馆 -> 阿美横町',
        spots: [
          { time: '09:30', name: '上野公园', type: '景点', note: '轻松开局，适合散步和调整节奏。', lat: 35.7141, lng: 139.7737, cost: 0 },
          { time: '11:00', name: '东京国立博物馆', type: '景点', note: '补全文化密度。', lat: 35.7188, lng: 139.7765, cost: 110 },
          { time: '14:30', name: '阿美横町', type: '餐饮', note: '适合边吃边买伴手礼。', lat: 35.709, lng: 139.7745, cost: 160 },
          { time: '18:00', name: '机场交通', type: '交通', note: '建议预留足够时间返回机场。', lat: 35.5494, lng: 139.7798, cost: 90 },
        ],
      },
    ],
    policyCards: [
      { title: '签证与入境', summary: '需提前确认签证、护照有效期与回程材料，入境表单建议提前准备。', level: '重要' },
      { title: '支付与通信', summary: '交通和便利店可以准备交通卡与一张可用国际信用卡，eSIM 体验更顺滑。', level: '建议' },
      { title: '天气与礼仪', summary: '若遇雨天，建议备轻便雨具并注意商场、寺社礼仪。', level: '提醒' },
    ],
    packingGroups: [
      { title: '证件与支付', items: ['护照原件', '签证页复印件', '信用卡', '少量日元现金'] },
      { title: '穿搭与洗护', items: ['轻薄风衣', '舒适球鞋', '可叠穿针织', '旅行装洗护'] },
      { title: '数码与效率', items: ['充电宝', '转换插头', '耳机', 'eSIM 二维码截图'] },
    ],
    outfitSuggestions: [
      { title: '通勤感城市漫游', mood: '干净、克制、适合购物与展馆', pieces: ['米色风衣', '黑色内搭', '小白鞋', '斜挎包'] },
      { title: '情侣夜景约会', mood: '更适合银座与涩谷夜景', pieces: ['深色西装外套', '垂坠半裙/西裤', '金属配饰', '低跟鞋'] },
    ],
    insuranceRecommendations: [
      { title: '标准出境旅行险', focus: '医疗、行李延误、航班变动', suitableFor: '首次出境、城市观光', tips: ['优先看境外医疗保额', '确认是否含电子设备保障'] },
      { title: '高配航变保障', focus: '适合旺季或转机行程', suitableFor: '航班衔接多、购物预算高', tips: ['看延误赔付门槛', '行李损失理赔要保留票据'] },
    ],
    notes: ['如果你想节奏更松，可以把第二天涩谷 Sky 换成代官山慢逛。', '雨天方案可替换为美术馆或大型商场动线。'],
    baseBudget: { flight: 2600, hotel: 1800, food: 1200, transportation: 420, tickets: 520, insurance: 160, flexible: 600 },
    flightTarget: '上海 -> 东京 往返',
    hotelTarget: '涩谷 / 银座 设计酒店',
  },
  {
    recommendation: {
      id: 'chengdu',
      city: '成都',
      country: '中国',
      bestWindow: '春秋两季最舒适，吃喝体验稳定',
      highlights: ['适合慢节奏回血', '美食密度高', '亲子与朋友同行都舒服'],
      coverImage: imageFromPrompt(
        'Chengdu travel destination, tea house, street food, panda city, premium lifestyle editorial image, warm sunlight',
      ),
      weatherSummary: '适合松弛感 citywalk，阴天也很好拍。',
      mapCenter: [104.0665, 30.5728],
    },
    keywordWeights: {
      慢逛: 2,
      美食: 3,
      休闲: 2,
      亲子: 1,
      朋友: 1,
      熊猫: 2,
      国内: 2,
    },
    dayPlans: [
      {
        day: 1,
        title: '人民公园与宽窄巷子的城市开场',
        routeSummary: '人民公园 -> 鹤鸣茶社 -> 宽窄巷子',
        spots: [
          { time: '09:00', name: '人民公园', type: '景点', note: '先让旅行节奏慢下来。', lat: 30.6635, lng: 104.0482, cost: 0 },
          { time: '10:30', name: '鹤鸣茶社', type: '餐饮', note: '喝盖碗茶，看本地生活。', lat: 30.6628, lng: 104.0471, cost: 58 },
          { time: '14:00', name: '宽窄巷子', type: '景点', note: '适合首日轻量散步与购买小礼物。', lat: 30.6672, lng: 104.0564, cost: 0 },
          { time: '18:30', name: '火锅晚餐', type: '餐饮', note: '建议选中辣鸳鸯锅，避免行程初期负担太大。', lat: 30.6656, lng: 104.0625, cost: 180 },
        ],
      },
      {
        day: 2,
        title: '熊猫基地与东郊记忆',
        routeSummary: '熊猫基地 -> 东郊记忆 -> 太古里夜景',
        spots: [
          { time: '08:30', name: '成都大熊猫繁育研究基地', type: '景点', note: '建议早点到，熊猫更活跃。', lat: 30.7392, lng: 104.1522, cost: 55 },
          { time: '13:00', name: '东郊记忆', type: '景点', note: '工业风拍照很稳定。', lat: 30.6723, lng: 104.1293, cost: 0 },
          { time: '17:00', name: '太古里', type: '景点', note: '逛街与咖啡兼顾。', lat: 30.6553, lng: 104.0819, cost: 0 },
          { time: '19:00', name: '川菜晚餐', type: '餐饮', note: '补一顿更精致的本地菜。', lat: 30.6543, lng: 104.0825, cost: 160 },
        ],
      },
      {
        day: 3,
        title: '青羊宫到返程的收尾日',
        routeSummary: '青羊宫 -> 文殊院 -> 返程',
        spots: [
          { time: '09:30', name: '青羊宫', type: '景点', note: '适合慢慢逛和放空。', lat: 30.6662, lng: 104.0359, cost: 12 },
          { time: '12:00', name: '文殊院素斋', type: '餐饮', note: '换个轻口味休整。', lat: 30.6769, lng: 104.0774, cost: 68 },
          { time: '15:00', name: '返程交通', type: '交通', note: '建议至少提前 2 小时前往机场或车站。', lat: 30.5785, lng: 103.9471, cost: 80 },
        ],
      },
    ],
    policyCards: [
      { title: '气候提醒', summary: '成都体感湿润，夏季闷热、冬季偏阴冷，建议带薄外套。', level: '重要' },
      { title: '美食节奏', summary: '辣度可调，首日建议不要排太刺激的餐饮连吃。', level: '建议' },
      { title: '亲子友好', summary: '熊猫基地与公园路线适合家庭同行，但建议准备防晒和湿巾。', level: '提醒' },
    ],
    packingGroups: [
      { title: '舒适装备', items: ['轻薄外套', '防滑运动鞋', '雨伞', '墨镜'] },
      { title: '亲子备品', items: ['湿巾', '备用衣物', '小零食', '驱蚊喷雾'] },
      { title: '松弛感装备', items: ['相机', '折叠托特包', '保温杯', '眼罩'] },
    ],
    outfitSuggestions: [
      { title: '茶馆慢逛 look', mood: '松弛、舒服、适合城市散步', pieces: ['亚麻衬衫', '阔腿裤', '轻便球鞋', '帆布袋'] },
      { title: '夜间太古里 look', mood: '更精致、更适合出片', pieces: ['短外套', '深色牛仔', '低饱和配饰', '小挎包'] },
    ],
    insuranceRecommendations: [
      { title: '国内综合旅行险', focus: '交通意外与医疗', suitableFor: '周末短途与长辈同行', tips: ['注意住院医疗条款', '若自驾需看是否含自驾责任'] },
    ],
    notes: ['如果你重视美食，可以加一晚建设路小吃线。', '如果同行有老人小孩，第二天建议去掉东郊记忆，直接回市中心休息。'],
    baseBudget: { flight: 1200, hotel: 900, food: 860, transportation: 260, tickets: 120, insurance: 60, flexible: 300 },
    flightTarget: '华东 / 华南 -> 成都 往返',
    hotelTarget: '春熙路 / 太古里 附近酒店',
  },
  {
    recommendation: {
      id: 'singapore',
      city: '新加坡',
      country: '新加坡',
      bestWindow: '全年可去，适合亲子与高确定性出境',
      highlights: ['城市整洁，适合亲子', '路线紧凑，转场成本低', '政策信息明确，体验稳定'],
      coverImage: imageFromPrompt(
        'Singapore travel destination, marina bay skyline, family friendly premium travel campaign, bright tropical light, clean and elegant',
      ),
      weatherSummary: '热带气候偏闷热，室内商场与景点丰富。',
      mapCenter: [103.8198, 1.3521],
    },
    keywordWeights: {
      亲子: 3,
      海边: 1,
      出境: 2,
      干净: 2,
      轻松: 2,
      购物: 1,
      免签: 1,
    },
    dayPlans: [
      {
        day: 1,
        title: '滨海湾的高效率开局',
        routeSummary: '鱼尾狮公园 -> 滨海湾花园 -> 克拉码头',
        spots: [
          { time: '10:00', name: '鱼尾狮公园', type: '景点', note: '先打卡城市名片。', lat: 1.2868, lng: 103.8545, cost: 0 },
          { time: '13:00', name: '滨海湾花园', type: '景点', note: '白天和夜晚都值得看，亲子也不累。', lat: 1.2816, lng: 103.8636, cost: 180 },
          { time: '18:30', name: '克拉码头晚餐', type: '餐饮', note: '环境好，适合旅行首晚。', lat: 1.2896, lng: 103.8466, cost: 240 },
        ],
      },
      {
        day: 2,
        title: '圣淘沙玩乐日',
        routeSummary: '环球影城 / 海洋馆 -> 沙滩休息 -> 酒店',
        spots: [
          { time: '09:30', name: '圣淘沙', type: '景点', note: '安排一整天，减少来回奔波。', lat: 1.2494, lng: 103.8303, cost: 280 },
          { time: '13:30', name: '海边简餐', type: '餐饮', note: '中午不要安排太重口味，方便继续玩。', lat: 1.2497, lng: 103.8302, cost: 160 },
          { time: '19:30', name: '滨海区酒店', type: '酒店', note: '尽量住地铁方便的位置。', lat: 1.2836, lng: 103.8593, cost: 0 },
        ],
      },
      {
        day: 3,
        title: '牛车水与返程购物',
        routeSummary: '牛车水 -> 乌节路 -> 返程',
        spots: [
          { time: '10:00', name: '牛车水', type: '景点', note: '适合吃和买伴手礼。', lat: 1.2838, lng: 103.8438, cost: 0 },
          { time: '14:00', name: '乌节路', type: '景点', note: '最后补购物清单。', lat: 1.3048, lng: 103.8318, cost: 0 },
          { time: '18:00', name: '樟宜机场', type: '交通', note: '建议早点去体验机场设施。', lat: 1.3644, lng: 103.9915, cost: 120 },
        ],
      },
    ],
    policyCards: [
      { title: '出入境准备', summary: '出发前留意电子入境卡、护照有效期和回程证明要求。', level: '重要' },
      { title: '天气与着装', summary: '室外闷热，商场和车内空调偏足，建议内外搭配。', level: '建议' },
      { title: '城市规范', summary: '公共秩序要求严格，垃圾分类和公共场所规定要提前了解。', level: '提醒' },
    ],
    packingGroups: [
      { title: '热带出行', items: ['速干短袖', '凉感内搭', '折叠伞', '防晒霜'] },
      { title: '亲子友好', items: ['便携水杯', '儿童防晒帽', '备用拖鞋', '纸巾湿巾'] },
      { title: '跨境必备', items: ['护照', '电子入境卡截图', '境外支付卡', '插头转换器'] },
    ],
    outfitSuggestions: [
      { title: '热带轻出行', mood: '清爽、透气、适合全天走路', pieces: ['速干衬衫', '短裤/轻薄半裙', '凉鞋', '遮阳帽'] },
      { title: '室内外切换', mood: '兼顾空调温差', pieces: ['吊带或 T 恤', '薄针织开衫', '轻便运动鞋', '迷你斜挎包'] },
    ],
    insuranceRecommendations: [
      { title: '亲子出境保障', focus: '医疗与高频小意外', suitableFor: '带孩子出行', tips: ['确认儿童门急诊条款', '查看是否覆盖热带传染病相关责任'] },
      { title: '自由行基础保障', focus: '航变、医疗、证件遗失', suitableFor: '情侣和家庭', tips: ['确认航班延误时长门槛', '提前留意理赔流程'] },
    ],
    notes: ['如果预算更宽裕，可以将圣淘沙升级为 2 天游玩。', '若主要想购物，可将乌节路时间提前到第一晚。'],
    baseBudget: { flight: 3200, hotel: 2200, food: 1400, transportation: 360, tickets: 680, insurance: 220, flexible: 700 },
    flightTarget: '中国主要城市 -> 新加坡 往返',
    hotelTarget: '滨海湾 / 乌节路酒店',
  },
]
