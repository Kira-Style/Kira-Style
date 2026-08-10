// === НАЛАШТУВАННЯ TELEGRAM ===
const BOT_TOKEN = '8528001817:AAFKjG0vcJFkXzLVl1P5Ehl0uaIS-nI7RQg'; 
const CHAT_ID = '-5357189546';

// Дерево категорій та підкатегорій
const CATEGORIES = {
  "Всі": [],
  "Фурнітура": ["нитки", "ґудзики", "резинки", "мережива", "кнопки", "блискавки", "інструменти для шиття", "нашивки"],
  "Тканини": ["пальтові", "костюмні", "легкі", "трикотажні"],
  "Набори": []
};

let products = []; // Порожній масив — заповнюється лише з products.json
let cart = [];
let selectedCategory = "Всі";
let selectedSubcategory = "";

// Завантаження товарів із файлу products.json
async function loadProducts() {
  try {
    const res = await fetch('products.json');
    products = await res.json();
    renderCategoryButtons();
    renderProducts();
  } catch (err) {
    console.error("Помилка завантаження products.json:", err);
  }
}

// Відображення кнопок категорій
function renderCategoryButtons() {
  const catContainer = document.getElementById('categories-container');
  if (!catContainer) return;

  catContainer.innerHTML = Object.keys(CATEGORIES).map(cat => `
    <button class="cat-btn ${cat === selectedCategory ? 'active' : ''}" onclick="selectCategory('${cat}')">${cat}</button>
  `).join('');

  renderSubcategoryButtons();
}

// Відображення кнопок підкатегорій
function renderSubcategoryButtons() {
  const subContainer = document.getElementById('subcategories-container');
  if (!subContainer) return;

  const subcats = CATEGORIES[selectedCategory] || [];

  if (subcats.length === 0) {
    subContainer.innerHTML = '';
    return;
  }

  subContainer.innerHTML = `
    <button class="subcat-btn ${selectedSubcategory === '' ? 'active' : ''}" onclick="selectSubcategory('')">Всі підкатегорії</button>
  ` + subcats.map(sub => `
    <button class="subcat-btn ${sub === selectedSubcategory ? 'active' : ''}" onclick="selectSubcategory('${sub}')">${sub}</button>
  `).join('');
}

function selectCategory(cat) {
  selectedCategory = cat;
  selectedSubcategory = "";
  renderCategoryButtons();
  renderProducts();
}

function selectSubcategory(sub) {
  selectedSubcategory = sub;
  renderSubcategoryButtons();
  renderProducts();
}

// Фільтрація та вивід товарів
function renderProducts() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  const filtered = products.filter(p => {
    const matchCat = selectedCategory === "Всі" || p.category === selectedCategory;
    const matchSub = selectedSubcategory === "" || p.subcategory === selectedSubcategory;
    return matchCat && matchSub;
  });

  if (filtered.length === 0) {
    grid.innerHTML = '<p style="grid-column: 1/-1; text-align: center;">У цій категорії поки немає товарів.</p>';
    return;
  }

  grid.innerHTML = filtered.map(p => {
    const step = p.unit === 'м' ? '0.1' : '1';
    const minQty = p.unit === 'м' ? '0.1' : '1';
    const initialVal = p.unit === 'м' ? '1' : '1';

    return `
      <div class="card">
        <img src="${p.image}" alt="${p.title}" onerror="this.src='https://via.placeholder.com/200?text=Немає+фото'">
        <h3>${p.title}</h3>
        <p><b>${p.price} грн / ${p.unit}</b></p>
        
        <div class="qty-box">
          <label>Кількість:</label>
          <input type="number" id="qty-${p.id}" class="qty-input" value="${initialVal}" min="${minQty}" step="${step}">
          <span>${p.unit}</span>
        </div>

        <button class="btn" onclick="addToCart(${p.id})">У кошик</button>
      </div>
    `;
  }).join('');
}

function addToCart(id) {
  const qtyInput = document.getElementById(`qty-${id}`);
  const qty = parseFloat(qtyInput.value);

  if (isNaN(qty) || qty <= 0) {
    alert('Будь ласка, вкажіть коректну кількість!');
    return;
  }

  const prod = products.find(x => x.id === id);
  const itemInCart = cart.find(x => x.id === id);

  if (itemInCart) {
    itemInCart.qty = Math.round((itemInCart.qty + qty) * 100) / 100;
  } else {
    cart.push({ ...prod, qty: qty });
  }

  alert(`Додано в кошик: ${prod.title} (${qty} ${prod.unit})`);
  updateCartUI();
}

function updateCartUI() {
  document.getElementById('cart-count').innerText = cart.length;
  
  const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  document.getElementById('cart-total').innerText = Math.round(total * 100) / 100;

  document.getElementById('cart-items').innerHTML = cart.map((item, index) => `
    <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:8px; border-bottom:1px solid #eee; padding-bottom:5px;">
      <div>
        <b>${item.title}</b><br>
        <small>${item.qty} ${item.unit} x ${item.price} грн = <b>${Math.round(item.qty * item.price * 100) / 100} грн</b></small>
      </div>
      <button onclick="removeFromCart(${index})" style="background:#ff4d4d; color:white; border:none; border-radius:3px; padding:2px 6px; cursor:pointer;">✕</button>
    </div>
  `).join('');
}

function removeFromCart(index) {
  cart.splice(index, 1);
  updateCartUI();
}

function toggleCart() {
  const modal = document.getElementById('cart-modal');
  modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
}

async function sendOrder() {
  const name = document.getElementById('cust-name').value.trim();
  const phone = document.getElementById('cust-phone').value.trim();

  if (!name || !phone) {
    alert('Будь ласка, заповніть ім\'я та телефон!');
    return;
  }
  if (cart.length === 0) {
    alert('Кошик порожній!');
    return;
  }

  const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const itemsList = cart.map(i => `• ${i.title} — ${i.qty} ${i.unit} x ${i.price} грн = ${Math.round(i.qty * i.price * 100) / 100} грн`).join('\n');

  const text = `
<b>📦 НОВЕ ЗАМОВЛЕННЯ!</b>
<b>📅 Дата:</b> ${new Date().toLocaleString('uk-UA')}

<b>👤 Ім'я:</b> ${name}
<b>📞 Телефон:</b> ${phone}

<b>🛒 Замовлені товари:</b>
${itemsList}

<b>💰 Загальна сума:</b> ${Math.round(total * 100) / 100} грн
  `;

  try {
    const response = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: CHAT_ID,
        text: text,
        parse_mode: 'HTML'
      })
    });

    if (response.ok) {
      alert('Дякуємо! Ваше замовлення успішно відправлено.');
      cart = [];
      updateCartUI();
      toggleCart();
    } else {
      alert('Помилка відправки. Перевірте Token у script.js');
    }
  } catch (err) {
    alert('Помилка мережі.');
  }
}

// Запуск зчитування products.json при завантаженні
loadProducts();