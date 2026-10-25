/* سكرتيري — المواقع ووقت الطريق */
(function () {
  'use strict';
  const SK = window.SK = window.SK || {};
  const A = window.SKNative;
  const cbs = {};
  let n = 0;
  const key = () => (SK.store && SK.store.settings.mapsKey) || '';

  function nativeCall(method, args) {
    return new Promise((res, rej) => {
      const id = 'g' + (++n) + '_' + Date.now();
      cbs[id] = { res, rej };
      try { A[method].apply(A, args.concat([id])); } catch (e) { delete cbs[id]; rej(e); }
      setTimeout(() => { if (cbs[id]) { delete cbs[id]; rej(new Error('انتهى الوقت')); } }, 40000);
    });
  }
  window.SKBridge = window.SKBridge || {};
  window.SKBridge.onGeo = (id, json) => {
    const cb = cbs[id]; if (!cb) return; delete cbs[id];
    let o = {}; try { o = typeof json === 'string' ? JSON.parse(json) : json; } catch (e) { }
    if (o && o.error) cb.rej(new Error(o.error)); else cb.res(o);
  };

  const G = SK.geo = {
    hasKey: () => !!key(),

    // بحث عن مكان بالاسم
    async search(q) {
      q = String(q || '').trim(); if (!q) return [];
      if (key()) {
        try {
          const r = await fetch('https://places.googleapis.com/v1/places:searchText', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key(), 'X-Goog-FieldMask': 'places.displayName,places.formattedAddress,places.location' },
            body: JSON.stringify({ textQuery: q, languageCode: 'ar', regionCode: 'SA', maxResultCount: 8 })
          });
          const d = await r.json();
          if (d.places) return d.places.map(p => ({ name: p.displayName && p.displayName.text || q, address: p.formattedAddress || '', lat: p.location.latitude, lng: p.location.longitude, src: 'google' }));
        } catch (e) { /* نرجع للبحث المجاني */ }
      }
      const url = 'https://nominatim.openstreetmap.org/search?format=jsonv2&limit=8&accept-language=ar&countrycodes=sa&q=' + encodeURIComponent(q);
      const r = await fetch(url, { headers: { 'Accept': 'application/json' } });
      const d = await r.json();
      return (d || []).map(p => ({ name: p.name || (p.display_name || '').split('،')[0].split(',')[0], address: p.display_name || '', lat: +p.lat, lng: +p.lon, src: 'osm' }));
    },

    // رابط من خرائط جوجل (يقبل الروابط القصيرة في التطبيق)
    async fromLink(url) {
      url = String(url || '').trim();
      let full = url;
      if (/goo\.gl|maps\.app/.test(url) && A && A.resolveUrl) {
        try { const o = await nativeCall('resolveUrl', [url]); full = o.url || url; } catch (e) { }
      }
      const pick = (re) => { const m = full.match(re); return m ? { lat: +m[1], lng: +m[2] } : null; };
      const ll = pick(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/) || pick(/@(-?\d+\.\d+),(-?\d+\.\d+)/) || pick(/[?&](?:q|query|ll|destination)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/) || pick(/^(-?\d+\.\d+),\s*(-?\d+\.\d+)$/);
      if (!ll) throw new Error('ما قدرت أقرأ الموقع من الرابط');
      let name = '';
      const m = full.match(/\/place\/([^/@]+)/); if (m) { try { name = decodeURIComponent(m[1].replace(/\+/g, ' ')); } catch (e) { } }
      return { name: name || 'موقع من خرائط جوجل', address: '', lat: ll.lat, lng: ll.lng, src: 'link' };
    },

    // موقعي الحالي
    async here() {
      if (A && A.getLocation) return nativeCall('getLocation', []);
      return new Promise((res, rej) => {
        if (!navigator.geolocation) return rej(new Error('الموقع غير متاح'));
        navigator.geolocation.getCurrentPosition(p => res({ lat: p.coords.latitude, lng: p.coords.longitude }), () => rej(new Error('اسمح بالوصول للموقع')), { enableHighAccuracy: true, timeout: 15000, maximumAge: 120000 });
      });
    },

    // وقت الطريق بالدقائق من موقعي الحالي
    async travel(lat, lng) {
      if (A && A.travelTime) return nativeCall('travelTime', [String(lat), String(lng)]);
      const me = await G.here();
      if (key()) {
        try {
          const r = await fetch('https://routes.googleapis.com/directions/v2:computeRoutes', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': key(), 'X-Goog-FieldMask': 'routes.duration,routes.distanceMeters' },
            body: JSON.stringify({ origin: { location: { latLng: { latitude: me.lat, longitude: me.lng } } }, destination: { location: { latLng: { latitude: lat, longitude: lng } } }, travelMode: 'DRIVE', routingPreference: 'TRAFFIC_AWARE' })
          });
          const d = await r.json();
          if (d.routes && d.routes[0]) return { minutes: Math.ceil(parseInt(d.routes[0].duration, 10) / 60), km: Math.round(d.routes[0].distanceMeters / 100) / 10, src: 'google' };
        } catch (e) { }
      }
      const r = await fetch(`https://router.project-osrm.org/route/v1/driving/${me.lng},${me.lat};${lng},${lat}?overview=false`);
      const d = await r.json();
      if (!d.routes || !d.routes[0]) throw new Error('ما قدرت أحسب الطريق');
      return { minutes: Math.ceil(d.routes[0].duration * 1.3 / 60), km: Math.round(d.routes[0].distance / 100) / 10, src: 'osm' };
    },

    mapsUrl: (p) => `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`
  };
})();
