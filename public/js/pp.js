document.addEventListener("DOMContentLoaded", function () {
    const profilePic = document.getElementById("profilePic");
    const fileInput = document.getElementById("fileInput");

    // Cek apakah ada foto profil tersimpan di localStorage
    const savedImage = localStorage.getItem("profilePic");
    if (savedImage) {
        profilePic.src = savedImage;
    }

    // Event saat memilih gambar baru
    fileInput.addEventListener("change", function (event) {
        const file = event.target.files[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = function (e) {
                profilePic.src = e.target.result;
                localStorage.setItem("profilePic", e.target.result); // Simpan di localStorage
            };
            reader.readAsDataURL(file);
        }
    });

    // Klik ikon kamera untuk membuka file picker
    document.querySelector(".edit-icon").addEventListener("click", function () {
        fileInput.click();
    });
});

function goToDashboard() {
    fetch('/user/dashboard') // Tidak pakai .html
        .then(response => {
            if (response.ok) {
                window.location.href = '/user/dashboard'; // Arahkan ke halaman yang benar
            } else {
                throw new Error('Halaman tidak ditemukan');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('Gagal mengakses dashboard');
        });
}
  
    async function fetchProfile() {
        const token = localStorage.getItem("token");
        if (!token) {
            alert("Anda belum login!");
            window.location.href = "/auth/login";
            return;
        }

        try {
            const response = await fetch("/api/profile", {
                headers: { Authorization: `Bearer ${token}` }
            });
            const data = await response.json();

            if (!response.ok) {
                alert(data.message);
                window.location.href = "/auth/login";
                return;
            }

            document.getElementById("username").value = data.username;
            document.getElementById("apikey").value = data.apikey;
            document.getElementById("limit").value = data.limit;
            document.getElementById("email").value = data.email;
            document.getElementById("phone").value = data.phone;
            document.getElementById("plan").value = data.plan;
            document.getElementById("register").value = data.registeredAt
            document.getElementById("id").value = data.id

            // **Sembunyikan tombol upgrade kalau user sudah premium**
            const upgradeBtn = document.getElementById("upgradePremium");
            if (data.premium && upgradeBtn) {
                upgradeBtn.style.display = "none";
            }
        } catch (error) {
            console.error("Gagal mengambil data profil:", error);
            alert("Terjadi kesalahan saat mengambil data profil.");
        }
    }

    function copyApiKey() {
        let apiKeyField = document.getElementById("apikey");
        let copyBtn = document.getElementById("copyBtn");

        navigator.clipboard.writeText(apiKeyField.value).then(() => {
            copyBtn.classList.replace("fa-copy", "fa-check");
            copyBtn.style.color = "green";

            setTimeout(() => {
                copyBtn.classList.replace("fa-check", "fa-copy");
                copyBtn.style.color = "#666";
            }, 2000);
        }).catch(err => {
            console.error("Gagal menyalin:", err);
        });
    }

    function logout() {
        localStorage.removeItem("token");
        window.location.href = "/auth/login";
    }

    document.addEventListener("DOMContentLoaded", () => {
        const upgradeBtn = document.getElementById("upgradePremium");

        if (upgradeBtn) {
            upgradeBtn.addEventListener("click", async function () {
                this.disabled = true;
                let reffId = "UPG" + Date.now();
                let nominal = 500;

                try {
                    let res = await fetch("/api/deposit", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ nominal, method: "QRISFAST", reff_id: reffId })
                    });

                    let data = await res.json();
                    if (data.success) {
                        document.getElementById("popupOverlay").style.display = "flex";
                        document.getElementById("qrImage").src = data.data.qr_url;
                        document.getElementById("qrAmount").innerText = data.data.nominal;
                        document.getElementById("qrExpiry").innerText = data.data.expired_at;

                        cekStatusUpgrade(data.data.id, this);
                    } else {
                        alert("Gagal membuat deposit: " + data.error);
                        this.disabled = false;
                    }
                } catch (err) {
                    console.error("Error saat upgrade:", err);
                    this.disabled = false;
                }
            });
        }

        fetchProfile();
    });

    function cekStatusUpgrade(id, button) {
        let interval = setInterval(async () => {
            try {
                let res = await fetch(`/api/deposit/status/${id}`);
                let data = await res.json();

                if (data.success && data.data.status === "success") {
                    clearInterval(interval);
                    upgradePremium(button, data.data);
                } else if (!data.success) {
                    clearInterval(interval);
                    alert("Transaksi gagal atau dibatalkan.");
                    button.disabled = false;
                }
            } catch (err) {
                console.error("Error saat cek status transaksi:", err);
            }
        }, 5000);
    }

    function tutupPopup() {
        document.getElementById("popupOverlay").style.display = "none";
    }

    async function upgradePremium(button, trxData) {
        try {
            let res = await fetch("/api/upgrade-premium", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": "Bearer " + localStorage.getItem("token")
                }
            });

            let result = await res.json();
            if (result.premium) {
                tutupPopup();
                document.getElementById("transactionDetails").style.display = "block";

                document.getElementById("trxId").innerText = trxData.id;
                document.getElementById("trxAmount").innerText = trxData.nominal;
                document.getElementById("trxStatus").innerText = "Berhasil ✅";
                document.getElementById("trxTime").innerText = new Date().toLocaleString();

                alert("Selamat! Akun Anda telah di-upgrade ke premium.");
                button.style.display = "none";
            } else {
                alert("Gagal upgrade premium: " + result.message);
                button.disabled = false;
            }
        } catch (err) {
            console.error("Error saat upgrade premium:", err);
        }
    }