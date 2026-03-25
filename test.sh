#!/bin/bash
# Cleanup všech Cloudflare tunelů - KOMPLETNÍ RESET

echo "🧹 CLOUDFLARE TUNEL CLEANUP"
echo "============================"
echo ""
echo "⚠️  VAROVÁNÍ: Toto smaže VŠECHNY tunely!"
echo "   mas.kelnape.eu a api.kelnape.eu přestanou fungovat!"
echo ""
read -p "Opravdu chcete pokračovat? (ano/ne): " confirm

if [ "$confirm" != "ano" ]; then
    echo "Zrušeno."
    exit 0
fi

echo ""
echo "🛑 Zastavuji služby..."
sudo systemctl stop cloudflared 2>/dev/null
sudo systemctl stop cloudflared-ai 2>/dev/null
sudo systemctl disable cloudflared 2>/dev/null
sudo systemctl disable cloudflared-ai 2>/dev/null
echo "✅ Služby zastaveny"

echo ""
echo "🗑️  Mažu systemd service soubory..."
sudo rm -f /etc/systemd/system/cloudflared.service
sudo rm -f /etc/systemd/system/cloudflared-ai.service
sudo systemctl daemon-reload
echo "✅ Service soubory smazány"

echo ""
echo "🗑️  Mažu config a credentials..."
sudo rm -rf /etc/cloudflared/
sudo rm -rf /root/.cloudflared/
sudo rm -rf /root/.cloudflared-ai/
sudo rm -rf ~/.cloudflared/ 2>/dev/null
echo "✅ Konfigurace smazána"

echo ""
echo "🔍 Ověřuji cleanup..."
if ! systemctl is-active --quiet cloudflared && \
   ! systemctl is-active --quiet cloudflared-ai && \
   ! [ -f /etc/systemd/system/cloudflared.service ] && \
   ! [ -d /etc/cloudflared ] && \
   ! [ -d /root/.cloudflared ]; then
    echo "✅ Cleanup dokončen!"
else
    echo "⚠️  Něco se možná nesmazalo kompletně"
    echo "Zkontrolujte manuálně"
fi

echo ""
echo "📋 CO ZBÝVÁ UDĚLAT:"
echo "1. Smažte tunely v Cloudflare dashboardu:"
echo "   https://one.dash.cloudflare.com"
echo "   → Networks → Tunnels → Delete každý tunel"
echo ""
echo "2. (Volitelně) Smažte DNS záznamy:"
echo "   https://dash.cloudflare.com"
echo "   → kelnape.eu → DNS → Smazat CNAME záznamy"
echo ""
echo "3. Pak vytvořte nový tunel pomocí:"
echo "   FRESH_START_TUNNEL.md"
echo ""
echo "✅ Lokální cleanup hotový!"
