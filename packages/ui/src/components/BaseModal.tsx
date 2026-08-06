import { ReactNode } from "react";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "./ui/alert-dialog";
import { cn } from "../lib/utils";

interface BaseModalProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    title: ReactNode;
    description?: ReactNode;
    children?: ReactNode;
    onConfirm?: () => void;
    onCancel?: () => void;
    confirmText?: string;
    cancelText?: string;
    confirmClassName?: string;
    cancelClassName?: string;
    contentClassName?: string;
    confirmDisabled?: boolean;
}

export function BaseModal({
    open,
    onOpenChange,
    title,
    description,
    children,
    onConfirm,
    onCancel,
    confirmText = "Confirm",
    cancelText = "Cancel",
    confirmClassName,
    cancelClassName,
    contentClassName,
    confirmDisabled,
}: Readonly<BaseModalProps>) {
    return (
        <AlertDialog open={open} onOpenChange={onOpenChange}>
            <AlertDialogContent className={cn("glass-panel bg-black/90 backdrop-blur-3xl border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.8)] text-slate-100", contentClassName)}>
                <AlertDialogHeader>
                    <AlertDialogTitle className="text-emerald-400 font-bold">{title}</AlertDialogTitle>
                    {description && (
                        <AlertDialogDescription className="text-slate-300">
                            {description}
                        </AlertDialogDescription>
                    )}
                </AlertDialogHeader>
                {children && <div className="py-2">{children}</div>}
                <AlertDialogFooter className="border-t-0 bg-transparent mt-2 pt-2 p-0 -mx-0 -mb-0 gap-2 sm:gap-2">
                    <AlertDialogCancel 
                        className={cn("bg-white/5 text-slate-300 hover:bg-white/10 hover:text-white border-transparent transition-colors", cancelClassName)} 
                        onClick={onCancel}
                    >
                        {cancelText}
                    </AlertDialogCancel>
                    <AlertDialogAction 
                        className={cn("bg-emerald-500 hover:bg-emerald-400 text-black font-bold transition-colors shadow-[0_0_15px_rgba(16,185,129,0.3)]", confirmClassName)} 
                        onClick={onConfirm}
                        disabled={confirmDisabled}
                    >
                        {confirmText}
                    </AlertDialogAction>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}
