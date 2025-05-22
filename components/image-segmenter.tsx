"use client"

import type React from "react"
import { useState, useRef, useCallback, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Loader2, Upload, Undo, Download, Trash2 } from "lucide-react"
import { cn } from "@/lib/utils"
import { ImageUploader } from "./image-uploader"
import { SegmentationControls } from "./segmentation-controls"
import { SegmentationCanvas } from "./segmentation-canvas"
import { useSegmentation } from "@/hooks/use-segmentation"
import { initOnnxModel } from "@/utils/onnx-utils"

export function ImageSegmenter() {
  const [image, setImage] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState("original")
  const [points, setPoints] = useState<Array<[number, number, number]>>([])
  const [modelLoaded, setModelLoaded] = useState(false)
  const [modelLoading, setModelLoading] = useState(false)
  const [selectedSegments, setSelectedSegments] = useState<number[]>([])

  const {
    isLoading,
    error,
    hasEmbedding,
    segmentationResult,
    getEmbedding,
    generateMask,
    reset: resetSegmentation,
  } = useSegmentation()

  const imageRef = useRef<HTMLImageElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  // Initialize ONNX model
  useEffect(() => {
    const loadModel = async () => {
      try {
        setModelLoading(true)
        await initOnnxModel()
        setModelLoaded(true)
      } catch (error) {
        console.error("Failed to load ONNX model:", error)
      } finally {
        setModelLoading(false)
      }
    }

    loadModel()
  }, [])

  const handleImageUpload = async (imageDataUrl: string) => {
    setImage(imageDataUrl)
    setPoints([])
    setSelectedSegments([])
    resetSegmentation()
    setActiveTab("original")

    // Get embeddings for the new image
    await getEmbedding(imageDataUrl)
  }

  const handleImageClick = useCallback(
    (e: React.MouseEvent<HTMLImageElement>) => {
      if (!imageRef.current || !hasEmbedding) return

      const rect = imageRef.current.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width
      const y = (e.clientY - rect.top) / rect.height

      // Add a foreground point (1)
      setPoints((prev) => [...prev, [x, y, 1]])
    },
    [hasEmbedding],
  )

  const handleNegativeClick = useCallback(
    (e: React.MouseEvent<HTMLImageElement>) => {
      if (!imageRef.current || !hasEmbedding) return

      const rect = imageRef.current.getBoundingClientRect()
      const x = (e.clientX - rect.left) / rect.width
      const y = (e.clientY - rect.top) / rect.height

      // Add a background point (0)
      setPoints((prev) => [...prev, [x, y, 0]])
    },
    [hasEmbedding],
  )

  const handleUndo = () => {
    setPoints((prev) => prev.slice(0, -1))
  }

  const handleReset = () => {
    setPoints([])
    setSelectedSegments([])
    resetSegmentation()
  }

  const handleSegment = async () => {
    if (!image || points.length === 0 || !hasEmbedding) return

    const success = await generateMask(points)
    if (success) {
      setActiveTab("segmented")
    }
  }

  const handleDownload = () => {
    if (!segmentationResult || !canvasRef.current) return

    const link = document.createElement("a")
    link.download = "segmentation-result.png"
    link.href = canvasRef.current.toDataURL("image/png")
    link.click()
  }

  return (
    <div className="w-full max-w-4xl mx-auto space-y-6">
      {!modelLoaded && (
        <Card className="p-6 text-center">
          <div className="flex flex-col items-center justify-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p>{modelLoading ? "Loading SAM2 ONNX model..." : "Initializing..."}</p>
          </div>
        </Card>
      )}

      {modelLoaded && !image ? (
        <ImageUploader onImageUpload={handleImageUpload} />
      ) : modelLoaded && image ? (
        <>
          <div className="flex flex-wrap gap-4 justify-center">
            <Button variant="outline" onClick={() => setImage(null)} className="flex items-center gap-2">
              <Upload className="h-4 w-4" />
              New Image
            </Button>

            <Button
              variant="outline"
              onClick={handleUndo}
              disabled={points.length === 0}
              className="flex items-center gap-2"
            >
              <Undo className="h-4 w-4" />
              Undo Point
            </Button>

            <Button
              variant="outline"
              onClick={handleReset}
              disabled={points.length === 0 && !segmentationResult}
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Reset
            </Button>

            {segmentationResult && (
              <Button variant="outline" onClick={handleDownload} className="flex items-center gap-2">
                <Download className="h-4 w-4" />
                Download Result
              </Button>
            )}

            <Button
              onClick={handleSegment}
              disabled={isLoading || points.length === 0 || !hasEmbedding}
              className="flex items-center gap-2"
            >
              {isLoading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                "Segment Image"
              )}
            </Button>
          </div>

          <Card className="overflow-hidden">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <div className="px-4 pt-4">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="original">Original Image</TabsTrigger>
                  <TabsTrigger value="segmented" disabled={!segmentationResult}>
                    Segmentation Result
                  </TabsTrigger>
                </TabsList>
              </div>

              <CardContent className="p-4">
                <TabsContent value="original" className="mt-0">
                  <div className="relative border rounded-md overflow-hidden">
                    <div className="relative">
                      <img
                        ref={imageRef}
                        src={image || "/placeholder.svg"}
                        alt="Original image"
                        className={cn(
                          "w-full h-auto max-h-[600px] object-contain bg-black/5",
                          hasEmbedding && "cursor-crosshair",
                        )}
                        onClick={handleImageClick}
                        onContextMenu={(e) => {
                          e.preventDefault()
                          handleNegativeClick(e)
                        }}
                      />

                      {/* Points overlay */}
                      <div className="absolute inset-0 pointer-events-none">
                        {points.map((point, i) => (
                          <div
                            key={i}
                            className={cn(
                              "absolute w-4 h-4 rounded-full -translate-x-1/2 -translate-y-1/2 border-2",
                              point[2] === 1 ? "bg-green-500 border-white" : "bg-red-500 border-white",
                            )}
                            style={{
                              left: `${point[0] * 100}%`,
                              top: `${point[1] * 100}%`,
                            }}
                          />
                        ))}
                      </div>
                    </div>
                  </div>

                  <SegmentationControls
                    pointCount={points.length}
                    hasNegativePoints={points.some((p) => p[2] === 0)}
                    segmentCount={selectedSegments.length}
                  />
                </TabsContent>

                <TabsContent value="segmented" className="mt-0">
                  {segmentationResult && (
                    <SegmentationCanvas ref={canvasRef} originalImage={image} segmentationResult={segmentationResult} />
                  )}
                </TabsContent>
              </CardContent>
            </Tabs>
          </Card>

          {error && <div className="p-4 bg-red-50 text-red-600 rounded-md">{error}</div>}
          {isLoading && !error && (
            <div className="p-4 bg-blue-50 text-blue-600 rounded-md flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Processing your request...
            </div>
          )}
        </>
      ) : null}
    </div>
  )
}
