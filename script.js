// === НАЛАШТУВАННЯ TELEGRAM ===
const BOT_TOKEN = '8528001817:AAFKjG0vcJFkXzLVl1P5Ehl0uaIS-nI7RQg'; 
const CHAT_ID = '-5357189546';

const CATEGORIES = {
  "Всі": [],
  "Фурнітура": ["нитки", "ґудзики", "резинки", "мережива", "кнопки", "блискавки", "інструменти для шиття", "нашивки"],
  "Тканини": ["пальтові", "костюмні", "легкі", "трикотажні"],
  "Набори": []
};

let products = []; 
let cart = loadCart(); // Завантажуємо кошик при старті
let selectedCategory = "Всі";
let selectedSubcategory = "";

// --- ФУНКЦІЇ ЗБЕРЕЖЕННЯ ---
function saveCart() {
  localStorage.setItem('kira_cart', JSON.stringify(cart));
}

function loadCart() {
  const saved = localStorage.getItem('kira_cart');
  return saved ? JSON.parse(saved) : [];
}

// Завантаження товарів
async function loadProducts() {
  try {
    const res = await fetch('products.json');
    products = await res.json();
    renderCategoryButtons();
    renderProducts();
    updateCartUI(); // Оновлюємо інтерфейс кошика після завантаження
  } catch (err) {
    console.error("Помилка завантаження products.json:", err);
  }
}

// Відображення товарів (ЗМІНЕНО ДЛЯ АКЦІЙ)
function renderProducts() {
  const grid = document.getElementById('products-grid');
  if (!grid) return;

  const filtered = products.filter(p => {
    const matchCat = selectedCategory === "Всі" || p.category === selectedCategory;
    const matchSub = selectedSubcategory === "" || p.subcategory === selectedSubcategory;
    return matchCat && matchSub;
  });

  grid.innerHTML = filtered.map(p => {
    const step = p.unit === 'м' ? '0.1' : '1';
    
    // Стікери (баджі)
    let badgeHtml = '';
    if (p.badge) {
      let badgeClass = '';
      if (p.badge.toLowerCase() === 'акція') badgeClass = 'badge-sale';
      if (p.badge.toLowerCase() === 'новинка') badgeClass = 'badge-new';
      if (p.badge.toLowerCase() === 'хіт') badgeClass = 'badge-hit';
      badgeHtml = `<div class="badge ${badgeClass}">${p.badge}</div>`;
    }

    // Стара ціна
    const oldPriceHtml = p.oldPrice ? `<span style="text-decoration: line-through; color: #999; font-size: 0.9rem; margin-right: 5px;">${p.oldPrice} грн</span>` : '';

    return `
      <div class="card">
        ${badgeHtml}
        <img src="${p.image}" alt="${p.title}" onerror="this.src='https://via.placeholder.com/200?text=Немає+фото'">
        <h3>${p.title}</h3>
        <p class="price-tag">${oldPriceHtml}<span>${p.price} грн / ${p.unit}</span></p>
        
        <div class="qty-box">
          <input type="number" id="qty-${p.id}" class="qty-input" value="1" min="${step}" step="${step}">
          <span>${p.unit}</span>
        </div>

        <button class="btn-add" onclick="addToCart(${p.id})">У кошик</button>
      </div>
    `;
  }).join('');
}

// Додавання в кошик (ЗМІНЕНО)
function addToCart(id) {
  const qtyInput = document.getElementById(`qty-${id}`);
  const qty = parseFloat(qtyInput.value);

  if (isNaN(qty) || qty <= 0) return;

  const prod = products.find(x => x.id === id);
  const itemInCart = cart.find(x => x.id === id);

  if (itemInCart) {
    itemInCart.qty = Math.round((itemInCart.qty + qty) * 100) / 100;
  } else {
    cart.push({ ...prod, qty: qty });
  }

  saveCart(); // Зберігаємо у пам'ять браузера
  updateCartUI();
  
  // Анімація кошика (якщо функція є в HTML)
  if (typeof animateCart === 'function') animateCart();
}

function updateCartUI() {
  const countSpan = document.getElementById('cart-count');
  if(countSpan) countSpan.innerText = cart.length;
  
  const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  const totalSpan = document.getElementById('cart-total');
  if(totalSpan) totalSpan.innerText = Math.round(total * 100) / 100;

  const itemsContainer = document.getElementById('cart-items');
  if(itemsContainer) {
    itemsContainer.innerHTML = cart.map((item, index) => `
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:10px; padding:5px; border-bottom:1px solid #eee;">
        <div style="font-size:14px;">
          <b>${item.title}</b><br>
          ${item.qty} ${item.unit} x ${item.price} грн
        </div>
        <button onclick="removeFromCart(${index})" style="background:none; border:none; color:red; cursor:pointer; font-weight:bold;">✕</button>
      </div>
    `).join('');
  }
}

function removeFromCart(index) {
  cart.splice(index, 1);
  saveCart();
  updateCartUI();
}

function toggleCart() {
  const modal = document.getElementById('cart-modal');
  modal.style.display = modal.style.display === 'flex' ? 'none' : 'flex';
}

// Відправка в Telegram (З ДОДАНИМИ ПОСИЛАННЯМИ НА ФОТО)
async function sendOrder() {
  const name = document.getElementById('cust-name').value.trim();
  const phone = document.getElementById('cust-phone').value.trim();

  if (!name || phone.length < 10) {
    alert('Введіть ім\'я та коректний телефон!');
    return;
  }

  const total = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);
  
  // Формуємо список товарів із посиланням на фотографію
  const itemsList = cart.map(i => {
    const photoUrl = new URL(i.image, window.location.href).href;
    return `• ${i.title}: ${i.qty} ${i.unit} x ${i.price} = ${Math.round(i.qty * i.price * 100) / 100} грн (<a href="${photoUrl}">🖼 Фото</a>)`;
  }).join('\n');

  const text = `📦 <b>НОВЕ ЗАМОВЛЕННЯ</b>\n\n👤 <b>Ім'я:</b> ${name}\n📞 <b>Тел:</b> ${phone}\n\n🛒 <b>Товари:</b>\n${itemsList}\n\n💰 <b>Разом:</b> ${total} грн`;

  try {
    const res = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        chat_id: CHAT_ID, 
        text: text, 
        parse_mode: 'HTML',
        disable_web_page_preview: true // Вимикає великі попередні перегляди посилань, роблячи чат охайним
      })
    });

    if (res.ok) {
      alert('Дякуємо! Замовлення відправлено.');
      cart = [];
      saveCart();
      updateCartUI();
      toggleCart();
    }
  } catch (err) {
    alert('Помилка з’єднання.');
  }
}

// Допоміжні функції для категорій
function renderCategoryButtons() {
  const catContainer = document.getElementById('categories-container');
  if (!catContainer) return;
  catContainer.innerHTML = Object.keys(CATEGORIES).map(cat => `
    <button class="cat-btn ${cat === selectedCategory ? 'active' : ''}" onclick="selectCategory('${cat}')">${cat}</button>
  `).join('');
  renderSubcategoryButtons();
}

function renderSubcategoryButtons() {
  const subContainer = document.getElementById('subcategories-container');
  const subcats = CATEGORIES[selectedCategory] || [];
  if (!subContainer || subcats.length === 0) { if(subContainer) subContainer.innerHTML = ''; return; }
  subContainer.innerHTML = `<button class="subcat-btn ${selectedSubcategory === '' ? 'active' : ''}" onclick="selectSubcategory('')">Всі</button>` + 
    subcats.map(sub => `<button class="subcat-btn ${sub === selectedSubcategory ? 'active' : ''}" onclick="selectSubcategory('${sub}')">${sub}</button>`).join('');
}

function selectCategory(cat) { selectedCategory = cat; selectedSubcategory = ""; renderCategoryButtons(); renderProducts(); }
function selectSubcategory(sub) { selectedSubcategory = sub; renderSubcategoryButtons(); renderProducts(); }

loadProducts();
