import PropTypes from 'prop-types';

/**
 * Draft Status Indicator Component
 * Shows auto-save status and last saved time
 */
const DraftIndicator = ({ lastSaved, isSaving, hasDraft, onClearDraft }) => {
    if (!hasDraft && !isSaving) return null;

    const formatTime = (date) => {
        if (!date) return '';
        const now = new Date();
        const diff = now - date;

        // Less than 1 minute
        if (diff < 60000) return 'just now';

        // Less than 1 hour
        if (diff < 3600000) {
            const mins = Math.floor(diff / 60000);
            return `${mins} min${mins > 1 ? 's' : ''} ago`;
        }

        // Show time
        return date.toLocaleTimeString('en-US', {
            hour: 'numeric',
            minute: '2-digit',
            hour12: true
        });
    };

    return (
        <div className="flex items-center gap-3 px-4 py-2 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
            {isSaving ? (
                <>
                    <div className="flex items-center gap-2">
                        <svg className="animate-spin h-4 w-4 text-blue-600" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="text-sm text-blue-700 dark:text-blue-300">Saving draft...</span>
                    </div>
                </>
            ) : hasDraft ? (
                <>
                    <div className="flex items-center gap-2 flex-1">
                        <svg className="h-4 w-4 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="text-sm text-green-700 dark:text-green-300">
                            Draft saved {formatTime(lastSaved)}
                        </span>
                    </div>
                    {onClearDraft && (
                        <button
                            onClick={onClearDraft}
                            className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300 font-medium"
                        >
                            Clear Draft
                        </button>
                    )}
                </>
            ) : null}
        </div>
    );
};

DraftIndicator.propTypes = {
    lastSaved: PropTypes.instanceOf(Date),
    isSaving: PropTypes.bool,
    hasDraft: PropTypes.bool,
    onClearDraft: PropTypes.func
};

export default DraftIndicator;
