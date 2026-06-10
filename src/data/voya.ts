const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`

export type VoyaMotionState = 'greeting' | 'listening' | 'nodding' | 'sharing' | 'talking'

export const voyaMotionVideos: Record<VoyaMotionState, string> = {
  greeting: assetUrl('voya/greeting.mp4'),
  listening: assetUrl('voya/listening.mp4'),
  nodding: assetUrl('voya/nodding.mp4'),
  sharing: assetUrl('voya/sharing.mp4'),
  talking: assetUrl('voya/talking.mp4'),
}

export const voyaMotionLabels: Record<VoyaMotionState, string> = {
  greeting: 'VOYA 打招呼',
  listening: 'VOYA 倾听',
  nodding: 'VOYA 点头',
  sharing: 'VOYA 分享行程',
  talking: 'VOYA 说话',
}
