/**
 * Task Payment & Payout Form Manager
 * Registry-driven payment architecture: renders method tabs, form templates, validation, and verification.
 */
const TaskPaymentForm = {
    selectedMethod: 'UPI',
    isIfscVerified: false,
    verifiedBankInfo: null,

    // ── STYLES REGISTRY ──
    BUTTON_STYLES: {
        active: 'py-2.5 px-3 text-xs font-semibold rounded-xl border border-violet-300 bg-violet-50 text-violet-900 flex items-center justify-center gap-2 transition cursor-pointer',
        inactive: 'py-2.5 px-3 text-xs font-bold rounded-xl border border-slate-200 text-slate-600 hover:bg-slate-50 flex items-center justify-center gap-2 transition cursor-pointer'
    },

    // ── METHOD REGISTRY (Self-Contained Components: UI + Templates + Validation) ──
    METHOD_REGISTRY: {
        UPI: {
            label: 'UPI ID',
            icon: 'fa-solid fa-mobile-screen',
            buttonId: 'btnUpi',
            sectionId: 'upiSection',

            renderForm() {
                return `
                    <div class="space-y-1.5">
                        <label for="upiInput" class="payout-label">UPI ID</label>
                        <div class="relative">
                            <input type="text" id="upiInput" autocapitalize="none" spellcheck="false" placeholder="yourname@oksbi"
                                oninput="TaskPaymentForm.handleUpiInput(this.value)"
                                class="w-full text-base font-medium px-3.5 py-3 pr-10 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-violet-500 transition placeholder:text-slate-400 placeholder:font-normal">
                            <div id="upiStatusIcon" class="absolute right-3.5 top-3.5 text-slate-400 text-xs flex items-center pointer-events-none">
                                <i class="fa-solid fa-at"></i>
                            </div>
                        </div>
                    </div>
                `;
            },

            validate() {
                const upiId = document.getElementById('upiInput')?.value.trim();
                if (!upiId) {
                    return {
                        isValid: false,
                        validationError: 'Please enter your UPI ID to receive reward cash!'
                    };
                }
                if (!TaskPaymentForm.isUpiVerified) {
                    return {
                        isValid: false,
                        validationError: TaskPaymentForm.upiValidationError || 'Invalid UPI ID! Please enter a valid and verified UPI address (e.g. mobile@paytm or yourname@oksbi).'
                    };
                }
                return {
                    isValid: true,
                    payoutPayload: {
                        payoutAccount: upiId,
                        payoutType: 'UPI'
                    }
                };
            }
        },

        BANK: {
            label: 'Bank Account',
            icon: 'fa-solid fa-building-columns',
            buttonId: 'btnBank',
            sectionId: 'bankSection',

            renderForm() {
                return `
                    <div class="space-y-3">
                        <!-- 1. IFSC Code Verification First -->
                        <div>
                            <label for="bankIfscInput" class="payout-label">Bank IFSC Code</label>
                            <div class="relative flex items-center">
                                <input type="text" id="bankIfscInput" maxlength="11" placeholder="e.g. SBIN0001234"
                                    oninput="TaskPaymentForm.handleIfscInput(this.value)"
                                    class="w-full text-base font-medium px-3.5 py-2.5 pr-20 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 uppercase transition placeholder:text-slate-400 placeholder:font-normal">
                                <button type="button" id="btnVerifyIfsc" onclick="TaskPaymentForm.triggerIfscVerification()"
                                    class="absolute right-1.5 px-3 py-1.5 text-[11px] font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition cursor-pointer">
                                    Verify
                                </button>
                            </div>
                            <p id="ifscErrorText" role="status" class="hidden text-xs text-red-700 font-semibold mt-1"></p>
                        </div>

                        <!-- Verified Bank Details Banner (Hidden until verified) -->
                        <div id="ifscVerifiedCard"
                            class="hidden p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 flex items-start gap-2.5">
                            <i class="fa-solid fa-circle-check text-emerald-600 text-sm mt-0.5 shrink-0"></i>
                            <div class="min-w-0">
                                <div id="ifscBankNameDisplay" class="text-xs font-bold text-emerald-900 leading-tight"></div>
                                <div id="ifscBranchDisplay" class="text-xs text-emerald-700 font-medium"></div>
                            </div>
                        </div>

                        <!-- 2. Remaining Bank Details (Revealed ONLY after IFSC is verified) -->
                        <div id="bankDetailsRemaining" class="hidden space-y-2.5 pt-1 border-t border-slate-100">
                            <div>
                                <label for="bankAccInput" class="payout-label">Bank Account Number</label>
                                <input type="text" id="bankAccInput" inputmode="numeric" minlength="9" maxlength="18"
                                    placeholder="Enter 9-18 digit account number"
                                    oninput="this.value = this.value.replace(/[^0-9]/g, '')"
                                    class="w-full text-base font-medium px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 transition placeholder:text-slate-400 placeholder:font-normal">
                            </div>
                            <div>
                                <label for="bankNameInput" class="payout-label">Account Holder Name (Optional)</label>
                                <input type="text" id="bankNameInput" placeholder="Name on bank passbook"
                                    class="w-full text-base font-medium px-3.5 py-2.5 rounded-xl border border-slate-300 focus:outline-none focus:ring-2 focus:ring-violet-500 transition placeholder:text-slate-400 placeholder:font-normal">
                            </div>
                        </div>
                    </div>
                `;
            },

            validate() {
                const ifscInput = document.getElementById('bankIfscInput')?.value.trim().toUpperCase();
                const bankAccountNumber = document.getElementById('bankAccInput')?.value.trim();
                const accountHolderName = document.getElementById('bankNameInput')?.value.trim();

                if (!ifscInput) {
                    return {
                        isValid: false,
                        validationError: 'Please enter your Bank IFSC Code and verify it first!'
                    };
                }

                if (!TaskPaymentForm.isIfscVerified) {
                    return {
                        isValid: false,
                        validationError: 'Please verify your Bank IFSC Code before proceeding!'
                    };
                }

                if (!bankAccountNumber) {
                    return {
                        isValid: false,
                        validationError: 'Please enter your Bank Account Number!'
                    };
                }

                if (!/^[0-9]{9,18}$/.test(bankAccountNumber)) {
                    return {
                        isValid: false,
                        validationError: 'Bank Account Number must be between 9 and 18 digits (numbers only)!'
                    };
                }

                return {
                    isValid: true,
                    payoutPayload: {
                        payoutAccount: bankAccountNumber,
                        payoutType: 'BANK',
                        payoutHolderName: accountHolderName || (TaskPaymentForm.verifiedBankInfo?.bankName || ''),
                        payoutIfsc: ifscInput
                    }
                };
            }
        }
    },

    /**
     * Initializes payment tabs, dynamic forms & restores saved account
     */
    init() {
        this.renderMethodTabs();
        this.renderMethodForms();
        this.restoreLastUsedAccount();
    },

    /**
     * Dynamically renders payment method tabs from METHOD_REGISTRY
     */
    renderMethodTabs() {
        const container = document.getElementById('payoutMethodTabs');
        if (!container) return;

        const methods = Object.entries(this.METHOD_REGISTRY);
        container.className = `grid grid-cols-${methods.length} gap-2 mb-3`;
        container.innerHTML = methods.map(([key, config]) => {
            const isSelected = key === this.selectedMethod;
            const style = isSelected ? this.BUTTON_STYLES.active : this.BUTTON_STYLES.inactive;
            return `
                <button type="button" id="${config.buttonId}" onclick="TaskPaymentForm.selectPaymentMethod('${key}')"
                    aria-pressed="${isSelected}" class="${style}">
                    <i class="${config.icon}"></i> ${config.label}
                </button>
            `;
        }).join('');
    },

    /**
     * Dynamically renders each method's form from METHOD_REGISTRY
     */
    renderMethodForms() {
        const container = document.getElementById('payoutFormsContainer');
        if (!container) return;

        container.innerHTML = Object.entries(this.METHOD_REGISTRY).map(([key, config]) => {
            const isSelected = key === this.selectedMethod;
            const hiddenClass = isSelected ? '' : 'hidden';
            return `<div id="${config.sectionId}" class="${hiddenClass}">${config.renderForm()}</div>`;
        }).join('');
    },

    /**
     * Switch between payment methods (UPI, BANK, etc.)
     */
    selectPaymentMethod(methodName) {
        if (!this.METHOD_REGISTRY[methodName]) return;

        this.selectedMethod = methodName;

        Object.entries(this.METHOD_REGISTRY).forEach(([name, config]) => {
            const isSelected = name === methodName;
            const buttonElement = document.getElementById(config.buttonId);
            const sectionElement = document.getElementById(config.sectionId);

            if (buttonElement) {
                buttonElement.setAttribute('aria-pressed', String(isSelected));
                buttonElement.className = isSelected
                    ? this.BUTTON_STYLES.active
                    : this.BUTTON_STYLES.inactive;
            }

            if (sectionElement) {
                sectionElement.classList.toggle('hidden', !isSelected);
            }
        });
    },

    upiDebounceTimer: null,
    isUpiVerified: false,
    verifiedUpiInfo: null,
    upiValidationError: null,

    /**
     * Handles live UPI input typing with 500ms debounce
     */
    handleUpiInput(rawValue) {
        clearTimeout(this.upiDebounceTimer);
        this.resetUpiVerification();

        const clean = (rawValue || '').trim();
        if (!clean || !clean.includes('@') || clean.length < 4) {
            this.upiValidationError = 'Please enter a valid UPI address (e.g. mobile@paytm or yourname@oksbi)';
            return;
        }

        this.upiDebounceTimer = setTimeout(() => {
            this.triggerUpiVerification(clean);
        }, 500);
    },

    /**
     * Resets verified UPI state and hides status indicators
     */
    resetUpiVerification() {
        this.isUpiVerified = false;
        this.verifiedUpiInfo = null;
        this.upiValidationError = null;

        const icon = document.getElementById('upiStatusIcon');
        if (icon) icon.innerHTML = '<i class="fa-solid fa-at text-slate-400"></i>';
    },

    /**
     * Performs async UPI verification via backend API
     */
    async triggerUpiVerification(vpa) {
        const icon = document.getElementById('upiStatusIcon');

        if (icon) icon.innerHTML = '<i class="fa-solid fa-spinner fa-spin text-slate-400"></i>';

        try {
            const upiData = await TaskAPI.verifyUpiId(vpa);
            if (document.getElementById('upiInput').value.trim() !== vpa) return;
            this.isUpiVerified = true;
            this.verifiedUpiInfo = upiData;
            this.upiValidationError = null;

            // Tick mark
            if (icon) icon.innerHTML = '<i class="fa-solid fa-circle-check text-emerald-600"></i>';
        } catch (err) {
            if (document.getElementById('upiInput').value.trim() !== vpa) return;
            this.isUpiVerified = false;
            this.verifiedUpiInfo = null;
            this.upiValidationError = err.message || 'Invalid UPI ID format. Please check and try again.';

            // X mark
            if (icon) icon.innerHTML = '<i class="fa-solid fa-circle-xmark text-rose-500"></i>';
        }
    },

    /**
     * Handles live IFSC input typing
     */
    handleIfscInput(rawValue) {
        const clean = (rawValue || '').trim().toUpperCase();
        const input = document.getElementById('bankIfscInput');
        if (input && input.value !== clean) {
            input.value = clean;
        }

        // Reset verification state on value edit
        this.resetIfscVerification();

        // Auto-verify if 11 characters entered
        if (clean.length === 11) {
            this.triggerIfscVerification();
        }
    },

    /**
     * Resets verified state and hides remaining fields
     */
    resetIfscVerification() {
        this.isIfscVerified = false;
        this.verifiedBankInfo = null;

        const verifiedCard = document.getElementById('ifscVerifiedCard');
        const remainingDetails = document.getElementById('bankDetailsRemaining');
        const errorText = document.getElementById('ifscErrorText');
        const verifyBtn = document.getElementById('btnVerifyIfsc');

        if (verifiedCard) verifiedCard.classList.add('hidden');
        if (remainingDetails) remainingDetails.classList.add('hidden');
        if (errorText) {
            errorText.textContent = '';
            errorText.classList.add('hidden');
        }
        if (verifyBtn) {
            verifyBtn.disabled = false;
            verifyBtn.textContent = 'Verify';
            verifyBtn.className = 'absolute right-1.5 px-3 py-1.5 text-[11px] font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition cursor-pointer';
        }
    },

    /**
     * Performs async IFSC verification via backend API
     */
    async triggerIfscVerification() {
        const ifscInput = document.getElementById('bankIfscInput');
        const verifyBtn = document.getElementById('btnVerifyIfsc');
        const errorText = document.getElementById('ifscErrorText');
        const verifiedCard = document.getElementById('ifscVerifiedCard');
        const remainingDetails = document.getElementById('bankDetailsRemaining');
        const bankNameDisplay = document.getElementById('ifscBankNameDisplay');
        const branchDisplay = document.getElementById('ifscBranchDisplay');

        const code = (ifscInput?.value || '').trim().toUpperCase();
        if (!code) {
            if (errorText) {
                errorText.textContent = 'Please enter an IFSC code';
                errorText.classList.remove('hidden');
            }
            return;
        }

        if (code.length !== 11) {
            if (errorText) {
                errorText.textContent = 'IFSC code must be exactly 11 characters (e.g. SBIN0001234)';
                errorText.classList.remove('hidden');
            }
            return;
        }

        // Loading State
        if (verifyBtn) {
            verifyBtn.disabled = true;
            verifyBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i>';
        }
        if (errorText) errorText.classList.add('hidden');

        try {
            const bankData = await TaskAPI.verifyIfscCode(code);
            if (ifscInput.value.trim().toUpperCase() !== code) return;
            this.isIfscVerified = true;
            this.verifiedBankInfo = bankData;

            if (bankNameDisplay) bankNameDisplay.textContent = bankData.bankName || 'Verified Bank';
            if (branchDisplay) {
                const branchParts = [bankData.branchName, bankData.city].filter(Boolean);
                branchDisplay.textContent = branchParts.length ? branchParts.join(' • ') : 'Verified Account Support';
            }

            if (verifiedCard) verifiedCard.classList.remove('hidden');
            if (remainingDetails) remainingDetails.classList.remove('hidden');

            if (verifyBtn) {
                verifyBtn.disabled = true;
                verifyBtn.innerHTML = '<i class="fa-solid fa-check"></i>';
                verifyBtn.className = 'absolute right-1.5 px-3 py-1.5 text-[11px] font-bold bg-emerald-100 text-emerald-800 rounded-lg transition';
            }
        } catch (err) {
            if (ifscInput.value.trim().toUpperCase() !== code) return;
            this.isIfscVerified = false;
            this.verifiedBankInfo = null;

            if (errorText) {
                errorText.textContent = err.message || 'Invalid IFSC code format or not found';
                errorText.classList.remove('hidden');
            }
            if (verifiedCard) verifiedCard.classList.add('hidden');
            if (remainingDetails) remainingDetails.classList.add('hidden');

            if (verifyBtn) {
                verifyBtn.disabled = false;
                verifyBtn.textContent = 'Verify';
                verifyBtn.className = 'absolute right-1.5 px-3 py-1.5 text-[11px] font-bold bg-slate-900 hover:bg-slate-800 text-white rounded-lg transition cursor-pointer';
            }
        }
    },

    /**
     * Extracts validated payment payload ready for backend click API
     */
    async getPaymentFormData() {
        const detectedTrafficSource = TaskAPI.detectTrafficSource();
        const config = this.METHOD_REGISTRY[this.selectedMethod];

        if (!config || !config.validate) {
            return {
                isValid: false,
                validationError: `Unsupported payout method: ${this.selectedMethod}`
            };
        }

        // If user is on UPI and verification is not done yet, verify immediately
        if (this.selectedMethod === 'UPI') {
            const upiId = document.getElementById('upiInput')?.value.trim();
            if (upiId && !this.isUpiVerified) {
                clearTimeout(this.upiDebounceTimer);
                await this.triggerUpiVerification(upiId);
            }
        }

        const result = config.validate();
        if (result.isValid && result.payoutPayload) {
            result.payoutPayload.source = detectedTrafficSource;
        }

        return result;
    },

    /**
     * Remember user's account for repeat visits
     */
    saveLastUsedAccount(accountIdentifier) {
        if (accountIdentifier) {
            localStorage.setItem('last_payout_account', accountIdentifier);
        }
    },

    /**
     * Restore user's last used UPI on load
     */
    restoreLastUsedAccount() {
        const lastSaved = localStorage.getItem('last_payout_account');
        const upiInput = document.getElementById('upiInput');
        if (/^[0-9]{9,18}$/.test(lastSaved || '')) {
            this.selectPaymentMethod('BANK');
            document.getElementById('bankAccInput').value = lastSaved;
        } else if (lastSaved && upiInput) {
            upiInput.value = lastSaved;
            this.handleUpiInput(lastSaved);
        }
    }
};

window.TaskPaymentForm = TaskPaymentForm;
