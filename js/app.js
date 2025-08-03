import { AuthService } from './auth.js';
import { DashboardService } from './dashboard.js';
import { AdminService } from './admin.js';
import { showToast } from './utils.js';

class EarnProApp {
    constructor() {
        this.authService = null;
        this.dashboardService = null;
        this.adminService = null;
        this.init();
    }

    async init() {
        try {
            // Initialize services
            this.authService = new AuthService();
            this.adminService = new AdminService();
            
            // Make services available globally for onclick handlers
            window.authService = this.authService;
            window.adminService = this.adminService;
            
            // Initialize dashboard service after auth is ready
            setTimeout(() => {
                if (this.authService.isLoggedIn()) {
                    this.initializeDashboard();
                }
            }, 100);

            // Setup route handling
            this.setupRouting();
            
            // Setup global error handling
            this.setupErrorHandling();

            console.log('EarnPro App initialized successfully');
            
        } catch (error) {
            console.error('Failed to initialize EarnPro App:', error);
            showToast('Failed to initialize application', 'error');
        }
    }

    initializeDashboard() {
        if (!this.dashboardService && this.authService.isLoggedIn()) {
            this.dashboardService = new DashboardService(this.authService);
            window.dashboardService = this.dashboardService;
        }
    }

    setupRouting() {
        // Handle hash changes for navigation
        window.addEventListener('hashchange', () => {
            this.handleRouteChange();
        });

        // Handle initial route
        this.handleRouteChange();
    }

    handleRouteChange() {
        const hash = window.location.hash;
        
        switch(hash) {
            case '#admin':
                this.showAdminPanel();
                break;
            case '#dashboard':
                if (this.authService.isLoggedIn()) {
                    this.showUserDashboard();
                } else {
                    window.location.hash = '';
                    showToast('Please login to access dashboard', 'warning');
                }
                break;
            default:
                // Default behavior is handled by AuthService
                break;
        }
    }

    showAdminPanel() {
        // Hide other containers
        document.getElementById('auth-container')?.classList.add('hidden');
        document.getElementById('user-dashboard')?.classList.add('hidden');
        document.getElementById('loading-screen')?.classList.add('hidden');
        
        // Show admin panel
        document.getElementById('admin-panel')?.classList.remove('hidden');
    }

    showUserDashboard() {
        // Hide other containers
        document.getElementById('auth-container')?.classList.add('hidden');
        document.getElementById('admin-panel')?.classList.add('hidden');
        document.getElementById('loading-screen')?.classList.add('hidden');
        
        // Show user dashboard
        document.getElementById('user-dashboard')?.classList.remove('hidden');
        
        // Initialize dashboard if not already done
        this.initializeDashboard();
    }

    setupErrorHandling() {
        // Global error handler
        window.addEventListener('error', (event) => {
            console.error('Global error:', event.error);
            showToast('An unexpected error occurred', 'error');
        });

        // Unhandled promise rejection handler
        window.addEventListener('unhandledrejection', (event) => {
            console.error('Unhandled promise rejection:', event.reason);
            showToast('An unexpected error occurred', 'error');
            event.preventDefault();
        });
    }

    // Utility methods for external access
    getCurrentUser() {
        return this.authService?.getCurrentUser();
    }

    isUserLoggedIn() {
        return this.authService?.isLoggedIn() || false;
    }

    isAdminLoggedIn() {
        return this.adminService?.isLoggedIn || false;
    }

    // Add sample data for demonstration
    async addSampleData() {
        try {
            // Add sample app tasks
            const sampleTasks = [
                {
                    id: Date.now() + 1,
                    title: 'WhatsApp Messenger',
                    instructions: 'Download WhatsApp from Google Play Store, install it, and take a screenshot of the app icon on your home screen.',
                    app_link: 'https://play.google.com/store/apps/details?id=com.whatsapp',
                    reward_amount: 25,
                    is_active: true,
                    created_at: new Date().toISOString()
                },
                {
                    id: Date.now() + 2,
                    title: 'Instagram',
                    instructions: 'Download Instagram from the app store, create an account or login, and take a screenshot of your profile page.',
                    app_link: 'https://play.google.com/store/apps/details?id=com.instagram.android',
                    reward_amount: 30,
                    is_active: true,
                    created_at: new Date().toISOString()
                },
                {
                    id: Date.now() + 3,
                    title: 'Telegram',
                    instructions: 'Download Telegram messenger, verify your phone number, and take a screenshot of the main chat list.',
                    app_link: 'https://play.google.com/store/apps/details?id=org.telegram.messenger',
                    reward_amount: 20,
                    is_active: true,
                    created_at: new Date().toISOString()
                }
            ];

            const existingTasks = JSON.parse(localStorage.getItem('earnpro_app_tasks') || '[]');
            if (existingTasks.length === 0) {
                localStorage.setItem('earnpro_app_tasks', JSON.stringify(sampleTasks));
                console.log('Sample app tasks added');
            }

        } catch (error) {
            console.error('Error adding sample data:', error);
        }
    }

    // Debug methods
    clearAllData() {
        if (confirm('Are you sure you want to clear all data? This will remove all users, tasks, and submissions.')) {
            const keys = [
                'earnpro_users',
                'earnpro_earning_options',
                'earnpro_app_tasks',
                'earnpro_task_submissions',
                'earnpro_withdrawal_requests',
                'earnpro_user_cooldowns',
                'earnpro_current_user'
            ];
            
            keys.forEach(key => localStorage.removeItem(key));
            
            showToast('All data cleared successfully', 'success');
            window.location.reload();
        }
    }

    exportData() {
        const data = {
            users: JSON.parse(localStorage.getItem('earnpro_users') || '[]'),
            earning_options: JSON.parse(localStorage.getItem('earnpro_earning_options') || '[]'),
            app_tasks: JSON.parse(localStorage.getItem('earnpro_app_tasks') || '[]'),
            task_submissions: JSON.parse(localStorage.getItem('earnpro_task_submissions') || '[]'),
            withdrawal_requests: JSON.parse(localStorage.getItem('earnpro_withdrawal_requests') || '[]'),
            user_cooldowns: JSON.parse(localStorage.getItem('earnpro_user_cooldowns') || '{}')
        };

        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `earnpro_data_${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        
        showToast('Data exported successfully', 'success');
    }

    // Performance monitoring
    startPerformanceMonitoring() {
        // Monitor page load time
        window.addEventListener('load', () => {
            const loadTime = performance.now();
            console.log(`Page loaded in ${loadTime.toFixed(2)}ms`);
        });

        // Monitor memory usage (if available)
        if ('memory' in performance) {
            setInterval(() => {
                const memory = performance.memory;
                if (memory.usedJSHeapSize > 50 * 1024 * 1024) { // 50MB
                    console.warn('High memory usage detected:', memory);
                }
            }, 30000); // Check every 30 seconds
        }
    }
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    const app = new EarnProApp();
    
    // Make app instance available globally for debugging
    window.earnProApp = app;
    
    // Add sample data on first load
    app.addSampleData();
    
    // Start performance monitoring
    app.startPerformanceMonitoring();
    
    // Debug shortcuts (only in development)
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        window.debugEarnPro = {
            clearData: () => app.clearAllData(),
            exportData: () => app.exportData(),
            addSampleUser: () => {
                const sampleUser = {
                    name: 'John Doe',
                    phone: '9876543210',
                    password: 'password123'
                };
                app.authService.dbService.createUser(sampleUser);
                showToast('Sample user created (9876543210 / password123)', 'success');
            },
            loginAsAdmin: () => {
                window.location.hash = '#admin';
                setTimeout(() => {
                    document.getElementById('adminPassword').value = 'ankit07';
                    app.adminService.handleLogin();
                }, 100);
            }
        };
        
        console.log('Debug methods available:', window.debugEarnPro);
    }
});

// Service Worker registration for PWA capabilities (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then((registration) => {
                console.log('SW registered: ', registration);
            })
            .catch((registrationError) => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

export default EarnProApp;