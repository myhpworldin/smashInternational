import type { OnboardingAssetDoc } from "@/server/repositories/onboarding-assets.repo";
import { ASSET_TYPES } from "@/shared/types/onboarding";

function formatSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Reuses the same authenticated file-serving route the client's own
// AssetsPanel uses — an admin session satisfies that route's access check
// (see api/onboarding/assets/[assetId]/file), so no separate admin-only
// download endpoint was needed.
export default function AdminAssetsList({ assets }: { assets: OnboardingAssetDoc[] }) {
  if (assets.length === 0) {
    return <p className="font-body text-sm text-ash">No files uploaded.</p>;
  }

  return (
    <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 md:grid-cols-3">
      {assets.map((asset) => {
        const fileUrl = `/api/onboarding/assets/${asset._id.toHexString()}/file`;
        const isImage = asset.mimeType.startsWith("image/");

        return (
          <li key={asset._id.toHexString()} className="flex flex-col gap-2 border border-carbon p-3">
            {isImage ? (
              // eslint-disable-next-line @next/next/no-img-element -- authenticated, per-record file route; next/image's remote-optimizer doesn't apply here
              <img
                src={fileUrl}
                alt={asset.originalFilename}
                className="h-32 w-full border border-carbon object-cover"
              />
            ) : (
              <div className="flex h-32 w-full items-center justify-center border border-carbon font-body text-xs text-ash uppercase">
                {asset.mimeType.split("/")[1] ?? "file"}
              </div>
            )}
            <p className="truncate font-body text-xs text-bone">{asset.originalFilename}</p>
            <p className="font-body text-xs text-ash">
              {ASSET_TYPES.find((t) => t.id === asset.assetType)?.label} · {formatSize(asset.sizeBytes)}
            </p>
            <a
              href={fileUrl}
              target="_blank"
              rel="noreferrer"
              className="font-body text-xs text-ash underline hover:text-bone focus-visible:-outline-offset-2"
            >
              Open
            </a>
          </li>
        );
      })}
    </ul>
  );
}
