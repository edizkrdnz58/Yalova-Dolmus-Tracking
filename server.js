const http = require('http');
const fs = require('fs');
const path = require('path');

const dolmuslar = [
    { id: '1', hat: 'Kampüs', lat: 40.651114538720336, lng: 29.218212991624526, hedef: 1 },
    { id: '2', hat: 'Hastane', lat: 40.63398685647124, lng: 29.26833534655411, hedef: 1 },
    { id: '3', hat: 'Toki', lat: 40.63828465555746, lng: 29.257076998362496, hedef: 1 }
];

const rotalar = {
    'Kampüs':[
            {lat: 40.651114538720336, lng: 29.218212991624526 },
            {lat: 40.64591790117539,  lng: 29.232186885553055 },
            {lat: 40.64591790117539,  lng: 29.232186885553055 },
            {lat: 40.652050228690435, lng: 29.257726878455834 },
            {lat: 40.65221820211525,  lng: 29.27010838885775  },
            {lat: 40.6574897680814,   lng: 29.27056822490623  },
            {lat: 40.65882051425163,  lng: 29.276699371657106 },  
        ]
};

setInterval(() => {
    dolmuslar.forEach(dolmus => {
        const rota = rotalar[dolmus.hat];
        if (!rota) return;
        const hedef = rota[dolmus.hedef];
        const dlat = hedef.lat - dolmus.lat;
        const dlng = hedef.lng - dolmus.lng;
        const mesafe = Math.hypot(dlat, dlng);
        const adim = 0.0002; // Her güncellemede gidilecek mesafe

        if (mesafe <= adim) {
            dolmus.lat = hedef.lat;
            dolmus.lng = hedef.lng;
            dolmus.hedef = (dolmus.hedef + 1) % rota.length; // Sonraki hedefe geç
        } else {
            dolmus.lat += (dlat / mesafe) * adim;
            dolmus.lng += (dlng / mesafe) * adim;
        }
            
    });
    
}, 1000);

const sunucu = http.createServer((istek, cevap) => {
    console.log('Gelen adres:', istek.url);

    if (istek.url === '/') {
        fs.readFile(path.join(__dirname, 'index1.html'), (hata, veri) => {
            if (hata) {
                cevap.writeHead(500, { 'Content-Type': 'text/plain; charset=utf-8' });
                cevap.end('Sunucu hatası');
                return;
            }

            cevap.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
            cevap.end(veri);
        });
    } else if (istek.url === '/api/dolmuslar') {
        cevap.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
        cevap.end(JSON.stringify(dolmuslar));
    } else {
        cevap.writeHead(404, { 'Content-Type': 'application/json; charset=utf-8' });
        cevap.end(JSON.stringify({ hata: 'Sayfa bulunamadı' }));
    }
});

const PORT = 3000; 

sunucu.listen(PORT, () => {
    console.log(`Sunucu ${PORT} portunda çalışıyor...`);
});