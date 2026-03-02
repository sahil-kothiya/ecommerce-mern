import { forwardRef, useId } from 'react';

const Input = forwardRef(({
    label,
    error,
    helperText,
    icon: Icon,
    iconRight: IconRight,
    size = 'md',
    className = '',
    wrapperClassName = '',
    id: externalId,
    ...props
}, ref) => {
    const autoId = useId();
    const inputId = externalId || props.name || autoId;
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText && !error ? `${inputId}-helper` : undefined;
    const describedBy = [errorId, helperId].filter(Boolean).join(' ') || undefined;

    const sizeClasses = {
        sm: 'px-3 py-1.5 text-sm rounded-lg',
        md: 'px-3.5 py-2 text-sm rounded-lg',
        lg: 'px-4 py-2.5 text-base rounded-xl',
    };

    return (
        <div className={wrapperClassName}>
            {label && (
                <label htmlFor={inputId} className="block text-sm font-medium text-slate-700 mb-1.5">
                    {label}
                    {props.required && <span className="text-red-500 ml-0.5" aria-hidden="true">*</span>}
                </label>
            )}

            <div className="relative">
                {Icon && (
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none">
                        <Icon className="h-4 w-4" aria-hidden="true" />
                    </div>
                )}

                <input
                    ref={ref}
                    id={inputId}
                    aria-invalid={error ? true : undefined}
                    aria-describedby={describedBy}
                    className={[
                        'w-full border bg-white text-slate-900 placeholder:text-slate-400',
                        'transition-all duration-200',
                        'focus:outline-none focus:ring-2 focus:ring-offset-0',
                        error
                            ? 'border-red-300 focus:border-red-500 focus:ring-red-500/20'
                            : 'border-slate-200 focus:border-primary-500 focus:ring-primary-500/20',
                        sizeClasses[size],
                        Icon && 'pl-9',
                        IconRight && 'pr-9',
                        props.disabled && 'bg-slate-50 text-slate-500 cursor-not-allowed',
                        className,
                    ].filter(Boolean).join(' ')}
                    {...props}
                />

                {IconRight && (
                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                        <IconRight className="h-4 w-4" aria-hidden="true" />
                    </div>
                )}
            </div>

            {error && <p id={errorId} className="mt-1 text-xs text-red-600" role="alert">{error}</p>}
            {!error && helperText && <p id={helperId} className="mt-1 text-xs text-slate-500">{helperText}</p>}
        </div>
    );
});

Input.displayName = 'Input';
export default Input;
