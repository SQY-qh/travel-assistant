import type { OutfitSuggestion, TravelProfile } from '@/types/travel'

type OutfitCatalogItem = Required<Pick<OutfitSuggestion, 'title' | 'mood' | 'pieces' | 'imageUrl' | 'gender' | 'scenario' | 'keywords' | 'interpretation'>>

const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`

export const outfitCatalog: OutfitCatalogItem[] = [
  {
    title: '城市漫游轻量穿搭',
    gender: '女',
    scenario: '城市漫游',
    imageUrl: assetUrl('outfits/citywalk-women.jpg'),
    keywords: ['透气', '耐走', '防晒', '可拍照'],
    interpretation: '适合博物馆、老街、湖边和商圈之间连续步行，浅色上衣降低闷热感，运动鞋保证全天舒适。',
    mood: '清爽、轻便、适合长时间 citywalk',
    pieces: ['亚麻衬衫', '阔腿裤', '舒适运动鞋', '小挎包', '太阳镜', '折叠伞'],
  },
  {
    title: '城市漫游轻量穿搭',
    gender: '男',
    scenario: '城市漫游',
    imageUrl: assetUrl('outfits/citywalk-men.jpg'),
    keywords: ['透气', '耐走', '轻便', '防晒'],
    interpretation: '适合白天高频转场，短袖外搭和直筒裤兼顾清爽与得体，小包方便放证件和充电宝。',
    mood: '干净、实用、适合城市步行',
    pieces: ['轻薄短袖外搭', '透气 T 恤', '直筒休闲裤', '步行鞋', '斜挎包', '水杯'],
  },
  {
    title: '雨天室内机动穿搭',
    gender: '女',
    scenario: '雨天室内',
    imageUrl: assetUrl('outfits/rainy-indoor-women.jpg'),
    keywords: ['防雨', '防滑', '室内外切换', '收纳'],
    interpretation: '适合雨天、博物馆和商场路线，防水外套与深色裤装更耐脏，双肩包适合放雨具。',
    mood: '轻防雨、耐走、适合博物馆和商场',
    pieces: ['轻薄防水外套', '浅色 T 恤', '深色直筒裤', '防滑步行鞋', '双肩包', '折叠伞'],
  },
  {
    title: '雨天室内机动穿搭',
    gender: '男',
    scenario: '雨天室内',
    imageUrl: assetUrl('outfits/rainy-indoor-men.jpg'),
    keywords: ['防雨', '速干', '耐走', '功能包'],
    interpretation: '适合阵雨和室内展馆切换，防水壳与速干裤减少湿冷感，背包便于收纳雨伞和外套。',
    mood: '稳妥、功能性强、适合雨天转场',
    pieces: ['防水壳外套', '透气 T 恤', '速干长裤', '防水步行鞋', '功能双肩包', '充电宝'],
  },
  {
    title: '晚间餐厅与夜景穿搭',
    gender: '女',
    scenario: '晚间餐厅',
    imageUrl: assetUrl('outfits/evening-dinner-women.jpg'),
    keywords: ['利落', '夜景', '轻正式', '舒适'],
    interpretation: '适合江滩、夜景平台和餐厅场景，深色外搭提升精致度，低帮鞋保证夜间步行不累。',
    mood: '比白天更精致，但不牺牲舒适度',
    pieces: ['深色薄外套', '黑色内搭', '直筒裤或半裙', '低帮休闲鞋', '小挎包', '金属配饰'],
  },
  {
    title: '晚间餐厅与夜景穿搭',
    gender: '男',
    scenario: '晚间餐厅',
    imageUrl: assetUrl('outfits/evening-dinner-men.jpg'),
    keywords: ['利落', '轻正式', '夜景', '不闷热'],
    interpretation: '适合晚餐、酒吧街和江边夜景，深色轻外套看起来更完整，休闲鞋保留旅行机动性。',
    mood: '克制、精神、适合夜间城市活动',
    pieces: ['深色轻外套', '黑色 T 恤', '直筒长裤', '低帮休闲鞋', '斜挎包', '腕表'],
  },
  {
    title: '海边度假防晒穿搭',
    gender: '女',
    scenario: '海边度假',
    imageUrl: assetUrl('outfits/beach-women.jpg'),
    keywords: ['防晒', '透气', '可下水', '度假感'],
    interpretation: '适合海边、岛屿和温暖目的地，宽松外衫和帽子负责防晒，凉鞋方便沙滩和步道切换。',
    mood: '轻松、明亮、适合海边和度假酒店',
    pieces: ['防晒罩衫', '透气背心', '宽松短裤或半裙', '凉鞋', '草编帽', '托特包'],
  },
  {
    title: '海边度假防晒穿搭',
    gender: '男',
    scenario: '海边度假',
    imageUrl: assetUrl('outfits/beach-men.jpg'),
    keywords: ['防晒', '速干', '轻便', '沙滩友好'],
    interpretation: '适合沙滩、海滨步道和度假酒店，亚麻衬衫防晒又透气，速干短裤方便临时下水。',
    mood: '清爽、松弛、适合热带旅行',
    pieces: ['亚麻衬衫', '速干短裤', '凉鞋', '遮阳帽', '太阳镜', '帆布包'],
  },
  {
    title: '寒冷城市叠穿',
    gender: '女',
    scenario: '寒冷城市',
    imageUrl: assetUrl('outfits/cold-layer-women.jpg'),
    keywords: ['保暖', '叠穿', '防风', '可步行'],
    interpretation: '适合冬季城市旅行，内层保暖、外层防风，围巾和手套能明显提升长时间户外舒适度。',
    mood: '温暖、克制、适合冬季城市漫游',
    pieces: ['羊毛大衣', '保暖内搭', '针织衫', '直筒长裤', '短靴', '围巾手套'],
  },
  {
    title: '寒冷城市叠穿',
    gender: '男',
    scenario: '寒冷城市',
    imageUrl: assetUrl('outfits/cold-layer-men.jpg'),
    keywords: ['保暖', '防风', '叠穿', '耐走'],
    interpretation: '适合低温城市和冬季夜间活动，大衣负责防风，毛衣和保暖内搭负责温度，靴子更适合长时间步行。',
    mood: '稳重、保暖、适合冬季城市路线',
    pieces: ['羊毛大衣', '保暖内搭', '圆领毛衣', '厚长裤', '皮靴', '围巾手套'],
  },
]

const scoreOutfit = (item: OutfitCatalogItem, profile: TravelProfile, city: string) => {
  const text = [
    city,
    profile.destinationIntent,
    profile.dateRange,
    profile.travelers,
    profile.accommodationPreference,
    profile.transportPreference,
    ...profile.travelStyle,
    profile.notes,
  ].join(' ')
  let score = 0
  if (/海边|海岛|海滩|岛屿|三亚|厦门|青岛|新加坡|普吉|沙滩/.test(text) && item.scenario === '海边度假') score += 8
  if (/冬|冷|雪|哈尔滨|北京|首尔|伦敦|巴黎|12月|1月|2月/.test(text) && item.scenario === '寒冷城市') score += 8
  if (/雨|梅雨|博物馆|省博|展|室内/.test(text) && item.scenario === '雨天室内') score += 6
  if (/夜|晚餐|约会|情侣|江滩|酒吧|夜景/.test(text) && item.scenario === '晚间餐厅') score += 5
  if (/城市|慢逛|历史|美食|购物|武汉|成都|上海|东京|杭州|南京|西安/.test(text) && item.scenario === '城市漫游') score += 6
  if (item.gender === '女') score += 1
  return score
}

export const selectOutfitsForTrip = (profile: TravelProfile, city: string, limit = 4): OutfitSuggestion[] => {
  const ranked = [...outfitCatalog]
    .map((item) => ({ item, score: scoreOutfit(item, profile, city) }))
    .sort((left, right) => right.score - left.score)

  const picked: OutfitCatalogItem[] = []
  const usedScenarios = new Set<string>()
  const usedGenderScenario = new Set<string>()

  for (const { item } of ranked) {
    const pairKey = `${item.scenario}-${item.gender}`
    if (usedGenderScenario.has(pairKey)) continue
    if (usedScenarios.has(item.scenario) && picked.some((pickedItem) => pickedItem.scenario === item.scenario && pickedItem.gender === item.gender)) continue
    picked.push(item)
    usedGenderScenario.add(pairKey)
    usedScenarios.add(item.scenario)
    if (picked.length >= limit) break
  }

  for (const item of outfitCatalog) {
    if (picked.length >= limit) break
    if (!picked.some((pickedItem) => pickedItem.imageUrl === item.imageUrl)) picked.push(item)
  }

  return picked
}
