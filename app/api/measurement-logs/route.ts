import { NextRequest, NextResponse } from 'next/server'

type MeasurementLogRequest = {
  trialId?: string
  recognizedModelNumber?: string
  result: string
  completedAt?: string
  metrics: {
    t1Ms?: number
    t2Ms?: number
    t3Ms?: number
    t4Ms?: number
    t7Ms?: number
    t8Ms?: number
  }
}

const formatMs = (value?: number) =>
  typeof value === 'number' ? value.toFixed(3) : '-'

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as MeasurementLogRequest
    const { metrics } = body

    console.log(
      [
        '[OCR_MEASUREMENT]',
        `trial_id=${body.trialId ?? '-'}`,
        `result=${body.result}`,
        `model_number=${body.recognizedModelNumber ?? '-'}`,
        `T1_ms=${formatMs(metrics.t1Ms)}`,
        `T2_ms=${formatMs(metrics.t2Ms)}`,
        `T3_ms=${formatMs(metrics.t3Ms)}`,
        `T4_ms=${formatMs(metrics.t4Ms)}`,
        `T7_ms=${formatMs(metrics.t7Ms)}`,
        `T8_ms=${formatMs(metrics.t8Ms)}`,
        `completed_at=${body.completedAt ?? '-'}`,
      ].join(' ')
    )

    return NextResponse.json({ status: 'ok' })
  } catch (error) {
    console.error('[OCR_MEASUREMENT_ERROR]', error)

    return NextResponse.json(
      { status: 'error', message: 'invalid measurement log' },
      { status: 400 }
    )
  }
}