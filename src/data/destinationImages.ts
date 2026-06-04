const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`

const destinationCoverMap: Record<string, string> = {
  上海: 'destinations/shanghai.svg',
  沈阳: 'destinations/shenyang.svg',
  北京: 'destinations/beijing.svg',
  东京: 'destinations/tokyo.svg',
  成都: 'destinations/chengdu.svg',
  新加坡: 'destinations/singapore.svg',
}

const destinationAliases: Array<[RegExp, string]> = [
  [/shanghai|上海/i, '上海'],
  [/shenyang|沈阳/i, '沈阳'],
  [/beijing|北京/i, '北京'],
  [/tokyo|东京/i, '东京'],
  [/chengdu|成都/i, '成都'],
  [/singapore|新加坡/i, '新加坡'],
]

export const destinationCoverImage = (value = '') => {
  const matchedCity = destinationAliases.find(([pattern]) => pattern.test(value))?.[1]
  return assetUrl(destinationCoverMap[matchedCity || ''] || 'destinations/city.svg')
}

export const hasOutfitCoverImage = (value = '') => /\/outfits\/|^outfits\//.test(value)
