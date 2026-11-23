/**
 * Task UI & View Manager
 * Handles UI display states (loading/error/content), DOM population for offer data, and click history.
 */
const TaskUI = {
    initPayoutSheet() {
        const sheet = document.getElementById('payoutSheet');
        const card = document.getElementById('payoutCard');
        const home = document.getElementById('payoutHome');
        const warning = document.getElementById('payoutWarning');
        const desktop = window.matchMedia('(min-width: 768px)');

        document.getElementById('openPayout').addEventListener('click', () => {
            if (desktop.matches || sheet.open) return;
            warning.hidden = true;
            sheet.appendChild(card);
            sheet.showModal();
        });
        document.getElementById('closePayout').addEventListener('click', () => sheet.close());
        sheet.addEventListener('click', event => {
            if (event.target === sheet && event.clientY < sheet.getBoundingClientRect().top) sheet.close();
        });
        sheet.addEventListener('close', () => {
            if (sheet.open) return;
            warning.hidden = true;
            home.appendChild(card);
        });
        desktop.addEventListener('change', () => {
            if (desktop.matches && sheet.open) sheet.close();
        });
    },

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
    offerText(value) {
        if (typeof value !== 'string') return '';
        const text = value.trim();
        return /^(nil{1,2}|null|n\/a)$/i.test(text) ? '' : text;
    },

    renderOfferImage(id, source) {
        const image = document.getElementById(id);
        image.hidden = true;
        image.onload = () => { image.hidden = false; };
        image.onerror = () => { image.hidden = true; };
        if (source) {
            image.src = source;
        } else {
            image.removeAttribute('src');
        }
    },

    renderOfferDetails(offerData) {
        const name = this.offerText(offerData.offerName) || 'Reward task';
        document.getElementById('offerName').textContent = name;
        document.getElementById('offerInitial').textContent = Array.from(name)[0].toUpperCase();
        document.getElementById('offerCategory').textContent = this.offerText(offerData.category);
        this.renderOfferImage('offerIcon', this.offerText(offerData.icon));
        this.renderOfferImage('offerBanner', this.offerText(offerData.bannerUrl));

        const hook = document.getElementById('offerHook');
        hook.textContent = this.offerText(offerData.comment);
        hook.hidden = !hook.textContent;

        const currency = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
        const reward = offerData.totalRewardINR ?? offerData.rewardINR ?? 0;
        document.getElementById('offerReward').textContent = currency.format(reward);

        const spin = offerData.spinSettings;
        const strip = document.getElementById('spinBonusStrip');
        strip.hidden = true;
        if (spin?.enabled && Array.isArray(spin.slices) && spin.slices.length >= 2) {
            const amounts = spin.slices.map(Number);
            if (amounts.every(amount => Number.isFinite(amount) && amount >= 0) && Math.max(...amounts) > 0) {
                const money = new Intl.NumberFormat('en-IN', {
                    style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 2
                });
                const min = Math.min(...amounts);
                const max = Math.max(...amounts);
                const range = min === max ? money.format(max) : money.format(min) + '\u2013' + money.format(max);
                document.getElementById('spinBonusText').textContent = 'Spin for an extra ' + range;
                strip.hidden = false;
            }
        }

        const steps = document.getElementById('offerStepsContainer');
        steps.replaceChildren();
        for (const line of this.offerText(offerData.steps).split('\n')) {
            const text = this.offerText(line);
            if (!text) continue;
            const item = document.createElement('li');
            item.textContent = text;
            steps.appendChild(item);
        }
        document.getElementById('stepsSection').hidden = !steps.childElementCount;

        const terms = document.getElementById('offerTerms');
        terms.textContent = this.offerText(offerData.termsAndConditions);
        document.getElementById('termsSection').hidden = !terms.textContent;
        this.showOfferContent();
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
