import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://idmxevyuimqvawyiwepn.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlkbXhldnl1aW1xdmF3eWl3ZXBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQxMDM0NjAsImV4cCI6MjA2OTY3OTQ2MH0.jI02IzcO3EymscBI-z3d2lVLlwvAUwcGqPKf0cRiJcU';

export const supabase = createClient(supabaseUrl, supabaseKey);

// Database schemas and utilities
export const DatabaseService = {
    // Initialize database tables if they don't exist
    async initializeDatabase() {
        try {
            // Check if tables exist by trying to query them
            const { data: users, error: usersError } = await supabase
                .from('users')
                .select('id')
                .limit(1);

            if (usersError && usersError.code === '42P01') {
                // Tables don't exist, create them
                await this.createTables();
            }
        } catch (error) {
            console.log('Database initialization check:', error);
        }
    },

    async createTables() {
        // Note: In a real application, you would create these tables through Supabase dashboard
        // or migrations. For this demo, we'll use localStorage as fallback
        console.log('Tables should be created through Supabase dashboard');
    },

    // User operations
    async createUser(userData) {
        try {
            const { data, error } = await supabase
                .from('users')
                .insert([{
                    name: userData.name,
                    phone: userData.phone,
                    password_hash: userData.password, // In production, hash this properly
                    wallet_balance: 0,
                    total_earned: 0,
                    referral_code: this.generateReferralCode(),
                    referred_by: userData.referredBy || null,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Create user error:', error);
            return { success: false, error: error.message };
        }
    },

    async getUserByPhone(phone) {
        try {
            const { data, error } = await supabase
                .from('users')
                .select('*')
                .eq('phone', phone)
                .single();

            if (error && error.code !== 'PGRST116') throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Get user error:', error);
            return { success: false, error: error.message };
        }
    },

    async updateUserWallet(userId, amount, type = 'add') {
        try {
            const { data: user } = await supabase
                .from('users')
                .select('wallet_balance, total_earned')
                .eq('id', userId)
                .single();

            const newBalance = type === 'add' 
                ? user.wallet_balance + amount 
                : user.wallet_balance - amount;
            const newTotal = type === 'add' 
                ? user.total_earned + amount 
                : user.total_earned;

            const { data, error } = await supabase
                .from('users')
                .update({
                    wallet_balance: Math.max(0, newBalance),
                    total_earned: newTotal
                })
                .eq('id', userId)
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Update wallet error:', error);
            return { success: false, error: error.message };
        }
    },

    // Earning options operations
    async getEarningOptions() {
        try {
            const { data, error } = await supabase
                .from('earning_options')
                .select('*')
                .eq('is_active', true)
                .order('display_order');

            if (error && error.code !== 'PGRST116') throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Get earning options error:', error);
            return { success: false, error: error.message };
        }
    },

    async createEarningOption(optionData) {
        try {
            const { data, error } = await supabase
                .from('earning_options')
                .insert([{
                    title: optionData.title,
                    description: optionData.description,
                    icon_class: optionData.iconClass,
                    reward_min: optionData.rewardMin,
                    reward_max: optionData.rewardMax,
                    cooldown_hours: optionData.cooldownHours,
                    action_type: optionData.actionType,
                    action_url: optionData.actionUrl,
                    is_active: true,
                    display_order: optionData.displayOrder || 0,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Create earning option error:', error);
            return { success: false, error: error.message };
        }
    },

    async updateEarningOption(id, updates) {
        try {
            const { data, error } = await supabase
                .from('earning_options')
                .update(updates)
                .eq('id', id)
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Update earning option error:', error);
            return { success: false, error: error.message };
        }
    },

    // App tasks operations
    async getAppTasks() {
        try {
            const { data, error } = await supabase
                .from('app_tasks')
                .select('*')
                .eq('is_active', true)
                .order('created_at', { ascending: false });

            if (error && error.code !== 'PGRST116') throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Get app tasks error:', error);
            return { success: false, error: error.message };
        }
    },

    async createAppTask(taskData) {
        try {
            const { data, error } = await supabase
                .from('app_tasks')
                .insert([{
                    title: taskData.title,
                    instructions: taskData.instructions,
                    app_link: taskData.appLink,
                    reward_amount: taskData.rewardAmount,
                    is_active: true,
                    created_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Create app task error:', error);
            return { success: false, error: error.message };
        }
    },

    // Task submissions operations
    async submitTaskProof(submissionData) {
        try {
            const { data, error } = await supabase
                .from('task_submissions')
                .insert([{
                    user_id: submissionData.userId,
                    task_id: submissionData.taskId,
                    screenshot_url: submissionData.screenshotUrl,
                    status: 'pending',
                    submitted_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Submit task proof error:', error);
            return { success: false, error: error.message };
        }
    },

    async getTaskSubmissions() {
        try {
            const { data, error } = await supabase
                .from('task_submissions')
                .select(`
                    *,
                    users (name, phone),
                    app_tasks (title, reward_amount)
                `)
                .order('submitted_at', { ascending: false });

            if (error && error.code !== 'PGRST116') throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Get task submissions error:', error);
            return { success: false, error: error.message };
        }
    },

    // Withdrawal operations
    async createWithdrawalRequest(requestData) {
        try {
            const { data, error } = await supabase
                .from('withdrawal_requests')
                .insert([{
                    user_id: requestData.userId,
                    amount: requestData.amount,
                    payment_method: requestData.paymentMethod,
                    payment_details: requestData.paymentDetails,
                    status: 'pending',
                    requested_at: new Date().toISOString()
                }])
                .select()
                .single();

            if (error) throw error;
            return { success: true, data };
        } catch (error) {
            console.error('Create withdrawal request error:', error);
            return { success: false, error: error.message };
        }
    },

    async getWithdrawalRequests() {
        try {
            const { data, error } = await supabase
                .from('withdrawal_requests')
                .select(`
                    *,
                    users (name, phone, wallet_balance)
                `)
                .order('requested_at', { ascending: false });

            if (error && error.code !== 'PGRST116') throw error;
            return { success: true, data: data || [] };
        } catch (error) {
            console.error('Get withdrawal requests error:', error);
            return { success: false, error: error.message };
        }
    },

    // Utility functions
    generateReferralCode() {
        return 'REF' + Math.random().toString(36).substr(2, 8).toUpperCase();
    },

    generateRandomReward(min, max) {
        return (Math.random() * (max - min) + min).toFixed(2);
    },

    formatCurrency(amount) {
        return `₹${parseFloat(amount).toFixed(2)}`;
    }
};

// Fallback localStorage service for development
export const LocalStorageService = {
    // Initialize with default data
    init() {
        if (!localStorage.getItem('earnpro_users')) {
            localStorage.setItem('earnpro_users', JSON.stringify([]));
        }
        if (!localStorage.getItem('earnpro_earning_options')) {
            localStorage.setItem('earnpro_earning_options', JSON.stringify(this.getDefaultEarningOptions()));
        }
        if (!localStorage.getItem('earnpro_app_tasks')) {
            localStorage.setItem('earnpro_app_tasks', JSON.stringify([]));
        }
        if (!localStorage.getItem('earnpro_task_submissions')) {
            localStorage.setItem('earnpro_task_submissions', JSON.stringify([]));
        }
        if (!localStorage.getItem('earnpro_withdrawal_requests')) {
            localStorage.setItem('earnpro_withdrawal_requests', JSON.stringify([]));
        }
        if (!localStorage.getItem('earnpro_user_cooldowns')) {
            localStorage.setItem('earnpro_user_cooldowns', JSON.stringify({}));
        }
    },

    getDefaultEarningOptions() {
        return [
            {
                id: 1,
                title: 'Spin & Earn',
                description: 'Spin the wheel and earn instant rewards',
                icon_class: 'fas fa-spinner',
                reward_min: 0.5,
                reward_max: 2,
                cooldown_hours: 1,
                action_type: 'spin',
                is_active: true,
                display_order: 1
            },
            {
                id: 2,
                title: 'Watch Ads & Earn',
                description: 'Watch short videos and earn money',
                icon_class: 'fas fa-play-circle',
                reward_min: 1,
                reward_max: 2,
                cooldown_hours: 0.5,
                action_type: 'watch_ad',
                is_active: true,
                display_order: 2
            },
            {
                id: 3,
                title: 'Download Apps',
                description: 'Download and install apps to earn rewards',
                icon_class: 'fas fa-download',
                reward_min: 10,
                reward_max: 50,
                cooldown_hours: 0,
                action_type: 'download_app',
                is_active: true,
                display_order: 3
            }
        ];
    },

    // User operations
    createUser(userData) {
        const users = JSON.parse(localStorage.getItem('earnpro_users') || '[]');
        const newUser = {
            id: Date.now(),
            name: userData.name,
            phone: userData.phone,
            password: userData.password,
            wallet_balance: userData.referredBy ? 5 : 0, // ₹5 bonus for referred users
            total_earned: userData.referredBy ? 5 : 0,
            referral_code: DatabaseService.generateReferralCode(),
            referred_by: userData.referredBy || null,
            referral_count: 0,
            referral_earnings: 0,
            created_at: new Date().toISOString()
        };

        // Add referral bonus to referrer
        if (userData.referredBy) {
            const referrer = users.find(u => u.referral_code === userData.referredBy);
            if (referrer) {
                referrer.wallet_balance += 8;
                referrer.total_earned += 8;
                referrer.referral_count += 1;
                referrer.referral_earnings += 8;
            }
        }

        users.push(newUser);
        localStorage.setItem('earnpro_users', JSON.stringify(users));
        return { success: true, data: newUser };
    },

    getUserByPhone(phone) {
        const users = JSON.parse(localStorage.getItem('earnpro_users') || '[]');
        const user = users.find(u => u.phone === phone);
        return { success: true, data: user };
    },

    updateUser(userId, updates) {
        const users = JSON.parse(localStorage.getItem('earnpro_users') || '[]');
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            users[userIndex] = { ...users[userIndex], ...updates };
            localStorage.setItem('earnpro_users', JSON.stringify(users));
            return { success: true, data: users[userIndex] };
        }
        return { success: false, error: 'User not found' };
    },

    updateUserWallet(userId, amount, type = 'add') {
        const users = JSON.parse(localStorage.getItem('earnpro_users') || '[]');
        const userIndex = users.findIndex(u => u.id === userId);
        if (userIndex !== -1) {
            const user = users[userIndex];
            if (type === 'add') {
                user.wallet_balance += amount;
                user.total_earned += amount;
            } else {
                user.wallet_balance = Math.max(0, user.wallet_balance - amount);
            }
            localStorage.setItem('earnpro_users', JSON.stringify(users));
            return { success: true, data: user };
        }
        return { success: false, error: 'User not found' };
    },

    getAllUsers() {
        const users = JSON.parse(localStorage.getItem('earnpro_users') || '[]');
        return { success: true, data: users };
    },

    // Earning options operations
    getEarningOptions() {
        const options = JSON.parse(localStorage.getItem('earnpro_earning_options') || '[]');
        return { success: true, data: options.filter(o => o.is_active) };
    },

    createEarningOption(optionData) {
        const options = JSON.parse(localStorage.getItem('earnpro_earning_options') || '[]');
        const newOption = {
            id: Date.now(),
            ...optionData,
            is_active: true,
            created_at: new Date().toISOString()
        };
        options.push(newOption);
        localStorage.setItem('earnpro_earning_options', JSON.stringify(options));
        return { success: true, data: newOption };
    },

    updateEarningOption(id, updates) {
        const options = JSON.parse(localStorage.getItem('earnpro_earning_options') || '[]');
        const optionIndex = options.findIndex(o => o.id === id);
        if (optionIndex !== -1) {
            options[optionIndex] = { ...options[optionIndex], ...updates };
            localStorage.setItem('earnpro_earning_options', JSON.stringify(options));
            return { success: true, data: options[optionIndex] };
        }
        return { success: false, error: 'Option not found' };
    },

    getAllEarningOptions() {
        const options = JSON.parse(localStorage.getItem('earnpro_earning_options') || '[]');
        return { success: true, data: options };
    },

    // Check and update cooldowns
    canUserPerformAction(userId, actionType) {
        const cooldowns = JSON.parse(localStorage.getItem('earnpro_user_cooldowns') || '{}');
        const userCooldowns = cooldowns[userId] || {};
        const lastAction = userCooldowns[actionType];
        
        if (!lastAction) return true;
        
        const options = JSON.parse(localStorage.getItem('earnpro_earning_options') || '[]');
        const option = options.find(o => o.action_type === actionType);
        if (!option) return true;
        
        const cooldownMs = option.cooldown_hours * 60 * 60 * 1000;
        const timePassed = Date.now() - new Date(lastAction).getTime();
        
        return timePassed >= cooldownMs;
    },

    updateUserCooldown(userId, actionType) {
        const cooldowns = JSON.parse(localStorage.getItem('earnpro_user_cooldowns') || '{}');
        if (!cooldowns[userId]) cooldowns[userId] = {};
        cooldowns[userId][actionType] = new Date().toISOString();
        localStorage.setItem('earnpro_user_cooldowns', JSON.stringify(cooldowns));
    },

    getCooldownTimeLeft(userId, actionType) {
        const cooldowns = JSON.parse(localStorage.getItem('earnpro_user_cooldowns') || '{}');
        const userCooldowns = cooldowns[userId] || {};
        const lastAction = userCooldowns[actionType];
        
        if (!lastAction) return 0;
        
        const options = JSON.parse(localStorage.getItem('earnpro_earning_options') || '[]');
        const option = options.find(o => o.action_type === actionType);
        if (!option) return 0;
        
        const cooldownMs = option.cooldown_hours * 60 * 60 * 1000;
        const timePassed = Date.now() - new Date(lastAction).getTime();
        
        return Math.max(0, cooldownMs - timePassed);
    }
};

// Initialize localStorage on module load
LocalStorageService.init();