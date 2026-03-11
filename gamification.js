// gamification.js
// Handles Offline Streaks, Badges, and Simulated Leagues

const Gamification = {
    state: {
        coins: 0,
        xp: 0,
        currentStreak: 0,
        highestStreak: 0,
        lastLoginDate: null,
        badges: [],
        league: 'Bronze',
        quizzesCompleted: 0,
        consecutiveSundays: 0,
        lastSundayPlayed: null
    },

    init: function () {
        const saved = localStorage.getItem('linguabible_gamification');
        if (saved) {
            this.state = { ...this.state, ...JSON.parse(saved) };
        }
        this.checkStreak();
    },

    save: function () {
        localStorage.setItem('linguabible_gamification', JSON.stringify(this.state));
    },

    checkStreak: function () {
        const today = new Date().toDateString();
        if (this.state.lastLoginDate === today) return; // Already logged in today

        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);

        if (this.state.lastLoginDate === yesterday.toDateString()) {
            // Streak continues
            this.state.currentStreak++;
            this.state.coins += 5; // Daily bonus
        } else {
            // Streak broken or first time
            this.state.currentStreak = 1;
        }

        if (this.state.currentStreak > this.state.highestStreak) {
            this.state.highestStreak = this.state.currentStreak;
        }

        this.state.lastLoginDate = today;
        this.save();
    },

    awardQuizCompletion: function (score, total, bookName) {
        this.state.quizzesCompleted++;
        this.state.coins += score * 10;
        this.state.xp += score * 20;

        // Check Badges
        this.checkBadges(score, total, bookName);

        // Update Leagues
        this.updateLeague();

        this.save();
    },

    checkBadges: function (score, total, bookName) {
        // 1. Prophet Prodigy: Get 10/10 or perfect score on >=10 questions
        if (total >= 10 && score === total && !this.state.badges.includes('Prophet Prodigy')) {
            this.state.badges.push('Prophet Prodigy');
            this.showBadgeNotification('Prophet Prodigy 🏆', 'Perfect score on 10+ questions!');
        }

        // 2. Pentateuch Power: Mastered a Genesis Quiz
        if (bookName && bookName.toLowerCase().includes('genesis') && score === total && !this.state.badges.includes('Pentateuch Power')) {
            this.state.badges.push('Pentateuch Power');
            this.showBadgeNotification('Pentateuch Power 📜', 'Mastered a Genesis Quiz!');
        }

        // 3. Sunday Scholar
        const today = new Date();
        if (today.getDay() === 0) { // Sunday
            const todayStr = today.toDateString();
            if (this.state.lastSundayPlayed !== todayStr) {
                // If it's exactly 1 week since last Sunday play
                const lastWeek = new Date();
                lastWeek.setDate(lastWeek.getDate() - 7);
                if (this.state.lastSundayPlayed === lastWeek.toDateString()) {
                    this.state.consecutiveSundays++;
                } else {
                    this.state.consecutiveSundays = 1;
                }
                this.state.lastSundayPlayed = todayStr;

                if (this.state.consecutiveSundays >= 5 && !this.state.badges.includes('Sunday Scholar')) {
                    this.state.badges.push('Sunday Scholar');
                    this.showBadgeNotification('Sunday Scholar ⛪', 'Played consistently on 5 Sundays!');
                }
            }
        }
    },

    updateLeague: function () {
        // Simulated thresholds: Bronze -> Silver (600 XP), Silver -> Gold (1500 XP)
        if (this.state.league === 'Bronze' && this.state.xp >= 600) {
            this.state.league = 'Silver';
            this.showBadgeNotification('League Promotion! 🥈', 'Welcome to the Silver League!');
        } else if (this.state.league === 'Silver' && this.state.xp >= 1500) {
            this.state.league = 'Gold';
            this.showBadgeNotification('League Promotion! 🥇', 'Welcome to the Gold League!');
        }
    },

    showBadgeNotification: function (title, desc) {
        console.log(`[Gamification] Badge Unlocked: ${title}`);
        const toast = document.createElement('div');
        toast.className = 'badge-toast';
        toast.innerHTML = `
            <div class="toast-icon">⭐</div>
            <div class="toast-content">
                <strong>${title}</strong>
                <span>${desc}</span>
            </div>
        `;
        document.body.appendChild(toast);

        setTimeout(() => {
            toast.classList.add('show');
            setTimeout(() => {
                toast.classList.remove('show');
                setTimeout(() => toast.remove(), 500);
            }, 5000);
        }, 100);
    },

    renderProfile: function () {
        document.getElementById('profileStreak').textContent = this.state.currentStreak;
        document.getElementById('profileCoins').textContent = this.state.coins;
        document.getElementById('profileXP').textContent = this.state.xp;

        const leagueIcons = { 'Bronze': '🥉', 'Silver': '🥈', 'Gold': '🥇' };
        const leagueMax = { 'Bronze': 600, 'Silver': 1500, 'Gold': 3000 };
        document.getElementById('profileLeagueName').textContent = this.state.league;
        document.getElementById('profileLeagueIcon').textContent = leagueIcons[this.state.league];

        const nextXp = leagueMax[this.state.league] || 3000;
        const fillPct = Math.min(100, Math.round((this.state.xp / nextXp) * 100));
        document.getElementById('profileLeagueFill').style.width = '0%';
        setTimeout(() => {
            document.getElementById('profileLeagueFill').style.width = fillPct + '%';
        }, 100);

        if (this.state.league === 'Gold') {
            document.getElementById('profileLeagueHint').textContent = "You're in the Top League!";
            document.getElementById('profileLeagueFill').style.width = '100%';
        } else {
            const needed = Math.max(0, nextXp - this.state.xp);
            document.getElementById('profileLeagueHint').textContent = `Earn ${needed} more XP to promote!`;
        }

        const badgesGrid = document.getElementById('profileBadgesGrid');
        const allBadges = [
            { id: 'Prophet Prodigy', icon: '🏆', desc: 'Perfect on 10+ questions' },
            { id: 'Pentateuch Power', icon: '📜', desc: 'Mastered a Genesis Quiz' },
            { id: 'Sunday Scholar', icon: '⛪', desc: 'Played 5 Sundays in a row' }
        ];

        badgesGrid.innerHTML = '';
        allBadges.forEach(b => {
            const unlocked = this.state.badges.includes(b.id);
            badgesGrid.innerHTML += `
                <div class="badge-item ${unlocked ? 'unlocked' : ''}">
                    <div class="badge-icon">${b.icon}</div>
                    <span>${b.id}</span>
                </div>
            `;
        });
    }
};

window.addEventListener('DOMContentLoaded', () => {
    Gamification.init();

    // Wiring Profile Buttons
    const profileBtn = document.getElementById('quizProfileBtn');
    const closeProfileBtn = document.getElementById('closeProfileBtn');
    const setupScreen = document.getElementById('quizSetupScreen');
    const profileScreen = document.getElementById('quizProfileScreen');

    if (profileBtn && closeProfileBtn) {
        profileBtn.addEventListener('click', () => {
            Gamification.renderProfile();
            setupScreen.style.display = 'none';
            profileScreen.style.display = 'flex';
        });

        closeProfileBtn.addEventListener('click', () => {
            profileScreen.style.display = 'none';
            setupScreen.style.display = 'flex';
        });
    }
});
