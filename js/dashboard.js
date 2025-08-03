import { DatabaseService, LocalStorageService } from './supabase.js';
import { showToast, showModal, hideModal, formatCurrency, formatDuration, randomBetween, handleImageUpload } from './utils.js';

export class DashboardService {
    constructor(authService) {
        this.authService = authService;
        this.dbService = this.authService.useSupabase ? DatabaseService : LocalStorageService;
        this.earningOptions = [];
        this.appTasks = [];
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadDashboardData();
        this.startWalletUpdateInterval();
        this.startCooldownTimers();
    }

    setupEventListeners() {
        // Withdraw button
        document.getElementById('withdrawBtn')?.addEventListener('click', () => {
            this.showWithdrawModal();
        });

        // Copy referral link
        document.getElementById('copyReferralBtn')?.addEventListener('click', () => {
            const referralInput = document.getElementById('referralLinkInput');
            if (referralInput) {
                referralInput.select();
                document.execCommand('copy');
                showToast('Referral link copied!', 'success');
            }
        });
    }

    async loadDashboardData() {
        await Promise.all([
            this.updateWalletDisplay(),
            this.loadEarningOptions(),
            this.loadAppTasks(),
            this.updateReferralStats()
        ]);
    }

    async updateWalletDisplay() {
        const user = this.authService.getCurrentUser();
        if (!user) return;

        // Update current user data
        await this.authService.updateCurrentUser();
        const updatedUser = this.authService.getCurrentUser();

        const walletBalance = document.getElementById('walletBalance');
        const todayEarning = document.getElementById('todayEarning');
        const totalEarned = document.getElementById('totalEarned');
        const referralBonus = document.getElementById('referralBonus');

        if (walletBalance) walletBalance.textContent = formatCurrency(updatedUser.wallet_balance || 0);
        if (totalEarned) totalEarned.textContent = formatCurrency(updatedUser.total_earned || 0);
        if (referralBonus) referralBonus.textContent = formatCurrency(updatedUser.referral_earnings || 0);

        // Calculate today's earning (this would be more complex in a real app)
        const todayAmount = this.calculateTodayEarning(updatedUser);
        if (todayEarning) todayEarning.textContent = formatCurrency(todayAmount);
    }

    calculateTodayEarning(user) {
        // Simple calculation for demo - in reality, you'd track daily earnings
        const today = new Date().toDateString();
        const lastActivity = localStorage.getItem(`earnpro_last_activity_${user.id}`);
        
        if (lastActivity === today) {
            return parseFloat(localStorage.getItem(`earnpro_today_earning_${user.id}`) || '0');
        } else {
            localStorage.setItem(`earnpro_today_earning_${user.id}`, '0');
            localStorage.setItem(`earnpro_last_activity_${user.id}`, today);
            return 0;
        }
    }

    addTodayEarning(amount) {
        const user = this.authService.getCurrentUser();
        if (!user) return;

        const currentTodayEarning = this.calculateTodayEarning(user);
        const newTodayEarning = currentTodayEarning + amount;
        
        localStorage.setItem(`earnpro_today_earning_${user.id}`, newTodayEarning.toString());
        localStorage.setItem(`earnpro_last_activity_${user.id}`, new Date().toDateString());
    }

    async loadEarningOptions() {
        try {
            const result = await this.dbService.getEarningOptions();
            if (result.success) {
                this.earningOptions = result.data;
                this.renderEarningOptions();
            }
        } catch (error) {
            console.error('Load earning options error:', error);
        }
    }

    renderEarningOptions() {
        const container = document.getElementById('earningOptions');
        if (!container) return;

        const user = this.authService.getCurrentUser();
        if (!user) return;

        container.innerHTML = this.earningOptions.map(option => {
            const canPerform = this.dbService.canUserPerformAction ? 
                this.dbService.canUserPerformAction(user.id, option.action_type) : true;
            
            const cooldownLeft = this.dbService.getCooldownTimeLeft ? 
                this.dbService.getCooldownTimeLeft(user.id, option.action_type) : 0;

            return `
                <div class="earning-option ${!canPerform ? 'disabled' : ''}" data-id="${option.id}">
                    <div class="icon">
                        <i class="${option.icon_class}"></i>
                    </div>
                    <h4>${option.title}</h4>
                    <p>${option.description}</p>
                    <div class="reward">Earn ${formatCurrency(option.reward_min)} - ${formatCurrency(option.reward_max)}</div>
                    ${!canPerform && cooldownLeft > 0 ? 
                        `<div class="cooldown">Next available in ${formatDuration(cooldownLeft)}</div>` : 
                        ''
                    }
                    <button class="earning-btn" 
                            ${!canPerform ? 'disabled' : ''} 
                            onclick="window.dashboardService.handleEarningAction('${option.action_type}', ${option.id})">
                        ${this.getActionButtonText(option.action_type)}
                    </button>
                </div>
            `;
        }).join('');
    }

    getActionButtonText(actionType) {
        switch(actionType) {
            case 'spin': return '<i class="fas fa-spinner"></i> Spin Now';
            case 'watch_ad': return '<i class="fas fa-play"></i> Watch Ad';
            case 'download_app': return '<i class="fas fa-download"></i> View Tasks';
            default: return '<i class="fas fa-coins"></i> Start Earning';
        }
    }

    async handleEarningAction(actionType, optionId) {
        const user = this.authService.getCurrentUser();
        if (!user) return;

        // Check if user can perform this action
        if (this.dbService.canUserPerformAction && !this.dbService.canUserPerformAction(user.id, actionType)) {
            showToast('Please wait for cooldown to finish', 'warning');
            return;
        }

        switch(actionType) {
            case 'spin':
                await this.handleSpin(optionId);
                break;
            case 'watch_ad':
                await this.handleWatchAd(optionId);
                break;
            case 'download_app':
                this.showAppTasksModal();
                break;
            default:
                await this.handleGenericEarning(optionId);
        }
    }

    async handleSpin(optionId) {
        const option = this.earningOptions.find(o => o.id === optionId);
        if (!option) return;

        const user = this.authService.getCurrentUser();
        
        // Show spinning animation
        const spinButton = document.querySelector(`[onclick*="${option.action_type}"]`);
        if (spinButton) {
            spinButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Spinning...';
            spinButton.disabled = true;
        }

        // Simulate spin delay
        setTimeout(async () => {
            const reward = randomBetween(option.reward_min, option.reward_max);
            const rewardAmount = parseFloat(reward.toFixed(2));

            // Update user wallet
            const updateResult = await this.dbService.updateUserWallet(user.id, rewardAmount, 'add');
            
            if (updateResult.success) {
                // Update cooldown
                if (this.dbService.updateUserCooldown) {
                    this.dbService.updateUserCooldown(user.id, option.action_type);
                }

                // Add to today's earning
                this.addTodayEarning(rewardAmount);

                showToast(`🎉 You earned ${formatCurrency(rewardAmount)}!`, 'success');
                await this.updateWalletDisplay();
                this.renderEarningOptions();
            } else {
                showToast('Error updating wallet. Please try again.', 'error');
            }
        }, 2000);
    }

    async handleWatchAd(optionId) {
        const option = this.earningOptions.find(o => o.id === optionId);
        if (!option) return;

        // Show ad watching modal
        showModal('Watch Advertisement', `
            <div style="text-align: center; padding: 20px;">
                <div style="width: 100%; height: 200px; background: linear-gradient(45deg, #667eea, #764ba2); border-radius: 12px; display: flex; align-items: center; justify-content: center; color: white; font-size: 1.2rem; margin-bottom: 20px;">
                    <div>
                        <i class="fas fa-play-circle" style="font-size: 3rem; margin-bottom: 10px;"></i>
                        <div>Advertisement Playing...</div>
                        <div style="margin-top: 10px; font-size: 0.9rem;">Please wait <span id="adTimer">10</span> seconds</div>
                    </div>
                </div>
            </div>
        `, []);

        // Start ad timer
        let timeLeft = 10;
        const timer = setInterval(() => {
            timeLeft--;
            const timerElement = document.getElementById('adTimer');
            if (timerElement) {
                timerElement.textContent = timeLeft;
            }

            if (timeLeft <= 0) {
                clearInterval(timer);
                this.completeAdWatching(optionId);
            }
        }, 1000);
    }

    async completeAdWatching(optionId) {
        const option = this.earningOptions.find(o => o.id === optionId);
        if (!option) return;

        const user = this.authService.getCurrentUser();
        const reward = randomBetween(option.reward_min, option.reward_max);
        const rewardAmount = parseFloat(reward.toFixed(2));

        // Update user wallet
        const updateResult = await this.dbService.updateUserWallet(user.id, rewardAmount, 'add');
        
        if (updateResult.success) {
            // Update cooldown
            if (this.dbService.updateUserCooldown) {
                this.dbService.updateUserCooldown(user.id, option.action_type);
            }

            // Add to today's earning
            this.addTodayEarning(rewardAmount);

            hideModal();
            showToast(`🎉 You earned ${formatCurrency(rewardAmount)} for watching the ad!`, 'success');
            await this.updateWalletDisplay();
            this.renderEarningOptions();
        } else {
            hideModal();
            showToast('Error updating wallet. Please try again.', 'error');
        }
    }

    async loadAppTasks() {
        try {
            // For localStorage, get from storage
            const tasks = JSON.parse(localStorage.getItem('earnpro_app_tasks') || '[]');
            this.appTasks = tasks.filter(task => task.is_active !== false);
        } catch (error) {
            console.error('Load app tasks error:', error);
        }
    }

    showAppTasksModal() {
        if (this.appTasks.length === 0) {
            showToast('No app download tasks available at the moment', 'info');
            return;
        }

        const tasksHtml = this.appTasks.map(task => `
            <div class="task-item" style="border: 1px solid var(--border-color); border-radius: var(--border-radius); padding: 15px; margin-bottom: 15px;">
                <h4 style="margin-bottom: 8px; color: var(--primary-color);">${task.title}</h4>
                <p style="margin-bottom: 10px; color: var(--text-secondary); font-size: 0.9rem;">${task.instructions}</p>
                <div style="margin-bottom: 15px;">
                    <span style="color: var(--success-color); font-weight: 600;">Reward: ${formatCurrency(task.reward_amount || 25)}</span>
                </div>
                <div style="display: flex; gap: 10px; flex-wrap: wrap;">
                    <a href="${task.app_link}" target="_blank" class="btn-primary" style="text-decoration: none; padding: 8px 16px; font-size: 0.9rem; flex: 1; text-align: center;">
                        <i class="fas fa-download"></i> Download App
                    </a>
                    <button onclick="window.dashboardService.showProofUpload(${task.id})" class="btn-secondary" style="padding: 8px 16px; font-size: 0.9rem; flex: 1;">
                        <i class="fas fa-camera"></i> Upload Proof
                    </button>
                </div>
            </div>
        `).join('');

        showModal('Download Apps & Earn', `
            <div style="max-height: 400px; overflow-y: auto;">
                ${tasksHtml}
                <div style="text-align: center; margin-top: 20px; padding: 15px; background: rgba(102, 126, 234, 0.1); border-radius: var(--border-radius);">
                    <p style="margin-bottom: 10px;"><strong>How it works:</strong></p>
                    <ol style="text-align: left; padding-left: 20px; color: var(--text-secondary);">
                        <li>Download the app using the link provided</li>
                        <li>Install and open the app</li>
                        <li>Take a screenshot showing the app is installed</li>
                        <li>Upload the screenshot as proof</li>
                        <li>Wait for admin approval to receive your reward</li>
                    </ol>
                </div>
            </div>
        `);
    }

    showProofUpload(taskId) {
        const task = this.appTasks.find(t => t.id === taskId);
        if (!task) return;

        showModal('Upload Installation Proof', `
            <div class="form-group">
                <label>Task: ${task.title}</label>
                <p style="color: var(--text-secondary); margin-bottom: 15px;">${task.instructions}</p>
            </div>
            <div class="form-group">
                <label for="proofImage">Upload Screenshot</label>
                <input type="file" id="proofImage" accept="image/*" style="margin-bottom: 10px;">
                <div id="imagePreview" style="margin-top: 10px;"></div>
            </div>
        `, [
            {
                text: 'Cancel',
                class: 'btn-secondary',
                onClick: () => hideModal()
            },
            {
                text: 'Submit Proof',
                class: 'btn-primary',
                onClick: () => this.submitTaskProof(taskId)
            }
        ]);

        // Handle image preview
        document.getElementById('proofImage')?.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                const reader = new FileReader();
                reader.onload = (e) => {
                    document.getElementById('imagePreview').innerHTML = `
                        <img src="${e.target.result}" style="max-width: 100%; height: auto; border-radius: var(--border-radius);">
                    `;
                };
                reader.readAsDataURL(file);
            }
        });
    }

    async submitTaskProof(taskId) {
        const user = this.authService.getCurrentUser();
        const fileInput = document.getElementById('proofImage');
        
        if (!fileInput?.files[0]) {
            showToast('Please select an image to upload', 'error');
            return;
        }

        try {
            const imageData = await handleImageUpload(fileInput.files[0]);
            
            // Save submission to localStorage
            const submissions = JSON.parse(localStorage.getItem('earnpro_task_submissions') || '[]');
            const newSubmission = {
                id: Date.now(),
                user_id: user.id,
                task_id: taskId,
                user_name: user.name,
                user_phone: user.phone,
                screenshot_url: imageData,
                status: 'pending',
                submitted_at: new Date().toISOString()
            };

            submissions.push(newSubmission);
            localStorage.setItem('earnpro_task_submissions', JSON.stringify(submissions));

            hideModal();
            showToast('Proof submitted successfully! Wait for admin approval.', 'success');

        } catch (error) {
            showToast(error.message, 'error');
        }
    }

    async updateReferralStats() {
        const user = this.authService.getCurrentUser();
        if (!user) return;

        const totalReferrals = document.getElementById('totalReferrals');
        const referralEarnings = document.getElementById('referralEarnings');

        if (totalReferrals) totalReferrals.textContent = user.referral_count || 0;
        if (referralEarnings) referralEarnings.textContent = formatCurrency(user.referral_earnings || 0);
    }

    showWithdrawModal() {
        const user = this.authService.getCurrentUser();
        if (!user || user.wallet_balance < 10) {
            showToast('Minimum withdrawal amount is ₹10', 'warning');
            return;
        }

        showModal('Withdraw Money', `
            <div class="form-group">
                <label>Available Balance</label>
                <div style="font-size: 1.5rem; font-weight: 600; color: var(--success-color); margin-bottom: 15px;">
                    ${formatCurrency(user.wallet_balance)}
                </div>
            </div>
            <div class="form-group">
                <label for="withdrawAmount">Withdrawal Amount</label>
                <input type="number" id="withdrawAmount" min="10" max="${user.wallet_balance}" step="0.01" placeholder="Enter amount">
            </div>
            <div class="form-group">
                <label for="paymentMethod">Payment Method</label>
                <select id="paymentMethod">
                    <option value="upi">UPI</option>
                    <option value="bank">Bank Transfer</option>
                </select>
            </div>
            <div class="form-group">
                <label for="paymentDetails">Payment Details</label>
                <textarea id="paymentDetails" placeholder="Enter UPI ID or Bank Account Details" rows="3"></textarea>
            </div>
        `, [
            {
                text: 'Cancel',
                class: 'btn-secondary',
                onClick: () => hideModal()
            },
            {
                text: 'Submit Request',
                class: 'btn-primary',
                onClick: () => this.submitWithdrawRequest()
            }
        ]);
    }

    async submitWithdrawRequest() {
        const user = this.authService.getCurrentUser();
        const amount = parseFloat(document.getElementById('withdrawAmount')?.value);
        const paymentMethod = document.getElementById('paymentMethod')?.value;
        const paymentDetails = document.getElementById('paymentDetails')?.value.trim();

        if (!amount || amount < 10) {
            showToast('Minimum withdrawal amount is ₹10', 'error');
            return;
        }

        if (amount > user.wallet_balance) {
            showToast('Insufficient balance', 'error');
            return;
        }

        if (!paymentDetails) {
            showToast('Please enter payment details', 'error');
            return;
        }

        try {
            // Save withdrawal request
            const requests = JSON.parse(localStorage.getItem('earnpro_withdrawal_requests') || '[]');
            const newRequest = {
                id: Date.now(),
                user_id: user.id,
                user_name: user.name,
                user_phone: user.phone,
                amount: amount,
                payment_method: paymentMethod,
                payment_details: paymentDetails,
                status: 'pending',
                requested_at: new Date().toISOString()
            };

            requests.push(newRequest);
            localStorage.setItem('earnpro_withdrawal_requests', JSON.stringify(requests));

            hideModal();
            showToast('Withdrawal request submitted successfully!', 'success');

        } catch (error) {
            showToast('Error submitting withdrawal request', 'error');
        }
    }

    startWalletUpdateInterval() {
        // Update wallet display every 30 seconds
        setInterval(() => {
            this.updateWalletDisplay();
        }, 30000);
    }

    startCooldownTimers() {
        // Update cooldown timers every second
        setInterval(() => {
            this.updateCooldownDisplays();
        }, 1000);
    }

    updateCooldownDisplays() {
        const user = this.authService.getCurrentUser();
        if (!user) return;

        document.querySelectorAll('.earning-option').forEach(optionElement => {
            const optionId = parseInt(optionElement.dataset.id);
            const option = this.earningOptions.find(o => o.id === optionId);
            
            if (option && this.dbService.getCooldownTimeLeft) {
                const cooldownLeft = this.dbService.getCooldownTimeLeft(user.id, option.action_type);
                const cooldownElement = optionElement.querySelector('.cooldown');
                const button = optionElement.querySelector('.earning-btn');
                
                if (cooldownLeft > 0) {
                    if (cooldownElement) {
                        cooldownElement.textContent = `Next available in ${formatDuration(cooldownLeft)}`;
                    }
                    if (button) {
                        button.disabled = true;
                    }
                    optionElement.classList.add('disabled');
                } else {
                    if (cooldownElement) {
                        cooldownElement.remove();
                    }
                    if (button) {
                        button.disabled = false;
                    }
                    optionElement.classList.remove('disabled');
                }
            }
        });
    }
}