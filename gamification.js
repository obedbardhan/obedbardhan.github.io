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

    icons: {
        trophy: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6"/><path d="M18 9h1.5a2.5 2.5 0 0 0 0-5H18"/><path d="M4 22h16"/><path d="M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22"/><path d="M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2Z"/></svg>`,
        scroll: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 17V5a2 2 0 0 0-2-2H4"/><path d="M8 21h12a2 2 0 0 0 2-2v-1a1 1 0 0 0-1-1H11a1 1 0 0 0-1 1v1a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v2a1 1 0 0 0 1 1h3"/></svg>`,
        church: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m12 2 3 5h6v15h-18v-15h6z"/><path d="M12 2v20"/><path x1="9" y1="12" x2="15" y2="12"/></svg>`,
        star: `<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
        flame: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
        coin: `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="8"/><line x1="12" y1="8" x2="12" y2="16"/><line x1="8" y1="12" x2="16" y2="12"/></svg>`,
        medal1: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#FFD700" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>`,
        medal2: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#C0C0C0" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>`,
        medal3: `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#CD7F32" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="8" r="7"/><polyline points="8.21 13.89 7 23 12 20 17 23 15.79 13.88"/></svg>`
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
            this.showBadgeNotification('Prophet Prodigy', 'Perfect score on 10+ questions!', this.icons.trophy);
        }

        // 2. Pentateuch Power: Mastered a Genesis Quiz
        if (bookName && bookName.toLowerCase().includes('genesis') && score === total && !this.state.badges.includes('Pentateuch Power')) {
            this.state.badges.push('Pentateuch Power');
            this.showBadgeNotification('Pentateuch Power', 'Mastered a Genesis Quiz!', this.icons.scroll);
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
                    this.showBadgeNotification('Sunday Scholar', 'Played consistently on 5 Sundays!', this.icons.church);
                }
            }
        }
    },

    updateLeague: function () {
        // Simulated thresholds: Bronze -> Silver (600 XP), Silver -> Gold (1500 XP)
        if (this.state.league === 'Bronze' && this.state.xp >= 600) {
            this.state.league = 'Silver';
            this.showBadgeNotification('League Promotion!', 'Welcome to the Silver League!', this.icons.medal2);
        } else if (this.state.league === 'Silver' && this.state.xp >= 1500) {
            this.state.league = 'Gold';
            this.showBadgeNotification('League Promotion!', 'Welcome to the Gold League!', this.icons.medal1);
        }
    },

    showBadgeNotification: function (title, desc, iconSvg = null) {
        console.log(`[Gamification] Badge Unlocked: ${title}`);
        const toast = document.createElement('div');
        toast.className = 'badge-toast';
        toast.innerHTML = `
            <div class="toast-icon">${iconSvg || this.icons.star}</div>
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
        const streakContainer = document.getElementById('profileStreak').parentElement;
        const coinContainer = document.getElementById('profileCoins').parentElement;
        const xpContainer = document.getElementById('profileXP').parentElement;

        if (streakContainer) streakContainer.querySelector('.stat-icon').innerHTML = this.icons.flame;
        if (coinContainer) coinContainer.querySelector('.stat-icon').innerHTML = this.icons.coin;
        if (xpContainer) xpContainer.querySelector('.stat-icon').innerHTML = this.icons.star;

        document.getElementById('profileStreak').textContent = this.state.currentStreak;
        document.getElementById('profileCoins').textContent = this.state.coins;
        document.getElementById('profileXP').textContent = this.state.xp;

        const leagueIcons = { 'Bronze': this.icons.medal3, 'Silver': this.icons.medal2, 'Gold': this.icons.medal1 };
        const leagueMax = { 'Bronze': 600, 'Silver': 1500, 'Gold': 3000 };
        document.getElementById('profileLeagueName').textContent = this.state.league;
        document.getElementById('profileLeagueIcon').innerHTML = leagueIcons[this.state.league];

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
            { id: 'Prophet Prodigy', icon: this.icons.trophy, desc: 'Perfect on 10+ questions' },
            { id: 'Pentateuch Power', icon: this.icons.scroll, desc: 'Mastered a Genesis Quiz' },
            { id: 'Sunday Scholar', icon: this.icons.church, desc: 'Played 5 Sundays in a row' }
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
