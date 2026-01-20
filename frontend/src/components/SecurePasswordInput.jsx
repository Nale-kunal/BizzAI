import { useState, useEffect, useRef } from 'react';

const SecurePasswordInput = ({
    id,
    name,
    value,
    onChange,
    placeholder = "Enter password",
    required = false,
    showPassword,
    onToggleVisibility,
    className = "",
}) => {
    const [showTooltip, setShowTooltip] = useState(false);
    const [tooltipMessage, setTooltipMessage] = useState('');
    const [ariaMessage, setAriaMessage] = useState('');
    const timeoutRef = useRef(null);

    // Cleanup timeout on unmount to prevent memory leaks
    useEffect(() => {
        return () => {
            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }
        };
    }, []);

    // Prevent copy, paste, cut, and drag operations
    const handlePreventAction = (e, action) => {
        e.preventDefault();
        const message = `For security reasons, ${action} passwords is disabled.`;
        setTooltipMessage(message);
        setAriaMessage(message); // For screen readers
        setShowTooltip(true);

        // Clear previous timeout
        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        // Hide tooltip after 3 seconds
        timeoutRef.current = setTimeout(() => {
            setShowTooltip(false);
            setAriaMessage(''); // Clear screen reader message
        }, 3000);
    };

    const handleCopy = (e) => handlePreventAction(e, 'copying');
    const handlePaste = (e) => handlePreventAction(e, 'pasting');
    const handleCut = (e) => handlePreventAction(e, 'cutting');
    const handleDrag = (e) => handlePreventAction(e, 'dragging');
    const handleDrop = (e) => handlePreventAction(e, 'dropping');
    const handleContextMenu = (e) => {
        e.preventDefault();
        const message = 'For security reasons, right-click is disabled on password fields.';
        setTooltipMessage(message);
        setAriaMessage(message);
        setShowTooltip(true);

        if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
        }

        timeoutRef.current = setTimeout(() => {
            setShowTooltip(false);
            setAriaMessage('');
        }, 3000);
    };

    // Prevent keyboard shortcuts (Ctrl+C, Ctrl+V, Ctrl+X, Cmd+C, Cmd+V, Cmd+X)
    const handleKeyDown = (e) => {
        if ((e.ctrlKey || e.metaKey) && (e.key === 'c' || e.key === 'v' || e.key === 'x')) {
            e.preventDefault();
            const action = e.key === 'c' ? 'copying' : e.key === 'v' ? 'pasting' : 'cutting';
            const message = `For security reasons, ${action} passwords is disabled.`;
            setTooltipMessage(message);
            setAriaMessage(message);
            setShowTooltip(true);

            if (timeoutRef.current) {
                clearTimeout(timeoutRef.current);
            }

            timeoutRef.current = setTimeout(() => {
                setShowTooltip(false);
                setAriaMessage('');
            }, 3000);
        }
    };

    return (
        <div className="relative">
            {/* ARIA live region for screen reader announcements */}
            <div
                role="status"
                aria-live="polite"
                aria-atomic="true"
                className="sr-only"
            >
                {ariaMessage}
            </div>

            <input
                type={showPassword ? "text" : "password"}
                id={id}
                name={name}
                value={value}
                onChange={onChange}
                onCopy={handleCopy}
                onPaste={handlePaste}
                onCut={handleCut}
                onDrag={handleDrag}
                onDrop={handleDrop}
                onContextMenu={handleContextMenu}
                onKeyDown={handleKeyDown}
                required={required}
                autoComplete="new-password"
                data-lpignore="true" // Prevent LastPass interference
                data-form-type="other" // Prevent browser autofill interference
                className={className || "w-full px-4 py-3 pr-12 border border-gray-300 dark:border-[rgb(var(--color-border))] bg-white dark:bg-[rgb(var(--color-input))] text-main dark:text-[rgb(var(--color-text))] rounded-lg focus:ring-2 focus:ring-indigo-500 dark:focus:ring-[rgb(var(--color-primary))] focus:border-transparent transition placeholder:text-gray-400 dark:placeholder:text-[rgb(var(--color-placeholder))]"}
                placeholder={placeholder}
                aria-label={placeholder}
                aria-describedby={showTooltip ? `${id}-security-message` : undefined}
            />

            {/* Password visibility toggle button */}
            <button
                type="button"
                onClick={onToggleVisibility}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted dark:text-[rgb(var(--color-text-secondary))] hover:text-secondary dark:hover:text-[rgb(var(--color-text))] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 dark:focus:ring-[rgb(var(--color-primary))] rounded"
                aria-label={showPassword ? 'Hide password' : 'Show password'}
                tabIndex={0}
            >
                {showPassword ? (
                    <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21"
                        />
                    </svg>
                ) : (
                    <svg
                        className="w-5 h-5"
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                    >
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"
                        />
                        <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"
                        />
                    </svg>
                )}
            </button>

            {/* Tooltip */}
            {showTooltip && (
                <div
                    id={`${id}-security-message`}
                    className="absolute left-0 -bottom-12 w-full z-10 animate-fade-in"
                    role="alert"
                >
                    <div className="bg-gray-900 dark:bg-gray-800 text-white text-xs rounded-lg py-2 px-3 shadow-lg">
                        <div className="flex items-start gap-2">
                            <svg
                                className="w-4 h-4 flex-shrink-0 mt-0.5"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                                aria-hidden="true"
                            >
                                <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                                />
                            </svg>
                            <span>{tooltipMessage}</span>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default SecurePasswordInput;
