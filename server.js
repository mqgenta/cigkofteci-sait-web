require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const db = require('./db/database');

const app = express();
const PORT = process.env.PORT || 3000;

const SHOP_INFO = {
  brand: 'Çiğköfteci Sait',
  branch: 'Ümraniye Şehzade Caddesi Şubesi',
  address: 'İstiklal Mah., Şehzade Cad. No:36/B, Ümraniye / İstanbul',
  phoneDisplay: '+90 532 207 58 57',
  phoneRaw: '905322075857',
  hoursWeekday: '12:15 – 00:30',
  hoursFriday: '13:30 – 00:30',
  paymentMethods: [
    'Nakit',
    'Kredi / Banka Kartı',
    'Multinet',
    'Pluxee (Sodexo)',
    'Ticket',
    'Metropol',
    'Setcard'
  ],
  links: {
    yemeksepeti: 'https://www.yemeksepeti.com/restaurant/wtw4/cig-kofteci-sait-wtw4',
    migros: 'https://www.migros.com.tr/yemek/cig-kofteci-sait-umraniye-istiklal-mah-sehzade-cad-st-1b81f',
    trendyol: 'https://tgoyemek.com/restoranlar/2043',
    googleMaps: 'https://share.google/NvmhqW7AAedZ9r6vE',
    googleMapsEmbed: 'https://maps.google.com/maps?q=%C3%87i%C4%9Fk%C3%B6fteci%20Sait%20%C4%B0stiklal%20Mahallesi%20%C5%9Eehzade%20Caddesi%2036%20%C3%9Cmraniye%20%C4%B0stanbul&t=&z=16&ie=UTF8&iwloc=&output=embed',
    whatsapp: 'https://wa.me/905322075857?text=' + encodeURIComponent('Merhaba, Çiğköfteci Sait Ümraniye Şehzade Caddesi şubesinden sipariş vermek istiyorum.')
  }
};

const CATEGORIES = ['Çiğ Köfteler', 'Pilavlar', 'Menüler', 'İçecekler', 'Tatlılar', 'Yan Ürün & Sos'];

const TRENDYOL_STATS = {
  totalRatings: '8.000+',
  totalComments: '2.100+'
};

const TRENDYOL_REVIEWS = [
  { name: 'Bisküvili Tatlı', rate: 100 },
  { name: 'Mega Çiğ Köfte Dürüm (125 gr)', rate: 91 },
  { name: 'Ekşi Ayran (275 cl)', rate: 91 },
  { name: 'Çiğ Köfte (1 Kg) Porsiyon', rate: 85 },
  { name: 'Doritoslu Duble Dürüm', rate: 85 },
  { name: 'Double Dürüm + B.Ayran', rate: 84 }
];

const CATEGORY_DEFAULT_IMAGES = {
  'Çiğ Köfteler': '/images/durum.jpg',
  'Pilavlar': '/images/pilav.jpg',
  'Menüler': '/images/durum.jpg',
  'İçecekler': '/images/ayran_salgam.jpg',
  'Tatlılar': '/images/tatli_donut.jpg',
  'Yan Ürün & Sos': '/images/tursu_sos.jpg'
};

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

app.use(session({
  secret: process.env.SESSION_SECRET || 'cigkofteci-sait-gizli-anahtar-2026',
  resave: false,
  saveUninitialized: false,
  cookie: { maxAge: 1000 * 60 * 60 * 4 }
}));

app.use((req, res, next) => {
  res.locals.shop = SHOP_INFO;
  res.locals.categories = CATEGORIES;
  res.locals.trendyolStats = TRENDYOL_STATS;
  res.locals.trendyolReviews = TRENDYOL_REVIEWS;
  res.locals.isAdmin = Boolean(req.session && req.session.isAdmin);
  res.locals.currentPath = req.path;
  next();
});

function requireAdmin(req, res, next) {
  if (req.session && req.session.isAdmin) {
    return next();
  }
  return res.redirect('/admin/login');
}

// Ana Sayfa
app.get('/', (req, res) => {
  const featured = db.all(
    'SELECT * FROM products WHERE is_available = 1 AND is_featured = 1 ORDER BY id ASC'
  );
  const allProducts = db.all(
    'SELECT * FROM products WHERE is_available = 1 ORDER BY category ASC, id ASC'
  );
  res.render('index', {
    title: 'Ana Sayfa',
    featured,
    allProducts
  });
});

// Dinamik Menü Sayfası
app.get('/menu', (req, res) => {
  const selectedCategory = req.query.kategori || 'Tümü';
  const searchQuery = (req.query.q || '').trim();

  let sql = 'SELECT * FROM products WHERE is_available = 1';
  const params = [];

  if (selectedCategory && selectedCategory !== 'Tümü') {
    sql += ' AND category = ?';
    params.push(selectedCategory);
  }

  if (searchQuery) {
    sql += ' AND (LOWER(name) LIKE ? OR LOWER(description) LIKE ?)';
    const likeTerm = `%${searchQuery.toLowerCase()}%`;
    params.push(likeTerm, likeTerm);
  }

  sql += ' ORDER BY category ASC, id ASC';
  const products = db.all(sql, params);

  res.render('menu', {
    title: 'Menü',
    products,
    selectedCategory,
    searchQuery
  });
});

// Toplu / Özel Gün Tepsi Sipariş & İletişim Formu
app.get('/siparis', (req, res) => {
  res.render('order', {
    title: 'Toplu Sipariş & İletişim',
    errors: {},
    formData: {},
    successOrder: null
  });
});

app.post('/siparis', (req, res) => {
  const {
    customer_name = '',
    phone = '',
    order_type = '',
    quantity_note = '',
    delivery_date = '',
    message = ''
  } = req.body;

  const cleanName = customer_name.trim();
  const cleanPhone = phone.trim();
  const cleanQty = quantity_note.trim();
  const cleanMsg = message.trim();
  const errors = {};

  if (cleanName.length < 3) {
    errors.customer_name = 'Lütfen en az 3 karakterden oluşan ad soyad giriniz.';
  }

  const normalizedPhone = cleanPhone.replace(/[\s()-]/g, '');
  if (!/^(\+?90|0)?5\d{9}$/.test(normalizedPhone)) {
    errors.phone = 'Geçerli bir cep telefonu numarası giriniz (ör. 0532 123 45 67).';
  }

  if (!order_type) {
    errors.order_type = 'Lütfen talep türünü seçiniz.';
  }

  if (cleanQty.length < 2) {
    errors.quantity_note = 'Lütfen tahmini miktar veya ürün bilgisini yazınız (ör. 2 Kg Tepsi).';
  }

  if (!delivery_date) {
    errors.delivery_date = 'Lütfen teslim veya etkinlik tarihini seçiniz.';
  } else {
    const today = new Date().toISOString().split('T')[0];
    if (delivery_date < today) {
      errors.delivery_date = 'Teslim tarihi bugünden eski olamaz.';
    }
  }

  if (Object.keys(errors).length > 0) {
    return res.status(400).render('order', {
      title: 'Toplu Sipariş & İletişim',
      errors,
      formData: req.body,
      successOrder: null
    });
  }

  db.run(
    `INSERT INTO orders (customer_name, phone, order_type, quantity_note, delivery_date, message)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [cleanName, cleanPhone, order_type, cleanQty, delivery_date, cleanMsg]
  );

  const whatsappSummary = encodeURIComponent(
    `Merhaba, web sitesi üzerinden toplu sipariş/iletişim talebi oluşturdum.\n` +
    `Ad Soyad: ${cleanName}\n` +
    `Telefon: ${cleanPhone}\n` +
    `Talep Türü: ${order_type}\n` +
    `Miktar/Ürün: ${cleanQty}\n` +
    `Tarih: ${delivery_date}` +
    (cleanMsg ? `\nNot: ${cleanMsg}` : '')
  );

  return res.render('order', {
    title: 'Toplu Sipariş & İletişim',
    errors: {},
    formData: {},
    successOrder: {
      customer_name: cleanName,
      order_type,
      quantity_note: cleanQty,
      delivery_date,
      whatsappUrl: `https://wa.me/${SHOP_INFO.phoneRaw}?text=${whatsappSummary}`
    }
  });
});

// Admin Giriş / Çıkış
app.get('/admin/login', (req, res) => {
  if (req.session && req.session.isAdmin) {
    return res.redirect('/admin');
  }
  res.render('admin-login', {
    title: 'Yönetici Girişi',
    error: null
  });
});

app.post('/admin/login', (req, res) => {
  const { username = '', password = '' } = req.body;
  const adminUser = process.env.ADMIN_USER || 'admin';
  const adminPass = process.env.ADMIN_PASS || 'sait2026';

  if (username.trim() === adminUser && password === adminPass) {
    req.session.isAdmin = true;
    return res.redirect('/admin');
  }

  return res.status(401).render('admin-login', {
    title: 'Yönetici Girişi',
    error: 'Kullanıcı adı veya şifre hatalı.'
  });
});

app.post('/admin/logout', (req, res) => {
  req.session.destroy(() => {
    res.redirect('/');
  });
});

// Admin Paneli
app.get('/admin', requireAdmin, (req, res) => {
  const products = db.all('SELECT * FROM products ORDER BY id DESC');
  const orders = db.all('SELECT * FROM orders ORDER BY id DESC');
  const editId = req.query.edit ? Number(req.query.edit) : null;
  const editProduct = editId ? db.get('SELECT * FROM products WHERE id = ?', [editId]) : null;

  res.render('admin', {
    title: 'Şube Yönetim Paneli',
    products,
    orders,
    editProduct,
    statusMessage: req.query.msg || null,
    errorMessage: req.query.err || null
  });
});

// Admin CRUD: Ürün Ekleme
app.post('/admin/products', requireAdmin, (req, res) => {
  const { name = '', category = '', description = '', price = '', portion_info = '', image_url = '', is_featured } = req.body;
  const numericPrice = parseFloat(price);

  if (name.trim().length < 2 || !CATEGORIES.includes(category) || Number.isNaN(numericPrice) || numericPrice <= 0) {
    return res.redirect('/admin?err=' + encodeURIComponent('Lütfen ürün adı, kategori ve geçerli bir fiyat giriniz.'));
  }

  const finalImage = image_url.trim() || CATEGORY_DEFAULT_IMAGES[category] || '/images/durum.jpg';

  db.run(
    `INSERT INTO products (name, category, description, price, portion_info, image_url, is_featured, is_available)
     VALUES (?, ?, ?, ?, ?, ?, ?, 1)`,
    [
      name.trim(),
      category,
      description.trim() || 'Taze günlük hazırlanmış lezzet.',
      numericPrice,
      portion_info.trim(),
      finalImage,
      is_featured ? 1 : 0
    ]
  );

  return res.redirect('/admin?msg=' + encodeURIComponent('Yeni ürün menüye eklendi.'));
});

// Admin CRUD: Ürün Güncelleme
app.post('/admin/products/:id/update', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { name = '', category = '', description = '', price = '', portion_info = '', image_url = '', is_featured, is_available } = req.body;
  const numericPrice = parseFloat(price);

  if (!id || name.trim().length < 2 || !CATEGORIES.includes(category) || Number.isNaN(numericPrice) || numericPrice <= 0) {
    return res.redirect('/admin?err=' + encodeURIComponent('Güncelleme için geçerli ürün bilgisi giriniz.'));
  }

  const finalImage = image_url.trim() || CATEGORY_DEFAULT_IMAGES[category] || '/images/durum.jpg';

  db.run(
    `UPDATE products
     SET name = ?, category = ?, description = ?, price = ?, portion_info = ?, image_url = ?, is_featured = ?, is_available = ?
     WHERE id = ?`,
    [
      name.trim(),
      category,
      description.trim(),
      numericPrice,
      portion_info.trim(),
      finalImage,
      is_featured ? 1 : 0,
      is_available ? 1 : 0,
      id
    ]
  );

  return res.redirect('/admin?msg=' + encodeURIComponent('Ürün başarıyla güncellendi.'));
});

// Admin CRUD: Ürün Silme
app.post('/admin/products/:id/delete', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (id) {
    db.run('DELETE FROM products WHERE id = ?', [id]);
  }
  return res.redirect('/admin?msg=' + encodeURIComponent('Ürün menüden silindi.'));
});

// Admin: Sipariş Talebi Durum Güncelleme ve Silme
app.post('/admin/orders/:id/status', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  const { status } = req.body;
  const allowed = ['Beklemede', 'Hazırlanıyor', 'Tamamlandı', 'İptal'];
  if (id && allowed.includes(status)) {
    db.run('UPDATE orders SET status = ? WHERE id = ?', [status, id]);
  }
  return res.redirect('/admin?msg=' + encodeURIComponent('Talep durumu güncellendi.'));
});

app.post('/admin/orders/:id/delete', requireAdmin, (req, res) => {
  const id = Number(req.params.id);
  if (id) {
    db.run('DELETE FROM orders WHERE id = ?', [id]);
  }
  return res.redirect('/admin?msg=' + encodeURIComponent('Talep kaydı silindi.'));
});

// 404 Sayfası
app.use((req, res) => {
  res.status(404).render('404', { title: 'Sayfa Bulunamadı' });
});

db.initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Çiğköfteci Sait Web Sunucusu çalışıyor: http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Veritabanı başlatma hatası:', err);
    process.exit(1);
  });
