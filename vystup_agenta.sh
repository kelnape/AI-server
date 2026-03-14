#!/bin/bash

# Cíl pro čištění logů
LOG_DIR="/var/log"

# Počet dní, po kterých se logy odstraní
DAYS=7

# Pročištění logů starších než 7 dní
find "$LOG_DIR" -type f -name "*.log" -mtime +$DAYS -exec rm -f {} \;

# Volitelně: Můžete také pročišťovat staré logy pomocí logrotate
# logrotate -f /etc/logrotate.conf

echo "Logy starší než $DAYS dní byly úspěšně odstraněny."