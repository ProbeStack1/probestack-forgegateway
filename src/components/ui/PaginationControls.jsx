// src/components/Gateway/PaginationControls.jsx
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "../../lib/utils";

export const PaginationControls = ({
  currentPage,
  totalItems,
  pageSize,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 25, 50],
  className = "",
}) => {
  const totalPages = Math.ceil(totalItems / pageSize);
  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;
    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      if (currentPage <= 3) {
        for (let i = 1; i <= 4; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      } else if (currentPage >= totalPages - 2) {
        pages.push(1);
        pages.push("...");
        for (let i = totalPages - 3; i <= totalPages; i++) pages.push(i);
      } else {
        pages.push(1);
        pages.push("...");
        for (let i = currentPage - 1; i <= currentPage + 1; i++) pages.push(i);
        pages.push("...");
        pages.push(totalPages);
      }
    }
    return pages;
  };

  if (totalItems === 0) return null;

  return (
    <div className={`flex flex-wrap items-center justify-between gap-4 mt-4 ${className}`}>
      {/* Page size selector */}
      <div className="flex items-center gap-2">
        <span className="text-xs text-slate-400">Show</span>
        <select
          value={pageSize}
          onChange={(e) => {
            onPageSizeChange(Number(e.target.value));
            onPageChange(1);
          }}
          className="bg-[#1a1f2e] border border-[#2a3550] rounded-lg px-2 py-1 text-sm text-white focus:outline-none focus:border-[#ff5b1f]"
        >
          {pageSizeOptions.map((size) => (
            <option key={size} value={size}>
              {size}
            </option>
          ))}
        </select>
        <span className="text-xs text-slate-400">entries</span>
      </div>

      {/* Range info */}
      <div className="text-sm text-slate-400">
        Showing <span className="text-white font-medium">{startItem}</span> to{" "}
        <span className="text-white font-medium">{endItem}</span> of{" "}
        <span className="text-white font-medium">{totalItems}</span> results
      </div>

      {/* Pagination buttons */}
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-lg transition-all",
            currentPage === 1
              ? "text-slate-600 cursor-not-allowed"
              : "text-slate-300 hover:bg-[#ff5b1f]/20 hover:text-white border border-transparent hover:border-[#ff5b1f]/40"
          )}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {getPageNumbers().map((page, idx) =>
          page === "..." ? (
            <span key={`ellipsis-${idx}`} className="w-8 h-8 flex items-center justify-center text-slate-500">
              •••
            </span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page)}
              className={cn(
                "w-8 h-8 rounded-lg text-sm font-medium transition-all",
                currentPage === page
                  ? "bg-gradient-to-r from-[#ff5b1f] to-[#ff8a5c] text-white shadow-md"
                  : "text-slate-300 hover:bg-[#1a1f2e] hover:text-white border border-transparent hover:border-[#2a3550]"
              )}
            >
              {page}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={cn(
            "flex items-center justify-center w-8 h-8 rounded-lg transition-all",
            currentPage === totalPages
              ? "text-slate-600 cursor-not-allowed"
              : "text-slate-300 hover:bg-[#ff5b1f]/20 hover:text-white border border-transparent hover:border-[#ff5b1f]/40"
          )}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};