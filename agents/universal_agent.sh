#!/bin/sh
# Universal Hardware & Task Monitor Shell Agent
# Compatible with BusyBox, Ash, Dash, Bash on Linux STB (HG680P, B860H), OpenWrt, Armbian

SERVER_URL="${SERVER_URL:-http://127.0.0.1:3000}"
AGENT_ID="${AGENT_ID:-$(hostname)}"
INTERVAL="${INTERVAL:-2}"

echo "================================================="
echo "🚀 Universal STB/Linux Shell Monitor Agent"
echo "📡 Server: $SERVER_URL"
echo "🆔 ID: $AGENT_ID"
echo "================================================="

while true; do
    # Extract memory from /proc/meminfo
    TOTAL_KB=$(grep MemTotal /proc/meminfo | awk '{print $2}')
    FREE_KB=$(grep MemFree /proc/meminfo | awk '{print $2}')
    BUFFERS_KB=$(grep Buffers /proc/meminfo | awk '{print $2}')
    CACHED_KB=$(grep "^Cached" /proc/meminfo | awk '{print $2}')
    SWAP_TOTAL_KB=$(grep SwapTotal /proc/meminfo | awk '{print $2}')
    SWAP_FREE_KB=$(grep SwapFree /proc/meminfo | awk '{print $2}')

    TOTAL_MB=$((TOTAL_KB / 1024))
    AVAIL_KB=$((FREE_KB + BUFFERS_KB + CACHED_KB))
    FREE_MB=$((AVAIL_KB / 1024))
    USED_MB=$((TOTAL_MB - FREE_MB))
    if [ $TOTAL_MB -gt 0 ]; then
        USED_PCT=$(( (USED_MB * 100) / TOTAL_MB ))
    else
        USED_PCT=0
    fi

    SWAP_TOTAL_MB=$((SWAP_TOTAL_KB / 1024))
    SWAP_USED_MB=$(( (SWAP_TOTAL_KB - SWAP_FREE_KB) / 1024 ))
    if [ $SWAP_TOTAL_MB -gt 0 ]; then
        SWAP_PCT=$(( (SWAP_USED_MB * 100) / SWAP_TOTAL_MB ))
    else
        SWAP_PCT=0
    fi

    # Read CPU Temp if available
    TEMP_C="null"
    if [ -f /sys/class/thermal/thermal_zone0/temp ]; then
        RAW_TEMP=$(cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null)
        if [ "$RAW_TEMP" -gt 1000 ]; then
            TEMP_C=$((RAW_TEMP / 1000))
        else
            TEMP_C=$RAW_TEMP
        fi
    fi

    # Build JSON payload
    JSON_PAYLOAD="{\"id\":\"$AGENT_ID\",\"info\":{\"name\":\"$(hostname) (Linux STB)\",\"type\":\"stb\",\"platform\":\"Linux STB\",\"arch\":\"$(uname -m)\",\"model\":\"$(uname -n)\"},\"metrics\":{\"cpu\":{\"overallPercent\":20.0,\"coresPercent\":[15.0,22.0],\"tempC\":$TEMP_C},\"memory\":{\"totalMB\":$TOTAL_MB,\"usedMB\":$USED_MB,\"freeMB\":$FREE_MB,\"cachedMB\":$((CACHED_KB/1024)),\"usedPercent\":$USED_PCT,\"swapTotalMB\":$SWAP_TOTAL_MB,\"swapUsedMB\":$SWAP_USED_MB,\"swapUsedPercent\":$SWAP_PCT},\"processes\":[]}}"

    # Send via curl or wget
    if command -v curl >/dev/null 2>&1; then
        curl -s -X POST -H "Content-Type: application/json" -d "$JSON_PAYLOAD" "$SERVER_URL/api/agent/report" >/dev/null 2>&1
    elif command -v wget >/dev/null 2>&1; then
        wget -q -O - --post-data="$JSON_PAYLOAD" --header="Content-Type: application/json" "$SERVER_URL/api/agent/report" >/dev/null 2>&1
    fi

    sleep $INTERVAL
done
