"use client";

import { useEffect, useRef, useState } from "react";
import {
  ASSET_TYPES,
  MAX_ASSET_SIZE_BYTES,
  isAllowedAssetMime,
  type AssetType,
} from "@/shared/types/onboarding";
import { useOnboardingApiBase } from "@/components/onboarding/OnboardingApiContext";

type Asset = {
  _id: string;
  assetType: AssetType;
  originalFilename: string;
  mimeType: string;
  sizeBytes: number;
};

type UploadState = { fileName: string; progress: number; error: string | null };

// Short, beginner-friendly guidance per category — shown next to the file
// picker since a native <input type="file"> has no placeholder of its own.
const UPLOAD_GUIDANCE: Record<AssetType, string> = {
  logo: "Upload your company logo",
  brand_guidelines: "Upload your brand guideline document",
  product_images: "Upload clear images of your products",
  existing_creatives: "Upload previous ads, social designs, or videos",
  brochures: "Upload your brochure (PDF)",
  catalogues: "Upload your product catalogue (PDF)",
};

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
  apiBase: string,
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

    xhr.open("POST", `${apiBase}/assets`);
    xhr.send(formData);
  });
}

function AssetThumbnail({ asset }: { asset: Asset }) {
  const fileUrl = `/api/onboarding/assets/${asset._id}/file`;
  const isImage = asset.mimeType.startsWith("image/");

  if (isImage) {
    return (
      // eslint-disable-next-line @next/next/no-img-element -- authenticated, per-record file route; next/image's remote-optimizer doesn't apply here
      <img
        src={fileUrl}
        alt={asset.originalFilename}
        className="h-14 w-14 shrink-0 border border-carbon object-cover"
      />
    );
  }

  const kind = asset.mimeType === "application/pdf" ? "PDF" : asset.mimeType.startsWith("video/") ? "Video" : "File";

  return (
    <div className="flex h-14 w-14 shrink-0 items-center justify-center border border-carbon font-body text-[10px] tracking-[0.1em] text-ash uppercase">
      {kind}
    </div>
  );
}

export default function AssetsPanel() {
  const apiBase = useOnboardingApiBase();
  const [assets, setAssets] = useState<Asset[]>([]);
  const [assetType, setAssetType] = useState<AssetType>("logo");
  const [loading, setLoading] = useState(true);
  const [uploads, setUploads] = useState<Record<string, UploadState>>({});
  const [reorderError, setReorderError] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`${apiBase}/assets`)
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
    // eslint-disable-next-line react-hooks/exhaustive-deps -- apiBase is fixed for the life of one wizard mount, not reactive state
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

    const result = await uploadWithProgress(file, assetType, apiBase, (percent) =>
      setUploads((prev) => ({ ...prev, [uploadKey]: { ...prev[uploadKey], progress: percent } })),
    );

    if (result.ok && result.asset) {
      setAssets((prev) => [...prev, result.asset as Asset]);
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
    await fetch(`${apiBase}/assets/${assetId}`, { method: "DELETE" }).catch(() => null);
  };

  // Reorders locally first (the control the user just used should react
  // immediately), then persists the full new sequence — reverted back to
  // the pre-move order if the save fails, so the visible list never claims
  // an order the server didn't actually accept.
  const moveAsset = async (index: number, direction: -1 | 1) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= assets.length) return;

    const previous = assets;
    const reordered = [...assets];
    [reordered[index], reordered[targetIndex]] = [reordered[targetIndex], reordered[index]];
    setAssets(reordered);
    setReorderError(null);

    try {
      const response = await fetch(`${apiBase}/assets`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ assetIds: reordered.map((a) => a._id) }),
      });
      const data = await response.json().catch(() => null);
      if (!response.ok || !data?.ok) {
        setAssets(previous);
        setReorderError("Couldn't save the new order. Try again.");
      }
    } catch {
      setAssets(previous);
      setReorderError("Couldn't reach the server. Try again.");
    }
  };

  const hasFiles = assets.length > 0 || Object.keys(uploads).length > 0;

  return (
    <div className="flex flex-col gap-4 border border-carbon p-4">
      <div>
        <h3 className="font-body text-xs tracking-[0.14em] text-ash uppercase">Assets</h3>
        <p className="mt-1 font-body text-xs text-ash">
          Logo, brand guidelines, product images, existing creatives, brochures, catalogues.
        </p>
      </div>

      {loading ? (
        <p className="font-body text-xs text-ash">Loading…</p>
      ) : (
        hasFiles && (
          <ul className="flex flex-col gap-2">
            {assets.map((asset, index) => (
              <li
                key={asset._id}
                className="flex items-center gap-3 border border-carbon bg-void p-2 font-body text-xs"
              >
                <a
                  href={`/api/onboarding/assets/${asset._id}/file`}
                  target="_blank"
                  rel="noreferrer"
                  aria-label={`Open ${asset.originalFilename}`}
                  className="focus-visible:-outline-offset-2"
                >
                  <AssetThumbnail asset={asset} />
                </a>
                <div className="min-w-0 flex-1">
                  <a
                    href={`/api/onboarding/assets/${asset._id}/file`}
                    target="_blank"
                    rel="noreferrer"
                    className="block truncate text-bone underline hover:text-smash-text focus-visible:-outline-offset-2"
                  >
                    {asset.originalFilename}
                  </a>
                  <span className="text-ash">
                    {ASSET_TYPES.find((t) => t.id === asset.assetType)?.label} · {formatSize(asset.sizeBytes)}
                  </span>
                </div>
                <div className="flex shrink-0 items-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveAsset(index, -1)}
                    disabled={index === 0}
                    aria-label={`Move ${asset.originalFilename} earlier`}
                    className="px-1.5 py-1 text-ash hover:text-bone disabled:opacity-30 focus-visible:-outline-offset-2"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => moveAsset(index, 1)}
                    disabled={index === assets.length - 1}
                    aria-label={`Move ${asset.originalFilename} later`}
                    className="px-1.5 py-1 text-ash hover:text-bone disabled:opacity-30 focus-visible:-outline-offset-2"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemove(asset._id)}
                    aria-label={`Remove ${asset.originalFilename}`}
                    className="px-1.5 py-1 text-ash hover:text-smash-text focus-visible:-outline-offset-2"
                  >
                    ×
                  </button>
                </div>
              </li>
            ))}
            {Object.entries(uploads).map(([key, upload]) => (
              <li key={key} className="flex flex-col gap-1 border border-carbon bg-void p-2 font-body text-xs">
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
        )
      )}

      {reorderError && (
        <p role="alert" className="font-body text-xs text-smash-text">
          {reorderError}
        </p>
      )}

      <div className="flex flex-col gap-2 border-t border-carbon pt-4">
        <p className="font-body text-xs tracking-[0.14em] text-ash uppercase">Add a file</p>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <label htmlFor="asset-type-select" className="font-body text-xs text-ash sm:w-28 sm:shrink-0">
            Category
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
        </div>
        <p className="font-body text-xs text-ash sm:pl-[calc(7rem+0.5rem)]">{UPLOAD_GUIDANCE[assetType]}</p>
        <input
          ref={fileInputRef}
          type="file"
          onChange={(e) => handleFileSelected(e.target.files?.[0])}
          className="hidden"
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="self-start rounded-none border border-carbon bg-carbon px-[18px] py-[11px] font-body text-sm text-bone hover:border-ash focus-visible:-outline-offset-2 sm:ml-[calc(7rem+0.5rem)]"
        >
          Choose file to upload
        </button>
      </div>
    </div>
  );
}
