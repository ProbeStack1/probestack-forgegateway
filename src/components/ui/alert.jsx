import * as React from "react";
import { cn } from "../../lib/utils";

const Alert = React.forwardRef(({ className, children, ...props }, ref) => (
  <div
    ref={ref}
    role="alert"
    className={cn(
      "relative w-full rounded-lg border p-4 flex items-start gap-3",
      className
    )}
    {...props}
  >
    {children}
  </div>
));
Alert.displayName = "Alert";

const AlertDescription = React.forwardRef(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("text-sm [&_p]:leading-relaxed flex-1", className)}
    {...props}
  />
));
AlertDescription.displayName = "AlertDescription";

export { Alert, AlertDescription };

