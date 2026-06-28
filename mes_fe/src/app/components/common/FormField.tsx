import { ReactNode } from "react";
import { Label } from "../ui/label";
import { cn } from "../ui/utils";

interface FormFieldProps {
  label: string;
  children: ReactNode;
  required?: boolean;
  labelClassName?: string;
  containerClassName?: string;
  layout?: "horizontal" | "vertical";
}

export function FormField({
  label,
  children,
  required = false,
  labelClassName,
  containerClassName,
  layout = "horizontal",
}: FormFieldProps) {
  if (layout === "vertical") {
    return (
      <div className={cn("space-y-2", containerClassName)}>
        <Label className={cn("text-sm font-light text-gray-700", labelClassName)}>
          {required && <span className="text-red-500">* </span>}
          {label}
        </Label>
        {children}
      </div>
    );
  }

  return (
    <div className={cn("grid grid-cols-[120px_1fr] items-center gap-4", containerClassName)}>
      <Label
        className={cn(
          "text-sm px-4 py-2 text-center font-light",
          required && "bg-[#5B6FD8] text-white",
          !required && "bg-gray-50 text-gray-700",
          labelClassName
        )}
      >
        {required && <span className="text-red-500">* </span>}
        {label}
      </Label>
      {children}
    </div>
  );
}