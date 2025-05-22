export function SegmentationControls({
  pointCount,
  hasNegativePoints,
  segmentCount = 0,
}: {
  pointCount: number
  hasNegativePoints: boolean
  segmentCount?: number
}) {
  return (
    <div className="mt-4 p-4 bg-muted/50 rounded-md">
      <h3 className="font-medium mb-2">Instructions:</h3>
      <ul className="space-y-2 text-sm">
        <li className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>Hover over objects to see potential segments</span>
        </li>
        <li className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-green-500"></div>
          <span>Left click to add the highlighted segment (include in selection)</span>
        </li>
        <li className="flex items-center gap-2">
          <div className="w-3 h-3 rounded-full bg-red-500"></div>
          <span>Right click to exclude the highlighted segment (exclude from selection)</span>
        </li>
        <li>
          Current points: <span className="font-medium">{pointCount}</span>
          {pointCount > 0 && (
            <span className="text-xs ml-2">({hasNegativePoints ? "Mixed points" : "Positive points only"})</span>
          )}
        </li>
        {segmentCount > 0 && (
          <li>
            Selected segments: <span className="font-medium">{segmentCount}</span>
          </li>
        )}
      </ul>
    </div>
  )
}
