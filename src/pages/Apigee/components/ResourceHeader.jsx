import { cn } from "../../../lib/utils";

export default function ResourceHeader({ title, onCreate }) {
  return (
    <div className="flex justify-between items-center">
      <h2 className="text-lg font-semibold text-white">{title}</h2>

      <button
        onClick={onCreate}
        className={cn(
          "px-6 py-2.5 rounded-lg font-semibold text-sm transition-all",
          "bg-primary text-white shadow-lg shadow-primary/30"
        )}
      >
        Create
      </button>
    </div>
  );
}