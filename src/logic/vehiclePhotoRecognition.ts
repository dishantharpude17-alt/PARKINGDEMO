import Tesseract from 'tesseract.js'
import type { VehicleType } from '../types/vehicleSession.ts'
import { extractRegistrationFromOcrText } from './extractRegistrationFromOcr.ts'

const MAX_IMAGE_BYTES = 8 * 1024 * 1024
const ACCEPTED_TYPES = new Set([
  'image/jpeg',
  'image/png',
  'image/webp',
  'image/gif',
])

export type VehiclePhotoRecognitionProgress = {
  stage: string
  progress: number
}

export type VehiclePhotoRecognitionSuccess = {
  ok: true
  registrationNumber: string
  vehicleType: VehicleType | null
  ocrSnippet: string
  vehicleTypeFromImage: boolean
}

export type VehiclePhotoRecognitionFailure = {
  ok: false
  code:
    | 'invalid_image'
    | 'file_too_large'
    | 'ocr_failed'
    | 'no_plate'
    | 'unsupported'
  error: string
}

export type VehiclePhotoRecognitionResult =
  | VehiclePhotoRecognitionSuccess
  | VehiclePhotoRecognitionFailure

let cocoModelPromise: Promise<{
  detect: (input: HTMLImageElement | HTMLCanvasElement) => Promise<
    { class: string; score: number }[]
  >
}> | null = null

function mapDetectionToVehicleType(
  detections: { class: string; score: number }[],
): VehicleType | null {
  const relevant = detections
    .filter((d) => d.score >= 0.35)
    .sort((a, b) => b.score - a.score)

  for (const detection of relevant) {
    switch (detection.class) {
      case 'motorcycle':
        return 'motorcycle'
      case 'car':
        return 'car'
      case 'bus':
        return 'van'
      case 'truck':
        return 'truck'
      default:
        break
    }
  }
  return null
}

async function classifyVehicleTypeFromImage(
  image: HTMLImageElement,
  onProgress?: (update: VehiclePhotoRecognitionProgress) => void,
): Promise<VehicleType | null> {
  try {
    onProgress?.({ stage: 'Detecting vehicle type…', progress: 0.2 })
    if (!cocoModelPromise) {
      cocoModelPromise = import('@tensorflow-models/coco-ssd').then(async (cocoSsd) => {
        await import('@tensorflow/tfjs')
        return cocoSsd.load()
      })
    }
    const model = await cocoModelPromise
    const predictions = await model.detect(image)
    onProgress?.({ stage: 'Detecting vehicle type…', progress: 0.9 })
    return mapDetectionToVehicleType(predictions)
  } catch {
    return null
  }
}

function validateImageFile(file: File): VehiclePhotoRecognitionFailure | null {
  if (!ACCEPTED_TYPES.has(file.type)) {
    return {
      ok: false,
      code: 'invalid_image',
      error: 'Use a JPEG, PNG, WebP, or GIF photo.',
    }
  }
  if (file.size > MAX_IMAGE_BYTES) {
    return {
      ok: false,
      code: 'file_too_large',
      error: 'Image is too large (max 8 MB). Try a smaller photo.',
    }
  }
  return null
}

async function loadImageFromFile(file: File): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    await new Promise<void>((resolve, reject) => {
      image.onload = () => resolve()
      image.onerror = () => reject(new Error('Image decode failed'))
      image.src = url
    })
    return image
  } finally {
    URL.revokeObjectURL(url)
  }
}

async function runOcr(
  source: File | HTMLImageElement,
  onProgress?: (update: VehiclePhotoRecognitionProgress) => void,
): Promise<string> {
  const result = await Tesseract.recognize(source, 'eng', {
    logger: (message) => {
      if (message.status === 'recognizing text' && typeof message.progress === 'number') {
        onProgress?.({
          stage: 'Reading plate text…',
          progress: message.progress,
        })
      }
    },
  })
  return result.data.text ?? ''
}

export async function recognizeVehicleFromPhotoFile(
  file: File,
  onProgress?: (update: VehiclePhotoRecognitionProgress) => void,
): Promise<VehiclePhotoRecognitionResult> {
  const validationError = validateImageFile(file)
  if (validationError) {
    return validationError
  }

  try {
    onProgress?.({ stage: 'Loading image…', progress: 0.05 })
    const image = await loadImageFromFile(file)

    onProgress?.({ stage: 'Reading plate text…', progress: 0.1 })
    const ocrText = await runOcr(image, onProgress)
    const registrationNumber = extractRegistrationFromOcrText(ocrText)

    if (!registrationNumber) {
      return {
        ok: false,
        code: 'no_plate',
        error:
          'Could not read a valid registration (format AA00AA0000) from this photo. Try a clearer plate image or enter details manually.',
      }
    }

    const vehicleType = await classifyVehicleTypeFromImage(image, onProgress)

    return {
      ok: true,
      registrationNumber,
      vehicleType,
      ocrSnippet: ocrText.trim().slice(0, 120),
      vehicleTypeFromImage: vehicleType !== null,
    }
  } catch {
    return {
      ok: false,
      code: 'ocr_failed',
      error:
        'Photo recognition failed. Check the image and try again, or use manual entry.',
    }
  }
}
