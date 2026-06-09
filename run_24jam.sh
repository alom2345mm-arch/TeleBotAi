#!/bin/bash
clear
echo "====================================================="
echo "⚙️ ANTIGRAVITY AUTOMATION - GUARD 24 JAM ACTIVATED"
echo "====================================================="

# Path folder project
PROJECT_DIR="/storage/emulated/0/DATA PROJECT APP/BOT TELEGRAM Ai"
cd "$PROJECT_DIR"

# Mematikan proses bot lama jika ada yang masih menggantung agar tidak bentrok
pkill -f bot.py

echo "[*] Meluncurkan python bot.py di latar belakang (Background Process)..."

# Menjalankan bot secara background, output error/log akan dialihkan ke file bot_output.log
nohup python bot.py > bot_output.log 2>&1 &

echo "====================================================="
echo "✅ BOT BERHASIL BERJALAN 24 JAM DI LATAR BELAKANG!"
echo "====================================================="
echo "👉 Bot Anda sekarang aktif menjaga grup Telegram."
echo "👉 Anda aman menutup aplikasi Termux atau mematikan layar HP."
echo "👉 Untuk melihat log aktivitas bot, ketik: tail -f bot_output.log"
echo "====================================================="
