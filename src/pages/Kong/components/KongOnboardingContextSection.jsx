import { useEffect, useState } from "react";
import OnboardingCascadeSelect from "../../Apigee/components/OnboardingCascadeSelect";
import { loadKongOnboardingOptions } from "../kongTracking";

export default function KongOnboardingContextSection({
  value,
  onChange,
  disabled = false,
  className = "",
}) {
  const [options, setOptions] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    setIsLoading(true);
    setError("");

    loadKongOnboardingOptions()
      .then((nextOptions) => {
        if (isMounted) {
          setOptions(nextOptions);
        }
      })
      .catch((err) => {
        if (isMounted) {
          setError(err.message || "Failed to load Kong onboarding contexts");
        }
      })
      .finally(() => {
        if (isMounted) {
          setIsLoading(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className={`rounded-xl border border-white/10 bg-[#11182c]/70 p-4 ${className}`}>
      <div className="mb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-500">Onboarding Context</p>
        <p className="mt-1 text-sm text-slate-400">
          Kong changes are linked to this onboarding application and sent to the wrapper as headers.
        </p>
      </div>
      <OnboardingCascadeSelect
        value={value || ""}
        onChange={onChange}
        options={options}
        isLoading={isLoading || disabled}
        required
        selectClassName="w-full rounded-lg border border-white/10 bg-[#1f2937] px-3 py-2 text-sm text-white outline-none focus:ring-2 focus:ring-primary disabled:cursor-not-allowed disabled:opacity-60"
      />
      {error && <p className="mt-3 text-sm text-red-400">{error}</p>}
    </div>
  );
}