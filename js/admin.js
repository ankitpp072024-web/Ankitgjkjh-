import { DatabaseService, LocalStorageService } from './supabase.js';
import { showToast, showModal, hideModal, formatCurrency, formatDate, validateForm } from './utils.js';

export class AdminService {
    constructor() {
        this.useSupabase = false; // Set to true when Supabase tables are ready
        this.dbService = this.useSupabase ? DatabaseService : LocalStorageService;
        this.isLoggedIn = false;
        this.adminPassword = 'ankit07';
        this.init();
    }

    init() {
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Admin login
        document.getElementById('adminLoginForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        // Admin logout
        document.getElementById('adminLogoutBtn')?.addEventListener('click', () => {
            this.logout();
        });

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Add earning option button
        document.getElementById('addEarningOptionBtn')?.addEventListener('click', () => {
            this.showAddEarningOptionModal();
        });

        // Add app task button
        document.getElementById('addTaskBtn')?.addEventListener('click', () => {
            this.showAddTaskModal();
        });
    }

    handleLogin() {
        const password = document.getElementById('adminPassword')?.value;
        
        if (password === this.adminPassword) {
            this.isLoggedIn = true;
            document.getElementById('admin-login')?.classList.add('hidden');
            document.getElementById('admin-dashboard')?.classList.remove('hidden');
            showToast('Admin login successful!', 'success');
            
            // Load initial data
            this.loadTabData('earning-options');
        } else {
            showToast('Invalid admin password', 'error');
        }
    }

    logout() {
        this.isLoggedIn = false;
        document.getElementById('admin-dashboard')?.classList.add('hidden');
        document.getElementById('admin-login')?.classList.remove('hidden');
        document.getElementById('adminPassword').value = '';
        window.location.hash = '';
        showToast('Admin logged out successfully', 'success');
    }

    switchTab(tabName) {
        // Remove active class from all tabs and contents
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // Add active class to clicked tab and corresponding content
        document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
        document.getElementById(tabName)?.classList.add('active');
        
        // Load tab-specific data
        this.loadTabData(tabName);
    }

    async loadTabData(tabName) {
        if (!this.isLoggedIn) return;

        switch(tabName) {
            case 'earning-options':
                await this.loadEarningOptions();
                break;
            case 'app-tasks':
                await this.loadAppTasks();
                break;
            case 'proofs':
                await this.loadSubmittedProofs();
                break;
            case 'users':
                await this.loadUsers();
                break;
            case 'withdrawals':
                await this.loadWithdrawals();
                break;
        }
    }

    // Earning Options Management
    async loadEarningOptions() {
        const container = document.getElementById('earningOptionsAdmin');
        if (!container) return;

        try {
            const result = await this.dbService.getAllEarningOptions();
            if (result.success) {
                this.renderEarningOptions(result.data, container);
            }
        } catch (error) {
            console.error('Load earning options error:', error);
            showToast('Error loading earning options', 'error');
        }
    }

    renderEarningOptions(options, container) {
        if (options.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">No earning options found</p>';
            return;
        }

        container.innerHTML = options.map(option => `
            <div class="option-card" data-id="${option.id}">
                <div class="option-header">
                    <h4>${option.title}</h4>
                    <div class="option-controls">
                        <label class="toggle-switch">
                            <input type="checkbox" ${option.is_active ? 'checked' : ''} 
                                   onchange="window.adminService.toggleOption(${option.id}, this.checked)">
                            <span class="toggle-slider"></span>
                        </label>
                        <button class="btn-secondary" onclick="window.adminService.editOption(${option.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-secondary" onclick="window.adminService.deleteOption(${option.id})" title="Delete" style="background: var(--error-color);">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <p>${option.description}</p>
                <div class="option-details">
                    <span>Reward: ${formatCurrency(option.reward_min)} - ${formatCurrency(option.reward_max)}</span>
                    <span>Cooldown: ${option.cooldown_hours}h</span>
                    <span>Type: ${option.action_type}</span>
                </div>
            </div>
        `).join('');
    }

    showAddEarningOptionModal() {
        showModal('Add New Earning Option', `
            <form id="addEarningOptionForm">
                <div class="form-group">
                    <label for="optionTitle">Title</label>
                    <input type="text" id="optionTitle" placeholder="e.g., Quiz & Earn" required>
                </div>
                <div class="form-group">
                    <label for="optionDescription">Description</label>
                    <textarea id="optionDescription" placeholder="Brief description of the earning method" required></textarea>
                </div>
                <div class="form-group">
                    <label for="optionIcon">Icon Class</label>
                    <select id="optionIcon" required>
                        <option value="fas fa-spinner">Spinner (Spin & Earn)</option>
                        <option value="fas fa-play-circle">Play Circle (Watch Ads)</option>
                        <option value="fas fa-download">Download (App Downloads)</option>
                        <option value="fas fa-question-circle">Question (Quiz)</option>
                        <option value="fas fa-poll">Poll (Survey)</option>
                        <option value="fas fa-users">Users (Social Tasks)</option>
                        <option value="fas fa-coins">Coins (General)</option>
                        <option value="fas fa-gift">Gift (Bonus)</option>
                    </select>
                </div>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                    <div class="form-group">
                        <label for="optionRewardMin">Min Reward (₹)</label>
                        <input type="number" id="optionRewardMin" step="0.01" min="0" placeholder="0.50" required>
                    </div>
                    <div class="form-group">
                        <label for="optionRewardMax">Max Reward (₹)</label>
                        <input type="number" id="optionRewardMax" step="0.01" min="0" placeholder="2.00" required>
                    </div>
                </div>
                <div class="form-group">
                    <label for="optionCooldown">Cooldown Hours</label>
                    <input type="number" id="optionCooldown" step="0.1" min="0" placeholder="1" required>
                </div>
                <div class="form-group">
                    <label for="optionActionType">Action Type</label>
                    <select id="optionActionType" required>
                        <option value="spin">Spin & Earn</option>
                        <option value="watch_ad">Watch Advertisement</option>
                        <option value="download_app">Download App</option>
                        <option value="quiz">Take Quiz</option>
                        <option value="survey">Complete Survey</option>
                        <option value="social">Social Task</option>
                        <option value="custom">Custom Action</option>
                    </select>
                </div>
                <div class="form-group">
                    <label for="optionActionUrl">Action URL (Optional)</label>
                    <input type="url" id="optionActionUrl" placeholder="https://example.com">
                </div>
            </form>
        `, [
            {
                text: 'Cancel',
                class: 'btn-secondary',
                onClick: () => hideModal()
            },
            {
                text: 'Add Option',
                class: 'btn-primary',
                onClick: () => this.createEarningOption()
            }
        ]);
    }

    async createEarningOption() {
        const formData = {
            title: document.getElementById('optionTitle')?.value.trim(),
            description: document.getElementById('optionDescription')?.value.trim(),
            iconClass: document.getElementById('optionIcon')?.value,
            rewardMin: parseFloat(document.getElementById('optionRewardMin')?.value),
            rewardMax: parseFloat(document.getElementById('optionRewardMax')?.value),
            cooldownHours: parseFloat(document.getElementById('optionCooldown')?.value),
            actionType: document.getElementById('optionActionType')?.value,
            actionUrl: document.getElementById('optionActionUrl')?.value.trim()
        };

        // Validate form
        const validation = validateForm(formData, {
            title: { required: true, minLength: 3, label: 'Title' },
            description: { required: true, minLength: 10, label: 'Description' },
            iconClass: { required: true, label: 'Icon' },
            rewardMin: { required: true, min: 0, label: 'Min Reward' },
            rewardMax: { required: true, min: 0, label: 'Max Reward' },
            cooldownHours: { required: true, min: 0, label: 'Cooldown' },
            actionType: { required: true, label: 'Action Type' }
        });

        if (!validation.isValid) {
            showToast(validation.errors[0], 'error');
            return;
        }

        if (formData.rewardMax < formData.rewardMin) {
            showToast('Max reward must be greater than or equal to min reward', 'error');
            return;
        }

        try {
            const result = await this.dbService.createEarningOption(formData);
            if (result.success) {
                hideModal();
                showToast('Earning option created successfully!', 'success');
                await this.loadEarningOptions();
            } else {
                showToast('Error creating earning option: ' + result.error, 'error');
            }
        } catch (error) {
            console.error('Create earning option error:', error);
            showToast('Error creating earning option', 'error');
        }
    }

    async toggleOption(optionId, isActive) {
        try {
            const result = await this.dbService.updateEarningOption(optionId, { is_active: isActive });
            if (result.success) {
                showToast(`Option ${isActive ? 'activated' : 'deactivated'} successfully`, 'success');
            } else {
                showToast('Error updating option status', 'error');
                // Revert toggle
                const checkbox = document.querySelector(`[onchange*="${optionId}"]`);
                if (checkbox) checkbox.checked = !isActive;
            }
        } catch (error) {
            console.error('Toggle option error:', error);
            showToast('Error updating option status', 'error');
        }
    }

    async deleteOption(optionId) {
        if (!confirm('Are you sure you want to delete this earning option?')) return;

        try {
            const result = await this.dbService.updateEarningOption(optionId, { is_active: false });
            if (result.success) {
                showToast('Earning option deleted successfully', 'success');
                await this.loadEarningOptions();
            } else {
                showToast('Error deleting earning option', 'error');
            }
        } catch (error) {
            console.error('Delete option error:', error);
            showToast('Error deleting earning option', 'error');
        }
    }

    // App Tasks Management
    async loadAppTasks() {
        const container = document.getElementById('tasksContainer');
        if (!container) return;

        try {
            const tasks = JSON.parse(localStorage.getItem('earnpro_app_tasks') || '[]');
            this.renderAppTasks(tasks.filter(task => task.is_active !== false), container);
        } catch (error) {
            console.error('Load app tasks error:', error);
            showToast('Error loading app tasks', 'error');
        }
    }

    renderAppTasks(tasks, container) {
        if (tasks.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">No app tasks found</p>';
            return;
        }

        container.innerHTML = tasks.map(task => `
            <div class="option-card" data-id="${task.id}">
                <div class="option-header">
                    <h4>${task.title}</h4>
                    <div class="option-controls">
                        <button class="btn-secondary" onclick="window.adminService.editTask(${task.id})" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-secondary" onclick="window.adminService.deleteTask(${task.id})" title="Delete" style="background: var(--error-color);">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <p>${task.instructions}</p>
                <div class="option-details">
                    <span>Reward: ${formatCurrency(task.reward_amount || 25)}</span>
                    <span>Created: ${formatDate(task.created_at)}</span>
                </div>
                <a href="${task.app_link}" target="_blank" style="color: var(--primary-color); text-decoration: none; font-size: 0.9rem;">
                    <i class="fas fa-external-link-alt"></i> View App Link
                </a>
            </div>
        `).join('');
    }

    showAddTaskModal() {
        showModal('Add App Download Task', `
            <form id="addTaskForm">
                <div class="form-group">
                    <label for="taskTitle">App Title</label>
                    <input type="text" id="taskTitle" placeholder="e.g., WhatsApp Messenger" required>
                </div>
                <div class="form-group">
                    <label for="taskInstructions">Instructions</label>
                    <textarea id="taskInstructions" placeholder="Download and install the app, then take a screenshot..." required></textarea>
                </div>
                <div class="form-group">
                    <label for="taskAppLink">App Download Link</label>
                    <input type="url" id="taskAppLink" placeholder="https://play.google.com/store/apps/..." required>
                </div>
                <div class="form-group">
                    <label for="taskReward">Reward Amount (₹)</label>
                    <input type="number" id="taskReward" step="0.01" min="1" placeholder="25.00" required>
                </div>
            </form>
        `, [
            {
                text: 'Cancel',
                class: 'btn-secondary',
                onClick: () => hideModal()
            },
            {
                text: 'Add Task',
                class: 'btn-primary',
                onClick: () => this.createAppTask()
            }
        ]);
    }

    async createAppTask() {
        const formData = {
            title: document.getElementById('taskTitle')?.value.trim(),
            instructions: document.getElementById('taskInstructions')?.value.trim(),
            appLink: document.getElementById('taskAppLink')?.value.trim(),
            rewardAmount: parseFloat(document.getElementById('taskReward')?.value)
        };

        // Validate form
        const validation = validateForm(formData, {
            title: { required: true, minLength: 3, label: 'App Title' },
            instructions: { required: true, minLength: 10, label: 'Instructions' },
            appLink: { required: true, pattern: /^https?:\/\/.+/, patternMessage: 'Please enter a valid URL', label: 'App Link' },
            rewardAmount: { required: true, min: 1, label: 'Reward Amount' }
        });

        if (!validation.isValid) {
            showToast(validation.errors[0], 'error');
            return;
        }

        try {
            const tasks = JSON.parse(localStorage.getItem('earnpro_app_tasks') || '[]');
            const newTask = {
                id: Date.now(),
                title: formData.title,
                instructions: formData.instructions,
                app_link: formData.appLink,
                reward_amount: formData.rewardAmount,
                is_active: true,
                created_at: new Date().toISOString()
            };

            tasks.push(newTask);
            localStorage.setItem('earnpro_app_tasks', JSON.stringify(tasks));

            hideModal();
            showToast('App task created successfully!', 'success');
            await this.loadAppTasks();
        } catch (error) {
            console.error('Create app task error:', error);
            showToast('Error creating app task', 'error');
        }
    }

    async deleteTask(taskId) {
        if (!confirm('Are you sure you want to delete this task?')) return;

        try {
            const tasks = JSON.parse(localStorage.getItem('earnpro_app_tasks') || '[]');
            const updatedTasks = tasks.filter(task => task.id !== taskId);
            localStorage.setItem('earnpro_app_tasks', JSON.stringify(updatedTasks));

            showToast('Task deleted successfully', 'success');
            await this.loadAppTasks();
        } catch (error) {
            console.error('Delete task error:', error);
            showToast('Error deleting task', 'error');
        }
    }

    // Submitted Proofs Management
    async loadSubmittedProofs() {
        const container = document.getElementById('proofsContainer');
        if (!container) return;

        try {
            const submissions = JSON.parse(localStorage.getItem('earnpro_task_submissions') || '[]');
            const tasks = JSON.parse(localStorage.getItem('earnpro_app_tasks') || '[]');
            
            // Combine submission data with task details
            const proofsWithDetails = submissions.map(submission => {
                const task = tasks.find(t => t.id === submission.task_id);
                return {
                    ...submission,
                    task_title: task?.title || 'Unknown Task',
                    task_reward: task?.reward_amount || 0
                };
            });

            this.renderSubmittedProofs(proofsWithDetails, container);
        } catch (error) {
            console.error('Load submitted proofs error:', error);
            showToast('Error loading submitted proofs', 'error');
        }
    }

    renderSubmittedProofs(proofs, container) {
        if (proofs.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">No submitted proofs found</p>';
            return;
        }

        container.innerHTML = `
            <div class="data-table">
                <table>
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Task</th>
                            <th>Screenshot</th>
                            <th>Submitted</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${proofs.map(proof => `
                            <tr>
                                <td>
                                    <div>
                                        <strong>${proof.user_name}</strong><br>
                                        <small>${proof.user_phone}</small>
                                    </div>
                                </td>
                                <td>
                                    <div>
                                        <strong>${proof.task_title}</strong><br>
                                        <small>Reward: ${formatCurrency(proof.task_reward)}</small>
                                    </div>
                                </td>
                                <td>
                                    <img src="${proof.screenshot_url}" alt="Proof" 
                                         style="width: 60px; height: 60px; object-fit: cover; border-radius: 8px; cursor: pointer;"
                                         onclick="window.adminService.viewScreenshot('${proof.screenshot_url}')">
                                </td>
                                <td>${formatDate(proof.submitted_at, 'relative')}</td>
                                <td>
                                    <span style="padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; 
                                                 background: ${proof.status === 'approved' ? 'var(--success-color)' : 
                                                              proof.status === 'rejected' ? 'var(--error-color)' : 
                                                              'var(--warning-color)'}; color: white;">
                                        ${proof.status.toUpperCase()}
                                    </span>
                                </td>
                                <td>
                                    ${proof.status === 'pending' ? `
                                        <button onclick="window.adminService.approveProof(${proof.id})" 
                                                class="btn-secondary" style="background: var(--success-color); margin-right: 5px;">
                                            <i class="fas fa-check"></i> Approve
                                        </button>
                                        <button onclick="window.adminService.rejectProof(${proof.id})" 
                                                class="btn-secondary" style="background: var(--error-color);">
                                            <i class="fas fa-times"></i> Reject
                                        </button>
                                    ` : `
                                        <span style="color: var(--text-secondary); font-size: 0.9rem;">No actions</span>
                                    `}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    viewScreenshot(imageUrl) {
        showModal('Submitted Screenshot', `
            <div style="text-align: center;">
                <img src="${imageUrl}" alt="Proof Screenshot" style="max-width: 100%; height: auto; border-radius: var(--border-radius);">
            </div>
        `);
    }

    async approveProof(proofId) {
        if (!confirm('Are you sure you want to approve this proof?')) return;

        try {
            const submissions = JSON.parse(localStorage.getItem('earnpro_task_submissions') || '[]');
            const submissionIndex = submissions.findIndex(s => s.id === proofId);
            
            if (submissionIndex === -1) {
                showToast('Submission not found', 'error');
                return;
            }

            const submission = submissions[submissionIndex];
            const tasks = JSON.parse(localStorage.getItem('earnpro_app_tasks') || '[]');
            const task = tasks.find(t => t.id === submission.task_id);
            
            if (!task) {
                showToast('Task not found', 'error');
                return;
            }

            // Update submission status
            submissions[submissionIndex].status = 'approved';
            localStorage.setItem('earnpro_task_submissions', JSON.stringify(submissions));

            // Credit user wallet
            const users = JSON.parse(localStorage.getItem('earnpro_users') || '[]');
            const userIndex = users.findIndex(u => u.id === submission.user_id);
            
            if (userIndex !== -1) {
                users[userIndex].wallet_balance += task.reward_amount;
                users[userIndex].total_earned += task.reward_amount;
                localStorage.setItem('earnpro_users', JSON.stringify(users));
            }

            showToast('Proof approved and user credited!', 'success');
            await this.loadSubmittedProofs();
        } catch (error) {
            console.error('Approve proof error:', error);
            showToast('Error approving proof', 'error');
        }
    }

    async rejectProof(proofId) {
        if (!confirm('Are you sure you want to reject this proof?')) return;

        try {
            const submissions = JSON.parse(localStorage.getItem('earnpro_task_submissions') || '[]');
            const submissionIndex = submissions.findIndex(s => s.id === proofId);
            
            if (submissionIndex === -1) {
                showToast('Submission not found', 'error');
                return;
            }

            submissions[submissionIndex].status = 'rejected';
            localStorage.setItem('earnpro_task_submissions', JSON.stringify(submissions));

            showToast('Proof rejected', 'success');
            await this.loadSubmittedProofs();
        } catch (error) {
            console.error('Reject proof error:', error);
            showToast('Error rejecting proof', 'error');
        }
    }

    // Users Management
    async loadUsers() {
        const container = document.getElementById('usersContainer');
        if (!container) return;

        try {
            const users = JSON.parse(localStorage.getItem('earnpro_users') || '[]');
            this.renderUsers(users, container);
        } catch (error) {
            console.error('Load users error:', error);
            showToast('Error loading users', 'error');
        }
    }

    renderUsers(users, container) {
        if (users.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">No users found</p>';
            return;
        }

        container.innerHTML = `
            <div class="data-table">
                <table>
                    <thead>
                        <tr>
                            <th>User Info</th>
                            <th>Wallet Balance</th>
                            <th>Total Earned</th>
                            <th>Referrals</th>
                            <th>Joined</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${users.map(user => `
                            <tr>
                                <td>
                                    <div>
                                        <strong>${user.name}</strong><br>
                                        <small>${user.phone}</small>
                                    </div>
                                </td>
                                <td>${formatCurrency(user.wallet_balance || 0)}</td>
                                <td>${formatCurrency(user.total_earned || 0)}</td>
                                <td>${user.referral_count || 0}</td>
                                <td>${formatDate(user.created_at)}</td>
                                <td>
                                    <button onclick="window.adminService.viewUserDetails(${user.id})" 
                                            class="btn-secondary" style="margin-right: 5px;">
                                        <i class="fas fa-eye"></i> View
                                    </button>
                                    <button onclick="window.adminService.deleteUser(${user.id})" 
                                            class="btn-secondary" style="background: var(--error-color);">
                                        <i class="fas fa-trash"></i> Delete
                                    </button>
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    viewUserDetails(userId) {
        const users = JSON.parse(localStorage.getItem('earnpro_users') || '[]');
        const user = users.find(u => u.id === userId);
        
        if (!user) {
            showToast('User not found', 'error');
            return;
        }

        showModal(`User Details - ${user.name}`, `
            <div style="display: grid; gap: 15px;">
                <div class="form-group">
                    <label>Personal Information</label>
                    <div style="background: rgba(51, 65, 85, 0.3); padding: 15px; border-radius: var(--border-radius);">
                        <p><strong>Name:</strong> ${user.name}</p>
                        <p><strong>Phone:</strong> ${user.phone}</p>
                        <p><strong>Referral Code:</strong> ${user.referral_code}</p>
                        <p><strong>Referred By:</strong> ${user.referred_by || 'None'}</p>
                        <p><strong>Joined:</strong> ${formatDate(user.created_at, 'DD/MM/YYYY HH:mm')}</p>
                    </div>
                </div>
                <div class="form-group">
                    <label>Financial Information</label>
                    <div style="background: rgba(51, 65, 85, 0.3); padding: 15px; border-radius: var(--border-radius);">
                        <p><strong>Wallet Balance:</strong> ${formatCurrency(user.wallet_balance || 0)}</p>
                        <p><strong>Total Earned:</strong> ${formatCurrency(user.total_earned || 0)}</p>
                        <p><strong>Referral Earnings:</strong> ${formatCurrency(user.referral_earnings || 0)}</p>
                        <p><strong>Total Referrals:</strong> ${user.referral_count || 0}</p>
                    </div>
                </div>
            </div>
        `);
    }

    async deleteUser(userId) {
        if (!confirm('Are you sure you want to delete this user? This action cannot be undone.')) return;

        try {
            const users = JSON.parse(localStorage.getItem('earnpro_users') || '[]');
            const updatedUsers = users.filter(user => user.id !== userId);
            localStorage.setItem('earnpro_users', JSON.stringify(updatedUsers));

            showToast('User deleted successfully', 'success');
            await this.loadUsers();
        } catch (error) {
            console.error('Delete user error:', error);
            showToast('Error deleting user', 'error');
        }
    }

    // Withdrawals Management
    async loadWithdrawals() {
        const container = document.getElementById('withdrawalsContainer');
        if (!container) return;

        try {
            const requests = JSON.parse(localStorage.getItem('earnpro_withdrawal_requests') || '[]');
            this.renderWithdrawals(requests, container);
        } catch (error) {
            console.error('Load withdrawals error:', error);
            showToast('Error loading withdrawal requests', 'error');
        }
    }

    renderWithdrawals(requests, container) {
        if (requests.length === 0) {
            container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); padding: 40px;">No withdrawal requests found</p>';
            return;
        }

        container.innerHTML = `
            <div class="data-table">
                <table>
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Amount</th>
                            <th>Payment Method</th>
                            <th>Payment Details</th>
                            <th>Requested</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${requests.map(request => `
                            <tr>
                                <td>
                                    <div>
                                        <strong>${request.user_name}</strong><br>
                                        <small>${request.user_phone}</small>
                                    </div>
                                </td>
                                <td>${formatCurrency(request.amount)}</td>
                                <td>${request.payment_method.toUpperCase()}</td>
                                <td style="max-width: 200px; word-break: break-word;">
                                    <small>${request.payment_details}</small>
                                </td>
                                <td>${formatDate(request.requested_at, 'relative')}</td>
                                <td>
                                    <span style="padding: 4px 8px; border-radius: 4px; font-size: 0.8rem; 
                                                 background: ${request.status === 'approved' ? 'var(--success-color)' : 
                                                              request.status === 'rejected' ? 'var(--error-color)' : 
                                                              'var(--warning-color)'}; color: white;">
                                        ${request.status.toUpperCase()}
                                    </span>
                                </td>
                                <td>
                                    ${request.status === 'pending' ? `
                                        <button onclick="window.adminService.approveWithdrawal(${request.id})" 
                                                class="btn-secondary" style="background: var(--success-color); margin-right: 5px;">
                                            <i class="fas fa-check"></i> Approve
                                        </button>
                                        <button onclick="window.adminService.rejectWithdrawal(${request.id})" 
                                                class="btn-secondary" style="background: var(--error-color);">
                                            <i class="fas fa-times"></i> Reject
                                        </button>
                                    ` : `
                                        <span style="color: var(--text-secondary); font-size: 0.9rem;">No actions</span>
                                    `}
                                </td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            </div>
        `;
    }

    async approveWithdrawal(requestId) {
        if (!confirm('Are you sure you want to approve this withdrawal? Make sure you have sent the money manually.')) return;

        try {
            const requests = JSON.parse(localStorage.getItem('earnpro_withdrawal_requests') || '[]');
            const requestIndex = requests.findIndex(r => r.id === requestId);
            
            if (requestIndex === -1) {
                showToast('Withdrawal request not found', 'error');
                return;
            }

            const request = requests[requestIndex];
            
            // Update request status
            requests[requestIndex].status = 'approved';
            requests[requestIndex].processed_at = new Date().toISOString();
            localStorage.setItem('earnpro_withdrawal_requests', JSON.stringify(requests));

            // Deduct amount from user wallet
            const users = JSON.parse(localStorage.getItem('earnpro_users') || '[]');
            const userIndex = users.findIndex(u => u.id === request.user_id);
            
            if (userIndex !== -1) {
                users[userIndex].wallet_balance = Math.max(0, users[userIndex].wallet_balance - request.amount);
                localStorage.setItem('earnpro_users', JSON.stringify(users));
            }

            showToast('Withdrawal approved and amount deducted from user wallet!', 'success');
            await this.loadWithdrawals();
        } catch (error) {
            console.error('Approve withdrawal error:', error);
            showToast('Error approving withdrawal', 'error');
        }
    }

    async rejectWithdrawal(requestId) {
        if (!confirm('Are you sure you want to reject this withdrawal request?')) return;

        try {
            const requests = JSON.parse(localStorage.getItem('earnpro_withdrawal_requests') || '[]');
            const requestIndex = requests.findIndex(r => r.id === requestId);
            
            if (requestIndex === -1) {
                showToast('Withdrawal request not found', 'error');
                return;
            }

            requests[requestIndex].status = 'rejected';
            requests[requestIndex].processed_at = new Date().toISOString();
            localStorage.setItem('earnpro_withdrawal_requests', JSON.stringify(requests));

            showToast('Withdrawal request rejected', 'success');
            await this.loadWithdrawals();
        } catch (error) {
            console.error('Reject withdrawal error:', error);
            showToast('Error rejecting withdrawal', 'error');
        }
    }
}