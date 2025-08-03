# EarnPro - Professional Earning Website

A fully responsive and professional earning website that looks and feels exactly like a modern earning mobile app. Built with vanilla JavaScript, modern CSS, and Supabase integration.

## 🚀 Features

### User Features
- **User Registration & Login** - Phone number and password-based authentication
- **Responsive Dashboard** - Mobile-first design with modern UI
- **Multiple Earning Methods**:
  - 🎰 **Spin & Earn** - Spin wheel for ₹0.5-₹2 rewards (hourly cooldown)
  - 📺 **Watch Ads & Earn** - Watch short videos for ₹1-₹2 (30-minute cooldown)
  - 📱 **Download Apps & Earn** - Download apps and submit proof for ₹10-₹50
  - 👥 **Refer & Earn** - Get ₹8 for each successful referral, referred user gets ₹5
- **Wallet System** - Real-time balance updates with withdrawal functionality
- **Withdrawal System** - Support for UPI and Bank transfer
- **Referral System** - Unique referral links with tracking

### Admin Features
- **Protected Admin Panel** - Password: `ankit07`
- **Dynamic Earning Options Management** - Add, edit, disable earning methods in real-time
- **App Task Management** - Create and manage app download tasks
- **Proof Verification** - Review and approve/reject user submissions
- **User Management** - View all users, their earnings, and referral stats
- **Withdrawal Management** - Process withdrawal requests
- **Real-time Updates** - All changes reflect immediately for users

### Technical Features
- **Modern UI/UX** - Glowing buttons, rounded cards, smooth animations
- **Fully Responsive** - Optimized for mobile, tablet, and desktop
- **Dark Theme** - Professional dark theme with gradients
- **Toast Notifications** - Real-time feedback for all actions
- **Modal System** - Clean modal dialogs for forms and confirmations
- **Cooldown System** - Prevents spam with configurable cooldowns
- **Data Persistence** - localStorage for demo, Supabase-ready architecture
- **Error Handling** - Comprehensive error handling and validation

## 🛠️ Setup Instructions

### Prerequisites
- Node.js (v14 or higher)
- npm or yarn
- Modern web browser

### Installation

1. **Clone/Download the project**
   ```bash
   # If you have the files, navigate to the project directory
   cd earning-website
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Start development server**
   ```bash
   npm run dev
   ```

4. **Open in browser**
   - The app will automatically open at `http://localhost:3000`
   - For admin panel: `http://localhost:3000/#admin`

### Production Build
```bash
npm run build
npm run preview
```

## 📱 Usage Guide

### For Users

1. **Registration**
   - Enter your name, phone number, and password
   - If you have a referral link, you'll automatically get ₹5 bonus

2. **Earning Money**
   - **Spin & Earn**: Click the spin button (available once per hour)
   - **Watch Ads**: Click to watch a 10-second ad (available every 30 minutes)
   - **Download Apps**: Browse tasks, download apps, and upload proof screenshots
   - **Refer Friends**: Share your unique referral link

3. **Withdrawing Money**
   - Minimum withdrawal: ₹10
   - Enter UPI ID or bank details
   - Admin will process requests manually

### For Admins

1. **Access Admin Panel**
   - Visit `yourdomain.com/#admin`
   - Enter password: `ankit07`

2. **Managing Earning Options**
   - Add new earning methods (Quiz, Survey, etc.)
   - Toggle options on/off in real-time
   - Set rewards and cooldown periods

3. **Managing App Tasks**
   - Create new app download tasks
   - Set custom rewards and instructions

4. **Processing Submissions**
   - Review user-submitted proofs
   - Approve to credit user wallets
   - Reject invalid submissions

5. **User Management**
   - View all registered users
   - Check wallet balances and referral stats
   - Delete users if needed

6. **Withdrawal Processing**
   - Review withdrawal requests
   - Approve after manual payment
   - Reject invalid requests

## 🔧 Configuration

### Supabase Setup (Optional)

To use Supabase instead of localStorage:

1. Create tables in your Supabase dashboard:
   ```sql
   -- Users table
   CREATE TABLE users (
     id BIGSERIAL PRIMARY KEY,
     name TEXT NOT NULL,
     phone TEXT UNIQUE NOT NULL,
     password_hash TEXT NOT NULL,
     wallet_balance DECIMAL(10,2) DEFAULT 0,
     total_earned DECIMAL(10,2) DEFAULT 0,
     referral_code TEXT UNIQUE,
     referred_by TEXT,
     referral_count INTEGER DEFAULT 0,
     referral_earnings DECIMAL(10,2) DEFAULT 0,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Earning options table
   CREATE TABLE earning_options (
     id BIGSERIAL PRIMARY KEY,
     title TEXT NOT NULL,
     description TEXT,
     icon_class TEXT,
     reward_min DECIMAL(10,2),
     reward_max DECIMAL(10,2),
     cooldown_hours DECIMAL(4,2),
     action_type TEXT,
     action_url TEXT,
     is_active BOOLEAN DEFAULT true,
     display_order INTEGER DEFAULT 0,
     created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
   );

   -- Additional tables for app_tasks, task_submissions, withdrawal_requests...
   ```

2. Update `js/supabase.js` to enable Supabase:
   ```javascript
   // Change this line
   this.useSupabase = true; // Set to true when Supabase tables are ready
   ```

### Customization

- **Colors**: Edit CSS variables in `styles/main.css`
- **Admin Password**: Change in `js/admin.js`
- **Rewards**: Modify default earning options in `js/supabase.js`
- **Cooldowns**: Adjust in earning options management

## 🎨 Design Features

- **Modern Gradient UI** - Purple to blue gradients
- **Glowing Effects** - Buttons and cards with glow animations
- **Responsive Grid** - Auto-adjusting layouts
- **Smooth Animations** - Hover effects and transitions
- **Mobile-First** - Optimized for mobile devices
- **Dark Theme** - Professional dark color scheme
- **Font Awesome Icons** - Modern iconography
- **Google Fonts** - Poppins font family

## 🔍 Development Features

### Debug Tools (Development Only)
When running on localhost, access debug tools via browser console:
```javascript
// Available debug methods
debugEarnPro.clearData()      // Clear all data
debugEarnPro.exportData()     // Export data as JSON
debugEarnPro.addSampleUser()  // Add test user
debugEarnPro.loginAsAdmin()   // Quick admin login
```

### Sample Data
The app automatically creates sample app tasks on first load:
- WhatsApp Messenger (₹25)
- Instagram (₹30)
- Telegram (₹20)

## 📊 Data Structure

### User Data
```javascript
{
  id: number,
  name: string,
  phone: string,
  password: string,
  wallet_balance: number,
  total_earned: number,
  referral_code: string,
  referred_by: string,
  referral_count: number,
  referral_earnings: number,
  created_at: string
}
```

### Earning Options
```javascript
{
  id: number,
  title: string,
  description: string,
  icon_class: string,
  reward_min: number,
  reward_max: number,
  cooldown_hours: number,
  action_type: string,
  is_active: boolean
}
```

## 🚦 API Structure

The app is designed to work with both localStorage (for demo) and Supabase (for production). All database operations are abstracted through service classes.

## 📱 Mobile App Features

The website is designed to feel like a native mobile app:
- Touch-friendly interface
- App-like navigation
- Smooth animations
- Responsive design
- Toast notifications
- Modal dialogs

## 🔒 Security Features

- Phone number validation
- Password requirements
- Admin password protection
- Input sanitization
- Error handling
- Secure data storage patterns

## 🎯 Future Enhancements

- Push notifications
- Progressive Web App (PWA)
- Payment gateway integration
- Social media integration
- Advanced analytics
- Multi-language support

## 📞 Support

For setup assistance or customization requests, contact the development team.

## 📄 License

This project is for educational and demonstration purposes.

---

**EarnPro** - The complete earning website solution with professional admin panel and modern user experience.
