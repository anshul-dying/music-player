import React from "react";
import { Label as RadixLabel } from "radix-ui";
import { cn } from "../utils/cn";

export interface LabelProps
  extends React.ComponentPropsWithoutRef<typeof RadixLabel.Root> {
  required?: boolean;
}

export const Label = React.forwardRef<
  React.ElementRef<typeof RadixLabel.Root>,
  LabelProps
>(({ className, required, children, ...props }, ref) => {
  return (
    <RadixLabel.Root
      ref={ref}
      className={cn(
        "text-xs font-semibold uppercase tracking-wider text-text-kicker select-none block",
        className
      )}
      {...props}
    >
      {children}
      {required && <span className="ml-1 text-status-error">*</span>}
    </RadixLabel.Root>
  );
});

Label.displayName = "Label";

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  hasError?: boolean;
  sizeVariant?: "sm" | "md" | "lg";
}

const inputSizeStyles = {
  sm: "h-9 px-3 text-xs rounded-xl",
  md: "h-11 px-4 text-sm rounded-xl",
  lg: "h-13 px-5 text-base rounded-2xl",
};

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  (
    {
      className,
      type = "text",
      leftIcon,
      rightIcon,
      hasError = false,
      sizeVariant = "md",
      disabled,
      ...props
    },
    ref
  ) => {
    return (
      <div className="relative flex items-center w-full">
        {leftIcon && (
          <div className="absolute left-3.5 z-10 flex items-center pointer-events-none text-text-tertiary">
            {leftIcon}
          </div>
        )}
        <input
          ref={ref}
          type={type}
          disabled={disabled}
          className={cn(
            "w-full bg-surface/90 text-text-primary placeholder:text-text-tertiary",
            "border transition-all duration-200 outline-none backdrop-blur-md",
            "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
            hasError
              ? "border-status-error focus-visible:ring-status-error/50"
              : "border-border-subtle hover:border-border-muted focus-visible:border-border-focus focus-visible:ring-border-focus",
            inputSizeStyles[sizeVariant],
            leftIcon && "pl-10",
            rightIcon && "pr-10",
            disabled && "cursor-not-allowed opacity-40 bg-surface/40",
            className
          )}
          {...props}
        />
        {rightIcon && (
          <div className="absolute right-3.5 z-10 flex items-center text-text-tertiary">
            {rightIcon}
          </div>
        )}
      </div>
    );
  }
);

Input.displayName = "Input";

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  hasError?: boolean;
}

export const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, hasError = false, disabled, ...props }, ref) => {
    return (
      <textarea
        ref={ref}
        disabled={disabled}
        className={cn(
          "w-full min-h-[96px] p-3 text-sm rounded-xl bg-surface/90 text-text-primary placeholder:text-text-tertiary",
          "border transition-all duration-200 outline-none backdrop-blur-md resize-y",
          "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
          hasError
            ? "border-status-error focus-visible:ring-status-error/50"
            : "border-border-subtle hover:border-border-muted focus-visible:border-border-focus focus-visible:ring-border-focus",
          disabled && "cursor-not-allowed opacity-40",
          className
        )}
        {...props}
      />
    );
  }
);

Textarea.displayName = "Textarea";

export interface SelectProps
  extends React.SelectHTMLAttributes<HTMLSelectElement> {
  hasError?: boolean;
  wrapperClassName?: string;
}

export const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({ className, wrapperClassName, hasError = false, disabled, children, ...props }, ref) => {
    return (
      <div className={cn("relative w-full", wrapperClassName)}>
        <select
          ref={ref}
          disabled={disabled}
          className={cn(
            "w-full h-11 px-4 pr-10 text-sm rounded-xl appearance-none bg-surface text-text-primary",
            "border transition-all duration-200 outline-none cursor-pointer backdrop-blur-md",
            "focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-offset-canvas",
            hasError
              ? "border-status-error focus-visible:ring-status-error/50"
              : "border-border-subtle hover:border-border-muted focus-visible:border-border-focus focus-visible:ring-border-focus",
            disabled && "cursor-not-allowed opacity-40",
            className
          )}
          {...props}
        >
          {children}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3.5 text-text-tertiary">
          <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20">
            <path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" />
          </svg>
        </div>
      </div>
    );
  }
);

Select.displayName = "Select";

export interface FormFieldProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: string;
  helperText?: string;
  errorMessage?: string;
  required?: boolean;
  id?: string;
}

export const FormField = React.forwardRef<HTMLDivElement, FormFieldProps>(
  (
    {
      className,
      label,
      helperText,
      errorMessage,
      required,
      id,
      children,
      ...props
    },
    ref
  ) => {
    return (
      <div ref={ref} className={cn("flex flex-col gap-1.5 w-full", className)} {...props}>
        {label && (
          <Label htmlFor={id} required={required}>
            {label}
          </Label>
        )}
        {children}
        {errorMessage ? (
          <span className="text-xs text-status-error font-medium" role="alert">
            {errorMessage}
          </span>
        ) : helperText ? (
          <span className="text-xs text-text-secondary">{helperText}</span>
        ) : null}
      </div>
    );
  }
);

FormField.displayName = "FormField";
