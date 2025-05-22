"use client"

import { forwardRef, useEffect, useImperativeHandle, useRef } from "react"
import type { SegmentationResult } from "@/types/segmentation"

interface SegmentationCanvasProps {
  originalImage: string
  segmentationResult: SegmentationResult
}

export const SegmentationCanvas = forwardRef<HTMLCanvasElement, SegmentationCanvasProps>(function SegmentationCanvas(
  { originalImage, segmentationResult },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Forward the canvas ref
  useImperativeHandle(ref, () => canvasRef.current!)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas || !segmentationResult) return

    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const img = new Image()
    img.crossOrigin = "anonymous"
    img.onload = () => {
      // Set canvas dimensions to match the image
      canvas.width = img.width
      canvas.height = img.height

      // Draw the original image
      ctx.drawImage(img, 0, 0)

      // Create a mask from the segmentation result
      const { mask, width, height } = segmentationResult

      if (mask && mask.length > 0) {
        // Create an ImageData object from the mask
        const imageData = ctx.createImageData(width, height)
        const data = imageData.data

        // Apply the mask with a semi-transparent overlay
        for (let i = 0; i < mask.length; i++) {
          const pixelIndex = i * 4

          if (mask[i] > 0) {
            // For segmented areas, apply a colored overlay
            data[pixelIndex] = 255 // R
            data[pixelIndex + 1] = 0 // G
            data[pixelIndex + 2] = 0 // B
            data[pixelIndex + 3] = 128 // A (semi-transparent)
          } else {
            // For non-segmented areas, make them semi-transparent
            data[pixelIndex] = 0
            data[pixelIndex + 1] = 0
            data[pixelIndex + 2] = 0
            data[pixelIndex + 3] = 0
          }
        }

        // Draw the mask over the image
        ctx.putImageData(imageData, 0, 0)

        // Draw a border around the segmented area
        ctx.strokeStyle = "rgba(255, 255, 255, 0.8)"
        ctx.lineWidth = 2

        // Find the contour of the mask
        const contourData = findContour(mask, width, height)
        if (contourData.length > 0) {
          ctx.beginPath()
          for (let i = 0; i < contourData.length; i++) {
            const [x, y] = contourData[i]
            if (i === 0) {
              ctx.moveTo(x, y)
            } else {
              ctx.lineTo(x, y)
            }
          }
          ctx.closePath()
          ctx.stroke()
        }
      }
    }

    img.src = originalImage
  }, [originalImage, segmentationResult])

  return (
    <div className="border rounded-md overflow-hidden bg-black/5">
      <canvas ref={canvasRef} className="w-full h-auto max-h-[600px] object-contain" />
    </div>
  )
})

// Helper function to find the contour of the mask
function findContour(mask: number[], width: number, height: number): [number, number][] {
  const contour: [number, number][] = []
  const visited = new Set<number>()

  // Simplified contour detection - just find edge pixels
  for (let y = 1; y < height - 1; y++) {
    for (let x = 1; x < width - 1; x++) {
      const idx = y * width + x

      if (mask[idx] > 0) {
        // Check if this is an edge pixel (has at least one background neighbor)
        const hasBackgroundNeighbor =
          mask[idx - 1] === 0 || // left
          mask[idx + 1] === 0 || // right
          mask[idx - width] === 0 || // top
          mask[idx + width] === 0 // bottom

        if (hasBackgroundNeighbor && !visited.has(idx)) {
          contour.push([x, y])
          visited.add(idx)
        }
      }
    }
  }

  return contour
}
