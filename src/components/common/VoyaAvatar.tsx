import { useEffect, useRef } from 'react'
import { voyaMotionLabels, voyaMotionVideos, type VoyaMotionState } from '@/data/voya'
import { cn } from '@/lib/utils'

type VoyaAvatarProps = {
  state?: VoyaMotionState
  size?: 'sm' | 'status' | 'hero' | 'call'
  className?: string
}

const frameClassName = {
  sm: 'h-10 w-10 rounded-2xl border border-amber-100 bg-white shadow-sm',
  status: 'h-12 w-12 rounded-[22px] border border-amber-100 bg-white shadow-sm',
  hero: 'mx-auto mt-4 h-52 w-52 rounded-[34px] border border-white/80 bg-white/80 shadow-[0_18px_32px_rgba(176,124,39,0.22)]',
  call: 'mx-auto h-64 w-64 rounded-full border-[10px] border-white bg-white/80 shadow-[0_24px_60px_rgba(176,124,39,0.20)]',
}

const videoClassName = {
  sm: 'scale-[1.35] object-cover object-top',
  status: 'scale-[1.28] object-cover object-top',
  hero: 'object-contain object-center',
  call: 'object-cover object-top',
}

export default function VoyaAvatar({ state = 'listening', size = 'sm', className }: VoyaAvatarProps) {
  const videoRef = useRef<HTMLVideoElement>(null)

  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const play = () => {
      video.muted = true
      void video.play().catch(() => undefined)
    }

    play()
    video.addEventListener('loadeddata', play)
    return () => video.removeEventListener('loadeddata', play)
  }, [state])

  return (
    <div className={cn('relative shrink-0 overflow-hidden', frameClassName[size], className)} aria-label={voyaMotionLabels[state]}>
      <video
        ref={videoRef}
        key={state}
        className={cn('h-full w-full', videoClassName[size])}
        src={voyaMotionVideos[state]}
        autoPlay
        muted
        loop
        playsInline
        disableRemotePlayback
        preload={size === 'hero' ? 'auto' : 'metadata'}
      />
      <span className="pointer-events-none absolute inset-0 rounded-[inherit] ring-1 ring-inset ring-white/70" />
    </div>
  )
}
