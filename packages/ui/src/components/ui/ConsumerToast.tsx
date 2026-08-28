import * as React from "react";
import {cn} from "@wayontop/ui/lib/utils";

export interface ConsumerToastProps extends React.HTMLAttributes<HTMLDivElement> {
    message: string;
    description?: string;
    icon?: React.ReactNode;
    visible?: boolean;
}

export function ConsumerToast({
                                 message,
                                 description,
                                 icon,
                                 visible = true,
                                 className,
                                 ...props
                             }: Readonly<ConsumerToastProps>) {
    if (!visible) return null;

    return (
        <div
            className={cn(
                "absolute inset-0 z-50 bg-[#1C1C1E]/95 backdrop-blur-3xl text-emerald-400 px-4 py-2 rounded-[2rem] shadow-[0_0_20px_rgba(16,185,129,0.3)] border border-emerald-500/30 flex items-center max-w-[100%] animate-in fade-in zoom-in-95 duration-300 break-words pointer-events-none",
                className
            )}
            {...props}
        >
            {icon && (
                <div className="mr-3 w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center shrink-0 text-emerald-400 border border-emerald-500/30">
                    {icon}
                </div>
            )}
            <div className="flex flex-col justify-center overflow-hidden">
                <span className="text-xs font-bold uppercase tracking-widest truncate">{message}</span>
                {description && (
                    <span className="text-[10px] text-emerald-400/70 font-medium truncate leading-tight mt-0.5">{description}</span>
                )}
            </div>
        </div>
    );
}
