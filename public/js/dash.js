// Sidebar Toggle Logic
const sidebar = document.querySelector('.sidebar');
const menuToggle = document.getElementById('menuToggle');
const closeBtn = document.querySelector('.close-btn');

menuToggle.addEventListener('click', () => {
    sidebar.classList.toggle('active');
});

closeBtn.addEventListener('click', () => {
    sidebar.classList.remove('active');
});

// Submenu Toggle Logic
document.querySelectorAll('.has-submenu > .menu-link').forEach(menu => {
    menu.addEventListener('click', function (e) {
        e.preventDefault();
        const parent = this.parentElement;
        const submenu = parent.querySelector('.submenu');
        const chevron = this.querySelector('.chevron');

        if (submenu) {
            submenu.classList.toggle('open');
            chevron.classList.toggle('rotate');

            // Tutup submenu lain saat satu submenu dibuka
            document.querySelectorAll('.submenu').forEach(otherSubmenu => {
                if (otherSubmenu !== submenu) {
                    otherSubmenu.classList.remove('open');
                    otherSubmenu.parentElement.querySelector('.chevron')?.classList.remove('rotate');
                }
            });
        }
    });
});

// Klik di luar sidebar untuk menutupnya
document.addEventListener('click', (e) => {
    if (!sidebar.contains(e.target) && !menuToggle.contains(e.target)) {
        sidebar.classList.remove('active');
    }
});
        
            // DATA FETCHING
    async function fetchData(url, elementId, key) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    
            const data = await response.json();
            console.log(`Data dari ${url}:`, data);
    
            const element = document.getElementById(elementId);
            if (!element) return;
    
            if (data && data[key] !== undefined) {
                element.innerHTML = data[key];
            } else {
                element.innerHTML = '<span class="error">Data tidak tersedia</span>';
            }
        } catch (error) {
            console.error(`Error fetching ${url}:`, error);
            const element = document.getElementById(elementId);
            if (element) element.innerHTML = `<span class="error">Error: ${error.message}</span>`;
        }
    }
    
    // CHART
    let chart;
    async function fetchHistoryData() {
        try {
            const response = await fetch("/api/history-request");
            if (!response.ok) throw new Error(`HTTP error! Status: ${response.status}`);
    
            const data = await response.json();
            console.log("History Data:", data);
    
            const historyRequest = data.historyRequest || {};
            if (Object.keys(historyRequest).length === 0) throw new Error("Data kosong");
    
            const last7Days = Object.keys(historyRequest).slice(-7);
            const last7Values = last7Days.map(date => historyRequest[date] || 0);
    
            renderChart(last7Days, last7Values);
        } catch (error) {
            console.error('Error fetching history data:', error);
        }
    }
    
    function renderChart(labels, values) {
        const ctx = document.getElementById("chartCanvas").getContext("2d");
    
        function getPointColor(value) {
            return value >= 5000 ? 'rgba(255, 0, 0, 1)' :
                   value >= 3000 ? 'rgba(255, 255, 0, 1)' :
                   value >= 2000 ? 'rgba(0, 255, 0, 1)' :
                   value >= 1000 ? 'rgba(0, 0, 255, 1)' :
                                   'rgba(169, 169, 169, 1)';
        }
    
        if (chart) chart.destroy();
    
        chart = new Chart(ctx, {
            type: 'line',
            data: {
                labels: labels,
                datasets: [{
                    label: 'Request History',
                    data: values,
                    backgroundColor: 'rgba(70, 130, 180, 0.3)',
                    borderColor: 'rgba(70, 130, 180, 1)',
                    borderWidth: 2,
                    pointBackgroundColor: values.map(getPointColor),
                    fill: true,
                    tension: 0.4
                }]
            },
            options: {
                responsive: true,
                scales: {
                    x: { grid: { display: false } },
                    y: { beginAtZero: true, ticks: { stepSize: 500 }, grid: { display: true } }
                },
                plugins: { legend: { display: false } },
                onClick: (e) => {
                    const activePoints = chart.getElementsAtEventForMode(e, 'nearest', { intersect: true }, false);
                    if (activePoints.length > 0) {
                        const firstPoint = activePoints[0];
                        const label = chart.data.labels[firstPoint.index];
                        const value = chart.data.datasets[firstPoint.datasetIndex].data[firstPoint.index];
    
                        const infoBox = document.getElementById("info-box");
                        infoBox.style.display = 'block';
                        infoBox.querySelector(".date").textContent = `Date: ${label}`;
                        infoBox.querySelector(".request-count").textContent = `Requests: ${value}`;
                    }
                }
            }
        });
    }
    
    // WINDOW ONLOAD
    window.onload = () => {
        fetchHistoryData();
        fetchData("/api/total-request", "total-request", "totalRequest");
        fetchData("/api/request-today", "request-today", "requestToday");
        fetchData("/api/total-visitor", "total-visitor", "totalVisitor");
        fetchData("/api/total-users", "total-users", "totalUsers");
    };
    
    // CEK MANUAL REQUEST TODAY
    async function checkRequestToday() {
        try {
            const response = await fetch("/api/request-today");
            const data = await response.json();
            console.log("Request Today:", data);
        } catch (err) {
            console.error("Error fetching request today:", err);
        }
    }
    
    // Cek status baterai
    if (navigator.getBattery) {
        navigator.getBattery().then(battery => {
            function updateBatteryInfo() {
                let chargingStatus = battery.charging ? "Charging" : "Not Charging";
                document.getElementById("battery-status").innerText = `${chargingStatus} (${Math.round(battery.level * 100)}%)`;
            }
            updateBatteryInfo();
            battery.addEventListener("chargingchange", updateBatteryInfo);
            battery.addEventListener("levelchange", updateBatteryInfo);
        });
    } else {
        document.getElementById("battery-status").innerText = "Battery API Not Supported";
    }

    // Ambil IP publik
    fetch("https://api64.ipify.org?format=json")
        .then(response => response.json())
        .then(data => {
            document.getElementById("ip-address").innerText = data.ip;
        })
        .catch(() => {
            document.getElementById("ip-address").innerText = "Failed to load IP";
        });
    
    checkRequestToday();        