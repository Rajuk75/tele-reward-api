/**
 * Task Application Controller
 * Orchestrates offer loading, user payment form submission, click creation, and redirects.
 */
class TaskApp {
    constructor() {
        this.currentOffer = null;
    }

    /**
     * Initializes the page on load
     */
    async initializeTaskPage() {
        TaskUI.showLoadingSkeleton();
        TaskPaymentForm.init();
        TaskUI.initPayoutSheet();

        const offerId = this.currentOffer?.id || TaskAPI.extractOfferIdFromUrl();
        try {
            this.currentOffer = await TaskAPI.fetchPublicOfferDetails(offerId);
            TaskUI.renderOfferDetails(this.currentOffer);
        } catch (error) {
            TaskUI.showErrorScreen(error.message);
        }
    }

    /**
     * Triggered when user clicks "Continue"
     * Validates payment form first, then opens the Spin & Win Bonus Modal
     */
    async handleStartTaskAndClaim() {
        const sheet = document.getElementById('payoutSheet');
        const fromSheet = sheet.open;
        const warning = document.getElementById('payoutWarning');
        warning.hidden = true;
        const formValidation = await TaskPaymentForm.getPaymentFormData();
        if (fromSheet && !sheet.open) return;
        if (!formValidation.isValid) {
            if (fromSheet) {
                warning.textContent = formValidation.validationError;
                warning.hidden = false;
                return;
            }
            TaskAlerts.showValidationWarning('Information Required', formValidation.validationError);
            return;
        }

        if (fromSheet) sheet.close();
        const rewardAmount = this.currentOffer?.totalRewardINR ?? this.currentOffer?.rewardINR ?? 0;
        const spinConfig = this.currentOffer?.spinSettings;

        // Open the Spin & Win Bonus Modal ONLY if enabled with valid slices in offer settings
        if (spinConfig?.enabled && Array.isArray(spinConfig.slices) && spinConfig.slices.length >= 2 && window.TaskSpinModal) {
            window.TaskSpinModal.open({
                baseReward: rewardAmount,
                slices: spinConfig.slices,
                onProceed: async (spinResult) => {
                    await this.proceedToClickAndRedirect(formValidation, spinResult);
                }
            });
        } else {
            // Spin disabled -> Directly proceed smoothly
            await this.proceedToClickAndRedirect(formValidation);
        }
    }

    /**
     * Completes click creation and redirects to advertiser destination
     */
    async proceedToClickAndRedirect(formValidation, spinResult = {}) {
        const offerId = this.currentOffer?.id || TaskAPI.extractOfferIdFromUrl();
        const displayReward = spinResult.totalReward || (this.currentOffer?.totalRewardINR ?? this.currentOffer?.rewardINR ?? 0);
        TaskUI.setStartButtonLoadingState(true, displayReward);

        try {
            // Save user account for future convenience
            TaskPaymentForm.saveLastUsedAccount(formValidation.payoutPayload.payoutAccount);

            // Attach spin bonus if won
            const payload = {
                ...formValidation.payoutPayload,
                spinBonus: spinResult.bonusReward || 0
            };

            // Trigger click generation in backend
            const clickResponse = await TaskAPI.generateTaskClick(offerId, payload);

            // Record click ID in user's browser history
            TaskUI.saveClickToHistory(clickResponse.clickId, this.currentOffer?.offerName);

            // Show success modal and redirect to advertiser link
            TaskAlerts.showRedirectModal(displayReward, () => {
                window.location.href = clickResponse.redirectUrl;
            });
        } catch (error) {
            TaskAlerts.showErrorMessage('Unable to Start Task', error.message);
            TaskUI.setStartButtonLoadingState(false, displayReward);
        }
    }
}

// Global App Instance
window.taskApp = new TaskApp();

// Bind Page Load
window.addEventListener('DOMContentLoaded', () => {
    window.taskApp.initializeTaskPage();
});

// Reset button loading state & modals when page is restored from browser back-forward cache (bfcache)
window.addEventListener('pageshow', () => {
    const rewardAmount = window.taskApp?.currentOffer?.totalRewardINR ?? window.taskApp?.currentOffer?.rewardINR ?? 0;
    TaskUI.setStartButtonLoadingState(false, rewardAmount);
    if (window.Swal && typeof Swal.close === 'function') {
        Swal.close();
    }
});
