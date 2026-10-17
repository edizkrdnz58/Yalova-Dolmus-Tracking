const http = require("http");
const fs = require("fs");
const path = require("path");

const dolmuslar = [
  {
    id: "1",
    hat: "Kampüs",
    lat: 40.651114538720336,
    lng: 29.218212991624526,
    hiz: 0,
    rotaMesafe: 0,
    gercekMesafe: 0,
    katedilen: 0,
    gecmis: [],
    olcumMesafe: 0,
    sonZaman: Date.now() / 1000,
  },
  {
    id: "2",
    hat: "Hastane",
    lat: 40.63398685647124,
    lng: 29.26833534655411,
    hiz: 0,
    rotaMesafe: 0,
    gercekMesafe: 0,
    katedilen: 0,
    gecmis: [],
  },
  {
    id: "3",
    hat: "Toki",
    lat: 40.63828465555746,
    lng: 29.257076998362496,
    hiz: 0,
    rotaMesafe: 0,
    gercekMesafe: 0,
    katedilen: 0,
    gecmis: [],
  },
];

const rotaDosyasi = JSON.parse(
  fs.readFileSync(path.join(__dirname, "kampus-rota.geojson"), "utf-8"),
);

const kampusCizgisi = rotaDosyasi.features[0].geometry.coordinates.map(
  ([boylam, enlem]) => ({ lat: enlem, lng: boylam }),
);

const birikimli = [0];

for (let i = 1; i < kampusCizgisi.length; i++) {
  const onceki = kampusCizgisi[i - 1];
  const simdiki = kampusCizgisi[i];
  const parca = metreCinsindenMesafe(
    onceki.lat,
    onceki.lng,
    simdiki.lat,
    simdiki.lng,
  );
  birikimli.push(birikimli[i - 1] + parca);
}

const TOPLAM = birikimli[birikimli.length - 1];
const HIZ = 10; // m/s 36 km/h
const PENCERE = 12;
const ALFA = 0.3;


function cizgiyeOturt(lat, lng) {
  let enYakin = { sapma: Infinity, mesafe: 0 };

  for (let i = 0; i < kampusCizgisi.length - 1; i++) {
    const a = kampusCizgisi[i];
    const b = kampusCizgisi[i + 1];

    // a noktasını orijin kabul edip her şeyi metreye çeviriyoruz
    const kx = Math.cos((a.lat * Math.PI) / 180) * 111195;
    const ky = 111195;

    const bx = (b.lng - a.lng) * kx;
    const by = (b.lat - a.lat) * ky;
    const px = (lng - a.lng) * kx;
    const py = (lat - a.lat) * ky;

    const uzunlukKare = bx * bx + by * by;
    let t = 0;

    if (uzunlukKare > 0) {
      t = Math.max(0, Math.min(1, (px * bx + py * by) / uzunlukKare));
    }

    t = Math.max(0, Math.min(1, t));

    const sapma = Math.hypot(px - t * bx, py - t * by);

    if (sapma < enYakin.sapma) {
      enYakin = {
        sapma: sapma,
        mesafe: birikimli[i] + t * (birikimli[i + 1] - birikimli[i]),
      };
    }
  }

  return enYakin;
}

function konumdanNoktaya(mesafe) {
  for (let i = 0; i < birikimli.length - 1; i++) {
    if (mesafe <= birikimli[i + 1]) {
      const parcaUzunlugu = birikimli[i + 1] - birikimli[i];
      const t = parcaUzunlugu > 0 ? (mesafe - birikimli[i]) / parcaUzunlugu : 0;
      const a = kampusCizgisi[i];
      const b = kampusCizgisi[i + 1];
      return {
        lat: a.lat + t * (b.lat - a.lat),
        lng: a.lng + t * (b.lng - a.lng),
      };
    }
  }
  return kampusCizgisi[kampusCizgisi.length - 1];
}

function gurultuEkle(lat, lng, metre) {
  const dLat = ((Math.random() - 0.5) * 2 * metre) / 111195;
  const dLng = ((Math.random() - 0.5) * 2 * metre) / (111195 * Math.cos((lat * Math.PI) / 180));
  return { lat: lat + dLat, lng: lng + dLng };
}

function konumGuncelle(dolmus, lat, lng) {
  const rota = rotalar[dolmus.hat];
  const oturan = cizgiyeOturt(lat, lng);
  const simdi = Date.now() / 1000;

  let fark = oturan.mesafe - dolmus.olcumMesafe;

  if (fark < -TOPLAM / 2) fark += TOPLAM;   // tur sarması
  dolmus.katedilen += fark;
  dolmus.olcumMesafe = oturan.mesafe;

  dolmus.gecmis.push({ t: Date.now() / 1000, yol: dolmus.katedilen }); // O anın zamanını saniye cinsinden kaydediyoruz
  if (dolmus.gecmis.length > PENCERE) dolmus.gecmis.shift();

  if (dolmus.gecmis.length >= 2) {
    const ilk = dolmus.gecmis[0];
    const son = dolmus.gecmis[dolmus.gecmis.length - 1];
    const gecenSure = son.t - ilk.t;

    if (gecenSure >= 1) {
      const olculenHizMs = (son.yol - ilk.yol) / gecenSure;
      dolmus.hiz = Math.max(0, olculenHizMs * 3.6); // m/s to km/h
      }
    }
    
  const dt = simdi - dolmus.sonZaman;
  dolmus.sonZaman = simdi;

  const tahmin = dolmus.rotaMesafe + (dolmus.hiz / 3.6) * dt; // km/h to m/s
  const sapma = farkiDuzelt(oturan.mesafe - tahmin);
  dolmus.rotaMesafe = ((tahmin + ALFA * sapma) % TOPLAM + TOPLAM) % TOPLAM;
  
  const nokta = konumdanNoktaya(dolmus.rotaMesafe);
  dolmus.lat = nokta.lat;
  dolmus.lng = nokta.lng;

  const siradaki = rota.find((d) => d.rotaMesafe > dolmus.rotaMesafe) || rota[0];
  dolmus.siradakiDurak = siradaki.durakAd;

  const hizMs = dolmus.hiz / 3.6;
  dolmus.eta = hizMs < 0.5 ? null : duragaKalanMesafe(dolmus, siradaki) / hizMs;

}

  function farkiDuzelt(x) {
    return((((x + TOPLAM / 2) % TOPLAM) + TOPLAM) % TOPLAM) - TOPLAM / 2;
  }

const rotalar = {
  Kampüs: [
    { durakAd: "KYK", lat: 40.64812743875728, lng: 29.211592698229136 },
    { durakAd: "Kampüs", lat: 40.651114538720336, lng: 29.218212991624526 },
    { durakAd: "Petrol", lat: 40.64591790117539, lng: 29.232186885553055 },
    { durakAd: "Termal Yolu", lat: 40.65370219322155, lng: 29.24513843542296 },
    { durakAd: "Stad", lat: 40.652050228690435, lng: 29.257726878455834 },
    { durakAd: "Cumhuriyet", lat: 40.65221820211525, lng: 29.27010838885775 },
    { durakAd: "Heykel", lat: 40.6574897680814, lng: 29.27056822490623 },
    //{ durakAd: "Star AVM", lat: 40.65882051425163, lng: 29.276699371657106 },
  ],
};

rotalar.Kampüs.forEach((durak) => {
  const s = cizgiyeOturt(durak.lat, durak.lng);

  if (s.sapma > 20) {
    console.warn(
      `Durak ${durak.durakAd} cizgiye oturtulamadı, sapma: ${s.sapma.toFixed(2)} m`,
    );
  }

  durak.rotaMesafe = s.mesafe;
});

rotalar.Kampüs.forEach((durak) => {
  const nokta = konumdanNoktaya(durak.rotaMesafe);
  const fark = metreCinsindenMesafe(durak.lat, durak.lng, nokta.lat, nokta.lng);

  console.log(durak.durakAd.padEnd(12), "fark:", Math.round(fark), "m");
});

console.log(konumdanNoktaya(0));
console.log(konumdanNoktaya(birikimli[birikimli.length - 1]));

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

function duragaKalanMesafe(dolmus, durak) {
  let kalan = durak.rotaMesafe - dolmus.rotaMesafe;
  if (kalan < 0) {
    kalan += birikimli[birikimli.length - 1]; //durak dolmuşun gerisinde kaldıysa 1 tur ekleyin.
  }
  return kalan;
}

setInterval(() => {
  dolmuslar.forEach((dolmus) => {
    if (!rotalar[dolmus.hat]) return;

      dolmus.gercekMesafe = (dolmus.gercekMesafe + HIZ) % TOPLAM;
      const gercek = konumdanNoktaya(dolmus.gercekMesafe);

      const olculen = gurultuEkle(gercek.lat, gercek.lng, 8);

      konumGuncelle(dolmus, olculen.lat, olculen.lng);
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
  } else if (adres.pathname === "/api/rotalar") {
    cevap.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
    cevap.end(JSON.stringify(rotalar));
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
          const kalanMetre = duragaKalanMesafe(dolmus, rota[durak]);
          const hizMs = dolmus.hiz / 3.6; // km/h to m/s
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


