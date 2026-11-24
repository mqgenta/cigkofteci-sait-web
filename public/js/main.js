document.addEventListener('DOMContentLoaded', () => {
  const navToggle = document.getElementById('navToggle');
  const navLinks = document.getElementById('navLinks');

  if (navToggle && navLinks) {
    navToggle.addEventListener('click', () => {
      navLinks.classList.toggle('open');
    });
  }

  // Sade scroll reveal animasyonu
  const revealItems = document.querySelectorAll('.reveal');
  if (revealItems.length > 0 && 'IntersectionObserver' in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.08 }
    );
    revealItems.forEach((el) => observer.observe(el));
  } else {
    revealItems.forEach((el) => el.classList.add('visible'));
  }

  // Sipariş formu istemci tarafı hızlı doğrulama
  const orderForm = document.getElementById('orderForm');
  if (orderForm) {
    orderForm.addEventListener('submit', (e) => {
      const nameInput = orderForm.querySelector('#customer_name');
      const phoneInput = orderForm.querySelector('#phone');
      const dateInput = orderForm.querySelector('#delivery_date');

      if (nameInput && nameInput.value.trim().length < 3) {
        alert('Lütfen en az 3 karakterden oluşan ad soyad giriniz.');
        nameInput.focus();
        e.preventDefault();
        return;
      }

      if (phoneInput) {
        const clean = phoneInput.value.replace(/[\s()-]/g, '');
        if (!/^(\+?90|0)?5\d{9}$/.test(clean)) {
          alert('Lütfen geçerli bir Türkiye cep telefonu numarası giriniz (ör. 0532 123 45 67).');
          phoneInput.focus();
          e.preventDefault();
          return;
        }
      }

      if (dateInput && dateInput.value) {
        const today = new Date().toISOString().split('T')[0];
        if (dateInput.value < today) {
          alert('Teslim tarihi bugünden eski olamaz.');
          dateInput.focus();
          e.preventDefault();
        }
      }
    });
  }
});
