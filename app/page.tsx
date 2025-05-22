import { ImageSegmenter } from "@/components/image-segmenter"

export default function Home() {
  return (
    <main className="container mx-auto py-10 px-4 md:px-6">
      <div className="flex flex-col items-center space-y-6 text-center">
        <h1 className="text-4xl font-bold tracking-tighter sm:text-5xl">SAM2 Image Segmentation</h1>
        <p className="max-w-[700px] text-muted-foreground md:text-xl/relaxed">
          Hover over objects to see potential segments, then click to select them.
        </p>
        <div className="w-full max-w-4xl">
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4 mb-6 text-sm text-yellow-800">
            <p className="font-medium">Interactive Segmentation</p>
            <p>
              Hover over objects to see potential segments. Left-click to include a segment, right-click to exclude it.
            </p>
          </div>
          <ImageSegmenter />
        </div>
      </div>
    </main>
  )
}
