import * as ort from "onnxruntime-web"

// Initialize ONNX Runtime
let session: ort.InferenceSession | null = null

export async function initOnnxModel() {
  if (session) return session

  try {
    // Set ONNX WebAssembly path
    ort.env.wasm.wasmPaths = {
      "ort-wasm.wasm": "/ort-wasm.wasm",
      "ort-wasm-simd.wasm": "/ort-wasm-simd.wasm",
      "ort-wasm-threaded.wasm": "/ort-wasm-threaded.wasm",
    }

    // Create session
    session = await ort.InferenceSession.create("/models/sam_onnx_example.onnx", {
      executionProviders: ["wasm"],
      graphOptimizationLevel: "all",
    })

    return session
  } catch (error) {
    console.error("Error initializing ONNX model:", error)
    throw new Error("Failed to initialize ONNX model")
  }
}

export async function runSegmentation(
  embedding: number[],
  embeddingShape: number[],
  points: Array<[number, number, number]>,
  imageWidth: number,
  imageHeight: number,
  previousLowResMask?: Float32Array | null, // Added
): Promise<{ binaryMask: Uint8Array; lowResLogits: Float32Array }> { // Modified return type
  if (!session) {
    session = await initOnnxModel()
  }

  // Prepare input tensors
  const embeddingTensor = new ort.Tensor("float32", new Float32Array(embedding), embeddingShape)

  // Convert normalized points to pixel coordinates
  const pointCoords: number[] = []
  const pointLabels: number[] = []

  points.forEach(([x, y, label]) => {
    pointCoords.push(x * imageWidth)
    pointCoords.push(y * imageHeight)
    pointLabels.push(label)
  })

  // Create point tensors
  const pointCoordsTensor = new ort.Tensor("float32", new Float32Array(pointCoords), [1, points.length, 2])
  const pointLabelsTensor = new ort.Tensor("float32", new Float32Array(pointLabels), [1, points.length])

  // Create mask input tensor
  let maskInputTensor: ort.Tensor
  let hasMaskInputTensorValue: Float32Array

  if (previousLowResMask && previousLowResMask.length === 256 * 256) {
    maskInputTensor = new ort.Tensor("float32", previousLowResMask, [1, 1, 256, 256])
    hasMaskInputTensorValue = new Float32Array([1]) // Indicate that a mask is provided
  } else {
    maskInputTensor = new ort.Tensor("float32", new Float32Array(256 * 256), [1, 1, 256, 256])
    hasMaskInputTensorValue = new Float32Array([0]) // Indicate no mask is provided
  }

  const hasMaskInputTensor = new ort.Tensor(
    "float32",
    hasMaskInputTensorValue,
    [1],
  )

  // Create orig_im_size tensor
  const origImSizeTensor = new ort.Tensor("float32", new Float32Array([imageHeight, imageWidth]), [2])

  // Run inference
  const feeds = {
    image_embeddings: embeddingTensor,
    point_coords: pointCoordsTensor,
    point_labels: pointLabelsTensor,
    mask_input: maskInputTensor,
    has_mask_input: hasMaskInputTensor,
    orig_im_size: origImSizeTensor,
  }

  const results = await session.run(feeds)

  // Get the mask from the output
  const lowResLogits = results.masks.data as Float32Array // This is the raw output

  // Convert float mask to binary mask
  const binaryMask = new Uint8Array(lowResLogits.length)
  for (let i = 0; i < lowResLogits.length; i++) {
    binaryMask[i] = lowResLogits[i] > 0.0 ? 1 : 0 // Standard SAM threshold is 0.0 for logits
  }

  return { binaryMask, lowResLogits } // Return both
}
