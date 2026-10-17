const { TOPLAM, rotalar, cizgiyeOturt, konumdanNoktaya } = require("./rota");

const PENCERE = 12;
const ALFA = 0.3;

console.log({ TOPLAM, PENCERE, ALFA });

function konumGuncelle(dolmus, lat, lng) {
  const rota = rotalar[dolmus.hat];
  const oturan = cizgiyeOturt(lat, lng);
  const simdi = Date.now() / 1000;

  let fark = oturan.mesafe - dolmus.olcumMesafe;

  if (fark < -TOPLAM / 2) fark += TOPLAM; // tur sarması
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
  dolmus.rotaMesafe = (((tahmin + ALFA * sapma) % TOPLAM) + TOPLAM) % TOPLAM;

  const nokta = konumdanNoktaya(dolmus.rotaMesafe);
  dolmus.lat = nokta.lat;
  dolmus.lng = nokta.lng;

  const siradaki =
    rota.find((d) => d.rotaMesafe > dolmus.rotaMesafe) || rota[0];
  dolmus.siradakiDurak = siradaki.durakAd;

  const hizMs = dolmus.hiz / 3.6;
  dolmus.eta = hizMs < 0.5 ? null : duragaKalanMesafe(dolmus, siradaki) / hizMs;
}

function farkiDuzelt(x) {
  return ((((x + TOPLAM / 2) % TOPLAM) + TOPLAM) % TOPLAM) - TOPLAM / 2;
}

function duragaKalanMesafe(dolmus, durak) {
  let kalan = durak.rotaMesafe - dolmus.rotaMesafe;
  if (kalan < 0) {
    kalan += TOPLAM; //durak dolmuşun gerisinde kaldıysa 1 tur ekleyin.
  }
  return kalan;
}

module.exports = {
  konumGuncelle,
  duragaKalanMesafe,
};
