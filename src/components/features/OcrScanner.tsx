'use client'

import { useEffect, useRef, useState } from 'react'
import Tesseract from 'tesseract.js'
import { Sun, X } from 'lucide-react'
import { searchByModelNumber } from '@/src/api/v1/ocr'
import Footer from '../layouts/Footer'

type SearchItem = {
  id: number
  itemName: string
  modelNumber: string
  imageUrl: string | null
  regularPrice: number | null
  releaseDate?: string | null
  merkariUrl?: string | null
  marketPrice?: number | null
  description?: string | null
}

export default function OcrScanner() {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null)

  const [streamReady, setStreamReady] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [brightness, setBrightness] = useState(100)
  const [recognizedText, setRecognizedText] = useState('')
  const [searchResult, setSearchResult] = useState<SearchItem | null>(null)
  const [isScanning, setIsScanning] = useState(false)
  const [error, setError] = useState('')
  const [scanStatus, setScanStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const pinchStartDistanceRef = useRef<number | null>(null)
  const pinchStartZoomRef = useRef<number>(1)

  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [showBrightnessControl, setShowBrightnessControl] = useState(false)

  const flashScanStatus = (status: 'success' | 'error') => {
    setScanStatus(status)

    if (statusTimerRef.current) {
        clearTimeout(statusTimerRef.current)
    }

    statusTimerRef.current = setTimeout(() => {
        setScanStatus('idle')
    }, 1500)
    }

  const getTouchDistance = (touches: React.TouchList) => {
    const dx = touches[0].clientX - touches[1].clientX
    const dy = touches[0].clientY - touches[1].clientY
    return Math.sqrt(dx * dx + dy * dy)
  }
  
  const handleTouchStart = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2) {
      e.preventDefault()
      pinchStartDistanceRef.current = getTouchDistance(e.touches)
      pinchStartZoomRef.current = zoom
    }
  }
  
  const handleTouchMove = (e: React.TouchEvent<HTMLDivElement>) => {
    if (e.touches.length === 2 && pinchStartDistanceRef.current) {
      e.preventDefault()
  
      const currentDistance = getTouchDistance(e.touches)
      const scale = currentDistance / pinchStartDistanceRef.current
      const nextZoom = pinchStartZoomRef.current * scale
  
      const clampedZoom = Math.min(3, Math.max(1, nextZoom))
      setZoom(clampedZoom)
    }
  }
  
  const handleTouchEnd = () => {
    if (pinchStartDistanceRef.current) {
      pinchStartDistanceRef.current = null
    }
  }

  const cropRect = {
    xRatio: 0.18,
    yRatio: 0.40,
    widthRatio: 0.64,
    heightRatio: 0.10,
  }

  useEffect(() => {
    if (!streamReady) return
    drawCropPreview()
  }, [brightness, zoom, streamReady])

  useEffect(() => {
    let currentStream: MediaStream | null = null

    const startCamera = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
          },
          audio: false,
        })

        currentStream = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play()
          setStreamReady(true)
        }
      } catch (err) {
        console.error(err)
        setError('カメラの起動に失敗しました')
      }
    }

    startCamera()

    return () => {
      currentStream?.getTracks().forEach((track) => track.stop())

      if (statusTimerRef.current) {
        clearTimeout(statusTimerRef.current)
      }
    }
  }, [])

  const drawCropPreview = () => {
    const video = videoRef.current
    const captureCanvas = captureCanvasRef.current
    const previewCanvas = previewCanvasRef.current
  
    if (!video || !captureCanvas || !previewCanvas) return null
    if (!video.videoWidth || !video.videoHeight) return null
  
    const sourceWidth = video.videoWidth
    const sourceHeight = video.videoHeight
  
    captureCanvas.width = sourceWidth
    captureCanvas.height = sourceHeight
  
    const captureCtx = captureCanvas.getContext('2d')
    if (!captureCtx) return null
  
    captureCtx.clearRect(0, 0, sourceWidth, sourceHeight)
    captureCtx.filter = `brightness(${brightness}%)`
    captureCtx.drawImage(video, 0, 0, sourceWidth, sourceHeight)
  
    const baseCropX = sourceWidth * cropRect.xRatio
    const baseCropY = sourceHeight * cropRect.yRatio
    const baseCropWidth = sourceWidth * cropRect.widthRatio
    const baseCropHeight = sourceHeight * cropRect.heightRatio
  
    const centerX = baseCropX + baseCropWidth / 2
    const centerY = baseCropY + baseCropHeight / 2
  
    const zoomedCropWidth = baseCropWidth / zoom
    const zoomedCropHeight = baseCropHeight / zoom
  
    let cropX = Math.floor(centerX - zoomedCropWidth / 2)
    let cropY = Math.floor(centerY - zoomedCropHeight / 2)
    let cropWidth = Math.floor(zoomedCropWidth)
    let cropHeight = Math.floor(zoomedCropHeight)
  
    // はみ出し防止
    cropX = Math.max(0, Math.min(cropX, sourceWidth - cropWidth))
    cropY = Math.max(0, Math.min(cropY, sourceHeight - cropHeight))
  
    // 出力サイズは元の枠サイズで固定
    const outputWidth = Math.floor(baseCropWidth)
    const outputHeight = Math.floor(baseCropHeight)
  
    previewCanvas.width = outputWidth
    previewCanvas.height = outputHeight
  
    const previewCtx = previewCanvas.getContext('2d')
    if (!previewCtx) return null
  
    previewCtx.clearRect(0, 0, outputWidth, outputHeight)
    previewCtx.drawImage(
      captureCanvas,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      outputWidth,
      outputHeight
    )
  
    return previewCanvas.toDataURL('image/png')
  }

  const handleScan = async () => {
    try {
      setScanStatus('idle')
      setIsScanning(true)
      setError('')
      setRecognizedText('')
      setSearchResult(null)

      const imageDataUrl = drawCropPreview()

      if (!imageDataUrl) {
        setError('画像の切り出しに失敗しました')
        flashScanStatus('error')
        return
      }

      const ocrResult = await Tesseract.recognize(imageDataUrl, 'eng', {
        logger: (m) => {
          console.log(m)
        },
      })

      const normalized = ocrResult.data.text
        .replace(/\s+/g, '')
        .replace(/[^a-zA-Z0-9\-]/g, '')
        .toUpperCase()

      setRecognizedText(normalized)

      if (!normalized) {
        setError('型番を読み取れませんでした')
        flashScanStatus('error')

        return
      }

      const apiResult = await searchByModelNumber(normalized)
      console.log('検索結果', apiResult)

      setSearchResult(apiResult.data)
      flashScanStatus('success')
      
    } catch (err: any) {
      console.error(err)
      flashScanStatus('error')

      if (err?.response?.status === 404) {
        setError('該当する商品が見つかりませんでした')
      } else {
        setError('OCRまたは商品検索に失敗しました')
      }
    } finally {
      setIsScanning(false)
    }
  }

  return (
    <div className="bg-white">
      <div className="relative w-full overflow-hidden bg-black">
        <div
            className="relative mx-auto h-[calc(100vh-164px)] w-full max-w-xl bg-black touch-none"
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
        >
          <div
            className={`
              absolute top-0 left-0 right-0 z-20 px-3 pt-3
              transition-transform duration-300 ease-in-out
              ${searchResult ? 'translate-y-0' : '-translate-y-full'}
            `}
          >
            {searchResult && (
              <div className="rounded-2xl border border-gray-200 bg-white/95 p-4 shadow-xl backdrop-blur-sm">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0 flex-1">
                    <p className="text-md break-words font-bold text-gray-900">
                      {searchResult.itemName}
                    </p>
  
                    <div className="mt-3 space-y-1 text-xs text-gray-600">
                      <p>
                        <span className="font-medium text-gray-800">型番:</span>{' '}
                        {searchResult.modelNumber}
                      </p>
                      <p>
                        <span className="font-medium text-gray-800">定価:</span>{' '}
                        {searchResult.regularPrice ?? '不明'}
                      </p>
                    </div>
                  </div>
  
                  <div className="shrink-0 rounded-xl bg-blue-50 px-2 py-3 text-right">
                    <p className="text-xs font-semibold tracking-wide text-blue-600">
                      中古相場
                    </p>
                    <p className="mt-1 text-2xl font-bold text-blue-700">
                      {searchResult.marketPrice ?? '不明'}円
                    </p>
  
                    <a
                      href={
                        searchResult.merkariUrl ??
                        `https://jp.mercari.com/search?keyword=${encodeURIComponent(searchResult.itemName)}`
                      }
                      target="_blank"
                      rel="noopener noreferrer"
                      className="mt-3 inline-block rounded-lg bg-red-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-red-600"
                    >
                      メルカリを見る
                    </a>
                  </div>
                </div>
              </div>
            )}
          </div>
  
          <video
            ref={videoRef}
            autoPlay
            playsInline
            muted
            onLoadedMetadata={() => drawCropPreview()}
            className="absolute inset-0 h-full w-full object-cover"
            style={{
                transform: `scale(${zoom})`,
                transformOrigin: 'center center',
                filter: `brightness(${brightness}%)`,
            }}
         />
            {/* 読み取り枠ブロック*/}
            <div
                className={`
                    pointer-events-none absolute rounded-lg border-4 transition-all duration-300
                    ${
                    scanStatus === 'success'
                        ? 'border-green-400 shadow-[0_0_20px_rgba(74,222,128,0.8)]'
                        : scanStatus === 'error'
                        ? 'border-red-400 shadow-[0_0_20px_rgba(248,113,113,0.8)]'
                        : 'border-cyan-400 shadow-[0_0_20px_rgba(34,211,238,0.5)]'
                    }
                `}
                style={{
                    left: `${cropRect.xRatio * 100}%`,
                    top: `${cropRect.yRatio * 100}%`,
                    width: `${cropRect.widthRatio * 100}%`,
                    height: `${cropRect.heightRatio * 100}%`,
                }}
            />
            {/* エラー表示とスキャンボタンブロック */}
            <div className="absolute bottom-10 left-0 right-0 z-10 px-4">

                {error && (
                <div className="flex justify-center">
                    <p className="px-4 py-2 text-sm font-semibold text-red-500">
                    {error}
                    </p>
                </div>
                )}

                <div className="flex justify-center">
                    
                <button
                    type="button"
                    onClick={handleScan}
                    disabled={!streamReady || isScanning}
                    className="w-40 max-w-md rounded-xl bg-blue-600 py-4 text-xl font-bold text-white shadow-lg disabled:opacity-50"
                >
                    {isScanning ? 'スキャン中...' : 'スキャン'}
                </button>
                </div>

            </div>

            {/* 明るさ調整ブロック */}
            <div className="absolute bottom-10 right-6 z-20 flex flex-col items-center gap-3">
                {showBrightnessControl && (
                    <div className="flex h-44 w-14 items-center justify-center rounded-2xl bg-black/60 backdrop-blur-sm">
                    <input
                        type="range"
                        min={50}
                        max={180}
                        step={1}
                        value={brightness}
                        onChange={(e) => setBrightness(Number(e.target.value))}
                        className="h-32 w-32 cursor-pointer accent-yellow-400"
                        style={{
                        transform: 'rotate(-90deg)',
                        }}
                        aria-label="明るさ調整"
                    />
                    </div>
                )}

                <button
                    type="button"
                    onClick={() => setShowBrightnessControl((prev) => !prev)}
                    className="flex h-14 w-14 items-center justify-center rounded-full bg-black/70 text-white shadow-lg backdrop-blur-sm transition hover:bg-black/80"
                    aria-label="明るさ調整を開く"
                >
                    {showBrightnessControl ? <X size={22} /> : <Sun size={22} />}
                </button>
            </div>
        </div>
      </div>
  
      <div className="mx-auto max-w-xl rounded-t-3xl bg-white p-1">
        <div className="">
          <p className="mb-2 text-gray-500">OCR読取範囲プレビュー</p>
          <div className="h-24 w-full overflow-hidden rounded-md border bg-black">
            <canvas
              ref={previewCanvasRef}
              className="h-full w-full object-contain"
            />
          </div>
        </div>
  
        <input
          type="text"
          value={recognizedText}
          onChange={(e) => setRecognizedText(e.target.value)}
          placeholder="型番を青枠に合わせてください"
          className="hidden w-full rounded-xl border bg-gray-100 px-4 py-4 text-center text-xl font-semibold"
        />
  
        {error && <p className="text-sm text-red-500">{error}</p>}
  
        <canvas ref={captureCanvasRef} className="hidden" />
      </div>

      <Footer></Footer>

    </div>
  )
}