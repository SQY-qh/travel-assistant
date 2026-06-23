import { useMemo } from 'react'
import { ArrowLeft, Shirt, Sparkles } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import VoyaAvatar from '@/components/common/VoyaAvatar'
import { useTravelStore } from '@/store/useTravelStore'
import { cn } from '@/lib/utils'
import type { OutfitSuggestion } from '@/types/travel'

type TryOnPalette = {
  top: string
  bottom: string
  accent: string
  shoe: string
  bag: string
  glow: string
  label: string
}

const pickPalette = (outfit?: OutfitSuggestion): TryOnPalette => {
  const text = `${outfit?.title ?? ''} ${outfit?.scenario ?? ''} ${outfit?.pieces?.join(' ') ?? ''}`
  const isWoman = outfit?.gender !== '男'

  if (/雨|防水|雨天/.test(text)) {
    return {
      top: '#d9e3df',
      bottom: '#2f3437',
      accent: '#7d9a8a',
      shoe: '#263238',
      bag: '#3d4d4a',
      glow: 'rgba(109, 145, 130, 0.2)',
      label: '雨天机动',
    }
  }

  if (/晚|夜|餐厅|黑色|深色/.test(text)) {
    return {
      top: isWoman ? '#171412' : '#24201d',
      bottom: isWoman ? '#332d2b' : '#3b312e',
      accent: '#b88a53',
      shoe: '#1f1c1a',
      bag: '#171412',
      glow: 'rgba(184, 138, 83, 0.2)',
      label: '夜景约会',
    }
  }

  if (/海|沙滩|防晒|度假/.test(text)) {
    return {
      top: '#f5e4c8',
      bottom: isWoman ? '#8fc0c3' : '#87a9b6',
      accent: '#d9a45d',
      shoe: '#d5b083',
      bag: '#b88952',
      glow: 'rgba(126, 185, 189, 0.24)',
      label: '海边轻装',
    }
  }

  if (/冷|大衣|保暖|羊毛|针织/.test(text)) {
    return {
      top: '#5d554b',
      bottom: '#2f3437',
      accent: '#b79b6e',
      shoe: '#342820',
      bag: '#3d342c',
      glow: 'rgba(109, 92, 73, 0.2)',
      label: '叠穿保暖',
    }
  }

  return {
    top: isWoman ? '#f8f5ec' : '#e7e2d5',
    bottom: isWoman ? '#aab89b' : '#3f4a43',
    accent: '#c78f4c',
    shoe: '#efe6d6',
    bag: isWoman ? '#d7c4a9' : '#6e543c',
    glow: 'rgba(199, 143, 76, 0.2)',
    label: '城市漫游',
  }
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
  const palette = useMemo(() => pickPalette(outfit), [outfit])
  const pieces = outfit?.pieces ?? ['轻量上衣', '舒适下装', '耐走鞋', '随身小包']

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
      return
    }
    navigate('/prepare')
  }

  return (
    <div className="relative min-h-full overflow-hidden bg-[#fbf8f1] px-4 py-5">
      <div
        className="pointer-events-none absolute inset-x-8 top-20 h-72 rounded-full blur-3xl"
        style={{ backgroundColor: palette.glow }}
      />
      <div className="relative z-10 flex items-center justify-between">
        <button
          type="button"
          onClick={goBack}
          className="inline-flex h-11 w-11 items-center justify-center rounded-full bg-white/82 text-stone-800 shadow-sm backdrop-blur"
          aria-label="返回上一页"
        >
          <ArrowLeft className="h-5 w-5" />
        </button>
        <span className="rounded-full bg-white/82 px-3 py-1.5 text-[11px] font-semibold text-stone-600 shadow-sm backdrop-blur">
          {palette.label}
        </span>
      </div>

      <section className="relative z-10 mt-7 rounded-[32px] border border-white/80 bg-white/55 px-4 pb-5 pt-6 shadow-[0_22px_55px_rgba(82,61,34,0.14)]">
        <div className="relative mx-auto h-[410px] w-[268px]">
          <div className="try-on-floor absolute bottom-9 left-1/2 h-12 w-48 -translate-x-1/2 rounded-full bg-stone-900/10 blur-md" />
          <div className="try-on-walk absolute left-1/2 top-0 h-[366px] w-[250px] -translate-x-1/2">
            <VoyaAvatar state="sharing" size="call" className="try-on-avatar h-[354px] w-[250px] rounded-[56px]" />
            <div className="pointer-events-none absolute left-1/2 top-[136px] h-[92px] w-[92px] -translate-x-1/2">
              <span
                className="try-on-top absolute left-1/2 top-0 block h-[102px] w-[92px] -translate-x-1/2 rounded-[30px_30px_22px_22px] border border-white/50 shadow-[inset_0_14px_22px_rgba(255,255,255,0.22)]"
                style={{ backgroundColor: palette.top }}
              />
              <span
                className="try-on-accent absolute left-1/2 top-8 block h-2.5 w-20 -translate-x-1/2 rounded-full"
                style={{ backgroundColor: palette.accent }}
              />
              <span
                className="try-on-bottom absolute left-1/2 top-[82px] block h-[86px] w-[74px] -translate-x-1/2 rounded-[16px_16px_28px_28px]"
                style={{ backgroundColor: palette.bottom }}
              />
              <span
                className={cn(
                  'try-on-bag absolute top-[34px] block h-14 w-11 rounded-[16px] border border-white/55 shadow-[0_8px_16px_rgba(28,25,23,0.16)]',
                  outfit?.gender === '男' ? '-right-10' : '-left-10',
                )}
                style={{ backgroundColor: palette.bag }}
              />
              <span
                className="try-on-shoe absolute left-[5px] top-[156px] block h-5 w-10 rounded-full"
                style={{ backgroundColor: palette.shoe }}
              />
              <span
                className="try-on-shoe try-on-shoe-alt absolute right-[5px] top-[156px] block h-5 w-10 rounded-full"
                style={{ backgroundColor: palette.shoe }}
              />
            </div>
          </div>
          <div className="absolute bottom-0 left-1/2 flex -translate-x-1/2 items-center gap-2 rounded-full bg-white/86 px-3 py-2 text-[11px] font-medium text-stone-600 shadow-sm backdrop-blur">
            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
            VOYA 正在试穿
          </div>
        </div>

        <div className="-mt-1 text-center">
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
