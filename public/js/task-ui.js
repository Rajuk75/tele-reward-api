/**
 * Task UI & View Manager
 * Handles UI display states (loading/error/content), DOM population for offer data, and click history.
 */
const TaskUI = {
    showLoadingSkeleton() {
        document.getElementById('loadingState')?.classList.remove('hidden');
        document.getElementById('errorState')?.classList.add('hidden');
        document.getElementById('offerContent')?.classList.add('hidden');
    },

    showErrorScreen(errorMessageText) {
        document.getElementById('loadingState')?.classList.add('hidden');
        document.getElementById('offerContent')?.classList.add('hidden');
        const errorElement = document.getElementById('errorMessage');
        if (errorElement) errorElement.textContent = errorMessageText || 'Task Currently Unavailable';
        document.getElementById('errorState')?.classList.remove('hidden');
    },

    showOfferContent() {
        document.getElementById('loadingState')?.classList.add('hidden');
        document.getElementById('errorState')?.classList.add('hidden');
        document.getElementById('offerContent')?.classList.remove('hidden');
    },

    // ── DOM RENDERING (Displaying GET data) ──
    renderOfferDetails(offerData) {
        this.showOfferContent();

        const nameEl = document.getElementById('offerName');
        if (nameEl) nameEl.textContent = offerData.offerName || 'Reward Task';

        const catEl = document.getElementById('offerCategory');
        if (catEl) catEl.textContent = (offerData.category || 'APP TASK').toUpperCase();

        const rewardEl = document.getElementById('offerReward');
        if (rewardEl) rewardEl.textContent = `Up to ₹${offerData.totalRewardINR ?? offerData.rewardINR ?? 0}`;

        const hookEl = document.getElementById('offerHook');
        if (hookEl && offerData.comment) {
            hookEl.textContent = offerData.comment;
        }

        const iconEl = document.getElementById('offerIcon');
        if (iconEl && offerData.icon) {
            iconEl.src = offerData.icon;
        }

        // Render Step-by-Step Instructions
        const stepsContainer = document.getElementById('offerStepsContainer');
        if (stepsContainer) {
            stepsContainer.innerHTML = '';
            const rawStepsText = offerData.steps || 'Enter your payout account details.\nDownload and install the app.\nOpen app and complete registration to receive your reward.';
            const stepItems = rawStepsText.split('\n').map(s => s.trim()).filter(Boolean);

            stepItems.forEach((stepText) => {
                const stepRow = document.createElement('div');
                stepRow.className = 'text-xs text-slate-700 leading-relaxed font-medium';
                stepRow.textContent = stepText;
                stepsContainer.appendChild(stepRow);
            });
        }

        // Render Terms
        const termsEl = document.getElementById('offerTerms');
        if (termsEl) termsEl.textContent = offerData.termsAndConditions || 'Complete the task honestly. Rewards are transferred to your provided UPI/Account upon event verification.';
    },

    setStartButtonLoadingState(isLoading) {
        const claimBtn = document.getElementById('claimBtn');
        if (!claimBtn) return;

        claimBtn.disabled = isLoading;
        if (isLoading) {
            claimBtn.innerHTML = `<span>Please wait...</span>`;
        } else {
            claimBtn.innerHTML = `<span>Continue</span>`;
        }
    },

    saveClickToHistory(clickId, offerName) {
        if (!clickId) return;
        const clickHistory = JSON.parse(localStorage.getItem('my_clicks') || '[]');
        clickHistory.unshift({
            clickId,
            offerName: offerName || 'Reward Task',
            date: new Date().toISOString()
        });
        localStorage.setItem('my_clicks', JSON.stringify(clickHistory.slice(0, 10)));
    }
};

window.TaskUI = TaskUI;
