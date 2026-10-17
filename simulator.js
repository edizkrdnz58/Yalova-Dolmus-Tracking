const { TOPLAM, rotalar, konumdanNoktaya } = require("./rota");
const { konumGuncelle } = require("./takip");

const HIZ = 10;

console.log({ TOPLAM, HIZ });

function gurultuEkle(lat, lng, metre) {
  const dLat = ((Math.random() - 0.5) * 2 * metre) / 111195;
  const dLng =
    ((Math.random() - 0.5) * 2 * metre) /
    (111195 * Math.cos((lat * Math.PI) / 180));
  return { lat: lat + dLat, lng: lng + dLng };
}

function simulatoruBaslat(dolmuslar) {
  setInterval(() => {
    dolmuslar.forEach((dolmus) => {
      if (!rotalar[dolmus.hat]) return;

      dolmus.gercekMesafe = (dolmus.gercekMesafe + HIZ) % TOPLAM;
      const gercek = konumdanNoktaya(dolmus.gercekMesafe);

      const olculen = gurultuEkle(gercek.lat, gercek.lng, 8);

      konumGuncelle(dolmus, olculen.lat, olculen.lng);
    });
  }, 1000);
}

module.exports = {
  simulatoruBaslat,
};
