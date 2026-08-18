Judges Room Standalone Server
=============================

A local copy of the judgesroom.com server that you run on your computer
at the event. It is a standalone app. You do not need to install
anything, port-forward, or create a Cloudflare account.

Learn more about judgesroom.com at
https://github.com/Jerrylum/judgesroom.com

Start
-----
1. Unzip this folder somewhere writable (Desktop, a USB stick, Documents).
   Do not run it from inside the zip file.
2. Double-click:
     Windows:  Start.bat
     macOS:    Start.command
3. If Windows Firewall asks, allow access on Private networks.
   On macOS, there are extra steps the first time you start the server.
   Right-click Start.command → Open. The system will show
   "Start.command" Not Opened; click Done. Then go to Settings →
   Privacy & Security, scroll down, find Start.command, and click
   Open Anyway. To start the server again later, just double-click
   Start.command.
4. On this computer, open one of the printed URLs in a browser
   before you create the room. Never start on localhost.
   You and the judges must use the same one. If more than one
   appears, use the Wi-Fi address the judges are on (usually
   192.168....). Try it on a judge's phone; if it does not load,
   try the next URL.
5. Then create the room and share the invite link. Judges open
   that same URL on their devices.

Stop
----
Press x in the server window, or close the window.

After the event
---------------
Destroy the room in the app, or delete the data/ folder.
You do not need to delete the app itself. All room data is
in data/ next to this README. Copy that folder to back it up.

Notes
-----
- Keep the server window open while judges are connected.
- This computer and the judges must be on the same network.
