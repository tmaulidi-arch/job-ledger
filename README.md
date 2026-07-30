Job Ledger

Job Ledger is a small web application that helps job seekers browse, search, filter, and sort real, currently open remote and tech job listings — all in one place, without needing to visit multiple job boards individually.

 Live deployment

Load-balanced live site: http://98.94.24.162

The application is deployed on two web servers (Web01, Web02), each running an identical copy of the app behind an HAProxy load balancer (Lb01) that distributes incoming traffic between them using round-robin balancing.

 Why this app is useful

Job hunting usually means checking several different sites, each with its own layout and filters. Job Ledger pulls live listings from a single public jobs API into one clean, fast interface with real search, filter, and sort tools, so a user can quickly narrow down relevant openings and jump straight to the original posting to apply.

Features

- Live job listings fetched from a public external API
- Free-text search across job title, company name, and tags
- Filter by location (substring match)
- Filter by job type (full-time, part-time, contract, etc. — populated dynamically from the real data)
- Filter by remote vs on-site/hybrid
- Sort by newest, oldest, title (A–Z), or company (A–Z)
- Click any listing to view the full description in a detail popup, with a direct "Apply on source site" link
- Loading, empty-results, and error states with a retry option
- Clean, responsive design that works on desktop and mobile

API used

This app uses the Arbeitnow Job Board API (https://arbeitnow.com/api/job-board-api), a free public API that requires no API key or authentication. Full credit to Arbeitnow for providing this data.

Note on CORS: Arbeitnow's API does not send the browser CORS headers needed for direct client-side fetch() calls. To work around this without exposing any credentials or relying on a third-party proxy service, this project includes a tiny same-origin proxy (serve.py) that fetches the data server-side and forwards it to the frontend. This means no API key handling is needed at all, since the API itself doesn't require one — but it does mean the app must be run through serve.py rather than any plain static file server.

Project structure

job-ledger/
├── index.html
├── css/
│   └── style.css
├── js/
│   └── app.js
├── serve.py
├── README.md
└── .gitignore

 Running locally

Requirements: Python 3 (already included on most systems, including Ubuntu/WSL).

1. Clone the repository:
git clone https://github.com/tmaulidi-arch/job-ledger.git
cd job-ledger

2. Start the local server (this both serves the frontend and proxies the API):
python3 serve.py

3. Open your browser to:
http://localhost:8000

You should see the job listings load automatically. Use the search box, dropdown filters, and sort menu to narrow results, and click any listing to see full details and apply.

Note: You must run python3 serve.py, not a plain static server like python3 -m http.server, since serve.py includes the API proxy needed to avoid CORS errors in the browser.

 Deployment

The application is deployed to two Ubuntu web servers (Web01 and Web02), each configured identically:

1. Cloned the repository directly onto each server:
git clone https://github.com/tmaulidi-arch/job-ledger.git

2. Installed Nginx, Python 3, and Git on each server:
sudo apt update
sudo apt install -y nginx git python3 python3-pip

3. Started serve.py in the background on each server:
cd job-ledger
nohup python3 serve.py > server.log 2>&1 &

4. Configured Nginx on each server to reverse-proxy incoming requests on port 80 to serve.py running on port 8000:

server {
    listen 80;
    server_name _;

    location / {
        proxy_pass http://127.0.0.1:8000;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
    }
}

5. Restarted Nginx on each server:
sudo systemctl restart nginx

Load balancer configuration (Lb01)

Lb01 runs HAProxy, configured to distribute incoming traffic between Web01 and Web02 using round-robin balancing, with health checks to confirm each backend is responding before routing traffic to it:

frontend http_front
    bind *:80
    default_backend web_servers

backend web_servers
    balance roundrobin
    option httpchk GET /
    server web01 54.165.249.2:80 check
    server web02 52.207.238.151:80 check

Traffic sent to Lb01's public IP (98.94.24.162) is automatically distributed between Web01 and Web02 — if either server goes down, HAProxy's health check detects it and stops routing traffic there until it recovers.

Challenges encountered

The main technical challenge was that the Arbeitnow API, while free and requiring no key, does not return CORS headers — meaning direct fetch() calls from the browser were blocked. Several free public CORS-proxy services were tested as a workaround, but they proved unreliable (rate limits, downtime, or requiring paid API keys). The final solution was to write a minimal Python proxy (serve.py) that fetches the API server-side, where CORS restrictions don't apply, and forwards the JSON response to the frontend with the correct headers added. This same proxy runs on both deployed web servers, so the fix works identically in production as it does locally.

A second challenge was obtaining SSH access to the assigned deployment servers, since none of the locally generated SSH keys were initially trusted by the servers. This was resolved by connecting through a browser-based terminal already configured with working server access, then using that same trusted key to reach all three servers directly.

Credits

- Job data: Arbeitnow Job Board API (https://arbeitnow.com/api/job-board-api)
- Built with vanilla HTML, CSS, and JavaScript (no frameworks)
- Deployed with Nginx (reverse proxy) and HAProxy (load balancing) on Ubuntu servers
- the link video :https://www.loom.com/share/edc637b749d74797bc055b3fdc011519
