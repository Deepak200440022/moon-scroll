#!/usr/bin/env bash
# run.sh [full|zoom|blast|shards|blackhole]
# Serves the project and opens the page in your browser.
#   ./run.sh shards          just the shards animation
#   ./run.sh                 the full story (index.html)
# Ctrl-C in this terminal stops the server.
set -e
cd "$(dirname "$0")"

name="${1:-full}"
case "$name" in
  full)               page="/" ;;
  zoom|blast|shards|blackhole)
    page="/js/animations/$name/run.html" ;;
  *) echo "usage: ./run.sh [full|zoom|blast|shards|blackhole]"; exit 1 ;;
esac

# prefer 8080; if something else already has it, grab a free port
port=8080
if (exec 3<>/dev/tcp/127.0.0.1/8080) 2>/dev/null; then
  exec 3>&- 3<&-
  port=$(python3 -c 'import socket; s=socket.socket(); s.bind(("127.0.0.1",0)); print(s.getsockname()[1]); s.close()')
  echo "port 8080 is busy -> using $port"
fi

url="http://localhost:$port$page"
echo "serving -> $url   (Ctrl-C to stop)"
( sleep 1; (xdg-open "$url" 2>/dev/null || open "$url" 2>/dev/null) || true ) &
exec python3 -m http.server "$port"
