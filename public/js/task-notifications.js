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
        return Swal.fire({
            html: `
                <div style="display:flex; flex-direction:column; align-items:center; justify-content:center; padding:8px 0;">
                    <div style="width:34px; height:34px; border:3px solid #e2e8f0; border-top:3px solid #0f172a; border-radius:50%; animation:swalSpin 0.8s linear infinite; margin-bottom:10px;"></div>
                    <p style="font-size:13px; font-weight:700; color:#0f172a; margin:0; letter-spacing:-0.2px;">Connecting to task...</p>
                    <p style="font-size:11px; font-weight:500; color:#64748b; margin:3px 0 0 0;">Please wait</p>
                </div>
                <style>
                    @keyframes swalSpin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
                </style>
            `,
            showConfirmButton: false,
            timer: 700,
            width: 220,
            padding: '0.85rem',
            background: '#ffffff',
            backdrop: 'rgba(15, 23, 42, 0.4)',
            customClass: {
                popup: 'rounded-2xl shadow-2xl border border-slate-100'
            }
        }).then(() => {
            if (typeof onCompletedCallback === 'function') {
                onCompletedCallback();
            }
        });
    }
};

// Aliases for convenience
window.TaskAlerts = TaskAlerts;
window.TaskNotify = TaskAlerts;
