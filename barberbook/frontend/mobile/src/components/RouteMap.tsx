import React, { useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

/**
 * Turn-by-turn-ish route preview built on Leaflet + OpenStreetMap inside a
 * WebView. The path itself is computed by an **A\*** search running in the
 * page: a uniform grid is laid over the bounding box of (start → end) and A\*
 * (8-neighbour, octile heuristic) finds the lowest-cost path across it. The
 * resulting cells are projected back to lat/lng and drawn as a polyline.
 *
 * Start = the user's current location (GPS + OpenCage label upstream), end =
 * the booked shop's coordinate. Distance + a rough ETA computed from the
 * path are posted back over the RN bridge via `onRouteInfo`.
 */
export interface LatLng {
  lat: number;
  lng: number;
}

interface Props {
  start: LatLng;
  end: LatLng;
  /** Grid resolution for A* (cells per side). Higher = smoother path. */
  grid?: number;
  /** Average travel speed (km/h) used to estimate ETA from path length. */
  speedKmh?: number;
  onRouteInfo?: (info: { distanceKm: number; etaMin: number }) => void;
  style?: StyleProp<ViewStyle>;
}

export function RouteMap({ start, end, grid = 72, speedKmh = 22, onRouteInfo, style }: Props) {
  const html = useMemo(
    () => buildHtml({ start, end, grid, speedKmh }),
    [start.lat, start.lng, end.lat, end.lng, grid, speedKmh],
  );

  const handleMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data) as {
        type?: string;
        distanceKm?: number;
        etaMin?: number;
      };
      if (msg.type === 'route' && typeof msg.distanceKm === 'number') {
        onRouteInfo?.({ distanceKm: msg.distanceKm, etaMin: msg.etaMin ?? 0 });
      }
    } catch {
      // Ignore malformed bridge messages.
    }
  };

  return (
    <View style={[styles.root, style]}>
      <WebView
        originWhitelist={['*']}
        source={{ html }}
        onMessage={handleMessage}
        javaScriptEnabled
        domStorageEnabled
        startInLoadingState
        androidLayerType="hardware"
        style={styles.web}
        setSupportMultipleWindows={false}
      />
    </View>
  );
}

function buildHtml(opts: { start: LatLng; end: LatLng; grid: number; speedKmh: number }): string {
  const data = JSON.stringify(opts);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #FAF7F2; }
    .bb-pin { color:#F5F1E8; border:2px solid #F5F1E8; border-radius:14px;
      padding:3px 10px; font:700 12px -apple-system,Roboto,Helvetica,Arial,sans-serif;
      white-space:nowrap; box-shadow:0 1px 4px rgba(0,0,0,.35); transform:translate(-50%,-100%); }
    .bb-you { background:#1E3A8A; }
    .bb-shop { background:#D4322C; }
    .leaflet-div-icon { background:transparent; border:none; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
  <script>
    (function () {
      var D = ${data};
      function post(o){ if (window.ReactNativeWebView) { window.ReactNativeWebView.postMessage(JSON.stringify(o)); } }

      function haversine(a, b) {
        var R = 6371, toRad = function (d) { return d * Math.PI / 180; };
        var dLat = toRad(b[0]-a[0]), dLng = toRad(b[1]-a[1]);
        var s = Math.sin(dLat/2)*Math.sin(dLat/2) +
                Math.cos(toRad(a[0]))*Math.cos(toRad(b[0]))*Math.sin(dLng/2)*Math.sin(dLng/2);
        return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1-s));
      }

      // ── A* over a uniform grid covering the start→end bounding box ──
      function astar(start, end, N) {
        var minLat = Math.min(start.lat, end.lat), maxLat = Math.max(start.lat, end.lat);
        var minLng = Math.min(start.lng, end.lng), maxLng = Math.max(start.lng, end.lng);
        var dLat = (maxLat - minLat) || 0.01, dLng = (maxLng - minLng) || 0.01;
        // Pad the box so the route isn't pinned to the exact edges.
        minLat -= dLat * 0.18; maxLat += dLat * 0.18;
        minLng -= dLng * 0.18; maxLng += dLng * 0.18;
        var spanLat = maxLat - minLat, spanLng = maxLng - minLng;

        function clamp(v){ return Math.max(0, Math.min(N - 1, v)); }
        function toCell(lat, lng){
          return [clamp(Math.round((lat - minLat) / spanLat * (N - 1))),
                  clamp(Math.round((lng - minLng) / spanLng * (N - 1)))];
        }
        function toLatLng(r, c){
          return [minLat + (r / (N - 1)) * spanLat, minLng + (c / (N - 1)) * spanLng];
        }

        var s = toCell(start.lat, start.lng), g = toCell(end.lat, end.lng);
        var size = N * N;
        var gScore = new Float64Array(size); gScore.fill(Infinity);
        var fScore = new Float64Array(size); fScore.fill(Infinity);
        var came = new Int32Array(size); came.fill(-1);
        var open = new Uint8Array(size);
        var closed = new Uint8Array(size);
        function idx(r, c){ return r * N + c; }

        function h(r, c){
          // Octile distance (admissible for 8-connected grids).
          var dr = Math.abs(r - g[0]), dc = Math.abs(c - g[1]);
          return (dr + dc) + (Math.SQRT2 - 2) * Math.min(dr, dc);
        }

        var si = idx(s[0], s[1]);
        gScore[si] = 0; fScore[si] = h(s[0], s[1]); open[si] = 1;
        var openCount = 1;
        var nb = [[-1,0],[1,0],[0,-1],[0,1],[-1,-1],[-1,1],[1,-1],[1,1]];

        while (openCount > 0) {
          // Pick the open node with the lowest fScore (linear scan — N is small).
          var cur = -1, best = Infinity;
          for (var i = 0; i < size; i++) {
            if (open[i] && fScore[i] < best) { best = fScore[i]; cur = i; }
          }
          if (cur < 0) break;
          if (cur === idx(g[0], g[1])) break;
          open[cur] = 0; openCount--; closed[cur] = 1;
          var cr = (cur / N) | 0, cc = cur % N;

          for (var k = 0; k < nb.length; k++) {
            var nr = cr + nb[k][0], ncl = cc + nb[k][1];
            if (nr < 0 || ncl < 0 || nr >= N || ncl >= N) continue;
            var ni = idx(nr, ncl);
            if (closed[ni]) continue;
            var step = (nb[k][0] !== 0 && nb[k][1] !== 0) ? Math.SQRT2 : 1;
            var tentative = gScore[cur] + step;
            if (tentative < gScore[ni]) {
              came[ni] = cur;
              gScore[ni] = tentative;
              fScore[ni] = tentative + h(nr, ncl);
              if (!open[ni]) { open[ni] = 1; openCount++; }
            }
          }
        }

        // Reconstruct (cell path → lat/lng path).
        var path = [], node = idx(g[0], g[1]);
        if (came[node] === -1 && node !== si) {
          return [[start.lat, start.lng], [end.lat, end.lng]];
        }
        while (node !== -1) {
          var r = (node / N) | 0, c = node % N;
          path.push(toLatLng(r, c));
          node = came[node];
        }
        path.reverse();
        // Anchor the ends to the true coordinates.
        path[0] = [start.lat, start.lng];
        path[path.length - 1] = [end.lat, end.lng];
        return path;
      }

      try {
        var map = L.map('map', { zoomControl: true, attributionControl: false });
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

        var path = astar(D.start, D.end, D.grid);

        // Distance along the A* path.
        var dist = 0;
        for (var i = 1; i < path.length; i++) dist += haversine(path[i-1], path[i]);
        var eta = Math.max(2, Math.round(dist / D.speedKmh * 60));

        // Casing + route line for contrast over map tiles.
        L.polyline(path, { color: '#F5F1E8', weight: 9, opacity: 0.9 }).addTo(map);
        L.polyline(path, { color: '#D4322C', weight: 5, opacity: 1 }).addTo(map);

        var youIcon = L.divIcon({ className: '', html: '<div class="bb-pin bb-you">You</div>' });
        var shopIcon = L.divIcon({ className: '', html: '<div class="bb-pin bb-shop">Shop</div>' });
        L.marker([D.start.lat, D.start.lng], { icon: youIcon }).addTo(map);
        L.marker([D.end.lat, D.end.lng], { icon: shopIcon }).addTo(map);

        map.fitBounds(path, { padding: [50, 50], maxZoom: 16 });
        post({ type: 'route', distanceKm: Math.round(dist * 100) / 100, etaMin: eta });
      } catch (err) {
        post({ type: 'error', message: String(err) });
      }
    })();
  </script>
</body>
</html>`;
}

const styles = StyleSheet.create({
  root: { flex: 1, overflow: 'hidden' },
  web: { flex: 1, backgroundColor: '#FAF7F2' },
});
