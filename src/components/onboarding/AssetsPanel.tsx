"use client";

import { useEffect, useRef, useState } from "react";
import {
  ASSET_TYPES,
  MAX_ASSET_SIZE_BYTES,
  isAllowedAssetMime,
  type AssetType,
} from "@/shared/types/onboarding";

type Asset = {
  _id: string;
  assetType: AssetType;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
};

type UploadState = { fileName: string; progress: number; error: string | null };

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Uploads real bytes to the Phase 5 GridFS-backed endpoint. Uses XHR (not
// fetch) specifically for upload.onprogress — fetch has no upload progress
// event for a request body.
function uploadWithProgress(
  file: File,
  assetType: AssetType,
  onProgress: (percent: number) => void,
): Promise<{ ok: boolean; message?: string; asset?: Asset }> {
  return new Promise((resolve) => {
    const xhr = new XMLHttpRequest();
    const formData = new FormData();
    formData.append("file", file);
    formData.append("assetType", assetType);

    xhr.upload.onprogress = (e) => {
      if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100));
    };

    xhr.onload = () => {
      try {
        const data = JSON.parse(xhr.responseText);
        if (xhr.status >= 200 && xhr.status < 300 && data.ok) {
          resolve({ ok: true, asset: data.asset });
        } else {
          resolve({ ok: false, message: data.message ?? "Upload failed." });
        }
      } catch {
        resolve({ ok: false, message: "Upload failed." });
      }
    };

    xhr.onerror = () => resolve({ ok: false, message: "Couldn't reach the server." });

    xhr.open("POST", "/api/onboarding/assets");
    xhr.send(formData);
  });
}

export default function AssetsPanel() {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetType, setAssetType] = useState<AssetType>("logo");
  const [loading, setLoading] = useState(true);
  const [uploads, setUploads] = useState<Record<string, UploadState>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch("/api/onboarding/assets")
      .then((res) => res.json())
      .then((data) => {
        if (!cancelled && data?.ok) setAssets(data.assets);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleFileSelected = async (file: File | undefined) => {
    if (!file) return;

    const uploadKey = `${file.name}-${Date.now()}`;

    // Checked client-side first for immediate feedback — the server repeats
    // both checks regardless, since this is easy to bypass from outside the UI.
    if (file.size > MAX_ASSET_SIZE_BYTES) {
      setUploads((prev) => ({ ...prev, [uploadKey]: { fileName: file.name, progress: 0, error: "File is too large." } }));
      return;
    }
    if (!isAllowedAssetMime(assetType, file.type)) {
      setUploads((prev) => ({
        ...prev,
        [uploadKey]: { fileName: file.name, progress: 0, error: "That file type isn't supported for this category." },
      }));
      return;
    }

    setUploads((prev) => ({ ...prev, [uploadKey]: { fileName: file.name, progress: 0, error: null } }));

    const result = await uploadWithProgress(file, assetType, (percent) =>
      setUploads((prev) => ({ ...prev, [uploadKey]: { ...prev[uploadKey], progress: percent } })),
    );

    if (result.ok && result.asset) {
      setAssets((prev) => [result.asset as Asset, ...prev]);
      setUploads((prev) => {
        const next = { ...prev };
        delete next[uploadKey];
        return next;
      });
    } else {
      setUploads((prev) => ({
        ...prev,
        [uploadKey]: { ...prev[uploadKey], error: result.message ?? "Upload failed." },
      }));
    }

    if (fileInputRef.current) fileInputRef.current.value = "";
  };

  const handleRemove = async (assetId: string) => {
    setAssets((prev) => prev.filter((a) => a._id !== assetId));
    await fetch(`/api/onboarding/assets/${assetId}`, { method: "DELETE" }).catch(() => null);
  };

  return (
    <div className="flex flex-col gap-3 border border-carbon p-4">
      <h3 className="font-body text-xs tracking-[0.14em] text-ash uppercase">Assets</h3>
      <p className="font-body text-xs text-ash">
        Logo, brand guidelines, product images, videos, existing creatives, brochures, catalogues.
      </p>

      {loading ? (
        <p className="font-body text-xs text-ash">Loading…</p>
      ) : (
        <ul className="flex flex-col gap-1">
          {assets.length === 0 && Object.keys(uploads).length === 0 && (
            <li className="font-body text-xs text-ash">No files added yet.</li>
          )}
          {assets.map((asset) => (
            <li key={asset._id} className="flex items-center justify-between gap-2 font-body text-xs">
              <a
                href={`/api/onboarding/assets/${asset._id}/file`}
                target="_blank"
                rel="noreferrer"
                className="min-w-0 flex-1 truncate text-bone underline hover:text-smash-text focus-visible:-outline-offset-2"
              >
                {asset.originalFilename}
              </a>
              <span className="whitespace-nowrap text-ash">
                {ASSET_TYPES.find((t) => t.id === asset.assetType)?.label} · {formatSize(asset.sizeBytes)}
              </span>
              <button
                type="button"
                onClick={() => handleRemove(asset._id)}
                aria-label={`Remove ${asset.originalFilename}`}
                className="text-ash hover:text-smash-text focus-visible:-outline-offset-2"
              >
                ×
              </button>
            </li>
          ))}
          {Object.entries(uploads).map(([key, upload]) => (
            <li key={key} className="flex flex-col gap-1 font-body text-xs">
              <div className="flex items-center justify-between">
                <span className="truncate text-bone">{upload.fileName}</span>
                <span className="text-ash">{upload.error ? "Failed" : `${upload.progress}%`}</span>
              </div>
              {!upload.error && (
                <div className="h-[2px] w-full bg-carbon">
                  <div
                    className="h-full bg-smash transition-[width] duration-150"
                    style={{ width: `${upload.progress}%` }}
                  />
                </div>
              )}
              {upload.error && (
                <p role="alert" className="text-smash-text">
                  {upload.error}
                </p>
              )}
            </li>
          ))}
        </ul>
      )}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <label htmlFor="asset-type-select" className="sr-only">
          Asset type
        </label>
        <select
          id="asset-type-select"
          value={assetType}
          onChange={(e) => setAssetType(e.target.value as AssetType)}
          className="rounded-none border border-carbon bg-carbon px-3 py-2 font-body text-sm text-bone focus-visible:-outline-offset-2"
        >
          {ASSET_TYPES.map((t) => (
            <option key={t.id} value={t.id}>
              {t.label}
            </option>
          ))}
        </select>
        <label htmlFor="asset-file-input" className="sr-only">
          Choose file to upload
        </label>
        <input
          id="asset-file-input"
          ref={fileInputRef}
          type="file"
          onChange={(e) => handleFileSelected(e.target.files?.[0])}
          className="font-body text-xs text-ash"
        />
      </div>
    </div>
  );
}
