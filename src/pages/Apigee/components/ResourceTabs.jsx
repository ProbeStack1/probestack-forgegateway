import { cn } from "../../../lib/utils";

export default function ResourceTabs({ activeTab, onChange }) {
  const tabs = [
    { id: "target-server", label: "Target Server" },
    { id: "kvm", label: "KVM" },
  ];

  return (
    <div className="flex gap-3">
      {tabs.map(tab => (
        <button
          key={tab.id}
          onClick={() => onChange(tab.id)}
          className={cn(
            "px-5 py-2.5 rounded-lg text-sm font-semibold transition-all",
            activeTab === tab.id
              ? "bg-primary text-white shadow-lg shadow-primary/30"
              : "bg-dark-700 text-gray-300 hover:bg-dark-600"
          )}
        >
          {tab.label}
        </button>
      ))}
    </div>
  );
}