// ============================================
// DATA MANAGEMENT
// ============================================

class DataManager {
    constructor() {
        this.data = this.loadData();
    }

    loadData() {
        const saved = localStorage.getItem('shenshaAxiom');
        if (saved) {
            return JSON.parse(saved);
        }
        return this.getDefaultData();
    }

    getDefaultData() {
        return {
            settings: {
                startDate: new Date().toISOString().split('T')[0],
                startBalance: 10000,
                dailyTarget: 2,
                finalTarget: 0,
                dailyStopLoss: 3,
                maxTrades: 10
            },
            accounts: [
                {
                    id: 'master',
                    name: 'Master Account',
                    balance: 10000,
                    isMaster: true,
                    totalPL: 0
                }
            ],
            tracker: this.generateTrackerDays()
        };
    }

    generateTrackerDays(startDate = null) {
        const days = [];
        let currentDate = new Date(startDate || new Date().toISOString().split('T')[0]);
        let dayCount = 0;

        while (dayCount < 60) {
            const dayOfWeek = currentDate.getDay();
            if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Skip Sunday and Saturday
                days.push({
                    day: dayCount + 1,
                    date: currentDate.toISOString().split('T')[0],
                    dayName: currentDate.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' }),
                    pl: 0,
                    isPaused: false,
                    accountsData: {}
                });
                dayCount++;
            }
            currentDate.setDate(currentDate.getDate() + 1);
        }
        return days;
    }

    saveData() {
        localStorage.setItem('shenshaAxiom', JSON.stringify(this.data));
    }

    getTrackerDay(dayIndex) {
        return this.data.tracker[dayIndex];
    }

    setTrackerPL(dayIndex, pl) {
        this.data.tracker[dayIndex].pl = parseFloat(pl) || 0;
        this.updateBalances();
        this.saveData();
    }

    setTrackerPause(dayIndex, isPaused) {
        this.data.tracker[dayIndex].isPaused = isPaused;
        this.updateBalances();
        this.saveData();
    }

    updateBalances() {
        this.data.accounts.forEach(account => {
            let balance = account === this.data.accounts[0] ? this.data.settings.startBalance : this.getInitialBalance(account);
            account.totalPL = 0;

            this.data.tracker.forEach((day, index) => {
                if (!day.isPaused) {
                    const pl = day.pl || 0;
                    balance = balance + pl;
                    account.totalPL += pl;
                }
            });
            account.balance = balance;
        });
    }

    getInitialBalance(account) {
        if (account.isMaster) return this.data.settings.startBalance;
        return account.initialBalance || this.data.settings.startBalance;
    }

    addAccount() {
        const newAccount = {
            id: 'copy_' + Date.now(),
            name: `Copy Account ${this.data.accounts.length}`,
            balance: this.data.settings.startBalance,
            initialBalance: this.data.settings.startBalance,
            isMaster: false,
            totalPL: 0
        };
        this.data.accounts.push(newAccount);
        this.saveData();
        return newAccount;
    }

    removeAccount(accountId) {
        this.data.accounts = this.data.accounts.filter(a => a.id !== accountId);
        this.saveData();
    }

    updateSettings(settings) {
        this.data.settings = { ...this.data.settings, ...settings };
        
        // Se la data di inizio cambia, rigenera il tracker
        if (settings.startDate) {
            this.data.tracker = this.generateTrackerDays(settings.startDate);
        }
        
        this.updateBalances();
        this.saveData();
    }

    resetPL() {
        this.data.tracker.forEach(day => {
            day.pl = 0;
            day.isPaused = false;
        });
        this.updateBalances();
        this.saveData();
    }

    resetAll() {
        this.data = this.getDefaultData();
        this.saveData();
    }

    calculateStreaks() {
        let currentStreak = 0;
        let bestStreak = 0;

        this.data.tracker.forEach((day, index) => {
            if (day.isPaused) return;
            const balanceAtDay = this.getBalanceAtDay(index);
            if (balanceAtDay === 0) return;
            const plPercent = day.pl / balanceAtDay;
            if (plPercent > this.data.settings.dailyTarget / 100) {
                currentStreak++;
                bestStreak = Math.max(bestStreak, currentStreak);
            } else if (day.pl < 0 || plPercent <= 0) {
                currentStreak = 0;
            }
        });

        return { currentStreak, bestStreak };
    }

    getBalanceAtDay(dayIndex) {
        let balance = this.data.settings.startBalance;
        for (let i = 0; i < dayIndex; i++) {
            if (!this.data.tracker[i].isPaused) {
                balance += this.data.tracker[i].pl;
            }
        }
        return balance;
    }
}

// ============================================
// APP MANAGER
// ============================================

class AppManager {
    constructor() {
        this.dm = new DataManager();
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.render();
    }

    setupEventListeners() {
        // Tab switching
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', (e) => this.switchTab(e.target.dataset.tab));
        });

        // Settings
        document.getElementById('saveSettingsBtn')?.addEventListener('click', () => this.saveSettings());
        document.getElementById('resetAllBtn')?.addEventListener('click', () => this.resetAll());

        // Tracker
        document.getElementById('exportCsvBtn')?.addEventListener('click', () => this.exportCSV());
        document.getElementById('resetPLBtn')?.addEventListener('click', () => this.resetPL());

        // Accounts
        document.getElementById('addAccountBtn')?.addEventListener('click', () => this.addAccount());

        // Tools
        document.getElementById('runSimulatorBtn')?.addEventListener('click', () => this.runSimulator());
        document.getElementById('runWithdrawalBtn')?.addEventListener('click', () => this.runWithdrawal());
        document.getElementById('runGoalBtn')?.addEventListener('click', () => this.runGoalCalculator());
    }

    switchTab(tabName) {
        document.querySelectorAll('.tab-content').forEach(tab => tab.classList.remove('active'));
        document.querySelectorAll('.tab-btn').forEach(btn => btn.classList.remove('active'));
        
        document.getElementById(tabName).classList.add('active');
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');
    }

    render() {
        this.renderDashboard();
        this.renderTracker();
        this.renderCharts();
        this.renderSettings();
    }

    renderDashboard() {
        this.renderStats();
        this.renderAccounts();
        this.renderProgress();
        this.renderStreak();
        this.renderWeeklySummary();
    }

    renderStats() {
        const tradingDays = this.dm.data.tracker.filter(d => !d.isPaused).length;
        const startDate = this.dm.data.settings.startDate;
        const dailyTarget = this.dm.data.settings.dailyTarget;
        
        let estimatedTotal = this.dm.data.settings.startBalance;
        for (let i = 0; i < tradingDays; i++) {
            estimatedTotal *= (1 + dailyTarget / 100);
        }

        const el1 = document.getElementById('tradingDays');
        const el2 = document.getElementById('startDateDisplay');
        const el3 = document.getElementById('dailyTargetDisplay');
        const el4 = document.getElementById('estimatedTotal');
        
        if (el1) el1.textContent = tradingDays;
        if (el2) el2.textContent = new Date(startDate).toLocaleDateString();
        if (el3) el3.textContent = dailyTarget.toFixed(1) + '%';
        if (el4) el4.textContent = '$' + estimatedTotal.toFixed(2);
    }

    renderAccounts() {
        const container = document.getElementById('accountsList');
        if (!container) return;
        container.innerHTML = '';

        this.dm.data.accounts.forEach(account => {
            const card = document.createElement('div');
            card.className = 'account-card' + (account.isMaster ? ' master' : '');
            
            const removeBtn = account.isMaster ? '' : `<button class="account-remove" onclick="app.removeAccount('${account.id}')">×</button>`;
            
            const initialBalance = account.initialBalance || this.dm.data.settings.startBalance;
            const gainPercent = initialBalance > 0 ? ((account.balance - initialBalance) / initialBalance) * 100 : 0;

            card.innerHTML = `
                <div class="account-card-header">
                    <div class="account-name">${account.name}</div>
                    ${removeBtn}
                </div>
                <div class="account-balance">$${account.balance.toFixed(2)}</div>
                <div class="account-label">Balance</div>
                <div class="account-pl">
                    <span>P/L: $${account.totalPL.toFixed(2)}</span>
                    <span>${gainPercent.toFixed(2)}%</span>
                </div>
            `;
            container.appendChild(card);
        });
    }

    renderProgress() {
        const finalTarget = this.dm.data.settings.finalTarget;
        const progressSection = document.getElementById('progressSection');
        if (!progressSection || finalTarget === 0) {
            if (progressSection) progressSection.classList.add('hidden');
            return;
        }

        progressSection.classList.remove('hidden');

        const masterAccount = this.dm.data.accounts[0];
        const balance = masterAccount.balance;
        const remaining = Math.max(0, finalTarget - balance);
        const totalDays = 60;
        const tradedDays = this.dm.data.tracker.filter(d => !d.isPaused && d.pl !== 0).length;

        const balancePercent = finalTarget > 0 ? (balance / finalTarget) * 100 : 0;
        const timePercent = (tradedDays / totalDays) * 100;

        const onTrack = balance >= (finalTarget * (tradedDays / totalDays));
        const estDaysLeft = this.estimateDaysToTarget(finalTarget);

        const el1 = document.getElementById('progressDays');
        const el2 = document.getElementById('progressRemaining');
        const el3 = document.getElementById('progressStatus');
        const el4 = document.getElementById('progressEstDays');
        
        if (el1) el1.textContent = `${tradedDays}/${totalDays}`;
        if (el2) el2.textContent = '$' + remaining.toFixed(2);
        if (el3) el3.textContent = onTrack ? '✓ On Track' : '⚠ Behind';
        if (el4) el4.textContent = estDaysLeft;

        const balProg = document.getElementById('balanceProgress');
        const timeProg = document.getElementById('timeProgress');
        if (balProg) balProg.style.width = Math.min(100, balancePercent) + '%';
        if (timeProg) timeProg.style.width = timePercent + '%';
    }

    estimateDaysToTarget(target) {
        const masterAccount = this.dm.data.accounts[0];
        if (masterAccount.balance >= target) return 0;

        const avgDailyReturn = this.getAverageDailyReturn();
        if (avgDailyReturn <= 0) return 999;

        let balance = masterAccount.balance;
        let days = 0;
        while (balance < target && days < 100) {
            balance *= (1 + avgDailyReturn);
            days++;
        }
        return days;
    }

    getAverageDailyReturn() {
        const tradedDays = this.dm.data.tracker.filter(d => !d.isPaused && d.pl !== 0);
        if (tradedDays.length === 0) return 0;

        let totalReturn = 1;
        let balance = this.dm.data.settings.startBalance;

        tradedDays.forEach(day => {
            const newBalance = balance + day.pl;
            if (balance > 0) {
                totalReturn *= (newBalance / balance);
            }
            balance = newBalance;
        });

        return Math.pow(totalReturn, 1 / tradedDays.length) - 1;
    }

    renderStreak() {
        const { currentStreak, bestStreak } = this.dm.calculateStreaks();
        const el1 = document.getElementById('currentStreak');
        const el2 = document.getElementById('bestStreak');
        if (el1) el1.textContent = currentStreak;
        if (el2) el2.textContent = bestStreak;

        const totalPL = this.dm.data.accounts[0].totalPL;
        const targetPL = this.dm.data.tracker.filter(d => !d.isPaused).length * (this.dm.data.settings.startBalance * this.dm.data.settings.dailyTarget / 100);
        const performance = targetPL > 0 ? (totalPL / targetPL * 100) : 0;
        const el3 = document.getElementById('performanceVsTarget');
        if (el3) el3.textContent = performance.toFixed(1) + '%';

        this.renderHeatmap();
    }

    renderHeatmap() {
        const heatmap = document.getElementById('heatmap');
        if (!heatmap) return;
        heatmap.innerHTML = '';

        this.dm.data.tracker.forEach((day, index) => {
            const div = document.createElement('div');
            div.className = 'heatmap-day';
            
            if (day.isPaused) {
                div.classList.add('gray');
                div.textContent = '☕';
            } else {
                const balance = this.dm.getBalanceAtDay(index);
                const target = this.dm.data.settings.startBalance * (this.dm.data.settings.dailyTarget / 100);
                if (day.pl > target) {
                    div.classList.add('green');
                    div.textContent = '🟢';
                } else if (day.pl < 0) {
                    div.classList.add('red');
                    div.textContent = '🔴';
                } else {
                    div.classList.add('gray');
                    div.textContent = '⚪';
                }
            }
            heatmap.appendChild(div);
        });
    }

    renderWeeklySummary() {
        const container = document.getElementById('weeklySummary');
        if (!container) return;
        container.innerHTML = '';

        let weekCount = 0;
        let weekBalance = this.dm.data.settings.startBalance;
        let weekPL = 0;
        let weekDays = 0;

        this.dm.data.tracker.forEach((day, index) => {
            if (!day.isPaused) {
                weekBalance += day.pl;
                weekPL += day.pl;
                weekDays++;

                if (weekDays === 5 || index === this.dm.data.tracker.length - 1) {
                    const weekCard = document.createElement('div');
                    const isPositive = weekPL >= 0;
                    weekCard.className = 'weekly-card ' + (isPositive ? 'positive' : 'negative');

                    const startBalance = weekBalance - weekPL;
                    const avgPercent = startBalance > 0 && weekDays > 0 ? (weekPL / startBalance * 100) : 0;

                    weekCard.innerHTML = `
                        <div class="weekly-card-title">Week ${weekCount + 1}</div>
                        <div class="weekly-card-row">
                            <span class="weekly-card-label">Start Balance:</span>
                            <span class="weekly-card-value">$${startBalance.toFixed(2)}</span>
                        </div>
                        <div class="weekly-card-row">
                            <span class="weekly-card-label">End Balance:</span>
                            <span class="weekly-card-value">$${weekBalance.toFixed(2)}</span>
                        </div>
                        <div class="weekly-card-row">
                            <span class="weekly-card-label">P/L:</span>
                            <span class="weekly-card-value">$${weekPL.toFixed(2)}</span>
                        </div>
                        <div class="weekly-card-row">
                            <span class="weekly-card-label">Avg %:</span>
                            <span class="weekly-card-value">${avgPercent.toFixed(2)}%</span>
                        </div>
                    `;
                    container.appendChild(weekCard);

                    weekCount++;
                    weekPL = 0;
                    weekDays = 0;
                }
            }
        });
    }

    renderTracker() {
        const tbody = document.getElementById('trackerBody');
        if (!tbody) return;
        tbody.innerHTML = '';

        this.dm.data.tracker.forEach((day, index) => {
            const row = document.createElement('tr');
            const balanceStart = this.dm.getBalanceAtDay(index);
            const target = balanceStart > 0 ? balanceStart * (this.dm.data.settings.dailyTarget / 100) : 0;
            const balanceEnd = balanceStart + day.pl;
            const plPercent = balanceStart > 0 ? (day.pl / balanceStart * 100) : 0;
            const variation = day.isPaused ? 'Paused' : (day.pl > target ? '↑ Above' : day.pl < 0 ? '↓ Below' : '→ At');

            const plClass = day.pl > 0 ? 'positive' : day.pl < 0 ? 'negative' : '';
            const targetClass = day.pl > target ? 'positive' : day.pl < 0 ? 'negative' : '';

            row.innerHTML = `
                <td>${day.day}</td>
                <td>${day.dayName}</td>
                <td>$${balanceStart.toFixed(2)}</td>
                <td>${this.dm.data.settings.dailyTarget.toFixed(1)}%</td>
                <td>$${target.toFixed(2)}</td>
                <td>
                    <input type="number" step="0.01" value="${day.pl}" 
                        onchange="app.updateTrackerDay(${index}, this.value)"
                        ${day.isPaused ? 'disabled' : ''}>
                </td>
                <td class="${plClass}">${plPercent.toFixed(2)}%</td>
                <td>$${balanceEnd.toFixed(2)}</td>
                <td class="${targetClass}">${variation}</td>
                <td>
                    <button class="pause-btn ${day.isPaused ? 'paused' : ''}" 
                        onclick="app.togglePause(${index})">
                        ${day.isPaused ? '☕' : 'Rest'}
                    </button>
                </td>
            `;
            tbody.appendChild(row);
        });
    }

    renderCharts() {
        this.renderGrowthChart();
        this.renderPLChart();
    }

    renderGrowthChart() {
        const ctx = document.getElementById('growthChart');
        if (!ctx) return;

        const labels = this.dm.data.tracker.map(d => d.day);
        const actualData = [];
        const theoreticalData = [];

        let balance = this.dm.data.settings.startBalance;
        let theoreticalBalance = this.dm.data.settings.startBalance;

        actualData.push(balance);
        theoreticalData.push(theoreticalBalance);

        this.dm.data.tracker.forEach(day => {
            if (!day.isPaused) {
                balance += day.pl;
            }
            theoreticalBalance *= (1 + this.dm.data.settings.dailyTarget / 100);

            actualData.push(balance);
            theoreticalData.push(theoreticalBalance);
        });

        if (this.growthChart) this.growthChart.destroy();

        this.growthChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Actual Growth',
                        data: actualData,
                        borderColor: '#10b981',
                        backgroundColor: 'rgba(16, 185, 129, 0.1)',
                        tension: 0.4,
                        fill: true
                    },
                    {
                        label: 'Theoretical Growth',
                        data: theoreticalData,
                        borderColor: '#3b82f6',
                        backgroundColor: 'rgba(59, 130, 246, 0.1)',
                        borderDash: [5, 5],
                        tension: 0.4,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' }
                },
                scales: {
                    y: { beginAtZero: false }
                }
            }
        });
    }

    renderPLChart() {
        const ctx = document.getElementById('plChart');
        if (!ctx) return;

        const labels = this.dm.data.tracker.map(d => d.day);
        const plData = this.dm.data.tracker.map(d => d.pl);
        const targetData = this.dm.data.tracker.map((d, i) => {
            const balance = this.dm.getBalanceAtDay(i);
            return balance > 0 ? balance * (this.dm.data.settings.dailyTarget / 100) : 0;
        });

        if (this.plChart) this.plChart.destroy();

        this.plChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Actual P/L',
                        data: plData,
                        backgroundColor: plData.map(v => v > 0 ? '#10b981' : v < 0 ? '#ef4444' : '#9ca3af')
                    },
                    {
                        label: 'Daily Target',
                        data: targetData,
                        type: 'line',
                        borderColor: '#f59e0b',
                        borderWidth: 2,
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: { position: 'top' }
                }
            }
        });
    }

    renderSettings() {
        const startDate = document.getElementById('startDate');
        const startBalance = document.getElementById('startBalance');
        const dailyTarget = document.getElementById('dailyTarget');
        const finalTarget = document.getElementById('finalTarget');
        const dailyStopLoss = document.getElementById('dailyStopLoss');
        const maxTrades = document.getElementById('maxTrades');
        
        if (startDate) startDate.value = this.dm.data.settings.startDate;
        if (startBalance) startBalance.value = this.dm.data.settings.startBalance;
        if (dailyTarget) dailyTarget.value = this.dm.data.settings.dailyTarget;
        if (finalTarget) finalTarget.value = this.dm.data.settings.finalTarget;
        if (dailyStopLoss) dailyStopLoss.value = this.dm.data.settings.dailyStopLoss;
        if (maxTrades) maxTrades.value = this.dm.data.settings.maxTrades;
    }

    updateTrackerDay(dayIndex, value) {
        this.dm.setTrackerPL(dayIndex, value);
        this.render();
    }

    togglePause(dayIndex) {
        const day = this.dm.data.tracker[dayIndex];
        this.dm.setTrackerPause(dayIndex, !day.isPaused);
        this.render();
    }

    saveSettings() {
        const settings = {
            startDate: document.getElementById('startDate').value,
            startBalance: parseFloat(document.getElementById('startBalance').value),
            dailyTarget: parseFloat(document.getElementById('dailyTarget').value),
            finalTarget: parseFloat(document.getElementById('finalTarget').value),
            dailyStopLoss: parseFloat(document.getElementById('dailyStopLoss').value),
            maxTrades: parseInt(document.getElementById('maxTrades').value)
        };
        this.dm.updateSettings(settings);
        this.render();
        alert('✅ Settings saved!');
    }

    resetPL() {
        if (confirm('Reset all P/L data? Settings and accounts will be preserved.')) {
            this.dm.resetPL();
            this.render();
        }
    }

    resetAll() {
        if (confirm('⚠️ This will reset EVERYTHING. Are you sure?')) {
            this.dm.resetAll();
            this.render();
        }
    }

    addAccount() {
        this.dm.addAccount();
        this.render();
    }

    removeAccount(accountId) {
        if (confirm('Remove this account?')) {
            this.dm.removeAccount(accountId);
            this.render();
        }
    }

    exportCSV() {
        let csv = 'Day,Date,Balance Start,Daily Target,Actual P/L,P/L %,Balance End,Variation,Paused\n';

        this.dm.data.tracker.forEach((day, index) => {
            const balanceStart = this.dm.getBalanceAtDay(index);
            const target = balanceStart > 0 ? balanceStart * (this.dm.data.settings.dailyTarget / 100) : 0;
            const balanceEnd = balanceStart + day.pl;
            const plPercent = balanceStart > 0 ? (day.pl / balanceStart * 100) : 0;

            csv += `${day.day},"${day.dayName}",${balanceStart},${target},${day.pl},${plPercent},${balanceEnd},"${day.isPaused ? 'Paused' : 'Active'}",${day.isPaused ? 'Yes' : 'No'}\n`;
        });

        const blob = new Blob([csv], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'shensha-axiom-tracker.csv';
        a.click();
    }

    runSimulator() {
        const customPercent = parseFloat(document.getElementById('customPercent').value) || 2;
        const percentages = [2, 3, 4, 5, 6, customPercent];
        const results = [];

        percentages.forEach(percent => {
            let balance = this.dm.data.settings.startBalance;
            const tradingDays = this.dm.data.tracker.filter(d => !d.isPaused).length;

            for (let i = 0; i < tradingDays; i++) {
                balance *= (1 + percent / 100);
            }

            results.push({
                percent,
                finalBalance: balance,
                gain: balance - this.dm.data.settings.startBalance,
                gainPercent: ((balance - this.dm.data.settings.startBalance) / this.dm.data.settings.startBalance * 100)
            });
        });

        this.renderSimulatorChart(results);
        this.renderSimulatorResults(results);
    }

    renderSimulatorChart(results) {
        const ctx = document.getElementById('simulatorChart');
        if (!ctx) return;

        const datasets = results.map((r, i) => ({
            label: `${r.percent}%`,
            data: this.generateSimulationData(r.percent),
            borderColor: ['#667eea', '#764ba2', '#f59e0b', '#ef4444', '#10b981', '#3b82f6'][i],
            borderWidth: r.percent === parseFloat(document.getElementById('customPercent').value) ? 3 : 1,
            fill: false,
            tension: 0.4
        }));

        if (this.simulatorChart) this.simulatorChart.destroy();

        this.simulatorChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: Array.from({length: 41}, (_, i) => i * 1),
                datasets
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'top' } }
            }
        });
    }

    generateSimulationData(percent) {
        let balance = this.dm.data.settings.startBalance;
        const data = [balance];

        for (let i = 0; i < 40; i++) {
            balance *= (1 + percent / 100);
            data.push(balance);
        }
        return data;
    }

    renderSimulatorResults(results) {
        const container = document.getElementById('simulatorResults');
        if (!container) return;
        container.innerHTML = '';

        results.forEach(r => {
            const card = document.createElement('div');
            card.className = 'result-card' + (r.percent === parseFloat(document.getElementById('customPercent').value) ? ' highlight' : '');

            card.innerHTML = `
                <div class="result-label">${r.percent}% Daily</div>
                <div class="result-value">$${r.finalBalance.toFixed(2)}</div>
                <div class="result-label">Gain: $${r.gain.toFixed(2)} (${r.gainPercent.toFixed(1)}%)</div>
            `;
            container.appendChild(card);
        });
    }

    runWithdrawal() {
        const freq = document.getElementById('withdrawalFreq').value;
        const amount = parseFloat(document.getElementById('withdrawalAmount').value) || 0;

        const data = {
            withWithdrawal: [],
            noWithdrawal: [],
            labels: []
        };

        let balanceWith = this.dm.data.settings.startBalance;
        let balanceWithout = this.dm.data.settings.startBalance;
        let daysUntilDepletion = -1;

        this.dm.data.tracker.forEach((day, index) => {
            if (!day.isPaused) {
                balanceWith += day.pl;
                balanceWithout += day.pl;

                if (freq === 'daily' || (freq === 'weekly' && (index + 1) % 5 === 0) || (freq === 'monthly' && (index + 1) % 20 === 0)) {
                    balanceWith -= amount;
                    if (balanceWith < 0 && daysUntilDepletion === -1) {
                        daysUntilDepletion = index + 1;
                    }
                }
            }

            data.withWithdrawal.push(balanceWith);
            data.noWithdrawal.push(balanceWithout);
            data.labels.push(day.day);
        });

        this.renderWithdrawalChart(data);
        this.renderWithdrawalResults(data, amount, daysUntilDepletion);
    }

    renderWithdrawalChart(data) {
        const ctx = document.getElementById('withdrawalChart');
        if (!ctx) return;

        if (this.withdrawalChart) this.withdrawalChart.destroy();

        this.withdrawalChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: data.labels,
                datasets: [
                    {
                        label: 'With Withdrawal',
                        data: data.withWithdrawal,
                        borderColor: '#ef4444',
                        fill: false,
                        tension: 0.4
                    },
                    {
                        label: 'Without Withdrawal',
                        data: data.noWithdrawal,
                        borderColor: '#10b981',
                        fill: false,
                        tension: 0.4
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'top' } }
            }
        });
    }

    renderWithdrawalResults(data, amount, depleteDay) {
        const container = document.getElementById('withdrawalResults');
        if (!container) return;
        container.innerHTML = '';

        const withBalance = data.withWithdrawal[data.withWithdrawal.length - 1];
        const noBalance = data.noWithdrawal[data.noWithdrawal.length - 1];
        const totalWithdrawn = data.labels.length * amount;

        const cards = [
            { label: 'Final Balance (No Withdrawal)', value: '$' + noBalance.toFixed(2) },
            { label: 'Final Balance (With Withdrawal)', value: '$' + withBalance.toFixed(2) },
            { label: 'Total Withdrawn', value: '$' + totalWithdrawn.toFixed(2) },
            { label: 'Difference', value: '$' + (noBalance - withBalance).toFixed(2) }
        ];

        if (depleteDay > 0) {
            cards.push({ label: '⚠️ Depletion Day', value: 'Day ' + depleteDay });
        }

        cards.forEach(c => {
            const card = document.createElement('div');
            card.className = 'result-card';
            card.innerHTML = `
                <div class="result-label">${c.label}</div>
                <div class="result-value">${c.value}</div>
            `;
            container.appendChild(card);
        });
    }

    runGoalCalculator() {
        const target = parseFloat(document.getElementById('goalTarget').value);
        if (!target || target <= this.dm.data.settings.startBalance) {
            alert('Please enter a target higher than starting balance');
            return;
        }

        const avgDailyReturn = this.getAverageDailyReturn();
        if (avgDailyReturn <= 0) {
            alert('No positive trading history to calculate. Please trade first!');
            return;
        }

        let balance = this.dm.data.settings.startBalance;
        let daysNeeded = 0;
        const milestones = [];

        while (balance < target && daysNeeded < 1000) {
            balance *= (1 + avgDailyReturn);
            daysNeeded++;

            const progress = (balance / target) * 100;
            if (progress === 25 || progress === 50 || progress === 75 || progress === 100) {
                if (!milestones.find(m => m.percent === Math.floor(progress))) {
                    milestones.push({ percent: Math.floor(progress), day: daysNeeded, balance });
                }
            }
        }

        this.renderGoalChart(target, daysNeeded);
        this.renderGoalResults(target, daysNeeded, milestones);
    }

    renderGoalChart(target, daysNeeded) {
        const ctx = document.getElementById('goalChart');
        if (!ctx) return;

        let balance = this.dm.data.settings.startBalance;
        const data = [balance];
        const labels = [0];

        for (let i = 0; i < daysNeeded; i++) {
            balance *= (1 + this.getAverageDailyReturn());
            data.push(balance);
            labels.push(i + 1);
        }

        if (this.goalChart) this.goalChart.destroy();

        this.goalChart = new Chart(ctx, {
            type: 'line',
            data: {
                labels,
                datasets: [
                    {
                        label: 'Projected Balance',
                        data,
                        borderColor: '#10b981',
                        fill: false,
                        tension: 0.4
                    },
                    {
                        label: 'Target',
                        data: Array(labels.length).fill(target),
                        borderColor: '#f59e0b',
                        borderDash: [5, 5],
                        fill: false
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: { legend: { position: 'top' } }
            }
        });
    }

    renderGoalResults(target, daysNeeded, milestones) {
        const container = document.getElementById('goalResults');
        if (!container) return;
        container.innerHTML = '';

        const mainCard = document.createElement('div');
        mainCard.className = 'result-card highlight';
        mainCard.innerHTML = `
            <div class="result-label">Days to Target</div>
            <div class="result-value">${daysNeeded} days</div>
        `;
        container.appendChild(mainCard);

        milestones.forEach(m => {
            const card = document.createElement('div');
            card.className = 'result-card';
            card.innerHTML = `
                <div class="result-label">${m.percent}% Progress</div>
                <div class="result-value">Day ${m.day}</div>
                <div class="result-label">$${m.balance.toFixed(2)}</div>
            `;
            container.appendChild(card);
        });
    }
}

// ============================================
// INITIALIZE APP
// ============================================
const app = new AppManager();
