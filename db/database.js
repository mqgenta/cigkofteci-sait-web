const fs = require('fs');
const path = require('path');
const initSqlJs = require('sql.js');

const DATA_DIR = path.join(__dirname, '..', 'data');
const DB_PATH = path.join(DATA_DIR, 'database.sqlite');

let db = null;

function saveDb() {
  if (!db) return;
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
  const data = db.export();
  fs.writeFileSync(DB_PATH, Buffer.from(data));
}

function all(sql, params = []) {
  const stmt = db.prepare(sql);
  stmt.bind(params);
  const rows = [];
  while (stmt.step()) {
    rows.push(stmt.getAsObject());
  }
  stmt.free();
  return rows;
}

function get(sql, params = []) {
  const rows = all(sql, params);
  return rows.length > 0 ? rows[0] : null;
}

function run(sql, params = []) {
  db.run(sql, params);
  saveDb();
}

async function initDatabase() {
  const SQL = await initSqlJs();
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }

  if (fs.existsSync(DB_PATH)) {
    const fileBuffer = fs.readFileSync(DB_PATH);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  db.run(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      category TEXT NOT NULL,
      description TEXT NOT NULL,
      price REAL NOT NULL,
      portion_info TEXT DEFAULT '',
      image_url TEXT DEFAULT '/images/durum.jpg',
      like_badge TEXT DEFAULT '',
      is_featured INTEGER DEFAULT 0,
      is_available INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.run(`
    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      customer_name TEXT NOT NULL,
      phone TEXT NOT NULL,
      order_type TEXT NOT NULL,
      quantity_note TEXT NOT NULL,
      delivery_date TEXT NOT NULL,
      message TEXT DEFAULT '',
      status TEXT DEFAULT 'Beklemede',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  const countRow = get('SELECT COUNT(*) AS count FROM products');
  if (!countRow || countRow.count === 0) {
    const seedProducts = [
      ['Çiğ Köfte Dürüm (90 gr)', 'Çiğ Köfteler', 'İsteğe göre göbek marul, nar ekşisi, acı sos, maydanoz, limon.', 155, '90 gr', '/images/durum.jpg', '%75 Beğenildi', 1],
      ['Mega Çiğ Köfte Dürüm (125 gr)', 'Çiğ Köfteler', 'Çift lavaş, isteğe göre göbek marul, nar ekşisi, acı sos, maydanoz, limon.', 165, '125 gr • Çift Lavaş', '/images/durum.jpg', '%91 Beğenildi', 1],
      ['Double Çiğ Köfte Dürüm (150 gr)', 'Çiğ Köfteler', 'Çift lavaş, isteğe göre göbek marul, nar ekşisi, acı sos, maydanoz, limon.', 170, '150 gr • Çift Lavaş', '/images/durum.jpg', '%57 Beğenildi', 0],
      ['Doritoslu Cipsli Çiğ Köfte Dürüm', 'Çiğ Köfteler', '90 gr çiğ köfte, çıtır Doritos ve isteğe bağlı göbek, limon, nar ekşisi, acı sos.', 170, '90 gr', '/images/doritos_durum.jpg', '', 0],
      ['Doritoslu Cipsli Çiğköfte Duble Dürüm', 'Çiğ Köfteler', '150 gr çiğ köfte, çıtır Doritos ve isteğe bağlı yeşillik & soslar.', 180, '150 gr', '/images/doritos_durum.jpg', '%85 Beğenildi', 1],
      ['Doritoslu Cipsli Çiğköfte Mega Dürüm', 'Çiğ Köfteler', '125 gr çiğ köfte, Doritos cipsi ve taze garnitürler.', 190, '125 gr', '/images/doritos_durum.jpg', '', 0],
      ['Çiğ Köfte (200 gr) Porsiyon', 'Çiğ Köfteler', '3 adet lavaş. İsteğe göre göbek marul, nar ekşisi, acı sos, maydanoz, limon.', 385, '200 gr', '/images/porsiyon.jpg', '', 0],
      ['Çiğ Köfte (500 gr) Porsiyon', 'Çiğ Köfteler', '6 adet lavaş. İsteğe göre göbek marul, nar ekşisi, acı sos, maydanoz, limon.', 520, '500 gr', 'https://cdn.tgoapps.com/mnresize/256/-/tgo2/spm/prod/meal/media/images/product/2043/86104_1721818569056.jpg', '%66 Beğenildi', 1],
      ['Çiğ Köfte (500 gr) Garnitürsüz', 'Çiğ Köfteler', '6 adet lavaş ile yeşilliksiz ekonomik paket.', 465, '500 gr', '/images/porsiyon.jpg', '', 0],
      ['Çiğ Köfte (600 gr) Porsiyon', 'Çiğ Köfteler', '7 adet lavaş. İsteğe göre göbek marul, nar ekşisi, acı sos, maydanoz, limon.', 595, '600 gr', '/images/porsiyon.jpg', '', 0],
      ['Çiğ Köfte (800 gr) Porsiyon', 'Çiğ Köfteler', '8 adet lavaş, isteğe göre göbek marul, nar ekşisi, acı sos, maydanoz, limon.', 725, '800 gr', '/images/porsiyon.jpg', '', 0],
      ['Çiğ Köfte (1 Kg) Porsiyon', 'Çiğ Köfteler', '10 adet lavaş. İsteğe göre göbek marul, nar ekşisi, acı sos, maydanoz, limon.', 850, '1000 gr', '/images/porsiyon.jpg', '%85 Beğenildi', 1],
      ['Çiğ Köfte (1 Kg) Garnitürsüz', 'Çiğ Köfteler', '10 adet lavaş ile yeşilliksiz aile boyu paket.', 695, '1000 gr', '/images/porsiyon.jpg', '', 0],

      ['Sade Pilav (1 Porsiyon)', 'Pilavlar', '300 gr tereyağlı pirinç pilavı, cin biber ve karabiber ile servis edilir.', 210, '300 gr', '/images/sade_pilav.jpg', '', 0],
      ['Tavuklu Pilav (1 Porsiyon)', 'Pilavlar', '300 gr pirinç pilavı, 50 gr didiklenmiş tavuk, cin biber ve karabiber ile.', 250, '350 gr', '/images/pilav.jpg', '', 1],
      ['Sade Pilav (1.5 Porsiyon)', 'Pilavlar', '400 gr pirinç pilavı, cin biber ve karabiber ile servis edilir.', 230, '400 gr', '/images/sade_pilav.jpg', '', 0],
      ['Tavuklu Pilav (1.5 Porsiyon)', 'Pilavlar', '400 gr pirinç pilavı, 75 gr tavuk, cin biber ve karabiber ile.', 270, '475 gr', '/images/pilav.jpg', '', 0],

      ['Çiğ Köfte Dürüm (90 gr) + K.Ayran', 'Menüler', 'Dürüm + Küçük Ayran avantajlı menü.', 200, 'Menü', '/images/menu_combo.jpg', '', 0],
      ['Mega Çiğ Köfte Dürüm + K.Ayran', 'Menüler', '125 gr çift lavaş Mega Dürüm + Küçük Ayran.', 210, 'Menü', '/images/menu_combo.jpg', '', 0],
      ['Double Çiğ Köfte Dürüm + B.Ayran', 'Menüler', '150 gr çift lavaş Double Dürüm + Büyük Ayran.', 220, 'Menü', '/images/menu_combo.jpg', '%84 Beğenildi', 1],
      ['Çiğ Köfte Dürüm + K.Ayran & Tatlı', 'Menüler', 'Dürüm + Bisküvili Tatlı + Küçük Ayran.', 290, 'Tam Menü', '/images/menu_combo.jpg', '', 0],
      ['Mega Çiğ Köfte Dürüm + K.Ayran & Tatlı', 'Menüler', 'Mega Dürüm + Bisküvili Tatlı + Küçük Ayran.', 300, 'Tam Menü', '/images/menu_combo.jpg', '', 0],
      ['Double Çiğ Köfte Dürüm + B.Ayran & Tatlı', 'Menüler', 'Double Dürüm + Bisküvili Tatlı + Büyük Ayran.', 310, 'Tam Menü', '/images/menu_combo.jpg', '', 0],

      ['Bisküvili Tatlı (Plastik Kap)', 'Tatlılar', 'Bisküvi ve kakaolu puding ile hazırlanan klasik lezzet.', 110, '1 Porsiyon', '/images/biskuvili_tatli.jpg', '%100 Beğenildi', 1],
      ['Donut Kakaolu (40 gr)', 'Tatlılar', 'Kakao kaplamalı kakao soslu yumuşacık kek.', 60, '40 gr', '/images/donut.jpg', '', 0],
      ['Donut Muzlu (40 gr)', 'Tatlılar', 'Muz krema kaplamalı soslu kek.', 55, '40 gr', '/images/donut.jpg', '', 0],

      ['Ekşi Ayran (275 cl)', 'İçecekler', 'Buz gibi ferahlatıcı geleneksel ekşi ayran.', 70, '275 ml', '/images/ayran.jpg', '%91 Beğenildi', 0],
      ['Ayran Büyük (30 cl)', 'İçecekler', 'Soğuk büyük boy ayran.', 65, '300 ml', '/images/ayran.jpg', '%78 Beğenildi', 0],
      ['Ayran Küçük (20 cl)', 'İçecekler', 'Soğuk küçük boy ayran.', 55, '200 ml', '/images/ayran.jpg', '', 0],
      ['Doğanay Şalgam Suyu (30 cl)', 'İçecekler', 'Acılı / acısız pet şişe şalgam suyu.', 75, '300 ml', '/images/salgam.jpg', '', 0],
      ['Şalgam Suyu (1 L)', 'İçecekler', 'Aile boyu 1 litre şalgam suyu.', 110, '1000 ml', '/images/salgam.jpg', '', 0],
      ['Cola Sarıyer (330 ml)', 'İçecekler', 'Helal sertifikalı kutu kola.', 85, '330 ml', '/images/kola_soda_su.jpg', '', 0],
      ['Limonlu Soda (20 cl)', 'İçecekler', 'Cam şişe limonlu maden suyu.', 60, '200 ml', '/images/kola_soda_su.jpg', '', 0],
      ['Su (50 cl)', 'İçecekler', 'Pet şişe içme suyu.', 50, '500 ml', '/images/kola_soda_su.jpg', '', 0],

      ['Lavaş (Adet)', 'Yan Ürün & Sos', 'Günlük taze ince lavaş ekmeği.', 45, '1 Adet', '/images/lavas_limon.jpg', '', 0],
      ['Limon (Adet)', 'Yan Ürün & Sos', 'Taze sıkmalık bütün limon.', 55, '1 Adet', '/images/lavas_limon.jpg', '', 0],
      ['Acı Sos (Küçük)', 'Yan Ürün & Sos', 'Özel tarif acı sos.', 40, 'Küçük', '/images/tursu_sos.jpg', '', 0],
      ['Tatlı Sos / Nar Ekşisi (Küçük)', 'Yan Ürün & Sos', 'Yoğun kıvamlı tatlı sos.', 40, 'Küçük', '/images/tursu_sos.jpg', '%85 Beğenildi', 0],
      ['Acı Biber Turşusu (350 gr)', 'Yan Ürün & Sos', 'Kütür kütür acı biber turşusu.', 130, '350 gr', '/images/tursu_sos.jpg', '', 0],
      ['Biberiye Turşusu (350 gr)', 'Yan Ürün & Sos', 'Taze biberiye turşusu.', 130, '350 gr', '/images/tursu_sos.jpg', '', 0]
    ];

    for (const item of seedProducts) {
      db.run(
        `INSERT INTO products (name, category, description, price, portion_info, image_url, like_badge, is_featured) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
        item
      );
    }
    saveDb();
  }
}

module.exports = {
  initDatabase,
  all,
  get,
  run
};
