"use client"

import type React from "react"
import { useState, useRef } from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Upload, ImageIcon } from "lucide-react"

interface ImageUploaderProps {
  onImageUpload: (imageDataUrl: string) => void
}

export function ImageUploader({ onImageUpload }: ImageUploaderProps) {
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(true)
  }

  const handleDragLeave = () => {
    setIsDragging(false)
  }

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault()
    setIsDragging(false)

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFile(e.dataTransfer.files[0])
    }
  }

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFile(e.target.files[0])
    }
  }

  const handleFile = (file: File) => {
    if (!file.type.match("image.*")) {
      alert("Please select an image file")
      return
    }

    const reader = new FileReader()
    reader.onload = (e) => {
      if (e.target?.result) {
        onImageUpload(e.target.result as string)
      }
    }
    reader.readAsDataURL(file)
  }

  return (
    <Card
      className={`border-2 border-dashed ${
        isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/20"
      } transition-colors duration-200`}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      <CardContent className="flex flex-col items-center justify-center p-12 text-center">
        <div className="mb-4 rounded-full bg-primary/10 p-3">
          <ImageIcon className="h-10 w-10 text-primary" />
        </div>
        <h3 className="mb-2 text-xl font-semibold">Upload an image</h3>
        <p className="mb-6 text-sm text-muted-foreground">Drag and drop an image, or click to browse</p>
        <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        <Button variant="outline" onClick={() => fileInputRef.current?.click()} className="flex items-center gap-2">
          <Upload className="h-4 w-4" />
          Select Image
        </Button>
        <p className="mt-4 text-xs text-muted-foreground">Supported formats: JPEG, PNG, WebP</p>
      </CardContent>
    </Card>
  )
}
