export interface EmbeddingResponse {
  status: string
  data: {
    embedding: number[]
    shape: number[]
    dtype: string
  }
}

export interface SegmentationResult {
  mask: number[]
  width: number
  height: number
}

export interface Point {
  x: number
  y: number
  type: 0 | 1 // 0 for background, 1 for foreground
}
