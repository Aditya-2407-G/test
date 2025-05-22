"use client"

import { useState, useCallback } from "react"
import { getImageEmbeddings } from "@/actions/get-embeddings"
import { runSegmentation } from "@/utils/onnx-utils"
import type { SegmentationResult } from "@/types/segmentation"

export function useSegmentation() {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [embedding, setEmbedding] = useState<{
    data: number[]
    shape: number[]
    width: number
    height: number
  } | null>(null)
  const [segmentationResult, setSegmentationResult] = useState<SegmentationResult | null>(null)

  const getEmbedding = useCallback(async (imageDataUrl: string) => {
    setIsLoading(true)
    setError(null)
    console.log("useSegmentation: Starting getEmbedding for image..."); // Log: Start

    try {
      // Get image dimensions
      const img = new Image()
      img.src = imageDataUrl
      await new Promise((resolve, reject) => { // Added reject for error handling
        img.onload = resolve
        img.onerror = reject // Handle image loading errors
      })
      const width = img.width
      const height = img.height
      console.log(`useSegmentation: Image dimensions: ${width}x${height}`); // Log: Dimensions

      // Get embeddings from API
      console.log("useSegmentation: Calling getImageEmbeddings server action..."); // Log: Before server action call
      const response = await getImageEmbeddings(imageDataUrl)
      console.log("useSegmentation: Received response from getImageEmbeddings:", response); // Log: Response from server action

      if (response && response.status === "success" && response.data) {
        console.log("useSegmentation: Embedding success. Data:", response.data); // Log: Success and data
        setEmbedding({
          data: response.data.embedding,
          shape: response.data.shape,
          width,
          height,
        })
        return true
      } else {
        console.error("useSegmentation: Invalid response from embedding API or API error state. Response:", response); // Log: Invalid response
        throw new Error("Invalid response from embedding API")
      }
    } catch (err) {
      console.error("useSegmentation: Error in getEmbedding catch block:", err); // Log: Catch block error
      setError("Failed to get image embeddings. Please try again.")
      return false
    } finally {
      setIsLoading(false)
      console.log("useSegmentation: Finished getEmbedding."); // Log: Finish
    }
  }, [])

  const generateMask = useCallback(
    async (points: Array<[number, number, number]>) => {
      if (!embedding) return false

      setIsLoading(true)
      setError(null)

      try {
        const mask = await runSegmentation(embedding.data, embedding.shape, points, embedding.width, embedding.height)

        setSegmentationResult({
          mask: Array.from(mask),
          width: embedding.width,
          height: embedding.height,
        })

        return true
      } catch (err) {
        console.error(err)
        setError("Failed to generate segmentation mask. Please try again.")
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [embedding],
  )

  const reset = useCallback(() => {
    setSegmentationResult(null)
    setError(null)
  }, [])

  return {
    isLoading,
    error,
    hasEmbedding: !!embedding,
    segmentationResult,
    getEmbedding,
    generateMask,
    reset,
  }
}
