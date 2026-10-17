const fs = require("fs");
const path = require("path");
const { metreCinsindenMesafe } = require("./geo");

const birikimli = [0];

const rotaDosyasi = JSON.parse(
  fs.readFileSync(path.join(__dirname, "kampus-rota.geojson"), "utf-8"),
);

const kampusCizgisi = rotaDosyasi.features[0].geometry.coordinates.map(
  ([boylam, enlem]) => ({ lat: enlem, lng: boylam }),
);

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

rotalar.Kampüs.forEach((durak) => {
  const nokta = konumdanNoktaya(durak.rotaMesafe);
  const fark = metreCinsindenMesafe(durak.lat, durak.lng, nokta.lat, nokta.lng);
});

rotalar.Kampüs.forEach((durak) => {
  const s = cizgiyeOturt(durak.lat, durak.lng);

  if (s.sapma > 20) {
    console.warn(
      `Durak ${durak.durakAd} cizgiye oturtulamadı, sapma: ${s.sapma.toFixed(2)} m`,
    );
  }

  durak.rotaMesafe = s.mesafe;
});

module.exports = {
  cizgiyeOturt,
  konumdanNoktaya,
  TOPLAM,
  rotalar,
};
