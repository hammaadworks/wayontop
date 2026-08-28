import * as React from "react";
import {cn} from "@wayontop/ui/lib/utils";

export interface SpecialToastProps extends React.HTMLAttributes<HTMLDivElement> {
    message: string;
    icon?: React.ReactNode;
    visible?: boolean;
}

export function ProducerToast({
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
                "z-20 bg-emerald-500 text-white px-4 py-2 rounded-3xl shadow-[0_0_20px_rgba(16,185,129,0.7)] border border-emerald-400 text-[11px] font-black tracking-widest uppercase pointer-events-none flex items-center max-w-[90vw] sm:max-w-[320px] text-center sm:text-left animate-in fade-in zoom-in-95 slide-in-from-bottom-4 duration-300 break-words",
                className
            )}
            {...props}
        >
            {icon && (
                <div className="mr-2 w-6 h-6 rounded-full bg-white/20 flex items-center justify-center shrink-0 text-white shadow-inner">
                    {icon}
                </div>
            )}
            <span className="drop-shadow-md">{message}</span>
        </div>
    );
}
