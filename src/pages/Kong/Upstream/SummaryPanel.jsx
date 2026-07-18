import { Copy } from "lucide-react";
import { useMemo, useState } from "react";

export default function SummaryPanel({ form, targets }) {
    const [copied, setCopied] = useState(false);

    const totalWeight = useMemo(() => {
        return targets.reduce((sum, t) => sum + (parseInt(t.weight) || 0), 0);
    }, [targets]);

    const yamlPreview = useMemo(() => {
        let y = `upstreams:\n  - name: ${form.name || "my-upstream"}\n`;
        y += `    algorithm: ${form.algorithm || "round-robin"}\n`;
        y += `    slots: ${form.slots || 10000}\n`;

        if (targets.length) {
            y += `    targets:\n`;
            targets.forEach(t => {
                y += `      - target: "${t.host}:${t.port}"\n`;
                y += `        weight: ${t.weight || 100}\n`;
            });
        }

        return y;
    }, [form, targets]);
    const handleCopy = async () => {
        await navigator.clipboard.writeText(yamlPreview);
        setCopied(true);

        setTimeout(() => setCopied(false), 1500);
    };
    return (
        <div className="space-y-4 sticky top-0">

            {/* Stats */}
            <div className="bg-dark-800 p-4 rounded-lg border border-dark-700">
                <p className="text-sm text-gray-400 mb-2">Summary</p>

                <div className="space-y-3">
                    <div>
                        <p className="text-xs text-gray-500">Targets</p>
                        <p className="text-lg text-white">{targets.length}</p>
                    </div>

                    <div>
                        <p className="text-xs text-gray-500">Total Weight</p>
                        <p className="text-lg text-white">{totalWeight}</p>
                    </div>

                    <div>
                        <p className="text-xs text-gray-500">Slots</p>
                        <p className="text-lg text-white">{form.slots || 10000}</p>
                    </div>
                </div>
            </div>

            {/* YAML Preview */}
            <div className="bg-dark-800 p-4 rounded-lg border border-dark-700">
                {/* Header with Copy Button */}
                <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-400">YAML Preview</p>

                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-dark-700 hover:bg-dark-600 text-gray-300 transition"
                    >
                        <Copy size={12} />
                        {copied ? "Copied!" : "Copy"}
                    </button>
                </div>

                <pre className="text-[10px] text-green-300 font-mono max-h-[200px] overflow-auto">
                    {yamlPreview}
                </pre>
            </div>
        </div>
    );
}