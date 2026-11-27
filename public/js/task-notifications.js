/**
 * Task Alerts & Notifications
 * Clean wrapper around SweetAlert2 for user feedback, validation alerts, and redirect transitions.
 */
const TaskAlerts = {
    showValidationWarning(title, warningMessage) {
        return Swal.fire({
            icon: 'warning',
            title: title || 'Information Required',
            text: warningMessage,
            confirmButtonColor: '#0f172a',
            confirmButtonText: 'Got It',
            customClass: {
                popup: 'rounded-2xl shadow-xl',
                confirmButton: 'rounded-xl text-xs font-bold px-5 py-2.5'
            }
        });
    },

    showErrorMessage(title, errorMessage) {
        return Swal.fire({
            icon: 'error',
            title: title || 'Notice',
            text: errorMessage || 'Something went wrong. Please try again.',
            confirmButtonColor: '#0f172a',
            confirmButtonText: 'Close',
            customClass: {
                popup: 'rounded-2xl shadow-xl',
                confirmButton: 'rounded-xl text-xs font-bold px-5 py-2.5'
            }
        });
    },

    showRedirectModal(rewardAmountINR, onCompletedCallback) {
        if (window.TaskRedirect) {
            return window.TaskRedirect.show(rewardAmountINR, onCompletedCallback);
        }
        if (typeof onCompletedCallback === 'function') {
            onCompletedCallback();
        }
        return Promise.resolve();
    }
};

// Aliases for convenience
window.TaskAlerts = TaskAlerts;
window.TaskNotify = TaskAlerts;
