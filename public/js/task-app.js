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

        document.getElementById('spinBonusStrip')?.addEventListener('click', () => this.openPreSpinModal());
        document.getElementById('spinTopBanner')?.addEventListener('click', () => this.openPreSpinModal());

        const offerId = this.currentOffer?.id || TaskAPI.extractOfferIdFromUrl();
        try {
            this.currentOffer = await TaskAPI.fetchPublicOfferDetails(offerId);
            TaskUI.renderOfferDetails(this.currentOffer);
        } catch (error) {
            TaskUI.showErrorScreen(error.message);
        }
    }

    /**
     * Opens the Spin & Win Modal BEFORE Continue (only once per offer, locked via HttpOnly cookie)
     */
    openPreSpinModal() {
        const spinConfig = this.currentOffer?.spinSettings;
        if (!spinConfig?.enabled || !Array.isArray(spinConfig.slices) || spinConfig.slices.length < 2) {
            return;
        }
        if (this.currentOffer?.spinStatus?.alreadySpun) {
            return;
        }
        if (!window.TaskSpinModal) return;

        const rewardAmount = this.currentOffer?.totalRewardINR ?? this.currentOffer?.rewardINR ?? 0;
        window.TaskSpinModal.open({
            offerId: this.currentOffer.id,
            baseReward: rewardAmount,
            slices: spinConfig.slices,
            onProceed: (spinResult) => {
                const wonBonus = Number(spinResult?.bonusReward) || 0;
                this.currentOffer.spinStatus = { alreadySpun: true, bonus: wonBonus };
                TaskUI.applySpinBonusUI(this.currentOffer, wonBonus);
                TaskUI.openPayoutPrompt();
            }
        });
    }

    /**
     * Triggered when user clicks "Continue"
     * Validates payment form and proceeds directly to click creation & redirect (no spin modal here)
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
        await this.proceedToClickAndRedirect(formValidation);
    }

    /**
     * Completes click creation and redirects to advertiser destination
     */
    async proceedToClickAndRedirect(formValidation) {
        const offerId = this.currentOffer?.id || TaskAPI.extractOfferIdFromUrl();
        const baseReward = Number(this.currentOffer?.totalRewardINR ?? this.currentOffer?.rewardINR ?? 0);
        const appliedBonus = this.currentOffer?.spinStatus?.alreadySpun
            ? (Number(this.currentOffer.spinStatus.bonus) || 0)
            : 0;
        const displayReward = baseReward + appliedBonus;
        TaskUI.setStartButtonLoadingState(true, displayReward);
        TaskRedirect.start(displayReward);

        try {
            // Save user account for future convenience
            TaskPaymentForm.saveLastUsedAccount(formValidation.payoutPayload.payoutAccount);

            // Trigger click generation in backend (backend reads verified HttpOnly spin cookie)
            const clickResponse = await TaskAPI.generateTaskClick(offerId, formValidation.payoutPayload);

            // Record click ID in user's browser history
            TaskUI.saveClickToHistory(clickResponse.clickId, this.currentOffer?.offerName);

            // Mark final step active and redirect immediately (no extra delay)
            TaskRedirect.complete();
            window.location.href = clickResponse.redirectUrl;
        } catch (error) {
            TaskRedirect.remove();
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

// Reset button & redirect overlay when restored from browser back-forward cache
window.addEventListener('pageshow', (event) => {
    if (window.TaskRedirect) window.TaskRedirect.remove();
    if (event.persisted && window.taskApp?.currentOffer) {
        const baseReward = Number(window.taskApp.currentOffer?.totalRewardINR ?? window.taskApp.currentOffer?.rewardINR ?? 0);
        const appliedBonus = window.taskApp.currentOffer?.spinStatus?.alreadySpun
            ? (Number(window.taskApp.currentOffer.spinStatus.bonus) || 0)
            : 0;
        TaskUI.setStartButtonLoadingState(false, baseReward + appliedBonus);
    }
});

// Reset button loading state & modals when page is restored from browser back-forward cache (bfcache)
window.addEventListener('pageshow', () => {
    const rewardAmount = window.taskApp?.currentOffer?.totalRewardINR ?? window.taskApp?.currentOffer?.rewardINR ?? 0;
    TaskUI.setStartButtonLoadingState(false, rewardAmount);
    if (window.Swal && typeof Swal.close === 'function') {
        Swal.close();
    }
});
