"use client"

import { useEffect, useRef } from "react"

interface HoverSegmentationPreviewProps {
  originalImage: string
  hoverSegmentation: Uint8Array
  width: number
  height: number
}

export function HoverSegmentationPreview({
  originalImage,
  hoverSegmentation,
  width,
  height,
}: HoverSegmentationPreviewProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !hoverSegmentation || width === 0 || height === 0) return

    const ctx = canvas.getContext("2d", { willReadFrequently: true })
    if (!ctx) return

    // Set canvas dimensions
    canvas.width = width
    canvas.height = height

    // Create a new image
    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      // Draw the original image
      ctx.drawImage(img, 0, 0, width, height)

      // Get the image data
      const imageData = ctx.getImageData(0, 0, width, height)
      const data = imageData.data

      // Apply the hover segmentation with a semi-transparent overlay
      for (let i = 0; i < hoverSegmentation.length; i++) {
        if (hoverSegmentation[i] > 0) {
          // For segmented areas, apply a colored overlay
          const pixelIndex = i * 4
          data[pixelIndex] = Math.min(255, data[pixelIndex] + 100) // Increase red
          data[pixelIndex + 3] = Math.min(255, data[pixelIndex + 3] + 100) // Increase alpha
        }
      }

      // Put the modified image data back
      ctx.putImageData(imageData, 0, 0)
    }

    img.src = originalImage
  }, [originalImage, hoverSegmentation, width, height])

  return (
    <canvas
      ref={canvasRef}
      className="absolute top-0 left-0 w-full h-full pointer-events-none"
      style={{ mixBlendMode: "multiply" }}
    />
  )
}
