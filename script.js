document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Remove Skeleton/Loader
    setTimeout(() => {
        const loader = document.getElementById('loader');
        loader.style.opacity = '0';
        setTimeout(() => loader.remove(), 500);
        initializeData();
    }, 1500);

    // 2. Mobile Sidebar Toggle
    const menuToggle = document.getElementById('menu-toggle');
    const sidebar = document.getElementById('sidebar');
    menuToggle.addEventListener('click', () => {
        sidebar.classList.toggle('active');
    });

    // 3. Theme Switcher
    const themeToggle = document.getElementById('theme-toggle');
    themeToggle.addEventListener('click', () => {
        document.body.classList.toggle('light-theme');
        const isLight = document.body.classList.contains('light-theme');
        themeToggle.innerHTML = isLight ? '<i class="ph ph-sun"></i>' : '<i class="ph ph-moon"></i>';
        showToast(isLight ? 'Light mode activated' : 'Dark mode activated', 'info');
    });

    // 4. Initialize Chart.js
    const ctx = document.getElementById('trafficChart').getContext('2d');
    Chart.defaults.color = '#94A3B8';
    Chart.defaults.font.family = "'Plus Jakarta Sans', sans-serif";
    
    const gradient = ctx.createLinearGradient(0, 0, 0, 400);
    gradient.addColorStop(0, 'rgba(0, 240, 255, 0.4)');
    gradient.addColorStop(1, 'rgba(0, 240, 255, 0.0)');

    new Chart(ctx, {
        type: 'line',
        data: {
            labels: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
            datasets: [{
                label: 'Processed Messages',
                data: [1200, 1900, 1500, 2200, 1800, 2800, 2400],
                borderColor: '#00F0FF',
                backgroundColor: gradient,
                borderWidth: 2,
                tension: 0.4,
                fill: true,
                pointBackgroundColor: '#07090E',
                pointBorderColor: '#00F0FF',
                pointBorderWidth: 2
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' } },
                x: { grid: { display: false } }
            }
        }
    });

    // 5. Live Feed Simulation
    const feedList = document.getElementById('activity-feed');
    const logs = [
        { type: 'ai', icon: 'ph-brain', text: 'Gemini generated response in 0.8s', time: 'Just now' },
        { type: 'user', icon: 'ph-user-plus', text: 'New user joined group "Polda IT Dev"', time: '2 mins ago' },
        { type: 'spam', icon: 'ph-shield-warning', text: 'Blocked crypto spam payload', time: '5 mins ago' },
        { type: 'ai', icon: 'ph-robot', text: 'Autonomous task: Database cleanup complete', time: '12 mins ago' }
    ];

    function renderFeed() {
        feedList.innerHTML = '';
        logs.forEach(log => {
            const li = document.createElement('li');
            li.className = `feed-item ${log.type}`;
            li.innerHTML = `
                <span><i class="ph ${log.icon}"></i> ${log.text}</span>
                <span style="color: var(--text-muted); font-size: 0.75rem;">${log.time}</span>
            `;
            feedList.appendChild(li);
        });
    }

    renderFeed();

    // Simulate incoming webhook logs
    setInterval(() => {
        const events = ['Command /start executed', 'Gemini Pro analyzed text', 'Webhook synced to D1'];
        const randomEvent = events[Math.floor(Math.random() * events.length)];
        logs.unshift({ type: 'user', icon: 'ph-lightning', text: randomEvent, time: 'Just now' });
        if(logs.length > 6) logs.pop();
        renderFeed();
    }, 8000);
});

// --- Utility Functions ---

function initializeData() {
    // Animate numbers for visual effect
    animateValue("active-users", 0, 18420, 1500);
    animateValue("total-messages", 0, 142850, 2000);
    document.getElementById("api-latency").innerText = "42ms";
}

function refreshData() {
    showToast("Syncing with Cloudflare Edge...", "info");
    // Skeleton effect re-trigger
    const ids = ["active-users", "total-messages", "api-latency"];
    ids.forEach(id => {
        const el = document.getElementById(id);
        el.classList.add('skeleton');
        el.innerText = '00000';
    });
    
    setTimeout(() => {
        ids.forEach(id => document.getElementById(id).classList.remove('skeleton'));
        initializeData();
        showToast("Data synced successfully", "success");
    }, 1000);
}

function animateValue(id, start, end, duration) {
    const obj = document.getElementById(id);
    let startTimestamp = null;
    const step = (timestamp) => {
        if (!startTimestamp) startTimestamp = timestamp;
        const progress = Math.min((timestamp - startTimestamp) / duration, 1);
        obj.innerHTML = Math.floor(progress * (end - start) + start).toLocaleString('id-ID');
        if (progress < 1) {
            window.requestAnimationFrame(step);
        }
    };
    window.requestAnimationFrame(step);
}

function showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    const toast = document.createElement('div');
    toast.className = 'toast';
    
    let icon = 'ph-info';
    if(type === 'success') icon = 'ph-check-circle';
    if(type === 'error') icon = 'ph-warning-circle';
    
    toast.innerHTML = `<i class="ph ${icon}"></i> ${message}`;
    container.appendChild(toast);
    
    setTimeout(() => {
        toast.style.opacity = '0';
        toast.style.transform = 'translateY(20px)';
        toast.style.transition = 'all 0.3s';
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}
