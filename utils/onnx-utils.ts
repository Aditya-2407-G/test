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
): Promise<Uint8Array> {
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

  // Create mask input tensor (empty for first run)
  const maskInputTensor = new ort.Tensor("float32", new Float32Array(256 * 256), [1, 1, 256, 256])

  // Create has_mask_input tensor
  const hasMaskInputTensor = new ort.Tensor(
    "float32",
    new Float32Array([0]), // 0 for first run
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
  const maskOutput = results.masks.data as Float32Array

  // Convert float mask to binary mask
  const binaryMask = new Uint8Array(maskOutput.length)
  for (let i = 0; i < maskOutput.length; i++) {
    binaryMask[i] = maskOutput[i] > 0 ? 1 : 0
  }

  return binaryMask
}
