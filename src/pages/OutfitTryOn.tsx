import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, ChevronLeft, ChevronRight, Images, Shirt } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useTravelStore } from '@/store/useTravelStore'
import { cn } from '@/lib/utils'
import type { OutfitSuggestion } from '@/types/travel'

type TryOnImage = {
  src: string
  label: string
}

type TryOnPreset = {
  label: string
  glow: string
  images: TryOnImage[]
}

const assetUrl = (path: string) => `${import.meta.env.BASE_URL}${path.replace(/^\//, '')}`

const img = (name: string, label: string): TryOnImage => ({
  src: assetUrl(`voya-tryon/${name}.png`),
  label,
})

const presets = {
  cityWomen: {
    label: '城市漫游',
    glow: 'rgba(199, 143, 76, 0.22)',
    images: [
      img('citywalk-women-01', '正面试穿'),
      img('citywalk-women-02', '步行动作'),
      img('citywalk-women-03', '展示动作'),
    ],
  },
  cityMen: {
    label: '城市漫游',
    glow: 'rgba(126, 101, 70, 0.2)',
    images: [
      img('citywalk-men-01', '正面试穿'),
      img('citywalk-men-02', '步行动作'),
      img('citywalk-men-03', '展示动作'),
    ],
  },
  rainyWomen: {
    label: '雨天机动',
    glow: 'rgba(109, 145, 130, 0.2)',
    images: [
      img('rainy-women-01', '正面试穿'),
      img('rainy-women-02', '步行动作'),
      img('rainy-women-03', '展示动作'),
    ],
  },
  eveningWomen: {
    label: '夜景约会',
    glow: 'rgba(184, 138, 83, 0.2)',
    images: [
      img('evening-women-01', '正面试穿'),
      img('evening-women-02', '步行动作'),
      img('evening-women-03', '展示动作'),
    ],
  },
  eveningMen: {
    label: '夜景约会',
    glow: 'rgba(44, 38, 34, 0.2)',
    images: [
      img('evening-men-01', '正面试穿'),
      img('evening-men-02', '步行动作'),
      img('evening-men-03', '展示动作'),
    ],
  },
} satisfies Record<string, TryOnPreset>

const resolvePreset = (outfit?: OutfitSuggestion): TryOnPreset => {
  const text = `${outfit?.title ?? ''} ${outfit?.scenario ?? ''} ${outfit?.pieces?.join(' ') ?? ''}`
  const isMan = outfit?.gender === '男'

  if (/雨|防水|雨天/.test(text)) return presets.rainyWomen
  if (/晚|夜|餐厅|黑色|深色/.test(text)) return isMan ? presets.eveningMen : presets.eveningWomen
  if (/城市|漫游|citywalk|步行|衬衫|短袖|阔腿裤|直筒裤/.test(text)) return isMan ? presets.cityMen : presets.cityWomen
  return presets.cityWomen
}

export default function OutfitTryOn() {
  const navigate = useNavigate()
  const params = useParams()
  const plan = useTravelStore((state) => state.plan)
  const outfits = plan?.outfitSuggestions ?? []
  const rawIndex = Number(params.index ?? 0)
  const activeIndex = Number.isFinite(rawIndex)
    ? Math.min(Math.max(rawIndex, 0), Math.max(outfits.length - 1, 0))
    : 0
  const outfit = outfits[activeIndex]
  const preset = useMemo(() => resolvePreset(outfit), [outfit])
  const [activeImageIndex, setActiveImageIndex] = useState(0)
  const pieces = outfit?.pieces ?? ['亚麻衬衫', '阔腿裤', '舒适运动鞋', '小挎包']
  const activeImage = preset.images[activeImageIndex] ?? preset.images[0]

  useEffect(() => {
    setActiveImageIndex(0)
  }, [activeIndex, preset])

  useEffect(() => {
    const timer = window.setInterval(() => {
      setActiveImageIndex((current) => (current + 1) % preset.images.length)
    }, 2200)
    return () => window.clearInterval(timer)
  }, [preset.images.length])

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate('/prepare')
  }

  const goToImage = (direction: -1 | 1) => {
    setActiveImageIndex((current) => (current + direction + preset.images.length) % preset.images.length)
  }

  return (
    <div className="relative min-h-full bg-[#fbf8f1] px-4 py-4">
      <div
        className="pointer-events-none absolute inset-x-6 top-20 h-80 rounded-full blur-3xl"
        style={{ backgroundColor: preset.glow }}
      />
      <button
        type="button"
        onClick={goBack}
        className="sticky left-3 top-3 z-50 inline-flex items-center gap-1.5 rounded-full bg-stone-950 px-3.5 py-2 text-xs font-semibold text-white shadow-[0_12px_26px_rgba(28,25,23,0.22)]"
        aria-label="返回上一页"
      >
        <ArrowLeft className="h-4 w-4" />
        返回
      </button>

      <section className="relative z-10 -mt-1 rounded-[32px] border border-white/80 bg-white/62 px-4 pb-5 pt-5 shadow-[0_22px_55px_rgba(82,61,34,0.14)]">
        <div className="relative mx-auto h-[430px] overflow-hidden rounded-[30px] bg-white shadow-[inset_0_0_0_1px_rgba(255,255,255,0.8)]">
          <img
            key={activeImage.src}
            src={activeImage.src}
            alt={`VOYA ${outfit?.title ?? '试穿'}${activeImage.label}`}
            className="try-on-photo h-full w-full object-contain"
            loading="eager"
            decoding="async"
          />
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-white/92 to-transparent" />
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/88 px-3 py-2 text-[11px] font-medium text-stone-700 shadow-sm backdrop-blur">
            <Images className="h-3.5 w-3.5 text-amber-700" />
            VOYA 试穿图 · {activeImage.label}
          </div>
          <button
            type="button"
            onClick={() => goToImage(-1)}
            className="absolute left-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-stone-700 shadow-sm backdrop-blur"
            aria-label="上一张试穿图"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => goToImage(1)}
            className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/80 text-stone-700 shadow-sm backdrop-blur"
            aria-label="下一张试穿图"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>

        <div className="mt-4 text-center">
          <div className="inline-flex items-center gap-2 rounded-full bg-stone-950 px-3 py-1.5 text-[11px] font-semibold text-white">
            <Shirt className="h-3.5 w-3.5 text-amber-200" />
            第 {activeIndex + 1} 套
          </div>
          <h1 className="mt-3 text-xl font-semibold leading-snug text-stone-950">
            {outfit?.title ?? 'VOYA 试穿'}
          </h1>
          <p className="mx-auto mt-2 max-w-[280px] text-xs leading-6 text-stone-500">
            {outfit?.mood ?? '这套以轻便和耐走为主，适合在城市里连续转场。'}
          </p>
        </div>
      </section>

      <section className="relative z-10 mt-4 rounded-[28px] border border-white/80 bg-white/74 p-4 shadow-sm">
        <p className="text-[11px] uppercase tracking-[0.22em] text-stone-400">Try-on Gallery</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {preset.images.map((image, index) => (
            <button
              key={image.src}
              type="button"
              onClick={() => setActiveImageIndex(index)}
              className={cn(
                'overflow-hidden rounded-2xl border bg-white p-1 shadow-sm transition',
                index === activeImageIndex ? 'border-stone-950' : 'border-stone-100',
              )}
              aria-label={`查看${image.label}`}
            >
              <img src={image.src} alt={image.label} className="h-20 w-full rounded-xl object-cover object-top" loading="eager" decoding="async" />
              <span className="mt-1 block text-[10px] font-medium text-stone-500">{image.label}</span>
            </button>
          ))}
        </div>
      </section>

      <section className="relative z-10 mt-4 rounded-[28px] border border-white/80 bg-white/74 p-4 shadow-sm">
        <p className="text-[11px] uppercase tracking-[0.22em] text-stone-400">Outfit Pieces</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {pieces.slice(0, 6).map((piece) => (
            <span key={piece} className="rounded-full bg-amber-50 px-3 py-2 text-[11px] font-medium text-amber-800">
              {piece}
            </span>
          ))}
        </div>
        {outfit?.interpretation ? (
          <p className="mt-3 text-xs leading-6 text-stone-600">{outfit.interpretation}</p>
        ) : null}
      </section>
    </div>
  )
}
