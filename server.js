const http = require("http");
const fs = require("fs");
const path = require("path");

const { metreCinsindenMesafe } = require("./geo.js");
const { duragaKalanMesafe } = require("./takip.js");
const { rotalar } = require("./rota.js");

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

const { simulatoruBaslat } = require("./simulator");
simulatoruBaslat(dolmuslar);

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
