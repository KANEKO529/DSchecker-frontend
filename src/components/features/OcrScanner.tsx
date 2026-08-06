'use client'

import { useEffect, useRef, useState } from 'react'
import Tesseract from 'tesseract.js'
import { Sun, X,  History, Trash2} from 'lucide-react'
import { searchByModelNumber } from '@/src/api/v1/ocr'
import Footer from '../layouts/Footer'
import { useAuth } from '@clerk/nextjs'
import { useUserContext } from '@/src/contexts/UserContext'


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

type ScanHistoryItem = {
    modelNumber: string
    itemName: string
    marketPrice: number | null
    scannedAt: string
    merkariUrl?: string | null
}

type ScanMetrics = {
  t1ImageProcessingMs?: number
  t2OcrMs?: number
  t3ModelNumberProcessingMs?: number
  t4GoApiRoundTripMs?: number
  t7SearchFeatureMs?: number
  t8UserPerceivedMs?: number
}

type CropPreviewResult = {
  imageDataUrl: string
  elapsedMs: number
}

type ScanMode = 'manual' | 'auto'
  
const SCAN_HISTORY_KEY = 'dschecker_scan_history'
const MAX_HISTORY_COUNT = 10

export default function OcrScanner() {
  const { getToken } = useAuth()


  const streamRef = useRef<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const previewCanvasRef = useRef<HTMLCanvasElement | null>(null)
  const viewportRef = useRef<HTMLDivElement | null>(null)

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
  const [historyItems, setHistoryItems] = useState<ScanHistoryItem[]>([])
  const [showHistoryPanel, setShowHistoryPanel] = useState(false)

  const [scanMode, setScanMode] = useState<ScanMode>('manual')

  const [autoEnabled, setAutoEnabled] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const lastDetectedRef = useRef<string | null>(null)
  const detectCountRef = useRef(0)
  const lastSubmittedRef = useRef<string | null>(null)

  const { planStatus, isProUser, loading } = useUserContext()

  const [isResetting, setIsResetting] = useState(false)

  const autoScanTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const lastImageRef = useRef<string | null>(null)
  const lastScanTimeRef = useRef(0)

  const scanMetricsRef = useRef<ScanMetrics>({})
  const t8StartRef = useRef<number | null>(null)

  const measuredModelNumberRef = useRef('')

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

  const cardFrameRect = {
    xRatio: 0.10,
    yRatio: 0.26,
    widthRatio: 0.80,
    heightRatio: 0.54,
  }

  const modelAreaRect = {
    xRatioInFrame: 0.34,
    yRatioInFrame: 0.76,
    widthRatioInFrame: 0.56,
    heightRatioInFrame: 0.10,
  }

  const loadScanHistory = (): ScanHistoryItem[] => {
    try {
      const raw = localStorage.getItem(SCAN_HISTORY_KEY)
      if (!raw) return []

      const parsed = JSON.parse(raw)

      if (!Array.isArray(parsed)) return []

      return parsed.filter((item) => {
        return (
          item &&
          typeof item.modelNumber === 'string' &&
          typeof item.itemName === 'string' &&
          typeof item.scannedAt === 'string'
        )
      })
    } catch (err) {
      console.error('履歴の読み込みに失敗しました', err)
      return []
    }
  }

  const saveScanHistory = (newItem: ScanHistoryItem) => {
    try {
      const currentHistory = loadScanHistory()

      const filteredHistory = currentHistory.filter(
        (item) => item.modelNumber !== newItem.modelNumber
      )

      const updatedHistory = [newItem, ...filteredHistory].slice(0, MAX_HISTORY_COUNT)

      localStorage.setItem(SCAN_HISTORY_KEY, JSON.stringify(updatedHistory))
      setHistoryItems(updatedHistory)
    } catch (err) {
      console.error('履歴の保存に失敗しました', err)
    }
  }

  const clearScanHistory = () => {
    const confirmed = window.confirm('履歴をすべて削除しますか？')
  
    if (!confirmed) return
  
    try {
      localStorage.removeItem(SCAN_HISTORY_KEY)
      setHistoryItems([])
      setShowHistoryPanel(false)
    } catch (err) {
      console.error('履歴削除に失敗しました', err)
    }
  }
  
  useEffect(() => {
    if (scanMode !== 'auto' || !autoEnabled || !streamReady) return
  
    let cancelled = false
  
    const scheduleNext = (delay = 300) => {
      clearAutoScanTimer()
      autoScanTimeoutRef.current = setTimeout(() => {
        void loop()
      }, delay)
    }
  
    const loop = async () => {
      if (cancelled) return
  
      if (isScanning || isSubmitting || isResetting) {
        scheduleNext(300)
        return
      }
  
      const now = Date.now()
      if (now - lastScanTimeRef.current < 300) {
        scheduleNext(150)
        return
      }
  
      setIsSubmitting(true)
      lastScanTimeRef.current = now
  
      try {
        setError('')
  
        const cropResult = drawCropPreview()

        if (!cropResult) {
          scheduleNext(300)
          return
        }

        const { imageDataUrl } = cropResult
  
        if (isSimilarImage(lastImageRef.current, imageDataUrl)) {
          scheduleNext(250)
          return
        }
  
        lastImageRef.current = imageDataUrl
  
        const result = await Tesseract.recognize(imageDataUrl, 'eng', {
          tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
        })

        if (cancelled) return
  
        const core = extractModelCore(result.data.text)
        if (!core) {
          setError('型番を読み取れませんでした')
          flashScanStatus('error')
          scheduleNext(400)
          return
        }
  
        const modelNumber = buildDsModelNumber(core)
        
        setRecognizedText(modelNumber)
  
        if (lastSubmittedRef.current === modelNumber) {
          scheduleNext(600)
          return
        }
  
        const token = await getToken({ skipCache: true })
        const apiResult = await searchByModelNumber(token, modelNumber)
  
        if (cancelled) return
  
        setSearchResult(apiResult.data.item)
  
        saveScanHistory({
          modelNumber,
          itemName: apiResult.data.item.name,
          marketPrice: apiResult.data.item.marketPrice ?? null,
          scannedAt: new Date().toISOString(),
          merkariUrl: apiResult.data.item.merkariUrl ?? undefined,
        })
  
        setShowHistoryPanel(true)
        flashScanStatus('success')
  
        lastSubmittedRef.current = modelNumber
        detectCountRef.current = 0
  
        scheduleNext(900)
      } catch (err: any) {
        console.error(err)
        flashScanStatus('error')
  
        const status = err?.response?.status
        const errorCode = err?.response?.data?.error?.code
        const errorMessage = err?.response?.data?.error?.message
        const usage = err?.response?.data?.usage
  
        if (status === 400 && errorCode === 'INVALID_MODEL_NUMBER') {
          setError('型番を読み取れませんでした')
        } else if (status === 429 && errorCode === 'USAGE_LIMIT_EXCEEDED') {
          setError(
            usage
              ? `${errorMessage}（使用: ${usage.usedCount ?? '-'} / 上限: ${usage.limit ?? '-'}）`
              : errorMessage || '利用回数の上限に達しました'
          )
        } else if (status === 404 && errorCode === 'ITEM_NOT_FOUND') {
          setError('該当する商品が見つかりませんでした')
        } else if (status === 502 && errorCode === 'UPSTREAM_ERROR') {
          setError('検索サーバーとの通信に失敗しました。少し待ってから再度お試しください。')
        } else {
          setError('自動スキャンに失敗しました')
        }
  
        scheduleNext(800)
      } finally {
        if (!cancelled) {
          setIsSubmitting(false)
        }
      }
    }
  
    void loop()
  
    return () => {
      cancelled = true
      clearAutoScanTimer()
    }
  }, [scanMode, autoEnabled, streamReady, isScanning, isSubmitting, isResetting, getToken, brightness, zoom])



  useEffect(() => {
    const savedHistory = loadScanHistory()
    setHistoryItems(savedHistory)
  }, [])

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

  useEffect(() => {
    if (!searchResult || t8StartRef.current === null) return
  
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        if (t8StartRef.current === null) return
  
        const completedAt = new Date()
        const t8 = performance.now() - t8StartRef.current

        scanMetricsRef.current.t8UserPerceivedMs = t8
  
        void sendMeasurementLog(
          'success',
          measuredModelNumberRef.current,
          completedAt.toISOString()
        ).catch((error) => {
          console.error('計測ログの送信に失敗しました', error)
        })
  
        t8StartRef.current = null
      })
    })
  }, [searchResult])

  const drawCropPreview = (): CropPreviewResult | null => {

    const startedAt = performance.now()


    const video = videoRef.current
    const captureCanvas = captureCanvasRef.current
    const previewCanvas = previewCanvasRef.current
    const viewport = viewportRef.current
  
    if (!video || !captureCanvas || !previewCanvas || !viewport) return null
    if (!video.videoWidth || !video.videoHeight) return null
  
    const sourceWidth = video.videoWidth
    const sourceHeight = video.videoHeight
    const viewportWidth = viewport.clientWidth
    const viewportHeight = viewport.clientHeight
  
    if (!viewportWidth || !viewportHeight) return null
  
    captureCanvas.width = sourceWidth
    captureCanvas.height = sourceHeight
  
    const captureCtx = captureCanvas.getContext('2d')
    if (!captureCtx) return null
  
    captureCtx.clearRect(0, 0, sourceWidth, sourceHeight)
    captureCtx.filter = `brightness(${brightness}%)`
    captureCtx.drawImage(video, 0, 0, sourceWidth, sourceHeight)
  
    const videoAspect = sourceWidth / sourceHeight
    const viewportAspect = viewportWidth / viewportHeight
  
    let displayedWidth = 0
    let displayedHeight = 0
  
    if (videoAspect > viewportAspect) {
      displayedHeight = viewportHeight
      displayedWidth = displayedHeight * videoAspect
    } else {
      displayedWidth = viewportWidth
      displayedHeight = displayedWidth / videoAspect
    }
  
    displayedWidth *= zoom
    displayedHeight *= zoom
  
    const offsetX = (displayedWidth - viewportWidth) / 2
    const offsetY = (displayedHeight - viewportHeight) / 2
  
    // DSソフト全体の外枠
    const frameX = viewportWidth * cardFrameRect.xRatio
    const frameY = viewportHeight * cardFrameRect.yRatio
    const frameWidth = viewportWidth * cardFrameRect.widthRatio
    const frameHeight = viewportHeight * cardFrameRect.heightRatio
  
    // 右下の型番領域
    const modelX = frameX + frameWidth * modelAreaRect.xRatioInFrame
    const modelY = frameY + frameHeight * modelAreaRect.yRatioInFrame
    const modelWidth = frameWidth * modelAreaRect.widthRatioInFrame
    const modelHeight = frameHeight * modelAreaRect.heightRatioInFrame
  
    const scaleX = sourceWidth / displayedWidth
    const scaleY = sourceHeight / displayedHeight
  
    let cropX = Math.floor((modelX + offsetX) * scaleX)
    let cropY = Math.floor((modelY + offsetY) * scaleY)
    let cropWidth = Math.floor(modelWidth * scaleX)
    let cropHeight = Math.floor(modelHeight * scaleY)
  
    const paddingX = Math.floor(cropWidth * 0.18)
    const paddingY = Math.floor(cropHeight * 0.35)
  
    cropX -= paddingX
    cropY -= paddingY
    cropWidth += paddingX * 2
    cropHeight += paddingY * 2
  
    cropX = Math.max(0, cropX)
    cropY = Math.max(0, cropY)
    cropWidth = Math.min(cropWidth, sourceWidth - cropX)
    cropHeight = Math.min(cropHeight, sourceHeight - cropY)
  
    // 1. プレビューは「生画像」を表示
    previewCanvas.width = cropWidth
    previewCanvas.height = cropHeight
  
    const previewCtx = previewCanvas.getContext('2d')
    if (!previewCtx) return null
  
    previewCtx.clearRect(0, 0, cropWidth, cropHeight)
    previewCtx.drawImage(
      captureCanvas,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      cropWidth,
      cropHeight
    )
  
    // 2. OCR専用canvas
    const ocrCanvas = document.createElement('canvas')
    const ocrCtx = ocrCanvas.getContext('2d')
    if (!ocrCtx) return null
  
    const scale = 4
    ocrCanvas.width = cropWidth * scale
    ocrCanvas.height = cropHeight * scale
  
    ocrCtx.imageSmoothingEnabled = false
    ocrCtx.drawImage(
      captureCanvas,
      cropX,
      cropY,
      cropWidth,
      cropHeight,
      0,
      0,
      ocrCanvas.width,
      ocrCanvas.height
    )
  
    const img = ocrCtx.getImageData(0, 0, ocrCanvas.width, ocrCanvas.height)
    const data = img.data
  
    for (let i = 0; i < data.length; i += 4) {
      const r = data[i]
      const g = data[i + 1]
      const b = data[i + 2]
  
      let gray = 0.299 * r + 0.587 * g + 0.114 * b
      gray = (gray - 128) * 1.35 + 128
      gray = Math.max(0, Math.min(255, gray))
  
      const bin = gray > 165 ? 255 : 0
  
      data[i] = bin
      data[i + 1] = bin
      data[i + 2] = bin
      data[i + 3] = 255
    }
  
    ocrCtx.putImageData(img, 0, 0)
  
    const imageDataUrl = ocrCanvas.toDataURL('image/png')
    const elapsedMs = performance.now() - startedAt
  
    return {
      imageDataUrl,
      elapsedMs,
    }
  }
  const handleScan = async () => {
    // T8：スキャンボタン押下時点
    t8StartRef.current = performance.now()
    scanMetricsRef.current = {}

    try {
      const token = await getToken({ skipCache: true })

      // T7：画像前処理開始時点
      const t7StartedAt = performance.now()
  
      setScanStatus('idle')
      setIsScanning(true)
      setError('')
      setRecognizedText('')
      setSearchResult(null)
  
      // -------------------------
      // T1：画像前処理
      // -------------------------
      const cropResult = drawCropPreview()

      if (!cropResult) {
        setError('画像の切り出しに失敗しました')
        flashScanStatus('error')
        return
      }

      const { imageDataUrl, elapsedMs: t1 } = cropResult
      scanMetricsRef.current.t1ImageProcessingMs = t1

      // -------------------------
      // T2：OCR処理
      // -------------------------
      const t2StartedAt = performance.now()
    
      const ocrResult = await Tesseract.recognize(imageDataUrl, 'eng', {
        tessedit_char_whitelist: 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789',
      })

      const t2 = performance.now() - t2StartedAt
      scanMetricsRef.current.t2OcrMs = t2
  
      // -------------------------
      // T3：型番抽出・整形
      // -------------------------
      const t3StartedAt = performance.now()

      const core = extractModelCore(ocrResult.data.text)

      if (!core) {
        const t3 = performance.now() - t3StartedAt
        scanMetricsRef.current.t3ModelNumberProcessingMs = t3
      
        console.table(scanMetricsRef.current)
      
        t8StartRef.current = null
      
        setError('型番を読み取れませんでした')
        flashScanStatus('error')
        return
      }
  
      const modelNumber = buildDsModelNumber(core)
      measuredModelNumberRef.current = modelNumber


      const t3 = performance.now() - t3StartedAt
      scanMetricsRef.current.t3ModelNumberProcessingMs = t3

      setRecognizedText(modelNumber)

      // -------------------------
      // T4：Go API往復
      // -------------------------
  
      const t4StartedAt = performance.now()

      const apiResult = await searchByModelNumber(token, modelNumber)
  
      const t4 = performance.now() - t4StartedAt
      scanMetricsRef.current.t4GoApiRoundTripMs = t4

      // -------------------------
      // T7：画像前処理開始から商品取得まで
      // -------------------------
  
      const t7 = performance.now() - t7StartedAt
      scanMetricsRef.current.t7SearchFeatureMs = t7

      setSearchResult(apiResult.data.item)
  
      saveScanHistory({
        modelNumber,
        itemName: apiResult.data.item.name,
        marketPrice: apiResult.data.item.marketPrice ?? null,
        scannedAt: new Date().toISOString(),
        merkariUrl: apiResult.data.item.merkariUrl ?? undefined,
      })
  
      lastSubmittedRef.current = modelNumber
  
      setShowHistoryPanel(true)
      flashScanStatus('success')
    } catch (err: any) {
      t8StartRef.current = null

      console.error(err)
      console.table(scanMetricsRef.current)

      flashScanStatus('error')
  
      const status = err?.response?.status
      const errorCode = err?.response?.data?.error?.code
      const errorMessage = err?.response?.data?.error?.message
      const usage = err?.response?.data?.usage
  
      if (status === 400 && errorCode === 'INVALID_MODEL_NUMBER') {
        setError('型番を読み取れませんでした')
      } else if (status === 429 && errorCode === 'USAGE_LIMIT_EXCEEDED') {
        setError(
          usage
            ? `${errorMessage}（使用: ${usage.usedCount ?? '-'} / 上限: ${usage.limit ?? '-'}）`
            : errorMessage || '利用回数の上限に達しました'
        )
      } else if (status === 404 && errorCode === 'ITEM_NOT_FOUND') {
        setError('該当する商品が見つかりませんでした')
      } else if (status === 502 && errorCode === 'UPSTREAM_ERROR') {
        setError('検索サーバーとの通信に失敗しました。少し待ってから再度お試しください。')
      } else {
        setError('OCRまたは商品検索に失敗しました')
      }
    } finally {
      setIsScanning(false)
    }
  }

  function extractModelCore(raw: string): string | null {
    const text = raw
      .toUpperCase()
      .replace(/\s+/g, '')
      .replace(/[^A-Z0-9]/g, '')
  
    // NTRの後ろ4文字を優先
    const match = text.match(/NTR([A-Z0-9]{4})/)
    if (match) return match[1]
  
    // fallback
    const fallback = text.match(/[A-Z0-9]{4}/)
    return fallback ? fallback[0] : null
  }

  function buildDsModelNumber(core: string): string {
    return `NTR-${core}-JPN`
  }

  const isSimilarImage = (prev: string | null, next: string) => {
    if (!prev) return false
    return prev.slice(0, 120) === next.slice(0, 120)
  }

  const stopCameraStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop())
      streamRef.current = null
    }
  
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }
  
  const startCameraStream = async () => {
    const stream = await navigator.mediaDevices.getUserMedia({
      video: {
        facingMode: { ideal: 'environment' },
      },
      audio: false,
    })
  
    streamRef.current = stream
  
    if (videoRef.current) {
      videoRef.current.srcObject = stream
      await videoRef.current.play()
    }
  }
  
  const handleResetCamera = async () => {
    try {
      setIsResetting(true)
  
      clearAutoScanTimer()
  
      setError('')
      setIsScanning(false)
      setIsSubmitting(false)
      setRecognizedText('')
      setSearchResult(null)
      setShowHistoryPanel(false)
  
      lastSubmittedRef.current = null
      lastDetectedRef.current = null
      detectCountRef.current = 0
      lastImageRef.current = null
      lastScanTimeRef.current = 0
  
      // 一旦自動スキャン停止
      setScanMode('manual')
      setAutoEnabled(false)
  
      stopCameraStream()
  
      await new Promise((resolve) => setTimeout(resolve, 300))
  
      await startCameraStream()
  
      // 必要なら自動スキャン復帰
      setScanMode('auto')
      setAutoEnabled(true)
    } catch (err) {
      console.error(err)
      setError('カメラのリセットに失敗しました')
    } finally {
      setIsResetting(false)
    }
  }
  
  const clearAutoScanTimer = () => {
    if (autoScanTimeoutRef.current) {
      clearTimeout(autoScanTimeoutRef.current)
      autoScanTimeoutRef.current = null
    }
  }

  const sendMeasurementLog = async (
    result: string,
    recognizedModelNumber?: string,
    completedAt?: string
  ) => {
    const metrics = scanMetricsRef.current
  
    const response = await fetch('/api/measurement-logs', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        result,
        recognizedModelNumber,
        metrics: {
          t1Ms: metrics.t1ImageProcessingMs,
          t2Ms: metrics.t2OcrMs,
          t3Ms: metrics.t3ModelNumberProcessingMs,
          t4Ms: metrics.t4GoApiRoundTripMs,
          t7Ms: metrics.t7SearchFeatureMs,
          t8Ms: metrics.t8UserPerceivedMs,
        },
        completedAt,
      }),
    })
  
    if (!response.ok) {
      throw new Error(`measurement log failed: ${response.status}`)
    }
  }
  
  return (
    <div className="bg-white">
      <div className="relative w-full overflow-hidden bg-black">
      <div
        ref={viewportRef}
        className="relative mx-auto h-[calc(100vh-164px)] w-full max-w-xl overflow-hidden bg-black touch-none"
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* 背景カメラ */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className="absolute inset-0 h-full w-full object-cover"
          style={{
            transform: `scale(${zoom})`,
            filter: `brightness(${brightness}%)`,
            transformOrigin: 'center center',
          }}
        />

        {/* 外側ぼかし */}
        <div
          className="absolute pointer-events-none backdrop-blur-md bg-black/20"
          style={{
            left: 0,
            top: 0,
            width: '100%',
            height: `${cardFrameRect.yRatio * 100}%`,
          }}
        />
        <div
          className="absolute pointer-events-none backdrop-blur-md bg-black/20"
          style={{
            left: 0,
            top: `${cardFrameRect.yRatio * 100}%`,
            width: `${cardFrameRect.xRatio * 100}%`,
            height: `${cardFrameRect.heightRatio * 100}%`,
          }}
        />
        <div
          className="absolute pointer-events-none backdrop-blur-md bg-black/20"
          style={{
            left: `${(cardFrameRect.xRatio + cardFrameRect.widthRatio) * 100}%`,
            top: `${cardFrameRect.yRatio * 100}%`,
            width: `${(1 - cardFrameRect.xRatio - cardFrameRect.widthRatio) * 100}%`,
            height: `${cardFrameRect.heightRatio * 100}%`,
          }}
        />
        <div
          className="absolute pointer-events-none backdrop-blur-md bg-black/20"
          style={{
            left: 0,
            top: `${(cardFrameRect.yRatio + cardFrameRect.heightRatio) * 100}%`,
            width: '100%',
            height: `${(1 - cardFrameRect.yRatio - cardFrameRect.heightRatio) * 100}%`,
          }}
        />


        {/* 外側暗めオーバーレイ */}
        <div className="pointer-events-none absolute inset-0 z-5 bg-black/30" />

        {/* 履歴パネル */}
        <div
          className={`
            absolute top-0 left-14 right-0 z-30 px-4 pt-3 
            transition-transform duration-300 ease-in-out
            ${showHistoryPanel && historyItems.length > 0 ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}
          `}
        >
          {historyItems.length > 0 && (
            <div className="overflow-x-auto">
              <div className="flex w-max gap-2 pb-2 h-26">
                {historyItems.map((item) => (
                  <div
                    key={`${item.modelNumber}-${item.scannedAt}`}
                    className="min-w-[250px] max-w-[250px] shrink-0 rounded-xl border border-gray-200 bg-white/95 p-2 shadow-xl backdrop-blur-sm"
                  >
                    <p className="line-clamp-2 min-h-[2rem] text-xs font-bold leading-4 text-gray-900">
                      {item.itemName}
                    </p>

                    <div className="mt-0 text-[8px] text-gray-600">
                      <p>
                        <span className="font-medium text-gray-800">型番:</span>{' '}
                        {item.modelNumber}
                      </p>
                    </div>

                    <div className="mt-0 flex items-center justify-between rounded-xl bg-blue-50 px-2 py-[2px]">
                      <div>
                        <p className="text-[6px] font-semibold tracking-wide text-blue-600">
                          中古相場
                        </p>
                        <p className="text-md font-bold text-blue-700">
                          {item.marketPrice != null ? `${item.marketPrice}円` : '不明'}
                        </p>
                      </div>

                      <a
                        href={`https://jp.mercari.com/search?keyword=${encodeURIComponent(item.itemName)}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="shrink-0 rounded-lg bg-red-500 px-2 py-2 text-xs font-semibold text-white transition hover:bg-red-600"
                      >
                        メルカリ
                      </a>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* 左上ボタン群 */}
        <div className="absolute top-2 left-2 z-40 flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setShowHistoryPanel((prev) => !prev)}
            className="flex h-11 w-11 items-center justify-center rounded-full bg-black/60 text-white shadow-lg backdrop-blur-md"
          >
            {showHistoryPanel ? <X size={22} /> : <History size={22} />}
          </button>

          {showHistoryPanel && historyItems.length > 0 && (
            <button
              type="button"
              onClick={clearScanHistory}
              className="flex h-11 w-11 items-center justify-center rounded-full bg-red-500/90 text-white shadow-lg backdrop-blur-md"
            >
              <Trash2 size={20} />
            </button>
          )}
        </div>

        {/* 自動スキャン状態 */}
        {scanMode === 'auto' && (
          <div className="absolute left-1/2 top-20 z-40 -translate-x-1/2">
            <div className="rounded-full bg-black/55 px-5 py-3 text-white shadow-lg backdrop-blur-md">
              <div className="flex items-center gap-3 text-lg font-semibold">
                <span>自動スキャン中</span>
                <span className="h-2.5 w-2.5 rounded-full bg-green-400" />
              </div>
            </div>
          </div>
        )}

        {/* 説明文：枠の真上 */}
        <div
          className="absolute left-1/2 z-30 -translate-x-1/2 -translate-y-full"
          style={{
            top: `calc(${cardFrameRect.yRatio * 100}% - 4px)`,
          }}
        >
          <div className="w-75 rounded-xl bg-black/50 px-2 py-2 text-center text-white shadow-lg backdrop-blur-md">
            <p className="text-[10px] font-semibold">
              DSソフトの右下の型番を枠の中に合わせてください
            </p>
          </div>
        </div>

        {/* 読み取り枠 */}
        <div
          className={`
            pointer-events-none absolute z-20 rounded-[10px] border-[5px] transition-all duration-300
            ${
              scanStatus === 'success'
                ? 'border-green-400 shadow-[0_0_24px_rgba(74,222,128,0.7)]'
                : scanStatus === 'error'
                ? 'border-red-400 shadow-[0_0_24px_rgba(248,113,113,0.7)]'
                : 'border-white shadow-[0_0_20px_rgba(255,255,255,0.28)]'
            }
          `}
          style={{
            left: `${cardFrameRect.xRatio * 100}%`,
            top: `${cardFrameRect.yRatio * 100}%`,
            width: `${cardFrameRect.widthRatio * 100}%`,
            height: `${cardFrameRect.heightRatio * 100}%`,
          }}
        >
          <div
            className="absolute rounded-md border-2 border-dashed border-white/90 bg-black/10"
            style={{
              left: `${modelAreaRect.xRatioInFrame * 100}%`,
              top: `${modelAreaRect.yRatioInFrame * 100}%`,
              width: `${modelAreaRect.widthRatioInFrame * 100}%`,
              height: `${modelAreaRect.heightRatioInFrame * 100}%`,
            }}
          />

          <div
            className="absolute text-[10px] font-semibold text-white drop-shadow"
            style={{
              left: `${modelAreaRect.xRatioInFrame * 100}%`,
              top: `calc(${modelAreaRect.yRatioInFrame * 100}% - 16px)`,
            }}
          >
            型番
          </div>
        </div>



        {/* エラー */}
        {error && (
          <div className="absolute bottom-28 left-1/2 z-30 w-[88%] -translate-x-1/2">
            <p className="text-center text-sm font-semibold text-red-300 drop-shadow">
              {error}
            </p>
          </div>
        )}

        {/* 左下 */}
        <div className="absolute bottom-12 left-20 z-40 flex flex-col items-center gap-3">
            {showBrightnessControl && (
              <div className="flex h-44 w-10 items-center justify-center rounded-2xl bg-black/60 backdrop-blur-sm">
                <input
                  type="range"
                  min={50}
                  max={180}
                  step={1}
                  value={brightness}
                  onChange={(e) => setBrightness(Number(e.target.value))}
                  className="h-32 w-32 cursor-pointer accent-yellow-400"
                  style={{ transform: 'rotate(-90deg)' }}
                  aria-label="明るさ調整"
                />
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowBrightnessControl((prev) => !prev)}
              className="flex h-10 w-10 items-center justify-center rounded-full bg-black/55 text-white shadow-lg backdrop-blur-md"
              aria-label="明るさ調整を開く"
            >
              {showBrightnessControl ? <X size={18} /> : <Sun size={18} />}
            </button>

          </div>



        {/* 右下コントロール */}
        <div className="absolute bottom-8 right-2 z-40 flex flex-col items-center gap-3">


          {isProUser && (
              <button
                onClick={() => setScanMode(scanMode === 'auto' ? 'manual' : 'auto')}
                className="w-28 rounded-full bg-white/20 px-2 py-2 text-xs font-semibold text-white backdrop-blur-md"
              >
                {scanMode === 'auto' ? '手動に切替' : '自動に切替'}
              </button>
            )}

          <button
            type="button"
            onClick={handleResetCamera}
            disabled={isResetting}
            className="w-28 rounded-full bg-white/20 px-2 py-2 text-xs font-semibold text-white backdrop-blur-md"
          >
            {isResetting ? '再起動中...' : 'カメラ再起動'}
          </button>
        </div>

        {/* 下部中央ボタン */}
        <div className="absolute bottom-12 left-1/2 z-40 -translate-x-1/2">
          <div className="flex flex-col items-center gap-2">
            {scanMode === 'manual' ? (
              <button
                onClick={handleScan}
                className="rounded-full bg-white/90 px-8 py-3 text-base font-bold text-gray-900 shadow-lg"
              >
                スキャン
              </button>
            ) : (
              <button
                onClick={() => setAutoEnabled((prev) => !prev)}
                className="rounded-full bg-black/55 px-8 py-3 text-base font-bold text-white shadow-lg backdrop-blur-md"
              >
                {autoEnabled ? '自動停止' : '自動開始'}
              </button>
            )}


          </div>
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