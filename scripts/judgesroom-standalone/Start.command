#!/bin/bash
cd "$(dirname "$0")"
xattr -dr com.apple.quarantine . 2>/dev/null || true

echo
echo " Judges Room Standalone Server"
echo " ============================="
echo " v{{VERSION}}"
echo " Local server for your event network."
echo
echo " Access the app via the URL below. If there are multiple, try them one by one "
echo " on another device within the same network until one works. Everyone must use "
echo " the same URL. Do this before you create a room. Never start on localhost."
echo

print_url() {
	local iface="$1"
	local ip
	ip=$(ipconfig getifaddr "$iface" 2>/dev/null || true)
	[ -z "$ip" ] && return 1
	case "$ip" in
		127.* | 169.254.*) return 1 ;;
	esac
	local name
	name=$(networksetup -listallhardwareports 2>/dev/null | awk -v d="$iface" '
		/^Hardware Port:/ { port=$0; sub(/^Hardware Port: /, "", port) }
		/^Device:/ && $2 == d { print port; exit }
	')
	[ -z "$name" ] && name="$iface"
	printf "    %-20s http://%s:8787\n" "$name" "$ip"
	return 0
}

printed=0
if devices=$(networksetup -listallhardwareports 2>/dev/null | awk '/^Device:/ { print $2 }'); then
	for iface in $devices; do
		case "$iface" in
			utun* | awdl* | llw* | bridge* | vmenet* | ap* | gif* | stf* | lo*) continue ;;
		esac
		if print_url "$iface"; then
			printed=1
		fi
	done
fi
if [ "$printed" -eq 0 ]; then
	for iface in en0 en1 en2 en3 en4 en5 en6 en7 en8; do
		if print_url "$iface"; then
			printed=1
		fi
	done
fi

echo
echo " Close this window or press x to stop."
echo

export WRANGLER_SEND_METRICS=false

exec "./{{NODE_BIN}}" "./{{WRANGLER_JS}}" \
	dev --config "./worker/wrangler.jsonc" --env production \
	--ip 0.0.0.0 --port 8787 --persist-to "./data"
