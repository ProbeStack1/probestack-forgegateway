import { AlertTriangle, X } from "lucide-react";
import { useState } from "react";

export default function KongDeleteConfirmModal({
  resourceName = "resource",
  itemName = "",
  onCancel,
  onConfirm,
}) {
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState("");

  const handleConfirm = async () => {
    setIsDeleting(true);
    setError("");

    try {
      await onConfirm?.();
    } catch (deleteError) {
      setError(deleteError?.message || `Failed to delete ${resourceName}`);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-white/10 bg-[#15192b] shadow-2xl shadow-black/40">
        <div className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-full border border-red-500/30 bg-red-500/10 text-red-300">
              <AlertTriangle size={18} />
            </span>
            <div>
              <h2 className="text-base font-semibold text-white">Delete {resourceName}?</h2>
              <p className="mt-1 text-sm text-slate-400">This action cannot be undone.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="text-slate-400 transition hover:text-white disabled:opacity-50"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <div className="px-5 py-4">
          <p className="text-sm text-slate-300">
            Are you sure you want to delete
            {itemName ? <span className="font-semibold text-white"> {itemName}</span> : " this item"}?
          </p>
          {error && (
            <p className="mt-3 rounded-lg border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm text-red-300">
              {error}
            </p>
          )}
        </div>

        <div className="flex justify-end gap-3 border-t border-white/10 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="rounded-lg border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-200 transition hover:bg-white/10 disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            disabled={isDeleting}
            className="rounded-lg bg-red-500 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-red-500/20 transition hover:bg-red-400 disabled:opacity-50"
          >
            {isDeleting ? "Deleting..." : "Delete"}
          </button>
        </div>
      </div>
    </div>
  );
}
