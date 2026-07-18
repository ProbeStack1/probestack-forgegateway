import { Plus, X } from "lucide-react";
import { useState } from "react";

export default function KongTagInput({
  value = [],
  onChange,
  disabled = false,
  placeholder = "Add tag",
}) {
  const [tagInput, setTagInput] = useState("");
  const tags = Array.isArray(value) ? value : [];

  const addTag = () => {
    const nextTag = tagInput.trim();
    if (!nextTag) {
      return;
    }

    if (tags.some((tag) => tag.toLowerCase() === nextTag.toLowerCase())) {
      setTagInput("");
      return;
    }

    onChange?.([...tags, nextTag]);
    setTagInput("");
  };

  const removeTag = (tagToRemove) => {
    onChange?.(tags.filter((tag) => tag !== tagToRemove));
  };

  return (
    <div className="space-y-2">
      <div className="flex gap-2">
        <input
          value={tagInput}
          onChange={(event) => setTagInput(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") {
              event.preventDefault();
              addTag();
            }
          }}
          disabled={disabled}
          placeholder={placeholder}
          className="input flex-1"
        />
        <button
          type="button"
          disabled={disabled}
          onClick={addTag}
          className="inline-flex min-w-[4.5rem] items-center justify-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-primary/20 transition hover:bg-primary/90 disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus size={15} />
          Add
        </button>
      </div>

      {tags.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          {tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex max-w-full items-center gap-2 rounded-full border border-primary/40 bg-primary/15 px-3 py-1 text-xs font-semibold text-[#ffb08c]"
            >
              <span className="max-w-[220px] truncate">{tag}</span>
              {!disabled && (
                <button
                  type="button"
                  onClick={() => removeTag(tag)}
                  className="inline-flex h-4 w-4 items-center justify-center rounded-full text-[#ffb08c] transition hover:bg-primary hover:text-white"
                  title={`Remove ${tag}`}
                  aria-label={`Remove ${tag}`}
                >
                  <X size={12} />
                </button>
              )}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}
