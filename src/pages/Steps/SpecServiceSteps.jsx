// import ServiceDesign from "./ServiceDesign";

// const SpecServiceSteps = (props) => {
//   const [step, setStep] = useState(1);

//   return (
//     <div>
//       {/* Step Content */}
//       {step === 1 && (
//         <ServiceDesign {...props} onNext={() => setStep(2)} />
//       )}

//       {step === 2 && (
//         <StepOverview {...props} onNext={() => setStep(3)} onBack={() => setStep(1)} />
//       )}

//       {step === 3 && (
//         <StepConfig {...props} onBack={() => setStep(2)} />
//       )}
//     </div>
//   );
// }
// export default SpecServiceSteps;



import React, { useState } from "react";
import { Button } from "../../components/ui/button";

// import your actual step components
import ServiceDesign from "./ServiceDesign"; // step 1
import ServiceDesignOverview from "./ServiceDesignOverview";
import Testing from "./Testing";
import ServiceOverviewGeneration from "./ServiceOverviewGeneration";
import Complete from "./Complete";
import CreatePluginsModal from "../Kong/Plugins/CreatePluginsModal";
// import StepOverview from "./StepOverview";
// import StepConfig from "./StepConfig";

const SpecServiceSteps = ({ onBack, ...props }) => {
  const [step, setStep] = useState(1);
  const handleStep = (direction) => {
  setStep((prev) => {
    if (direction === "next") return Math.min(prev + 1, 5); // max step
    if (direction === "back") return Math.max(prev - 1, 1); // min step
    return prev;
  });
};

  return (
    <div className="p-6">
      {/* Steps */}
      {step === 1 && (
        <ServiceDesign
          {...props}
          onBack={onBack}
          onNext={() => setStep(2)}
        />
      )}

      {step === 2 && (
        <ServiceDesignOverview
        {...props}
          onBack={() => setStep(1)}
          onNext={() => setStep(3)}/>
      )}

      {step === 3 && (
        <ServiceOverviewGeneration
        {...props}
          onBack={() => setStep(2)}
          onNext={() => setStep(4)}/>
      )}

      {step === 4 && (
        <CreatePluginsModal
        isOnlyContent={true}
        {...props}
          onBack={() => setStep(3)}
          onNext={() => setStep(5)}/>
      )}
      {/* {step === 4 && (
        <Testing
        {...props}
          onBack={() => setStep(3)}
          onNext={() => setStep(5)}/>
      )} */}

      {step === 5 && (
        <Complete
        {...props}
          onBack={() => setStep(4)}
          onNext={onBack}/>
      )}
    </div>
  );
};

export default SpecServiceSteps;