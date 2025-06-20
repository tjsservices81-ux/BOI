import * as React from "react"

import { cn } from "@/lib/utils"

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-12 w-full rounded-md border border-input bg-background px-3 py-3 text-base leading-5 ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium file:text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50",
          // Android-specific overrides
          "touch-manipulation min-h-[48px]",
          // Consistent font sizing across platforms
          "text-[16px] leading-[20px]",
          // Android autofill fix
          "autofill:shadow-[inset_0_0_0_1000px_rgb(255,255,255)] autofill:[-webkit-text-fill-color:rgb(0,0,0)]",
          className
        )}
        style={{
          fontSize: '16px',
          lineHeight: '20px',
          minHeight: '48px',
          WebkitAppearance: 'none',
          WebkitTapHighlightColor: 'transparent',
          // Override Android Chrome autofill
          WebkitBoxShadow: type === 'password' || type === 'email' ? '0 0 0 1000px white inset' : undefined,
          WebkitTextFillColor: type === 'password' || type === 'email' ? '#000000' : undefined,
        }}
        ref={ref}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
