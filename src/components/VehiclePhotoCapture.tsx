import { useEffect, useId, useRef, useState } from 'react'
import {
  recognizeVehicleFromPhotoFile,
  type VehiclePhotoRecognitionResult,
} from '../logic/vehiclePhotoRecognition.ts'

type VehiclePhotoCaptureProps = {
  purpose: 'entry' | 'exit'
  disabled?: boolean
  onRecognitionResult: (result: VehiclePhotoRecognitionResult) => void
}

export default function VehiclePhotoCapture({
  purpose,
  disabled = false,
  onRecognitionResult,
}: VehiclePhotoCaptureProps) {
  const uploadInputId = useId()
  const cameraInputId = useId()
  const videoRef = useRef<HTMLVideoElement>(null)
  const streamRef = useRef<MediaStream | null>(null)

  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [cameraOpen, setCameraOpen] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [processing, setProcessing] = useState(false)
  const [progressLabel, setProgressLabel] = useState<string | null>(null)

  useEffect(() => {
    return () => {
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl)
      }
      stopCameraStream()
    }
  }, [previewUrl])

  function stopCameraStream() {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }

  async function openLiveCamera() {
    setCameraError(null)
    if (!navigator.mediaDevices?.getUserMedia) {
      setCameraError(
        'Live camera is not supported here. Use Upload Photo or the camera capture option on your device.',
      )
      return
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
        audio: false,
      })
      streamRef.current = stream
      setCameraOpen(true)
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          void videoRef.current.play()
        }
      })
    } catch {
      setCameraError(
        'Camera access was denied or unavailable. Allow camera permission or upload a photo instead.',
      )
    }
  }

  function closeCamera() {
    stopCameraStream()
    setCameraOpen(false)
  }

  async function captureFromLiveCamera() {
    const video = videoRef.current
    if (!video || video.videoWidth === 0) {
      setCameraError('Camera is not ready yet. Wait a moment and try again.')
      return
    }
    const canvas = document.createElement('canvas')
    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) {
      setCameraError('Could not capture from camera.')
      return
    }
    ctx.drawImage(video, 0, 0)
    closeCamera()
    canvas.toBlob(async (blob) => {
      if (!blob) {
        setCameraError('Could not capture from camera.')
        return
      }
      const file = new File([blob], 'camera-capture.jpg', { type: 'image/jpeg' })
      setPreviewUrl(URL.createObjectURL(file))
      await runRecognition(file)
    }, 'image/jpeg', 0.92)
  }

  async function runRecognition(file: File) {
    setProcessing(true)
    setProgressLabel('Starting recognition…')
    setCameraError(null)
    const result = await recognizeVehicleFromPhotoFile(file, (update) => {
      setProgressLabel(update.stage)
    })
    setProcessing(false)
    setProgressLabel(null)
    onRecognitionResult(result)
  }

  async function handleFileSelected(file: File | null) {
    if (!file) {
      return
    }
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl)
    }
    setPreviewUrl(URL.createObjectURL(file))
    await runRecognition(file)
  }

  const heading =
    purpose === 'entry'
      ? 'Photo recognition (optional)'
      : 'Photo recognition for exit'

  return (
    <section
      className="vehicle-photo-capture"
      aria-labelledby={`${uploadInputId}-heading`}
    >
      <h3 id={`${uploadInputId}-heading`} className="vehicle-photo-capture-title">
        {heading}
      </h3>
      <p className="vehicle-photo-capture-lead">
        Upload or capture a number-plate photo. OCR runs locally in your browser
        (first use downloads language data). Confirm or correct results before
        {purpose === 'entry' ? ' registering entry' : ' checkout'}.
      </p>

      <div className="vehicle-photo-capture-actions">
        <label className="vehicle-photo-capture-btn" htmlFor={uploadInputId}>
          Upload photo
        </label>
        <input
          id={uploadInputId}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          disabled={disabled || processing}
          onChange={(event) =>
            void handleFileSelected(event.target.files?.[0] ?? null)
          }
        />
        <label className="vehicle-photo-capture-btn" htmlFor={cameraInputId}>
          Use camera
        </label>
        <input
          id={cameraInputId}
          type="file"
          accept="image/*"
          capture="environment"
          className="sr-only"
          disabled={disabled || processing}
          onChange={(event) =>
            void handleFileSelected(event.target.files?.[0] ?? null)
          }
        />
        <button
          type="button"
          className="vehicle-photo-capture-btn vehicle-photo-capture-btn--secondary"
          disabled={disabled || processing}
          onClick={() => void openLiveCamera()}
        >
          Live camera
        </button>
      </div>

      {cameraError ? (
        <p className="form-message form-message--error" role="alert">
          {cameraError}
        </p>
      ) : null}

      {processing && progressLabel ? (
        <p className="vehicle-photo-capture-progress" role="status">
          {progressLabel}
        </p>
      ) : null}

      {previewUrl ? (
        <img
          src={previewUrl}
          alt="Preview of uploaded plate photo"
          className="vehicle-photo-capture-preview"
        />
      ) : null}

      {cameraOpen ? (
        <div
          className="vehicle-photo-camera-overlay"
          role="dialog"
          aria-modal="true"
          aria-label="Capture plate photo"
        >
          <div className="vehicle-photo-camera-panel">
            <video ref={videoRef} className="vehicle-photo-camera-video" playsInline muted />
            <div className="vehicle-photo-camera-actions">
              <button
                type="button"
                className="checkout-dialog-cancel"
                onClick={closeCamera}
              >
                Cancel
              </button>
              <button
                type="button"
                className="checkout-dialog-confirm entry-submit"
                onClick={() => void captureFromLiveCamera()}
              >
                Capture
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </section>
  )
}
