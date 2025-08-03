import { DatabaseService, LocalStorageService } from './supabase.js';
import { showToast, showModal } from './utils.js';

export class AuthService {
    constructor() {
        this.currentUser = null;
        this.useSupabase = false; // Set to true when Supabase tables are ready
        this.dbService = this.useSupabase ? DatabaseService : LocalStorageService;
        this.init();
    }

    init() {
        // Check if user is already logged in
        const savedUser = localStorage.getItem('earnpro_current_user');
        if (savedUser) {
            this.currentUser = JSON.parse(savedUser);
        }

        this.setupEventListeners();
        this.checkAuthState();
    }

    setupEventListeners() {
        // Switch between login and register forms
        document.getElementById('showRegister')?.addEventListener('click', () => {
            this.showRegisterForm();
        });

        document.getElementById('showLogin')?.addEventListener('click', () => {
            this.showLoginForm();
        });

        // Form submissions
        document.getElementById('loginForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });

        document.getElementById('registerForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });

        // Logout
        document.getElementById('logoutBtn')?.addEventListener('click', () => {
            this.logout();
        });

        // Check for referral code in URL
        this.checkReferralCode();
    }

    checkAuthState() {
        const authContainer = document.getElementById('auth-container');
        const userDashboard = document.getElementById('user-dashboard');
        const adminPanel = document.getElementById('admin-panel');
        const loadingScreen = document.getElementById('loading-screen');

        // Hide loading screen
        setTimeout(() => {
            loadingScreen?.classList.add('hidden');
            
            // Check if accessing admin panel
            if (window.location.hash === '#admin') {
                this.showAdminPanel();
                return;
            }

            if (this.currentUser) {
                authContainer?.classList.add('hidden');
                userDashboard?.classList.remove('hidden');
                this.updateUserInfo();
            } else {
                userDashboard?.classList.add('hidden');
                authContainer?.classList.remove('hidden');
            }
        }, 1500);
    }

    showLoginForm() {
        document.getElementById('login-form')?.classList.remove('hidden');
        document.getElementById('register-form')?.classList.add('hidden');
    }

    showRegisterForm() {
        document.getElementById('register-form')?.classList.remove('hidden');
        document.getElementById('login-form')?.classList.add('hidden');
    }

    showAdminPanel() {
        document.getElementById('auth-container')?.classList.add('hidden');
        document.getElementById('user-dashboard')?.classList.add('hidden');
        document.getElementById('admin-panel')?.classList.remove('hidden');
    }

    checkReferralCode() {
        const urlParams = new URLSearchParams(window.location.search);
        const refCode = urlParams.get('ref');
        if (refCode) {
            localStorage.setItem('earnpro_referral_code', refCode);
            showToast('Referral code applied! You\'ll get ₹5 bonus on registration.', 'success');
        }
    }

    async handleLogin() {
        const phone = document.getElementById('loginPhone')?.value.trim();
        const password = document.getElementById('loginPassword')?.value;

        if (!phone || !password) {
            showToast('Please fill in all fields', 'error');
            return;
        }

        if (!this.validatePhone(phone)) {
            showToast('Please enter a valid phone number', 'error');
            return;
        }

        try {
            const result = await this.dbService.getUserByPhone(phone);
            
            if (!result.success || !result.data) {
                showToast('User not found. Please register first.', 'error');
                return;
            }

            const user = result.data;
            
            // Simple password check (in production, use proper hashing)
            if (user.password !== password && user.password_hash !== password) {
                showToast('Invalid password', 'error');
                return;
            }

            // Login successful
            this.currentUser = user;
            localStorage.setItem('earnpro_current_user', JSON.stringify(user));
            
            showToast('Login successful!', 'success');
            this.checkAuthState();

        } catch (error) {
            console.error('Login error:', error);
            showToast('Login failed. Please try again.', 'error');
        }
    }

    async handleRegister() {
        const name = document.getElementById('registerName')?.value.trim();
        const phone = document.getElementById('registerPhone')?.value.trim();
        const password = document.getElementById('registerPassword')?.value;

        if (!name || !phone || !password) {
            showToast('Please fill in all fields', 'error');
            return;
        }

        if (!this.validatePhone(phone)) {
            showToast('Please enter a valid phone number', 'error');
            return;
        }

        if (password.length < 6) {
            showToast('Password must be at least 6 characters', 'error');
            return;
        }

        try {
            // Check if user already exists
            const existingUser = await this.dbService.getUserByPhone(phone);
            if (existingUser.success && existingUser.data) {
                showToast('Phone number already registered. Please login.', 'error');
                return;
            }

            // Get referral code if any
            const referralCode = localStorage.getItem('earnpro_referral_code');
            
            // Create new user
            const userData = {
                name,
                phone,
                password,
                referredBy: referralCode
            };

            const result = await this.dbService.createUser(userData);
            
            if (!result.success) {
                showToast('Registration failed: ' + result.error, 'error');
                return;
            }

            // Clear referral code
            localStorage.removeItem('earnpro_referral_code');

            // Auto login after registration
            this.currentUser = result.data;
            localStorage.setItem('earnpro_current_user', JSON.stringify(result.data));
            
            showToast('Registration successful! Welcome to EarnPro!', 'success');
            this.checkAuthState();

        } catch (error) {
            console.error('Registration error:', error);
            showToast('Registration failed. Please try again.', 'error');
        }
    }

    logout() {
        this.currentUser = null;
        localStorage.removeItem('earnpro_current_user');
        window.location.hash = '';
        showToast('Logged out successfully', 'success');
        this.checkAuthState();
    }

    updateUserInfo() {
        if (!this.currentUser) return;

        const userName = document.getElementById('userName');
        const userPhone = document.getElementById('userPhone');
        
        if (userName) userName.textContent = `Welcome, ${this.currentUser.name}!`;
        if (userPhone) userPhone.textContent = this.currentUser.phone;

        // Generate and display referral link
        this.updateReferralLink();
    }

    updateReferralLink() {
        if (!this.currentUser) return;

        const referralCode = this.currentUser.referral_code;
        const baseUrl = window.location.origin + window.location.pathname;
        const referralLink = `${baseUrl}?ref=${referralCode}`;
        
        const referralInput = document.getElementById('referralLinkInput');
        if (referralInput) {
            referralInput.value = referralLink;
        }

        // Copy referral link functionality
        const copyBtn = document.getElementById('copyReferralBtn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => {
                referralInput.select();
                document.execCommand('copy');
                showToast('Referral link copied!', 'success');
            });
        }
    }

    validatePhone(phone) {
        // Simple phone validation (adjust regex as needed)
        const phoneRegex = /^[6-9]\d{9}$/;
        return phoneRegex.test(phone.replace(/\D/g, ''));
    }

    getCurrentUser() {
        return this.currentUser;
    }

    isLoggedIn() {
        return !!this.currentUser;
    }

    // Update current user data
    async updateCurrentUser() {
        if (!this.currentUser) return;

        try {
            const result = await this.dbService.getUserByPhone(this.currentUser.phone);
            if (result.success && result.data) {
                this.currentUser = result.data;
                localStorage.setItem('earnpro_current_user', JSON.stringify(result.data));
            }
        } catch (error) {
            console.error('Update current user error:', error);
        }
    }
}

// Admin authentication
export class AdminAuth {
    constructor() {
        this.isAdminLoggedIn = false;
        this.adminPassword = 'ankit07';
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Admin login form
        document.getElementById('adminLoginForm')?.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleAdminLogin();
        });

        // Admin logout
        document.getElementById('adminLogoutBtn')?.addEventListener('click', () => {
            this.adminLogout();
        });

        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                this.switchTab(e.target.dataset.tab);
            });
        });
    }

    handleAdminLogin() {
        const password = document.getElementById('adminPassword')?.value;
        
        if (password === this.adminPassword) {
            this.isAdminLoggedIn = true;
            document.getElementById('admin-login')?.classList.add('hidden');
            document.getElementById('admin-dashboard')?.classList.remove('hidden');
            showToast('Admin login successful!', 'success');
            
            // Load admin dashboard data
            this.loadAdminDashboard();
        } else {
            showToast('Invalid admin password', 'error');
        }
    }

    adminLogout() {
        this.isAdminLoggedIn = false;
        document.getElementById('admin-dashboard')?.classList.add('hidden');
        document.getElementById('admin-login')?.classList.remove('hidden');
        document.getElementById('adminPassword').value = '';
        window.location.hash = '';
        showToast('Admin logged out', 'success');
    }

    switchTab(tabName) {
        // Remove active class from all tabs and contents
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        
        // Add active class to clicked tab and corresponding content
        document.querySelector(`[data-tab="${tabName}"]`)?.classList.add('active');
        document.getElementById(tabName)?.classList.add('active');
        
        // Load specific tab data
        this.loadTabData(tabName);
    }

    loadAdminDashboard() {
        // Load initial data for the first tab
        this.loadTabData('earning-options');
    }

    async loadTabData(tabName) {
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

    async loadEarningOptions() {
        const container = document.getElementById('earningOptionsAdmin');
        if (!container) return;

        try {
            const dbService = window.authService?.useSupabase ? DatabaseService : LocalStorageService;
            const result = await dbService.getAllEarningOptions();
            
            if (result.success) {
                this.renderEarningOptions(result.data, container);
            }
        } catch (error) {
            console.error('Load earning options error:', error);
        }
    }

    renderEarningOptions(options, container) {
        container.innerHTML = options.map(option => `
            <div class="option-card" data-id="${option.id}">
                <div class="option-header">
                    <h4>${option.title}</h4>
                    <div class="option-controls">
                        <label class="toggle-switch">
                            <input type="checkbox" ${option.is_active ? 'checked' : ''} 
                                   onchange="window.adminAuth.toggleOption(${option.id}, this.checked)">
                            <span class="toggle-slider"></span>
                        </label>
                        <button class="btn-secondary" onclick="window.adminAuth.editOption(${option.id})">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn-secondary" onclick="window.adminAuth.deleteOption(${option.id})">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </div>
                <p>${option.description}</p>
                <div class="option-details">
                    <span>Reward: ₹${option.reward_min} - ₹${option.reward_max}</span>
                    <span>Cooldown: ${option.cooldown_hours}h</span>
                </div>
            </div>
        `).join('');
    }

    async loadAppTasks() {
        // Implementation for loading app tasks
        console.log('Loading app tasks...');
    }

    async loadSubmittedProofs() {
        // Implementation for loading submitted proofs
        console.log('Loading submitted proofs...');
    }

    async loadUsers() {
        // Implementation for loading users
        console.log('Loading users...');
    }

    async loadWithdrawals() {
        // Implementation for loading withdrawals
        console.log('Loading withdrawals...');
    }
}