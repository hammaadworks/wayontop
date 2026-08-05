import * as React from "react";
import {cn} from "@wayontop/ui/lib/utils";

export interface SpecialToastProps extends React.HTMLAttributes<HTMLDivElement> {
    message: string;
    icon?: React.ReactNode;
    visible?: boolean;
}

export function SpecialToast({
                                 message,
                                 icon,
                                 visible = true,
                                 className,
                                 ...props
                             }: Readonly<SpecialToastProps>) {
    if (!visible) return null;

    return (
        <div
            className={cn(
                "absolute top-24 left-1/2 -translate-x-1/2 z-20 bg-indigo-600 text-white px-5 py-2.5 rounded-full shadow-lg text-sm font-medium pointer-events-none flex items-center animate-pulse whitespace-nowrap",
                className
            )}
            {...props}
        >
            {icon && (
                <span className="mr-2 md:inline flex items-center justify-center">
          {icon}
        </span>
            )}
            {message}
        </div>
    );
}
