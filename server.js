const http = require("http");
const fs = require("fs");
const path = require("path");

const dolmuslar = [
  {
    id: "1",
    hat: "Kampüs",
    lat: 40.651114538720336,
    lng: 29.218212991624526,
    hedef: 1,
    hiz: 0,
  },
  {
    id: "2",
    hat: "Hastane",
    lat: 40.63398685647124,
    lng: 29.26833534655411,
    hedef: 1,
    hiz: 0,
  },
  {
    id: "3",
    hat: "Toki",
    lat: 40.63828465555746,
    lng: 29.257076998362496,
    hedef: 1,
    hiz: 0,
  },
];

const rotalar = {
  Kampüs: [
    { durakAd: "Kampüs", lat: 40.651114538720336, lng: 29.218212991624526 },
    { durakAd: "Petrol", lat: 40.64591790117539, lng: 29.232186885553055 },
    { durakAd: "Termal Yolu", lat: 40.65370219322155, lng: 29.24513843542296 },
    { durakAd: "Stad", lat: 40.652050228690435, lng: 29.257726878455834 },
    { durakAd: "Cumhuriyet", lat: 40.65221820211525, lng: 29.27010838885775 },
    { durakAd: "Heykel", lat: 40.6574897680814, lng: 29.27056822490623 },
    { durakAd: "Star AVM", lat: 40.65882051425163, lng: 29.276699371657106 },
  ],
};

function metreCinsindenMesafe(lat1, lng1, lat2, lng2) {
  const R = 6371000;
  const radyan = (derece) => derece * (Math.PI / 180);

  const dLat = radyan(lat2 - lat1);
  const dLng = radyan(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(radyan(lat1)) *
      Math.cos(radyan(lat2)) *
      Math.sin(dLng / 2) *
      Math.sin(dLng / 2);

  return 2 * R * Math.asin(Math.sqrt(a));
}

function duragaKalanMesafe(dolmus, rota, durakIndeksi) {
  if (durakIndeksi < 0 || durakIndeksi >= rota.length) {
    return null;
  }

  let toplam = metreCinsindenMesafe(
    dolmus.lat,
    dolmus.lng,
    rota[dolmus.hedef].lat,
    rota[dolmus.hedef].lng,
  );

  let i = dolmus.hedef;
  while (i !== durakIndeksi) {
    const sonraki = (i + 1) % rota.length;
    toplam += metreCinsindenMesafe(
      rota[i].lat,
      rota[i].lng,
      rota[sonraki].lat,
      rota[sonraki].lng,
    );

    i = sonraki;
  }
  return toplam;
}

setInterval(() => {
  dolmuslar.forEach((dolmus) => {
    const rota = rotalar[dolmus.hat];
    if (!rota) return;
    const hedef = rota[dolmus.hedef];

    // 1. eski konumları saklar
    const eskilat = dolmus.lat;
    const eskilng = dolmus.lng;

    const dlat = hedef.lat - dolmus.lat;
    const dlng = hedef.lng - dolmus.lng;
    const mesafe = Math.hypot(dlat, dlng);

    const adim = 0.0001; // Her güncellemede gidilecek mesafe

    if (mesafe <= adim) {
      dolmus.lat = hedef.lat;
      dolmus.lng = hedef.lng;
      dolmus.hedef = (dolmus.hedef + 1) % rota.length; // Sonraki hedefe geç
    } else {
      dolmus.lat += (dlat / mesafe) * adim;
      dolmus.lng += (dlng / mesafe) * adim;
    }

    // 2. yeni konum ile eski konum arasındaki mesafeyi hesaplar
    const metre = metreCinsindenMesafe(
      eskilat,
      eskilng,
      dolmus.lat,
      dolmus.lng,
    );

    dolmus.hiz = metre * 3.6; // m/s to km/h

    const kalanMetre = metreCinsindenMesafe(
      dolmus.lat,
      dolmus.lng,
      hedef.lat,
      hedef.lng,
    );

    const hizMs = dolmus.hiz / 3.6; // km/h to m/s

    if (hizMs < 0.5) {
      dolmus.eta = null;
    } else {
      dolmus.eta = kalanMetre / hizMs; // saniye cinsinden
    }

    dolmus.siradakiDurak = hedef.durakAd;
  });
}, 1000);

const sunucu = http.createServer((istek, cevap) => {
  console.log("Gelen adres:", istek.url);

  let adres;
  try {
    adres = new URL(istek.url || "/", "http://localhost");
  } catch (hata) {
    cevap.writeHead(400, { "Content-Type": "text/plain; charset=utf-8" });
    cevap.end("Geçersiz URL");
    return;
  }

  if (adres.pathname === "/") {
    fs.readFile(path.join(__dirname, "index1.html"), (hata, veri) => {
      if (hata) {
        cevap.writeHead(500, { "Content-Type": "text/plain; charset=utf-8" });
        cevap.end("Sunucu hatası");
        return;
      }

      cevap.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      cevap.end(veri);
    });
  } else if (adres.pathname === "/api/dolmuslar") {
    cevap.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    cevap.end(JSON.stringify(dolmuslar));
  } else if (adres.pathname === "/api/eta") {
    const hat = adres.searchParams.get("hat");
    const durakMetni = adres.searchParams.get("durak");
    const durak = Number(durakMetni);
    const rota = rotalar[hat];

    if (
      !rota ||
      durakMetni === null ||
      durakMetni === "" ||
      !Number.isInteger(durak) ||
      durak < 0 ||
      durak >= rota.length
    ) {
      cevap.writeHead(400, {
        "Content-Type": "application/json; charset=utf-8",
      });
      cevap.end(
        JSON.stringify({ hata: "Geçersiz hat veya durak parametresi" }),
      );
      return;
    } else {
      const etaSonuclari = dolmuslar
        .filter((dolmus) => dolmus.hat === hat)
        .map((dolmus) => {
          
          const kalanMetre = duragaKalanMesafe(dolmus, rota, durak);
          const hedef = rota[durak];
          const hizMs = dolmus.hiz / 3.6;
          return {
            dolmus: dolmus.id,
            metre: Math.round(kalanMetre),
            eta: hizMs < 0.5 ? null : Math.round(kalanMetre / hizMs),
          };
        });

      cevap.writeHead(200, {
        "Content-Type": "application/json; charset=utf-8",
      });
      cevap.end(JSON.stringify(etaSonuclari));
    }
  } else {
    cevap.writeHead(404, { "Content-Type": "application/json; charset=utf-8" });
    cevap.end(JSON.stringify({ hata: "Sayfa bulunamadı" }));
  }
});

const PORT = 3000;

sunucu.listen(PORT, () => {
  console.log(`Sunucu ${PORT} portunda çalışıyor...`);
});
