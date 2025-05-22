"use server"

import type { EmbeddingResponse } from "@/types/segmentation"

export async function getImageEmbeddings(imageBase64: string): Promise<EmbeddingResponse> {
  // Remove the data URL prefix if present
  const base64Data = imageBase64.includes("base64,") ? imageBase64.split("base64,")[1] : imageBase64

  try {
    const endpoint = "https://rc19--sam-segmentation-api-sammodel-embed-image.modal.run"
    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        image: base64Data,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`Embedding API error (in server action): ${response.status} ${response.statusText}`, errorText) // More detailed log
      throw new Error(`Failed to get embeddings: ${response.status} ${response.statusText}. Details: ${errorText}`)
    }

    const result = await response.json()
    console.log("Embedding API success (in server action), result:", result); // Log successful result
    return result as EmbeddingResponse
  } catch (error) {
    console.error("Error in getImageEmbeddings server action catch block:", error) // Log caught error
    throw error // Re-throw the original error
  }
}
