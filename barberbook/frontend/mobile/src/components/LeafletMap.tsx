import React, { useMemo } from 'react';
import { StyleSheet, View, type StyleProp, type ViewStyle } from 'react-native';
import { WebView, type WebViewMessageEvent } from 'react-native-webview';

/**
 * Lightweight map built on Leaflet + OpenStreetMap tiles inside a WebView.
 *
 * Chosen over `react-native-maps` because it needs NO Google API key and adds
 * only the (comparatively small) WebView native module instead of pulling in
 * Google Play Services Maps across every CPU arch. Requires connectivity at
 * runtime (tiles + the Leaflet CDN bundle).
 *
 * Two modes:
 *   - Display: pass `markers` (e.g. nearby shops); tapping a marker fires
 *     `onMarkerPress(id)`.
 *   - Picker: set `selectable` and handle `onSelect(lat, lng)` — the user taps
 *     (or drags the pin) to choose a location.
 */
export interface MapMarker {
  id: string;
  lat: number;
  lng: number;
  /** Short text shown inside the marker pill, e.g. '₹₹'. */
  label?: string;
}

interface LatLng {
  lat: number;
  lng: number;
}

interface Props {
  markers?: MapMarker[];
  center?: LatLng;
  zoom?: number;
  selectable?: boolean;
  selected?: LatLng | null;
  onMarkerPress?: (id: string) => void;
  onSelect?: (lat: number, lng: number) => void;
  style?: StyleProp<ViewStyle>;
}

const CALICUT: LatLng = { lat: 11.2588, lng: 75.7804 };

export function LeafletMap({
  markers = [],
  center,
  zoom = 13,
  selectable = false,
  selected = null,
  onMarkerPress,
  onSelect,
  style,
}: Props) {
  const initialCenter = center ?? markers[0] ?? selected ?? CALICUT;

  // Rebuild the document only when the marker set (or mode) changes — NOT on
  // every `selected` change, so dragging the picker pin doesn't reload tiles.
  const markersKey = markers.map((m) => `${m.id}:${m.lat},${m.lng}`).join('|');
  const html = useMemo(
    () =>
      buildHtml({
        markers,
        center: initialCenter,
        zoom,
        selectable,
        selected: selected ?? initialCenter,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [markersKey, selectable, zoom],
  );

  const handleMessage = (e: WebViewMessageEvent) => {
    try {
      const msg = JSON.parse(e.nativeEvent.data) as {
        type?: string;
        id?: string;
        lat?: number;
        lng?: number;
      };
      if (msg.type === 'marker' && msg.id != null) {
        onMarkerPress?.(String(msg.id));
      } else if (
        msg.type === 'select' &&
        typeof msg.lat === 'number' &&
        typeof msg.lng === 'number'
      ) {
        onSelect?.(msg.lat, msg.lng);
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
        // Tiles + CDN are https; keep mixed content off.
        setSupportMultipleWindows={false}
      />
    </View>
  );
}

function buildHtml(opts: {
  markers: MapMarker[];
  center: LatLng;
  zoom: number;
  selectable: boolean;
  selected: LatLng;
}): string {
  const data = JSON.stringify(opts);
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
  <link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
  <style>
    html, body, #map { height: 100%; margin: 0; padding: 0; background: #FAF7F2; }
    .bb-pin { background:#D4322C; color:#F5F1E8; border:2px solid #F5F1E8; border-radius:14px;
      padding:3px 9px; font:700 12px -apple-system,Roboto,Helvetica,Arial,sans-serif;
      white-space:nowrap; box-shadow:0 1px 4px rgba(0,0,0,.35); transform:translate(-50%,-100%); }
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
      try {
        var map = L.map('map', { zoomControl: true, attributionControl: false })
          .setView([D.center.lat, D.center.lng], D.zoom || 13);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', { maxZoom: 19 }).addTo(map);

        (D.markers || []).forEach(function (m) {
          var icon = L.divIcon({ className: '', html: '<div class="bb-pin">' + (m.label || '•') + '</div>' });
          var mk = L.marker([m.lat, m.lng], { icon: icon }).addTo(map);
          mk.on('click', function () { post({ type: 'marker', id: m.id }); });
        });

        if (D.markers && D.markers.length > 1) {
          try { map.fitBounds(D.markers.map(function (m) { return [m.lat, m.lng]; }), { padding: [44, 44], maxZoom: 15 }); } catch (e) {}
        }

        if (D.selectable) {
          var marker = L.marker([D.selected.lat, D.selected.lng], { draggable: true }).addTo(map);
          function emit(ll){ post({ type: 'select', lat: ll.lat, lng: ll.lng }); }
          marker.on('dragend', function () { emit(marker.getLatLng()); });
          map.on('click', function (e) { marker.setLatLng(e.latlng); emit(e.latlng); });
        }
        post({ type: 'ready' });
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
