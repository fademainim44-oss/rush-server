#!/bin/bash
echo "========================================="
echo "🚀 Rush Client VDS Sunucusu Kuruluyor..."
echo "========================================="

# Node.js kontrolü
if ! command -v node &> /dev/null
then
    echo "⚠️ Node.js bulunamadı! Yükleniyor..."
    curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
    sudo apt-get install -y nodejs
fi

echo "📦 Paketler yükleniyor..."
npm install

echo "✨ Rush Sunucusu Başlatılıyor..."
node server.js
