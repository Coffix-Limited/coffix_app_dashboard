"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import {
  uploadProductImage,
  ACCEPTED_IMAGE_TYPES,
  MAX_IMAGE_BYTES,
} from "@/app/lib/firebase-storage";
import { Button } from "../ui/button";

interface ImageUploadFieldProps {
  value: string;
  onChange: (url: string) => void;
  label?: string;
  disabled?: boolean;
}

export function ImageUploadField({ value, onChange, label = "Image", disabled }: ImageUploadFieldProps) {
  const uid = useId();
  const inputId = `img-upload-${uid}`;
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploadState, setUploadState] = useState<"idle" | "uploading" | "error">("idle");
  const [progress, setProgress] = useState(0);
  const [validationError, setValidationError] = useState<string | null>(null);
  // Tracks a temporary local blob URL during upload; null when not uploading
  const [blobUrl, setBlobUrl] = useState<string | null>(null);
  const blobUrlRef = useRef<string | null>(null);

  // Derived: show blob preview during upload, fall back to committed URL
  const previewUrl = blobUrl ?? (value || null);

  useEffect(() => {
    return () => {
      if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    };
  }, []);

  function handleFile(file: File) {
    setValidationError(null);

    if (!(ACCEPTED_IMAGE_TYPES as readonly string[]).includes(file.type)) {
      setValidationError("Only PNG and JPEG images are accepted.");
      return;
    }
    if (file.size > MAX_IMAGE_BYTES) {
      setValidationError("Image must be 5 MB or smaller.");
      return;
    }

    if (blobUrlRef.current) URL.revokeObjectURL(blobUrlRef.current);
    const newBlobUrl = URL.createObjectURL(file);
    blobUrlRef.current = newBlobUrl;
    setBlobUrl(newBlobUrl);
    setProgress(0);
    setUploadState("uploading");

    uploadProductImage(file, setProgress)
      .then((downloadUrl) => {
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = null;
        }
        setBlobUrl(null);
        setUploadState("idle");
        onChange(downloadUrl);
      })
      .catch((err: Error) => {
        setValidationError(err.message ?? "Upload failed. Please try again.");
        setUploadState("error");
        if (blobUrlRef.current) {
          URL.revokeObjectURL(blobUrlRef.current);
          blobUrlRef.current = null;
        }
        setBlobUrl(null);
      });
  }

  function handleInputChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) handleFile(file);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  }

  function handleRemove() {
    if (blobUrlRef.current) {
      URL.revokeObjectURL(blobUrlRef.current);
      blobUrlRef.current = null;
    }
    setBlobUrl(null);
    setUploadState("idle");
    setValidationError(null);
    setProgress(0);
    onChange("");
  }

  const isUploading = uploadState === "uploading";
  const isDisabled = disabled || isUploading;

  return (
    <div>
      <label className="mb-1.5 block text-xs text-black">{label}</label>

      <label
        htmlFor={inputId}
        onDragOver={handleDragOver}
        onDrop={handleDrop}
        className={`flex min-h-[80px] cursor-pointer items-center gap-4 rounded-lg border-2 border-dashed px-4 py-3 transition-colors ${
          isDisabled
            ? "cursor-not-allowed opacity-60 border-border"
            : "border-border hover:border-primary"
        }`}
      >
        {previewUrl && (
          <div className="relative h-14 w-14 flex-shrink-0 overflow-hidden rounded-lg">
            <Image
              src={previewUrl}
              alt="Preview"
              fill
              className="object-cover"
              unoptimized={previewUrl.startsWith("blob:")}
            />
          </div>
        )}

        <div className="flex-1 min-w-0">
          {isUploading ? (
            <div className="space-y-1.5">
              <p className="text-xs text-black">Uploading…</p>
              <div className="h-1.5 w-full overflow-hidden rounded-full bg-border">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-200"
                  style={{ width: `${progress}%` }}
                />
              </div>
              <p className="text-xs text-black">{progress}%</p>
            </div>
          ) : (
            <>
              <p className="text-xs font-medium text-black">
                {previewUrl ? "Click to replace image" : "Click to upload an image"}
              </p>
              <p className="text-xs text-black opacity-60">PNG or JPEG · max 5 MB</p>
            </>
          )}
        </div>

        <input
          ref={inputRef}
          id={inputId}
          type="file"
          accept="image/png,image/jpeg,image/jpg"
          onChange={handleInputChange}
          disabled={isDisabled}
          className="sr-only"
        />
      </label>

      <div className="mt-1.5 flex items-center gap-3">
        {validationError && (
          <p className="text-xs text-error">{validationError}</p>
        )}
        {previewUrl && !isUploading && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleRemove}
            disabled={isDisabled}
            className="ml-auto text-xs text-black hover:text-error disabled:opacity-40"
          >
            ✕ Remove
          </Button>
        )}
      </div>
    </div>
  );
}
