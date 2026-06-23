import { selectOutfitsForTrip } from '@/data/outfits'
import { createEmptyProfile, type BookingComparison, type ContingencyPlan, type DayPlan, type SpotRecommendation, type TravelPlan, type TravelProfile } from '@/types/travel'

const commonsImage = (fileName: string, width = 1280) =>
  `https://commons.wikimedia.org/wiki/Special:Redirect/file/${encodeURIComponent(fileName)}?width=${width}`

const shanghaiImages = {
  bund: 'https://upload.wikimedia.org/wikipedia/commons/thumb/4/45/Bund_at_night_%28with_Bund_Financial_Center%29.jpg/1280px-Bund_at_night_%28with_Bund_Financial_Center%29.jpg',
  wukang: 'https://upload.wikimedia.org/wikipedia/commons/thumb/a/ad/Wukang_Mansion%2C_Shanghai%2C_May_2016_01.JPG/1280px-Wukang_Mansion%2C_Shanghai%2C_May_2016_01.JPG',
  disney: 'https://upload.wikimedia.org/wikipedia/commons/thumb/c/cb/Shanghai_disneyland_castle.jpg/1280px-Shanghai_disneyland_castle.jpg',
  jingan: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/1c/2014.11.17.121529_Jing%27an_Temple_Shanghai.jpg/1280px-2014.11.17.121529_Jing%27an_Temple_Shanghai.jpg',
  radisson: 'https://upload.wikimedia.org/wikipedia/commons/thumb/1/16/Radisson_Hotel_Shanghai.jpg/1280px-Radisson_Hotel_Shanghai.jpg',
  peaceHotel: 'https://upload.wikimedia.org/wikipedia/commons/thumb/8/8f/Peace_Hotel_%26_Bank_of_China_Building%2C_Shanghai.jpg/1280px-Peace_Hotel_%26_Bank_of_China_Building%2C_Shanghai.jpg',
  astorLobby: 'https://upload.wikimedia.org/wikipedia/commons/thumb/b/bb/Astor_house_hotel_lobby.jpg/1280px-Astor_house_hotel_lobby.jpg',
  szxAirport: commonsImage("Shenzhen Bao'an International Airport Terminal 3 interior 20250412.jpg"),
  hongqiaoStation: commonsImage('Shanghai Hongqiao Railway Station waiting hall.jpg'),
  nanjingRoad: commonsImage('East Nanjing Pedestrian Shopping Street.jpg'),
  northBund: commonsImage('Pudong CBD viewed from the North Bund in Shanghai.jpg'),
  anfuRoad: commonsImage('A brunch spot at Anfu Rd.jpg'),
  xujiahuiLibrary: commonsImage('徐家汇书院 05.jpg'),
  shanghaiMuseum: commonsImage('Shanghai Museum East inside.jpg'),
  suheBay: commonsImage('上海苏河湾万象天地.png'),
  juluRoad: commonsImage('Lane 852 Julu Rd. Shanghai.JPG'),
  yuyuanRoad: commonsImage('愚园路1086号住宅.jpg'),
  lujiazui: commonsImage('Lujiazui-towers-01.jpg'),
  pudongArtMuseum: commonsImage('浦东美术馆.jpg'),
  xiaolongbao: 'https://upload.wikimedia.org/wikipedia/commons/f/f5/Xiaolongbao_in_Shanghai%2C_China_by_avlxyz.jpg',
  hengshanRoad: 'https://upload.wikimedia.org/wikipedia/commons/7/76/Hengshan_Road_near_Hengshan_Road_Station.jpg',
  disneyTown: 'https://upload.wikimedia.org/wikipedia/commons/4/42/Shanghai_Disney_Resort_Disney_Town.jpg',
  ifcMall: 'https://upload.wikimedia.org/wikipedia/commons/d/de/Shanghai_IFC_Shopping_Arcade_Void_201005.jpg',
  qiantanTaikooLi: 'https://upload.wikimedia.org/wikipedia/commons/3/3e/%E4%B8%8A%E6%B5%B7%E5%89%8D%E6%BB%A9%E5%A4%AA%E5%8F%A4%E9%87%8C.jpg',
  zhongshanPark: 'https://upload.wikimedia.org/wikipedia/commons/1/13/Zhongshan_Park.jpg',
  longemont: 'https://upload.wikimedia.org/wikipedia/commons/8/81/Wide-shot_of_Longemont_20240204131131.jpg',
}

const hotelRoomImages = {
  radissonExterior: 'https://media.radissonhotels.net/image/radisson-blu-hotel-shanghai-new-world/exterior/16256-113952-f72757582_4K.jpg?impolicy=HomeHero',
  radissonRoom: 'https://media.radissonhotels.net/image/radisson-blu-hotel-shanghai-new-world/guest-room/16256-113952-f85642073_4K.jpg?impolicy=Card',
  radissonSuite: 'https://media.radissonhotels.net/image/radisson-blu-hotel-shanghai-new-world/suite/16256-113952-f65054505_4K.jpg?impolicy=Card',
  fairmontKingRoom: 'https://m.ahstatic.com/is/image/accorhotels/HCM_P_7202556:3by2?fmt=webp&wid=600&hei=400&qlt=80',
  fairmontDeluxeRoom: 'https://m.ahstatic.com/is/image/accorhotels/HCM_P_4493266:3by2?fmt=webp&wid=600&hei=400&qlt=80',
  shanghaiMansion: commonsImage('Shanghai Mansion.JPG'),
  astorLobby: shanghaiImages.astorLobby,
}

const shanghaiRecommendation = {
  id: 'local-shanghai-2026-07-01',
  city: '上海',
  country: '中国',
  score: 99,
  bestWindow: '2026 年 7 月 1 日至 7 月 5 日，按 4 晚 5 天规划',
  highlights: ['深圳直达上海交通选择多', '情侣城市漫游与夜景体验强', '预算 1 万可覆盖舒适住宿与重点门票'],
  reasons: ['从深圳出发航班和高铁都稳定，适合做前后一天比价。', '上海 5 天游可以把外滩、武康路、迪士尼、苏河湾和展馆分层安排。', '夏季天气多变，室内外替换方案成熟。'],
  matchReason: '这条 5 天游把外滩夜景、衡复街区、迪士尼和苏河湾串在一起，节奏适合情侣出行，也保留了前后一天的订票比价空间。',
  coverImage: shanghaiImages.bund,
  weatherSummary: '7 月上海偏湿热，午后可能阵雨；建议上午户外、午后室内、傍晚夜景。',
  mapCenter: [121.4737, 31.2304] as [number, number],
}

const dayPlans: DayPlan[] = [
  {
    day: 1,
    title: '抵达上海与外滩夜景开场',
    routeSummary: '深圳 -> 上海虹桥 / 浦东 -> Radisson Blu Hotel Shanghai New World -> 南京东路 -> 外滩 -> 北外滩',
    spots: [
      { time: '08:20', name: '深圳宝安机场 / 深圳北站出发', type: '交通', note: '优先选上午抵达上海的直飞航班；高铁备选 G902，深圳北 11:57 出发、19:43 到上海虹桥。情侣行李控制在 20 寸箱，地铁换乘会轻松很多。', imageUrl: shanghaiImages.szxAirport, cost: 2560, costDetails: ['深圳往返上海两人机票约 ¥2560。', '如果改坐 G902，高铁二等座两人单程约 ¥1734。', '到达后的地铁或打车另放在市内交通预算里。'] },
      { time: '12:30', name: 'Radisson Blu Hotel Shanghai New World 入住', address: '上海市南京西路 88 号 / 人民广场商圈', type: '酒店', note: '住 Radisson Blu Hotel Shanghai New World，去外滩、武康路、迪士尼和虹桥都比较顺。建议选可取消房型，后面如果日期微调也不被动。', imageUrl: hotelRoomImages.radissonExterior, lat: 31.2355, lng: 121.4752, cost: 4200, costDetails: ['Radisson Blu Hotel Shanghai New World 4 晚约 ¥4200。', '7/1 入住、7/5 退房，不含押金、早餐加购和市内交通。', '订房前再看一眼退改规则，尽量选可取消。'] },
      { time: '15:30', name: '南京东路步行街', type: '景点', note: '首日下午只做轻量城市适应，逛第一食品商店、和平饭店外观、外滩源一带；人多时走支路到圆明园路更舒服。', imageUrl: shanghaiImages.nanjingRoad, lat: 31.2397, lng: 121.4902, cost: 80, costDetails: ['景点本身免费。', '两人饮品/小食/伴手礼机动预算 ¥80。'] },
      { time: '18:00', name: '外滩日落到蓝调时刻', type: '景点', note: '情侣照建议 18:30 前到黄浦公园附近占位，先拍万国建筑群，再等陆家嘴亮灯；晚餐不要排太远，避免错过夜景。', imageUrl: shanghaiImages.bund, lat: 31.2405, lng: 121.4909, cost: 260, costDetails: ['外滩观景免费。', '南京东路/外滩源简餐两人约 ¥220。', '拍照补水和短途地铁预留 ¥40。'] },
      { time: '20:00', name: '北外滩滨江 / 乍浦路桥', type: '景点', note: '外滩人多时转去北外滩，机位更开阔；乍浦路桥适合拍东方明珠和苏州河夜色。', imageUrl: shanghaiImages.northBund, lat: 31.2503, lng: 121.4985, cost: 40, costDetails: ['滨江和桥位拍照免费。', '从外滩转场到北外滩的地铁/打车分摊约 ¥40。'] },
    ],
  },
  {
    day: 2,
    title: '武康路、衡复风貌与徐汇约会线',
    routeSummary: '武康大楼 -> 安福路 -> 湖南路 -> 徐家汇书院 -> 衡山路晚餐',
    spots: [
      { time: '09:00', name: '武康大楼', type: '景点', note: '早上 9 点前人相对少，拍完经典转角不要久停；之后沿武康路向安福路走，街区比单点更值得慢逛。', imageUrl: shanghaiImages.wukang, lat: 31.2103, lng: 121.4376, cost: 0, costDetails: ['外观拍照免费。', '建议把咖啡和休息消费放到下一站统一计算。'] },
      { time: '10:30', name: '安福路与话剧艺术中心周边', type: '景点', note: '适合咖啡、买小众香氛和拍街景；如果太阳太晒，就把户外压缩到 60 分钟，转进店内休息。', imageUrl: shanghaiImages.anfuRoad, lat: 31.2152, lng: 121.4442, cost: 160, costDetails: ['两杯咖啡/茶饮约 ¥80-100。', '小店伴手礼或香氛试购预留 ¥60。'] },
      { time: '13:00', name: '湖南路 / 永福路午餐', type: '餐饮', note: '推荐选 brunch 或本帮菜小馆，避开热门网红店长队；两人午餐按 ¥220-300 预算。', imageUrl: shanghaiImages.anfuRoad, lat: 31.2114, lng: 121.4446, cost: 260, costDetails: ['两份 brunch/本帮主食约 ¥180。', '饮品/甜品约 ¥60。', '服务费或排队替代店机动 ¥20。'] },
      { time: '15:00', name: '徐家汇书院', type: '景点', note: '下午最热时放室内，书院空间好拍，也能休整；若遇雨可延长到 2 小时。', imageUrl: shanghaiImages.xujiahuiLibrary, lat: 31.1919, lng: 121.4399, cost: 40, costDetails: ['书院参观免费。', '地铁转场/饮用水预留 ¥40。'] },
      { time: '18:30', name: '衡山路 / 建国西路晚餐', type: '餐饮', note: '晚上选有露台或低照度氛围的餐厅，适合情侣约会；晚餐按 ¥380-520 控制。', imageUrl: shanghaiImages.hengshanRoad, lat: 31.2041, lng: 121.4476, cost: 460, costDetails: ['两人主菜/小食约 ¥320。', '饮品或甜品约 ¥100。', '服务费和短途转场预留 ¥40。'] },
    ],
  },
  {
    day: 3,
    title: '迪士尼一日或浦东替代线',
    routeSummary: '上海迪士尼度假区；若天气/体力变化则改陆家嘴 + 前滩太古里',
    spots: [
      { time: '07:15', name: '从 Radisson Blu 前往上海迪士尼', type: '交通', note: '从人民广场到迪士尼约 60-80 分钟。想玩热门项目建议早到；不追求全项目则 9:30 后入园更轻松。', imageUrl: shanghaiImages.disneyTown, cost: 90, costDetails: ['人民广场到迪士尼地铁两人约 ¥16。', '早高峰打车/补差机动预留约 ¥74。'] },
      { time: '09:00', name: '上海迪士尼乐园', type: '景点', note: '情侣优先顺序：疯狂动物城热力追踪、创极速光轮、加勒比海盗、七个小矮人矿山车。只抓 4-5 个重点项目，玩得会比硬刷全园舒服。', imageUrl: shanghaiImages.disney, lat: 31.144, lng: 121.657, cost: 1180, costDetails: ['两张标准日门票约 ¥950-1100。', '如果当天排队较长，预留 ¥80-230 给热门项目或园内加购。', '出发前看一下当天票档和演出时间。'] },
      { time: '13:30', name: '园内午餐与降温休息', type: '餐饮', note: '中午避开排队和暴晒，选室内餐厅；带小风扇、雨衣和水杯，预算两人 ¥180-260。', imageUrl: shanghaiImages.disneyTown, lat: 31.144, lng: 121.657, cost: 220, costDetails: ['园内两份套餐约 ¥160-180。', '饮品/雪糕/补水约 ¥40-60。'] },
      { time: '18:30', name: '城堡烟花 / 夜间巡游', type: '景点', note: '如果当日烟花开放，提前 45 分钟找位置；若雨天取消，改去迪士尼小镇晚餐后回酒店。', imageUrl: shanghaiImages.disney, lat: 31.144, lng: 121.657, cost: 0, costDetails: ['夜间巡游和烟花含在门票内。', '如改迪士尼小镇晚餐，餐饮费用会从机动预算扣除。'] },
      { time: '21:30', name: '返回 Radisson Blu Hotel Shanghai New World', type: '交通', note: '回程排队明显，提前约车或接受地铁人流；第二天上午安排轻松一点。', imageUrl: hotelRoomImages.radissonExterior, cost: 120, costDetails: ['两人地铁回人民广场约 ¥16。', '夜间打车/网约车备选预留约 ¥100。'] },
    ],
  },
  {
    day: 4,
    title: '博物馆、苏河湾与静安精致收尾',
    routeSummary: '上海博物馆东馆 / 人民广场馆 -> 苏河湾万象天地 -> 静安寺 -> 巨鹿路',
    spots: [
      { time: '09:30', name: '上海博物馆', type: '景点', note: '按开放预约选择人民广场馆或东馆；重点看青铜、陶瓷、书画，不建议每层都硬逛。', imageUrl: shanghaiImages.shanghaiMuseum, lat: 31.2304, lng: 121.4707, cost: 0, costDetails: ['常设展免费，需按开放规则预约。', '特展如需购票则从门票机动预算扣除。'] },
      { time: '12:30', name: '人民广场周边本帮菜', type: '餐饮', note: '可以安排上海菜午餐：响油鳝糊、葱油拌面、红烧肉少量尝试；两人预算 ¥220-320。', imageUrl: shanghaiImages.xiaolongbao, lat: 31.232, lng: 121.475, cost: 280, costDetails: ['两人本帮菜/小笼主食约 ¥210。', '饮品/茶位约 ¥40。', '服务费或加菜预留 ¥30。'] },
      { time: '15:00', name: '苏河湾万象天地 / 天后宫桥', type: '景点', note: '下午走苏州河沿线，商场、河岸、历史建筑组合稳定；雨天也能在室内完成大部分体验。', imageUrl: shanghaiImages.suheBay, lat: 31.2468, lng: 121.4716, cost: 80, costDetails: ['街区和河岸免费。', '咖啡/甜品或展陈机动预算 ¥80。'] },
      { time: '17:30', name: '静安寺外观与久光商圈', type: '景点', note: '傍晚去静安寺外观更有城市反差感；如果想购物，久光、芮欧、晶品都在步行范围。', imageUrl: shanghaiImages.jingan, lat: 31.223, lng: 121.4452, cost: 100, costDetails: ['静安寺外观免费。', '如入寺参观，两人门票/香花券按现场规则预留。', '短途地铁和饮品约 ¥40-60。'] },
      { time: '19:30', name: '巨鹿路 / 富民路晚餐小酒', type: '餐饮', note: '最后一晚安排轻松约会，不建议再跨浦东；可选 bistro、日料或酒吧，预算 ¥450-650。', imageUrl: shanghaiImages.juluRoad, lat: 31.2216, lng: 121.454, cost: 560, costDetails: ['两人晚餐主菜/小食约 ¥380。', '酒水/无酒精饮品约 ¥140。', '服务费和回酒店交通预留 ¥40。'] },
    ],
  },
  {
    day: 5,
    title: '愚园路慢逛与返程',
    routeSummary: '愚园路 -> 中山公园 / 龙之梦 -> 虹桥 / 浦东返程',
    spots: [
      { time: '09:30', name: '愚园路城市更新街区', type: '景点', note: '最后一天不排重景点，适合咖啡、买伴手礼、补拍街景；比外滩更适合作为轻松收尾。', imageUrl: shanghaiImages.yuyuanRoad, lat: 31.2209, lng: 121.4317, cost: 120, costDetails: ['街区慢逛免费。', '两杯咖啡/茶饮约 ¥80。', '伴手礼机动预算 ¥40。'] },
      { time: '12:00', name: '中山公园 / 龙之梦午餐', type: '餐饮', note: '午餐选靠近地铁的商场，方便带行李转场；两人预算 ¥180-260。', imageUrl: shanghaiImages.longemont, lat: 31.2182, lng: 121.4165, cost: 220, costDetails: ['龙之梦商场两人午餐约 ¥180。', '饮品/打包小食约 ¥40。'] },
      { time: '14:00', name: '回 Radisson Blu Hotel Shanghai New World 取行李', type: '酒店', note: '提前和前台确认行李可以寄存到 14:00-15:00；若返程较晚，可以把苏河湾或静安补购物放到下午。', imageUrl: hotelRoomImages.radissonRoom, cost: 0, costDetails: ['行李寄存通常不收费。', '如果想延迟退房，到店后再和前台确认。'] },
      { time: '16:00', name: '前往虹桥机场 / 虹桥站', type: '交通', note: '优先从虹桥返深圳，市区到虹桥更稳定；去浦东需额外预留 40-60 分钟。', imageUrl: shanghaiImages.hongqiaoStation, lat: 31.1979, lng: 121.3363, cost: 120, costDetails: ['人民广场到虹桥地铁两人约 ¥14。', '带行李打车/网约车预留约 ¥100。', '机票返程费用已在 Day 1 往返交通预算中计入。'] },
    ],
  },
]

export const shenzhenShanghaiBookingComparison: BookingComparison = {
  title: '深圳到上海前后一天整体比价',
  baseline: '交通和住宿都按明确班次与酒店来排。价格会随日期和余量变化，临近付款前再确认一次就好。',
  cheapestOptionId: 'early',
  recommendedOptionId: 'baseline',
  summary: '纯价格最低是 6 月 30 日提前一天出发，但会多请一天假；综合体验推荐仍选 7 月 1 日上午出发，航班和酒店价格接近低位，行程完整度最好。',
  insights: [
    '高铁备选：G902 二等座两人约 ¥1734，耗时约 7 小时 46 分。',
    '首选住宿：Radisson Blu Shanghai New World，人民广场位置最稳。',
    '直飞 + 人民广场酒店约 ¥6760，适合想把首日晚景保住的安排。',
    '综合推荐仍选 7/1-7/5，少请假且首日外滩夜景完整。',
  ],
  options: [
    {
      id: 'early',
      label: '早一天：6/30-7/4',
      departDate: '2026-06-30',
      returnDate: '2026-07-04',
      hotelNights: 4,
      flightTotal: 2400,
      trainTotal: 1734,
      hotelTotal: 3840,
      totalByFlight: 6240,
      totalByTrain: 5574,
      recommendation: '适合能提前请假、想把首日节奏放慢的人；多出来的一晚会更松弛，但也要多请半天到一天假。',
      flightPlan: '深圳宝安 -> 上海虹桥 / 浦东直飞',
      trainPlan: 'G902 深圳北 11:57-上海虹桥 19:43',
      hotelPlan: 'Radisson Blu Shanghai New World',
      sourceNote: '提前一天更便宜，但多占假期',
      bookingTips: ['航班优先看上午直飞，避开过晚抵达。', '高铁备选 G902，抵达后可直接进市区。', '酒店优先锁 Radisson Blu Hotel Shanghai New World；预算收紧再看 Broadway Mansions Hotel Shanghai。'],
    },
    {
      id: 'baseline',
      label: '原计划：7/1-7/5',
      departDate: '2026-07-01',
      returnDate: '2026-07-05',
      hotelNights: 4,
      flightTotal: 2560,
      trainTotal: 1734,
      hotelTotal: 4200,
      totalByFlight: 6760,
      totalByTrain: 5934,
      recommendation: '综合最推荐：不用额外请假，上午出发还能保住首日晚景，住宿位置也最贴合这条路线。',
      flightPlan: '深圳宝安 -> 上海虹桥 / 浦东直飞',
      trainPlan: 'G902 深圳北 11:57-上海虹桥 19:43',
      hotelPlan: 'Radisson Blu Hotel Shanghai New World',
      sourceNote: '少请假，首日晚景完整',
      bookingTips: ['机票优先筛“深圳宝安 -> 上海虹桥”上午直飞。', '高铁备选 G902，二等座约 ¥867/人。', '酒店选 Radisson Blu Hotel Shanghai New World，人民广场 / 南京西路位置更贴合行程。'],
    },
    {
      id: 'late',
      label: '晚一天：7/2-7/6',
      departDate: '2026-07-02',
      returnDate: '2026-07-06',
      hotelNights: 4,
      flightTotal: 2700,
      trainTotal: 1953,
      hotelTotal: 4560,
      totalByFlight: 7260,
      totalByTrain: 6513,
      recommendation: '适合想把周末完整留在上海的人；缺点是周末住宿更容易涨价，整体预算会比原计划高。',
      flightPlan: '深圳宝安 -> 上海虹桥 / 浦东直飞',
      trainPlan: 'G386 深圳北 14:27-上海虹桥 22:42',
      hotelPlan: 'Broadway Mansions Hotel Shanghai / Fairmont Peace Hotel Shanghai',
      sourceNote: '周末更完整，住宿更贵',
      bookingTips: ['周末酒店可能抬价，建议同步看上海大厦和和平饭店。', '高铁备选 G386，深圳北 14:27 到上海虹桥 22:42。', '返程优先虹桥，少承受浦东远距离转场。'],
    },
  ],
  hotelOptions: [
    {
      name: 'Radisson Blu Hotel Shanghai New World',
      area: '南京西路 88 号 / 人民广场商圈',
      priceHint: '4 晚约 ¥4200，位置稳，适合第一次来上海',
      reason: '人民广场、南京东路和地铁转场都方便，和这条 5 天游路线匹配度最高。',
      imageUrl: hotelRoomImages.radissonExterior,
      roomImages: [
        { url: hotelRoomImages.radissonRoom, label: '客房' },
        { url: hotelRoomImages.radissonSuite, label: '套房' },
      ],
      imageCredit: 'Radisson Hotels',
      sourceUrl: 'https://www.radissonhotels.com/en-us/hotels/radisson-blu-shanghai-new-world',
    },
    {
      name: 'Fairmont Peace Hotel Shanghai',
      area: '南京东路 20 号 / 外滩',
      priceHint: '外滩经典奢华档，适合预算上调时选择',
      reason: '外滩夜景体验最强，适合预算上调时作为氛围感住宿备选。',
      imageUrl: shanghaiImages.peaceHotel,
      roomImages: [
        { url: hotelRoomImages.fairmontKingRoom, label: 'Fairmont 客房' },
        { url: hotelRoomImages.fairmontDeluxeRoom, label: 'Deluxe 客房' },
      ],
      imageCredit: 'Wikimedia Commons',
      sourceUrl: 'https://www.fairmont.com/en/hotels/shanghai/fairmont-peace-hotel.html',
    },
    {
      name: 'Broadway Mansions Hotel Shanghai',
      area: '北苏州路 20 号 / 北外滩',
      priceHint: '4 晚约 ¥2600 起，适合压预算又想靠近北外滩',
      reason: '靠近外白渡桥、北外滩和苏州河，和首晚/延误调整路线都更贴合。',
      imageUrl: hotelRoomImages.shanghaiMansion,
      roomImages: [
        { url: hotelRoomImages.astorLobby, label: '历史大堂' },
        { url: shanghaiImages.northBund, label: '北外滩视角' },
      ],
      imageCredit: 'Wikimedia Commons',
      sourceUrl: 'https://www.booking.com/hotel/cn/broadway-mansions.zh-cn.html',
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
    strategy: '交通优先保留飞机，酒店从 Radisson Blu Hotel Shanghai New World 切到 Broadway Mansions Hotel Shanghai，迪士尼尊享卡不买。',
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

const withAdjustmentNote = (notes: string[], note: string) => [note, ...notes.filter((item) => item !== note)]

export const applyShenzhenShanghaiPlanAdjustment = (plan: TravelPlan | null, text: string): { plan: TravelPlan; message: string } | null => {
  if (!plan?.localOnly || plan.selectedRecommendation.city !== '上海') return null
  const source = text.replace(/\s+/g, '')

  if (/(迪士尼|乐园).*(雨|下雨|暴雨|闭园|项目少)|(?:雨|下雨|暴雨|闭园).*(迪士尼|乐园)/.test(source)) {
    const nextDayPlans = plan.dayPlans.map((dayPlan) => {
      if (dayPlan.day === 3) {
        return {
          ...dayPlan,
          title: '雨天改为陆家嘴与前滩室内线',
          routeSummary: '酒店 -> 陆家嘴中心 / 上海中心 -> 浦东美术馆 -> 前滩太古里 -> 返回市区',
          spots: [
            { time: '09:30', name: '陆家嘴中心 / 上海中心商圈', type: '景点', note: '把原迪士尼日改成室内为主，先在陆家嘴完成城市天际线、商场和观景备选；暴雨时减少户外步行。', imageUrl: shanghaiImages.lujiazui, lat: 31.234, lng: 121.507, cost: 160, costDetails: ['上海中心/环球金融中心观景二选一，保守预留两人 ¥120。', '地铁与咖啡补给约 ¥40。'] },
            { time: '12:30', name: '陆家嘴室内午餐', type: '餐饮', note: '选择国金中心、正大广场或上海中心内餐厅，两人预算压到 ¥220-320，方便避雨。', imageUrl: shanghaiImages.ifcMall, lat: 31.236, lng: 121.502, cost: 280, costDetails: ['商场餐厅两人主餐约 ¥220。', '饮品/服务费预留 ¥60。'] },
            { time: '14:30', name: '浦东美术馆 / 室内展馆', type: '景点', note: '若展览预约合适，下午安排浦东美术馆；没有票则改上海中心观光或商场慢逛。', imageUrl: shanghaiImages.pudongArtMuseum, lat: 31.239, lng: 121.499, cost: 240, costDetails: ['两人展览票按 ¥160-200 预留。', '寄存/饮水/短途转场约 ¥40。'] },
            { time: '17:30', name: '前滩太古里晚餐与休整', type: '餐饮', note: '雨天不赶远路，前滩太古里完成晚餐和轻购物；第二天早起再去迪士尼。', imageUrl: shanghaiImages.qiantanTaikooLi, lat: 31.153, lng: 121.478, cost: 420, costDetails: ['两人晚餐约 ¥320。', '饮品/甜品约 ¥70。', '返回酒店交通预留 ¥30。'] },
          ],
        } satisfies DayPlan
      }
      if (dayPlan.day === 4) {
        return {
          ...dayPlan,
          title: '迪士尼顺延一日',
          routeSummary: '上海迪士尼度假区；原博物馆与苏河湾压缩为 Day 5 上午或取消',
          spots: dayPlans[2].spots.map((spot) => ({
            ...spot,
            note: spot.name.includes('上海迪士尼乐园') ? `${spot.note} 这是从 Day 3 顺延过来的版本，建议提前查看门票改签和天气。` : spot.note,
          })),
        } satisfies DayPlan
      }
      if (dayPlan.day === 5) {
        return {
          ...dayPlan,
          routeSummary: '愚园路轻逛 -> 可补上海博物馆 / 苏河湾短线 -> 虹桥返程',
          spots: dayPlan.spots.map((spot) =>
            spot.name.includes('愚园路')
              ? { ...spot, note: '如果 Day 4 顺延迪士尼，最后一天只保留轻量街区；想补博物馆就缩短愚园路，避免返程紧张。' }
              : spot,
          ),
        } satisfies DayPlan
      }
      return dayPlan
    })

    return {
      plan: {
        ...plan,
        dayPlans: nextDayPlans,
        notes: withAdjustmentNote(plan.notes, '迪士尼遇雨时，Day 3 走室内浦东线，Day 4 再顺延迪士尼。'),
      },
      message: '已把行程改好了：Day 3 不硬去迪士尼，改成陆家嘴、浦东美术馆和前滩太古里室内线；Day 4 顺延迪士尼，Day 5 压缩成轻松返程。你现在去“行程”页看 Day 3 和 Day 4 就是新安排。',
    }
  }

  if (/(航班|飞机|高铁).*(延误|晚点|迟到|很晚到|晚上到)|(?:延误|晚点|迟到|很晚到|晚上到).*(航班|飞机|高铁|到上海)/.test(source)) {
    const nextDayPlans = plan.dayPlans.map((dayPlan) => {
      if (dayPlan.day === 1) {
        return {
          ...dayPlan,
          title: '延误抵达后的轻量外滩夜景',
          routeSummary: '延误抵达 -> 酒店入住 -> 外滩源 / 北外滩短线 -> 酒店休息',
          spots: [
            { time: '18:30', name: '抵达上海并入住 Radisson Blu Hotel Shanghai New World', type: '酒店', note: '取消下午南京东路慢逛，先把行李和入住搞定；如果 20:00 后到，只保留酒店附近晚餐。', imageUrl: hotelRoomImages.radissonExterior, lat: 31.2355, lng: 121.4752, cost: 4200, costDetails: ['Radisson Blu Hotel Shanghai New World 4 晚约 ¥4200。', '延误不影响当晚入住，保留酒店确认单并提前说明到店时间。'] },
            { time: '20:00', name: '外滩源 / 北外滩短线', type: '景点', note: '只做 60-90 分钟夜景，不再跨太多点；如果太累，改为酒店附近散步。', imageUrl: shanghaiImages.northBund, lat: 31.2503, lng: 121.4985, cost: 40, costDetails: ['夜景拍照免费。', '从酒店到外滩源/北外滩短途交通约 ¥40。'] },
            { time: '21:30', name: 'Radisson Blu 周边晚餐与休息', type: '餐饮', note: '晚餐选南京东路或人民广场附近，避免排队店，两人控制 ¥180-280。', imageUrl: shanghaiImages.xiaolongbao, lat: 31.2355, lng: 121.4752, cost: 240, costDetails: ['两人简餐/本帮小吃约 ¥190。', '饮品和服务费预留 ¥50。'] },
          ],
        } satisfies DayPlan
      }
      if (dayPlan.day === 5) {
        return {
          ...dayPlan,
          title: '补回南京东路与轻松返程',
          routeSummary: '南京东路 / 外滩源补逛 -> 午餐 -> 取行李 -> 虹桥返程',
          spots: [
            { time: '09:30', name: '南京东路与外滩源补逛', type: '景点', note: '把首日取消的南京东路、外滩源补到返程日上午，拍照和伴手礼都更从容。', imageUrl: shanghaiImages.nanjingRoad, lat: 31.2397, lng: 121.4902, cost: 80, costDetails: ['街区参观免费。', '伴手礼/饮品预留 ¥80。'] },
            ...dayPlan.spots.slice(1),
          ],
        } satisfies DayPlan
      }
      return dayPlan
    })

    return {
      plan: {
        ...plan,
        dayPlans: nextDayPlans,
        notes: withAdjustmentNote(plan.notes, '首日交通延误时，Day 1 保留短夜景，Day 5 上午补回南京东路。'),
      },
      message: '已调整：Day 1 改成延误抵达后的轻量外滩夜景，不再硬逛南京东路；南京东路和外滩源补到 Day 5 上午。去“行程”页看 Day 1 和 Day 5 就能看到变化。',
    }
  }

  if (/(预算|钱|花费|费用).*(8000|八千|收紧|降低|压缩|省钱)|(?:8000|八千).*(预算|以内|左右)/.test(source)) {
    const nextDayPlans = plan.dayPlans.map((dayPlan) => {
      if (dayPlan.day === 1 || dayPlan.day === 5) {
        return {
          ...dayPlan,
          routeSummary: dayPlan.routeSummary.replace(/Radisson Blu Hotel Shanghai New World/g, 'Broadway Mansions Hotel Shanghai'),
          spots: dayPlan.spots.map((spot) => {
            if (spot.type === '酒店') {
              return {
                ...spot,
                name: spot.name.includes('取行李') ? '回 Broadway Mansions Hotel Shanghai 取行李' : 'Broadway Mansions Hotel Shanghai 入住',
                address: '上海市北苏州路 20 号 / 北外滩',
                note: spot.name.includes('取行李')
                  ? '预算收紧后改住 Broadway Mansions Hotel Shanghai，返程前回酒店取寄存行李，再去虹桥机场 / 虹桥站。'
                  : '预算收紧后改住 Broadway Mansions Hotel Shanghai，靠近北外滩和外白渡桥，保留首晚夜景优势。',
                imageUrl: hotelRoomImages.shanghaiMansion,
                cost: spot.name.includes('取行李') ? 0 : 2600,
                costDetails: spot.name.includes('取行李')
                  ? ['行李寄存通常不收费，到店时和前台确认即可。']
                  : ['Broadway Mansions Hotel Shanghai 4 晚约 ¥2600。', '7/1 入住、7/5 退房；订房前再核对房型和退改规则。'],
              }
            }
            return spot
          }),
        } satisfies DayPlan
      }
      if (dayPlan.day === 2 || dayPlan.day === 4) {
        return {
          ...dayPlan,
          spots: dayPlan.spots.map((spot) =>
            spot.type === '餐饮'
              ? {
                  ...spot,
                  note: `${spot.note} 预算收紧后，这一餐优先选商圈简餐或本帮小馆，不做高客单约会餐。`,
                  cost: Math.min(spot.cost ?? 260, 260),
                  costDetails: ['两人商圈简餐/本帮小馆控制在 ¥180-220。', '饮品和服务费预留 ¥40。'],
                }
              : spot,
          ),
        } satisfies DayPlan
      }
      if (dayPlan.day === 3) {
        return {
          ...dayPlan,
          spots: dayPlan.spots.map((spot) =>
            spot.name.includes('上海迪士尼乐园')
              ? { ...spot, note: '保留迪士尼门票，但不买尊享卡，只抓 4 个核心项目；若当日排队过长，转迪士尼小镇和低排队项目。', cost: 1180, costDetails: ['两张标准日门票约 ¥950-1100。', '不买尊享卡，园内机动控制在 ¥80 左右。'] }
              : spot.name.includes('Radisson Blu')
                ? {
                    ...spot,
                    name: spot.name.replace(/Radisson Blu(?: Hotel Shanghai New World)?/g, 'Broadway Mansions Hotel Shanghai'),
                    note: spot.note.replace(/人民广场/g, '北外滩'),
                    imageUrl: hotelRoomImages.shanghaiMansion,
                  }
                : spot,
          ),
        } satisfies DayPlan
      }
      return dayPlan
    })

    return {
      plan: {
        ...plan,
        dayPlans: nextDayPlans,
        budget: {
          ...plan.budget,
          total: 7980,
          hotel: 2600,
          food: 1280,
          transportation: 560,
          tickets: 1180,
          insurance: 100,
          flexible: 200,
        },
        notes: withAdjustmentNote(plan.notes, '预算收紧到 ¥8000 左右时，住宿切到 Broadway Mansions Hotel Shanghai，餐饮更轻，迪士尼不加尊享卡。'),
      },
      message: '已把预算版改好：总预算压到约 ¥7980，酒店从 Radisson Blu Hotel Shanghai New World 切到 Broadway Mansions Hotel Shanghai，餐饮减少高客单约会餐，迪士尼保留但不买尊享卡。你可以在“行程”的预算分配和 Day 2、Day 3、Day 4 看到变化。',
    }
  }

  if (/(购物|买东西|逛商场|买礼物|伴手礼|少走景点|减少景点|不想逛景点)/.test(source)) {
    const nextDayPlans = plan.dayPlans.map((dayPlan) => {
      if (dayPlan.day === 4) {
        return {
          ...dayPlan,
          title: '苏河湾、静安与购物加量',
          routeSummary: '上海博物馆短逛 -> 苏河湾万象天地 -> 静安寺商圈 -> 巨鹿路晚餐',
          spots: dayPlan.spots.map((spot) => {
            if (spot.name.includes('上海博物馆')) {
              return { ...spot, note: '博物馆压缩到 90 分钟，只看重点展厅，把下午时间留给苏河湾和静安购物。' }
            }
            if (spot.name.includes('静安寺')) {
              return { ...spot, name: '静安寺外观 + 久光 / 芮欧购物', note: '这里改成购物主线：久光、芮欧、晶品都在步行范围，适合买香氛、服饰和伴手礼。', cost: 300 }
            }
            return spot
          }),
        } satisfies DayPlan
      }
      if (dayPlan.day === 5) {
        return {
          ...dayPlan,
          title: '伴手礼与轻松返程',
          routeSummary: '愚园路咖啡 -> 中山公园 / 龙之梦购物 -> 取行李返程',
          spots: dayPlan.spots.map((spot) =>
            spot.name.includes('中山公园')
              ? { ...spot, name: '中山公园 / 龙之梦午餐与补购物', note: '返程日前半天集中买伴手礼和补购物，选靠近地铁的商场，带行李也不折腾。', cost: 360 }
              : spot,
          ),
        } satisfies DayPlan
      }
      return dayPlan
    })

    return {
      plan: {
        ...plan,
        dayPlans: nextDayPlans,
        notes: withAdjustmentNote(plan.notes, '想多留购物时间时，Day 4 加静安商圈，Day 5 留伴手礼时间。'),
      },
      message: '已调整成购物更友好的版本：Day 4 博物馆缩短，静安寺商圈加久光、芮欧和晶品；Day 5 在中山公园 / 龙之梦补伴手礼。去“行程”页看 Day 4 和 Day 5 就是新路线。',
    }
  }

  return null
}

export function buildShenzhenShanghaiLocalPlan(profile: TravelProfile): TravelPlan {
  return {
    source: 'local-preset',
    localOnly: true,
    recommendations: [shanghaiRecommendation],
    selectedRecommendation: shanghaiRecommendation,
    dayPlans,
    budget: {
      total: 11060,
      flight: 2560,
      hotel: 4200,
      food: 1850,
      transportation: 650,
      tickets: 1380,
      insurance: 120,
      flexible: 300,
    },
    policyCards: [
      { title: '行程定位', summary: '方案围绕深圳往返上海的 5 天情侣出游设计，兼顾外滩夜景、城市街区、迪士尼主题体验和前后一天预订比价。', level: '重要' },
      { title: '上海 7 月天气', summary: '湿热、午后阵雨概率高。上午安排户外街区，下午安排展馆 / 商场，傍晚再去夜景点。', level: '建议' },
      { title: '预约优先级', summary: '先定迪士尼门票、博物馆预约和可取消酒店；交通价格合适时就可以锁定。', level: '提醒' },
    ],
    monitors: [
      { id: 'local-shanghai-flight', category: '机票', target: '深圳 SZX -> 上海 SHA/PVG 往返 2 人', currentPrice: 2560, expectedPrice: 2400, trend: [2960, 2820, 2680, 2560, 2480, 2560], status: '接近低价', enabled: true },
      { id: 'local-shanghai-hotel', category: '酒店', target: 'Radisson Blu Shanghai New World 4 晚', currentPrice: 4200, expectedPrice: 3900, trend: [4680, 4520, 4360, 4200, 4080, 4200], status: '观察中', enabled: true },
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
      '该方案预算按两人计算；如果选择直飞 + Radisson Blu Hotel Shanghai New World，舒适档可能略超 ¥10000，可用 G902 高铁或 Broadway Mansions Hotel Shanghai 压回预算。',
      '交通和住宿都落到具体班次与酒店；出发前再确认价格、房型和退改规则。',
      shenzhenShanghaiBookingComparison.summary,
    ],
    spotRecommendations,
    bookingComparison: shenzhenShanghaiBookingComparison,
    contingencyPlans,
  }
}
