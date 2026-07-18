import { Copy } from "lucide-react";
import { useMemo, useState } from "react";

export default function ConsumerSummaryPanel({ form }) {
    const [copied, setCopied] = useState(false);

    // Stats
    const credentialsCount = useMemo(() => {
        return form.credentialType === "none" ? 0 : 1;
    }, [form.credentialType]);

    const groupsCount = useMemo(() => {
        return form.aclGroups?.length || 0;
    }, [form.aclGroups]);

    const rateLimitLabel = useMemo(() => {
        return form.rateLimitEnabled ? "Custom" : "Default";
    }, [form.rateLimitEnabled]);

    // JSON Preview (same concept as YAML in upstream)
    const jsonPreview = useMemo(() => {
        const obj = {
            consumer: {
                username: form.username || "username",
                custom_id: form.customId || undefined,
                tags: form.tags?.length ? form.tags : undefined
            }
        };

        // Credentials
        if (form.credentialType === "key") {
            obj.key_auth = {
                key: form.apiKey || "<api-key>"
            };
        }

        if (form.credentialType === "jwt") {
            obj.jwt = {
                key: form.jwtKey || "<iss-claim>",
                secret: form.jwtSecret || "<secret>",
                algorithm: form.jwtAlgo || "HS256",
                rsa_public_key: form.jwtRsaPublicKey || null
            };
        }

        if (form.credentialType === "basic") {
            obj.basic_auth = {
                username: form.basicUser || "<username>",
                password: "***"
            };
        }

        if (form.credentialType === "hmac") {
            obj.hmac_auth = {
                username: form.hmacUser || "<username>",
                secret: form.hmacSecret || "<secret>"
            };
        }

        // ACL Groups
        if (form.aclGroups?.length) {
            obj.acl_groups = form.aclGroups;
        }

        // Rate Limiting
        if (form.rateLimitEnabled) {
            obj.rate_limiting = {
                minute: parseInt(form.rlMin) || 100,
                hour: parseInt(form.rlHour) || 2000
            };
        }

        return JSON.stringify(obj, null, 2);
    }, [form]);

    const handleCopy = async () => {
        await navigator.clipboard.writeText(jsonPreview);
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
                        <p className="text-xs text-gray-500">Credentials</p>
                        <p className="text-lg text-white">{credentialsCount}</p>
                    </div>

                    <div>
                        <p className="text-xs text-gray-500">ACL Groups</p>
                        <p className="text-lg text-white">{groupsCount}</p>
                    </div>

                    <div>
                        <p className="text-xs text-gray-500">Rate Limit</p>
                        <p className="text-lg text-white">{rateLimitLabel}</p>
                    </div>

                </div>
            </div>

            {/* JSON Preview */}
            <div className="bg-dark-800 p-4 rounded-lg border border-dark-700">

                {/* Header */}
                <div className="flex items-center justify-between mb-2">
                    <p className="text-sm text-gray-400">JSON Preview</p>

                    <button
                        onClick={handleCopy}
                        className="flex items-center gap-1 text-xs px-2 py-1 rounded bg-dark-700 hover:bg-dark-600 text-gray-300 transition"
                    >
                        <Copy size={12} />
                        {copied ? "Copied!" : "Copy"}
                    </button>
                </div>

                <pre className="text-[10px] text-green-300 font-mono max-h-[200px] overflow-auto">
                    {jsonPreview}
                </pre>
            </div>
        </div>
    );
}
