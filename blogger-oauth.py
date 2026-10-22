#!/usr/bin/env python3
"""Full Blogger OAuth grant using the AUTHORIZED redirect URI http://localhost:PORT.

This is the flow Google actually accepts (verified: accounts.google.com 302s to
http://localhost:8793). Two variants:
  --url           print the consent URL only
  --serve         run the loopback listener, wait for the callback, exchange the
                  code, write blogger-oauth.json (same shape tmg-blog-api.py reads)
"""
import argparse, json, sys, urllib.parse
from http.server import BaseHTTPRequestHandler, HTTPServer
from pathlib import Path
import requests

HERMES = Path("/Users/dan/.hermes/profiles/dev")
SECRET = json.load(open(HERMES / "google_client_secret.json"))["installed"]
CLIENT_ID = SECRET["client_id"]
CLIENT_SECRET = SECRET["client_secret"]
TOKEN_PATH = HERMES / "blog" / "blogger-oauth.json"

SCOPES = ["openid",
          "https://www.googleapis.com/auth/userinfo.email",
          "https://www.googleapis.com/auth/blogger"]

_recv = {"code": None, "error": None}


class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        q = urllib.parse.parse_qs(urllib.parse.urlparse(self.path).query)
        _recv["code"] = (q.get("code") or [None])[0]
        _recv["error"] = (q.get("error") or [None])[0]
        self.send_response(200)
        self.send_header("Content-Type", "text/html")
        self.end_headers()
        ok = bool(_recv["code"])
        self.wfile.write(
            f"<html><body style='font-family:sans-serif;padding:40px'>"
            f"<h2>{'Authorization received — you can close this tab.' if ok else 'Error: ' + str(_recv['error'])}"
            f"</h2></body></html>".encode())

    def log_message(self, *a):
        pass


def auth_url(port):
    p = urllib.parse.urlencode({
        "client_id": CLIENT_ID,
        "redirect_uri": f"http://localhost:{port}",
        "response_type": "code",
        "scope": " ".join(SCOPES),
        "access_type": "offline",
        "prompt": "consent",
        "state": "blogger",
    })
    return f"https://accounts.google.com/o/oauth2/auth?{p}"


def exchange(port, code):
    r = requests.post("https://oauth2.googleapis.com/token", data={
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "code": code,
        "grant_type": "authorization_code",
        "redirect_uri": f"http://localhost:{port}",
    }, timeout=60)
    if r.status_code >= 400:
        return {"ok": False, "error": f"exchange {r.status_code}", "message": r.text[:300]}
    t = r.json()
    # tmg-blog-api.py reads client_id / client_secret / token_uri / refresh_token
    # from this file and refreshes the access token itself, so all four must be
    # present or the dashboard's Blog Approvals tab reports "no_refresh_token".
    payload = {
        "access_token": t["access_token"],
        "refresh_token": t.get("refresh_token", ""),
        "token": t["access_token"],
        "token_uri": "https://oauth2.googleapis.com/token",
        "client_id": CLIENT_ID,
        "client_secret": CLIENT_SECRET,
        "scopes": t.get("scope", " ".join(SCOPES)),
        "scope": t.get("scope", " ".join(SCOPES)),
        "expiry": None,
        "source": "blogger-oauth.py",
    }
    import datetime
    payload["expiry"] = (
        datetime.datetime.now(datetime.timezone.utc)
        + datetime.timedelta(seconds=t.get("expires_in", 3600))
    ).isoformat()
    TOKEN_PATH.parent.mkdir(parents=True, exist_ok=True)
    TOKEN_PATH.write_text(json.dumps(payload, indent=2))
    return {"ok": True, "token": str(TOKEN_PATH),
            "scopes": t.get("scope", "").split(),
            "expires_in": t.get("expires_in")}


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--url", action="store_true")
    ap.add_argument("--serve", action="store_true")
    ap.add_argument("--port", type=int, default=8765)
    ap.add_argument("--hint", default="", help="login_hint (an email)")
    ap.add_argument("--out", default="", help="token file to write (default: blog/blogger-oauth.json)")
    a = ap.parse_args()

    global TOKEN_PATH
    if a.out:
        TOKEN_PATH = Path(a.out)
        TOKEN_PATH.parent.mkdir(parents=True, exist_ok=True)

    url = auth_url(a.port)
    if a.hint:
        url += "&login_hint=" + urllib.parse.quote(a.hint)

    if a.url or not a.serve:
        print(url)
        return

    srv = HTTPServer(("127.0.0.1", a.port), Handler)
    print(json.dumps({"auth_url": url, "port": a.port, "listening": True}), flush=True)
    srv.timeout = 900
    while _recv["code"] is None and _recv["error"] is None:
        srv.handle_request()
    srv.server_close()
    if _recv["error"]:
        print(json.dumps({"ok": False, "error": _recv["error"]}), flush=True)
        return
    out = exchange(a.port, _recv["code"])
    print(json.dumps(out), flush=True)
    sys.exit(0 if out.get("ok") else 1)


if __name__ == "__main__":
    main()
