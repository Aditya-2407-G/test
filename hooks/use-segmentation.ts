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
  const [lowResMaskInput, setLowResMaskInput] = useState<Float32Array | null>(null)

  const getEmbedding = useCallback(async (imageDataUrl: string) => {
    setIsLoading(true)
    setError(null)
    setLowResMaskInput(null); // Clear previous mask when new image is loaded
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
      if (!embedding) {
        console.error("generateMask: No embedding available.")
        return false
      }

      setIsLoading(true)
      setError(null)
      console.log("generateMask: Called with points:", points.length, "hasLowResMaskInput:", !!lowResMaskInput)

      let processedLowResMaskInput = lowResMaskInput

      // If there's a previous mask and any negative points exist in the current point set,
      // create a biased version of the previous mask to strengthen exclusions.
      if (lowResMaskInput && points.some((p) => p[2] === 0)) {
        processedLowResMaskInput = new Float32Array(lowResMaskInput) // Work on a copy

        const neighborhoodSize = 5 // Pixel radius for biasing in the 256x256 low-res mask
        const biasValue = -10.0 // Strong negative logit to suppress segmentation

        points.forEach(([xNorm, yNorm, label]) => {
          if (label === 0) { // For each negative point
            const maskX = Math.floor(xNorm * 256)
            const maskY = Math.floor(yNorm * 256)

            for (let dy = -Math.floor(neighborhoodSize / 2); dy <= Math.floor(neighborhoodSize / 2); dy++) {
              for (let dx = -Math.floor(neighborhoodSize / 2); dx <= Math.floor(neighborhoodSize / 2); dx++) {
                const currentY = maskY + dy
                const currentX = maskX + dx

                if (currentX >= 0 && currentX < 256 && currentY >= 0 && currentY < 256) {
                  const index = currentY * 256 + currentX
                  processedLowResMaskInput![index] = biasValue
                }
              }
            }
          }
        })
        console.log("generateMask: Applied bias to lowResMaskInput for negative points.")
      }

      try {
        const { binaryMask, lowResLogits } = await runSegmentation(
          embedding.data,
          embedding.shape,
          points, // All current points are still passed to the model
          embedding.width,
          embedding.height,
          processedLowResMaskInput, // Pass the original or biased previous mask
        )

        setSegmentationResult({
          mask: Array.from(binaryMask),
          width: embedding.width,
          height: embedding.height,
        })
        setLowResMaskInput(lowResLogits) // Store the new raw logits for the next iteration
        console.log("generateMask: Successfully generated mask and updated lowResMaskInput.")
        return true
      } catch (err) {
        console.error("generateMask: Error during segmentation:", err)
        setError("Failed to generate segmentation mask. Please try again.")
        // Optionally clear lowResMaskInput on error, or leave it to retry with it
        // setLowResMaskInput(null);
        return false
      } finally {
        setIsLoading(false)
      }
    },
    [embedding, lowResMaskInput], 
  )

  const reset = useCallback(() => {
    setSegmentationResult(null)
    setLowResMaskInput(null); // Clear the stored mask on reset
    setError(null)
    console.log("useSegmentation: Reset called.");
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
