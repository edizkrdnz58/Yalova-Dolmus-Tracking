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

module.exports = {
  metreCinsindenMesafe,
};
