class NukhbaProProductCard extends HTMLElement {
  connectedCallback() {
    if (this.__initialized) return;

    this.product = this.product || this.parseProduct();
    this.slider = this.closest('salla-products-slider, salla-products-list');

    if (!this.product) {
      this.__retryCount = (this.__retryCount || 0) + 1;
      if (this.__retryCount <= 20) {
        requestAnimationFrame(() => this.connectedCallback());
      }
      return;
    }

    this.__initialized = true;

    if (window.app?.status === 'ready') {
      this.onReady();
    } else {
      document.addEventListener('theme::ready', () => this.onReady(), { once: true });
    }
  }

  parseProduct() {
    const raw = this.getAttribute('product');
    if (!raw) return null;

    try {
      return JSON.parse(raw);
    } catch (error) {
      return null;
    }
  }

  onReady() {
    this.placeholder = salla.url.asset(salla.config.get('theme.settings.placeholder'));
    this.isInWishlist = !salla.config.isGuest() && salla.storage.get('salla::wishlist', []).includes(Number(this.product.id));

    salla.lang.onLoaded(() => {
      this.startingPrice = salla.lang.get('pages.products.starting_price');
      this.addToCartText = salla.lang.get('pages.cart.add_to_cart');
      this.bookNowText = salla.lang.get('pages.cart.book_now');
      this.preOrderText = salla.lang.get('pages.products.pre_order_now');
      this.outOfStockText = salla.lang.get('pages.products.out_of_stock');
      this.donationText = salla.lang.get('pages.products.donation_exceed');
      this.render();
    });

    this.render();
  }

  getSetting(name, fallback = '') {
    const value = this.slider?.getAttribute(`data-${name}`);
    return value === null || value === undefined || value === '' ? fallback : value;
  }

  getJSONSetting(name, fallback = []) {
    const raw = this.getSetting(name, '');
    if (!raw) return fallback;

    try {
      const value = JSON.parse(raw);
      return Array.isArray(value) ? value : fallback;
    } catch (error) {
      return fallback;
    }
  }

  escapeHTML(value = '') {
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }

  getImageUrl() {
    return this.product?.image?.url || this.product?.thumbnail || this.placeholder || '';
  }

  getImageAlt() {
    return this.escapeHTML(this.product?.image?.alt || this.product?.name || '');
  }

  toEnglishDigits(value = '') {
    return String(value)
      .replace(/[٠-٩]/g, (digit) => '٠١٢٣٤٥٦٧٨٩'.indexOf(digit))
      .replace(/[۰-۹]/g, (digit) => '۰۱۲۳۴۵۶۷۸۹'.indexOf(digit));
  }

  shouldUseEnglishDigits() {
    return this.getSetting('use-english-digits') === 'true';
  }

  getMoney(price) {
    if (!price || price === 0) {
      return salla.config.get('store.settings.product.show_price_as_dash') ? '-' : '';
    }

    const formatted = salla.money(price);
    return this.shouldUseEnglishDigits() ? this.toEnglishDigits(formatted) : formatted;
  }

  getActualPrice() {
    return this.product?.starting_price || (this.product?.is_on_sale ? this.product?.sale_price : this.product?.price);
  }

  getOldPrice() {
    return this.product?.is_on_sale && this.product?.regular_price ? this.product.regular_price : null;
  }

  getDiscountPercent() {
    const oldPrice = this.getOldPrice();
    const actualPrice = this.getActualPrice();

    if (!oldPrice || !actualPrice || oldPrice <= actualPrice) {
      return null;
    }

    return Math.round(((oldPrice - actualPrice) / oldPrice) * 100);
  }

  getButtonText() {
    if (this.getSetting('button-text')) {
      return this.getSetting('button-text');
    }

    if (this.product?.add_to_cart_label) {
      return this.product.add_to_cart_label;
    }

    if (this.product?.has_preorder_campaign) {
      return this.preOrderText || 'اطلب الآن';
    }

    if (this.product?.status === 'sale' && this.product?.type === 'booking') {
      return this.bookNowText || 'احجز الآن';
    }

    if (this.product?.status === 'sale') {
      return this.addToCartText || 'إضافة إلى السلة';
    }

    if (this.product?.type !== 'donating') {
      return this.outOfStockText || 'نفدت الكمية';
    }

    return this.donationText || 'الحد الأقصى للتبرع';
  }

  getStyleAttr(color) {
    return color ? ` style="color:${color};"` : '';
  }

  getInstallmentLogosHTML() {
    const logos = this.getJSONSetting('installment-logos');
    const items = logos
      .filter((logo) => logo?.image)
      .map((logo) => `
        <span class="nukhba-pro-card__installment-logo">
          <img src="${logo.image}" alt="${this.escapeHTML(logo.alt || this.product?.name || '')}" loading="lazy" width="90" height="34" />
        </span>
      `)
      .join('');

    return items ? `<div class="nukhba-pro-card__installment-logos">${items}</div>` : '';
  }

  getChipsHTML() {
    const chips = this.getJSONSetting('chip-values');
    if (!chips.length) return '';

    return `
      <div class="nukhba-pro-card__chips">
        ${chips.map((chip) => `<span>${this.escapeHTML(chip)}</span>`).join('')}
      </div>
    `;
  }

  getHighlightHTML(textStyle) {
    const badge = this.getSetting('highlight-badge');
    const text = this.getSetting('highlight-text');

    if (!badge && !text) return '';

    return `
      <div class="nukhba-pro-card__highlight">
        ${text ? `<p${textStyle}>${this.escapeHTML(text)}</p>` : ''}
        ${badge ? `<span class="nukhba-pro-card__highlight-badge">${this.escapeHTML(badge)}</span>` : ''}
      </div>
    `;
  }

  getWishlistButton() {
    return `
      <button
        class="nukhba-pro-card__wishlist ${this.isInWishlist ? 'is-active' : ''}"
        type="button"
        aria-label="wishlist"
        data-id="${this.product.id}"
        onclick="salla.wishlist.toggle(${this.product.id})">
        <i class="sicon-heart"></i>
      </button>
    `;
  }

  render() {
    const actualPrice = this.getActualPrice();
    const oldPrice = this.getOldPrice();
    const discountPercent = this.getDiscountPercent();
    const textStyle = this.getStyleAttr(this.getSetting('text-color'));
    const priceStyle = this.getStyleAttr(this.getSetting('price-color'));
    const oldPriceStyle = this.getStyleAttr(this.getSetting('old-price-color'));
    const discountStyle = ` style="background:${this.getSetting('discount-bg-color', '#19763e')};color:${this.getSetting('discount-text-color', '#ffffff')};"`;
    const priceNote = this.getSetting('price-note') || (this.product?.starting_price ? this.startingPrice : '');
    const installmentTitle = this.getSetting('installment-title');
    const rightLabelText = this.getSetting('right-label-text');
    const leftLabelText = this.getSetting('left-label-text');

    this.classList.add('nukhba-pro-product-card-entry');
    this.setAttribute('id', this.product.id);

    this.innerHTML = `
      <article class="nukhba-pro-card">
        <div class="nukhba-pro-card__labels">
          ${rightLabelText ? `<span class="nukhba-pro-card__label is-right" style="background:${this.getSetting('right-label-bg', '#f30f0f')};color:${this.getSetting('right-label-color', '#ffffff')};">${this.escapeHTML(rightLabelText)}</span>` : ''}
          ${leftLabelText ? `<span class="nukhba-pro-card__label is-left" style="background:${this.getSetting('left-label-bg', '#6b8f71')};color:${this.getSetting('left-label-color', '#ffffff')};">${this.escapeHTML(leftLabelText)}</span>` : ''}
        </div>

        <a href="${this.product.url}" class="nukhba-pro-card__media" aria-label="${this.escapeHTML(this.product.name)}">
          <img src="${this.getImageUrl()}" alt="${this.getImageAlt()}" loading="lazy" width="480" height="420" />
        </a>

        ${this.getWishlistButton()}

        <div class="nukhba-pro-card__content">
          <h3${textStyle}>
            <a href="${this.product.url}"${textStyle}>${this.escapeHTML(this.product.name)}</a>
          </h3>

          <div class="nukhba-pro-card__price-box">
            <div class="nukhba-pro-card__price-head">
              ${discountPercent ? `<span class="nukhba-pro-card__discount"${discountStyle}>%${discountPercent} خصم</span>` : ''}
              <strong${priceStyle}>${this.getMoney(actualPrice)}</strong>
            </div>
            <div class="nukhba-pro-card__price-foot">
              ${priceNote ? `<span${textStyle}>${this.escapeHTML(priceNote)}</span>` : ''}
              ${oldPrice ? `<small${oldPriceStyle}>${this.getMoney(oldPrice)}</small>` : ''}
            </div>
          </div>

          ${this.getHighlightHTML(textStyle)}

          ${installmentTitle ? `<p class="nukhba-pro-card__installment-title"${textStyle}>${this.escapeHTML(installmentTitle)}</p>` : ''}
          ${this.getInstallmentLogosHTML()}
          ${this.getChipsHTML()}

          <salla-add-product-button
            fill="solid"
            width="wide"
            class="nukhba-pro-card__button"
            product-id="${this.product.id}"
            product-status="${this.product.status}"
            product-type="${this.product.type}">
            <i class="sicon-${this.product.type === 'booking' ? 'calendar-time' : 'shopping-bag'}"></i>
            <span>${this.escapeHTML(this.getButtonText())}</span>
          </salla-add-product-button>
        </div>
      </article>
    `;

    this.querySelectorAll('.nukhba-pro-card__wishlist').forEach((button) => {
      button.addEventListener('click', () => {
        button.classList.toggle('is-active');
      });
    });
  }
}

if (!customElements.get('nukhba-pro-product-card')) {
  customElements.define('nukhba-pro-product-card', NukhbaProProductCard);
}

class NukhbaProAdvancedProductCard extends NukhbaProProductCard {
  shouldUseEnglishDigits() {
    return true;
  }
}

if (!customElements.get('nukhba-pro-advanced-product-card')) {
  customElements.define('nukhba-pro-advanced-product-card', NukhbaProAdvancedProductCard);
}

class NukhbaBannerProductCard extends NukhbaProProductCard {
  getLayoutStyle() {
    return this.slider?.getAttribute('data-layout-style') || 'one_row';
  }

  getActionIcon() {
    return this.product?.type === 'booking' ? 'calendar-time' : 'shopping-bag';
  }

  render() {
    const actualPrice = this.getActualPrice();
    const oldPrice = this.getOldPrice();
    const isTwoRows = this.getLayoutStyle() === 'two_rows';
    const buttonText = this.escapeHTML(this.getButtonText());
    const buttonIcon = this.getActionIcon();

    this.classList.add('nukhba-banner-product-card-entry');
    this.setAttribute('id', this.product.id);

    this.innerHTML = `
      <article class="nukhba-banner-product-card ${isTwoRows ? 'is-two-rows' : 'is-one-row'}">
        <a href="${this.product.url}" class="nukhba-banner-product-card__media" aria-label="${this.escapeHTML(this.product.name)}">
          <img src="${this.getImageUrl()}" alt="${this.getImageAlt()}" loading="lazy" width="360" height="260" />
        </a>

        <div class="nukhba-banner-product-card__body">
          <div class="nukhba-banner-product-card__title">
            <a href="${this.product.url}">${this.escapeHTML(this.product.name)}</a>
          </div>

          <div class="nukhba-banner-product-card__prices">
            ${oldPrice ? `<small class="nukhba-banner-product-card__old-price">${this.getMoney(oldPrice)}</small>` : ''}
            <strong class="nukhba-banner-product-card__price">${this.getMoney(actualPrice)}</strong>
          </div>

          <salla-add-product-button
            fill="${isTwoRows ? 'solid' : 'outline'}"
            width="wide"
            class="nukhba-banner-product-card__action"
            product-id="${this.product.id}"
            product-status="${this.product.status}"
            product-type="${this.product.type}">
            <i class="sicon-${buttonIcon}"></i>
            <span>${buttonText}</span>
          </salla-add-product-button>
        </div>
      </article>
    `;
  }
}

if (!customElements.get('nukhba-banner-product-card')) {
  customElements.define('nukhba-banner-product-card', NukhbaBannerProductCard);
}

class NukhbaThreeZonesProductCard extends NukhbaProProductCard {
  getBadge(name) {
    const text = this.getSetting(`${name}-badge-text`);
    if (!text) return '';

    const bg = this.getSetting(`${name}-badge-bg`, name === 'right' ? '#f30f0f' : '#6b8f71');
    const color = this.getSetting(`${name}-badge-color`, '#ffffff');
    return `<span class="nukhba-three-zones-product-card__label" style="background:${bg};color:${color};">${this.escapeHTML(text)}</span>`;
  }

  render() {
    const actualPrice = this.getActualPrice();
    const oldPrice = this.getOldPrice();
    const priceNote = this.product?.starting_price ? (this.startingPrice || '') : '';
    const buttonText = this.escapeHTML(this.getButtonText());
    const buttonIcon = this.product?.type === 'booking' ? 'calendar-time' : 'shopping-bag';

    this.classList.add('nukhba-three-zones-product-card-entry');
    this.setAttribute('id', this.product.id);

    this.innerHTML = `
      <article class="nukhba-three-zones-product-card__inner">
        <div class="nukhba-three-zones-product-card__labels">
          ${this.getBadge('right')}
          ${this.getBadge('left')}
        </div>

        <a href="${this.product.url}" class="nukhba-three-zones-product-card__media" aria-label="${this.escapeHTML(this.product.name)}">
          <img src="${this.getImageUrl()}" alt="${this.getImageAlt()}" loading="lazy" width="420" height="320" />
        </a>

        <div class="nukhba-three-zones-product-card__content">
          <div class="nukhba-three-zones-product-card__title">
            <a href="${this.product.url}">${this.escapeHTML(this.product.name)}</a>
          </div>

          <div class="nukhba-three-zones-product-card__price${oldPrice ? ' nukhba-three-zones-product-card__price--sale' : ''}">
            ${oldPrice ? `<small class="nukhba-three-zones-product-card__price-old">${this.getMoney(oldPrice)}</small>` : ''}
            <strong class="nukhba-three-zones-product-card__price-current">${this.getMoney(actualPrice)}</strong>
          </div>

          ${priceNote ? `<div class="nukhba-three-zones-product-card__price-note">${this.escapeHTML(priceNote)}</div>` : ''}

          <salla-add-product-button
            fill="solid"
            width="wide"
            class="nukhba-three-zones-product-card__button"
            product-id="${this.product.id}"
            product-status="${this.product.status}"
            product-type="${this.product.type}">
            <i class="sicon-${buttonIcon}"></i>
            <span>${buttonText}</span>
          </salla-add-product-button>
        </div>
      </article>
    `;
  }
}

if (!customElements.get('nukhba-three-zones-product-card')) {
  customElements.define('nukhba-three-zones-product-card', NukhbaThreeZonesProductCard);
}

class NukhbaTopThreeProductCard extends NukhbaProProductCard {
  updateRank() {
    const cards = Array.from(this.parentElement?.querySelectorAll('nukhba-top-three-product-card') || []);
    const rank = cards.indexOf(this) + 1;
    const inner = this.querySelector('.nukhba-top-three-product-card__inner');

    if (rank > 0 && inner) {
      inner.dataset.rank = String(rank);
      this.dataset.rank = String(rank);
    }
  }

  render() {
    const actualPrice = this.getActualPrice();
    const oldPrice = this.getOldPrice();
    const buttonText = this.escapeHTML(this.getButtonText());
    const buttonIcon = this.product?.type === 'booking' ? 'calendar-time' : 'shopping-bag';
    const ratingAverage = this.product?.rating?.average || this.product?.rating?.stars || this.product?.rating_average;
    const ratingCount = this.product?.rating?.count || this.product?.rating_count;

    this.classList.add('nukhba-top-three-product-card-entry');
    this.setAttribute('id', this.product.id);

    this.innerHTML = `
      <article class="nukhba-top-three-product-card__inner">
        ${this.getWishlistButton().replace('nukhba-pro-card__wishlist', 'nukhba-top-three-product-card__wishlist')}

        <a href="${this.product.url}" class="nukhba-top-three-product-card__media" aria-label="${this.escapeHTML(this.product.name)}">
          <img src="${this.getImageUrl()}" alt="${this.getImageAlt()}" loading="lazy" width="420" height="420" />
        </a>

        <div class="nukhba-top-three-product-card__content">
          <h3 class="nukhba-top-three-product-card__title">
            <a href="${this.product.url}">${this.escapeHTML(this.product.name)}</a>
          </h3>

          ${ratingAverage ? `
            <div class="nukhba-top-three-product-card__rating">
              <i class="sicon-star2"></i>
              <span>${this.escapeHTML(String(ratingAverage))}</span>
              ${ratingCount ? `<small>(${this.escapeHTML(String(ratingCount))})</small>` : ''}
            </div>` : ''}

          <div class="nukhba-top-three-product-card__prices">
            <strong class="nukhba-top-three-product-card__price">${this.getMoney(actualPrice)}</strong>
            ${oldPrice ? `<small class="nukhba-top-three-product-card__old-price">${this.getMoney(oldPrice)}</small>` : ''}
          </div>

          <salla-add-product-button
            fill="solid"
            width="wide"
            class="nukhba-top-three-product-card__button"
            product-id="${this.product.id}"
            product-status="${this.product.status}"
            product-type="${this.product.type}">
            <i class="sicon-${buttonIcon}"></i>
            <span>${buttonText}</span>
          </salla-add-product-button>
        </div>
      </article>
    `;

    this.querySelectorAll('.nukhba-top-three-product-card__wishlist').forEach((button) => {
      button.addEventListener('click', () => {
        button.classList.toggle('is-active');
      });
    });

    requestAnimationFrame(() => this.updateRank());
  }
}

if (!customElements.get('nukhba-top-three-product-card')) {
  customElements.define('nukhba-top-three-product-card', NukhbaTopThreeProductCard);
}

function patchThreeZonesProductLists() {
  document.querySelectorAll('salla-products-list.nukhba-three-zones-showcase__product-list').forEach((list) => {
    const root = list.shadowRoot;
    if (!root || root.getElementById('nukhba-three-zones-grid-style')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'nukhba-three-zones-grid-style';
    style.textContent = `
      .s-products-list-wrapper,
      .s-products-list-content,
      .s-products-list-list,
      [part="wrapper"],
      [part="container"],
      [part="list"] {
        display: grid !important;
        grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        grid-auto-flow: row !important;
        gap: 1rem !important;
        align-items: stretch !important;
      }

      .s-product-card-entry,
      nukhba-three-zones-product-card {
        width: 100% !important;
        min-width: 0 !important;
        max-width: none !important;
        margin: 0 !important;
      }

      @media (max-width: 479px) {
        .s-products-list-wrapper,
        .s-products-list-content,
        .s-products-list-list,
        [part="wrapper"],
        [part="container"],
        [part="list"] {
          grid-template-columns: 1fr !important;
        }
      }
    `;

    root.appendChild(style);
  });
}

function scheduleThreeZonesProductListPatch(retries = 20) {
  patchThreeZonesProductLists();

  if (retries <= 0) {
    return;
  }

  setTimeout(() => scheduleThreeZonesProductListPatch(retries - 1), 400);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => scheduleThreeZonesProductListPatch(), { once: true });
} else {
  scheduleThreeZonesProductListPatch();
}

document.addEventListener('theme::ready', () => scheduleThreeZonesProductListPatch());

function patchTopThreeProductLists() {
  document.querySelectorAll('salla-products-list.nukhba-top-three-products__list').forEach((list) => {
    const root = list.shadowRoot;
    if (!root || root.getElementById('nukhba-top-three-grid-style')) {
      return;
    }

    const style = document.createElement('style');
    style.id = 'nukhba-top-three-grid-style';
    style.textContent = `
      .s-products-list-wrapper,
      .s-products-list-content,
      .s-products-list-list,
      [part="wrapper"],
      [part="container"],
      [part="list"] {
        display: grid !important;
        grid-template-columns: repeat(3, minmax(0, 1fr)) !important;
        gap: 1.25rem !important;
        align-items: stretch !important;
      }

      .s-product-card-entry,
      nukhba-top-three-product-card {
        width: 100% !important;
        min-width: 0 !important;
        max-width: none !important;
        margin: 0 !important;
      }

      @media (max-width: 991px) {
        .s-products-list-wrapper,
        .s-products-list-content,
        .s-products-list-list,
        [part="wrapper"],
        [part="container"],
        [part="list"] {
          grid-template-columns: repeat(2, minmax(0, 1fr)) !important;
        }
      }

      @media (max-width: 639px) {
        .s-products-list-wrapper,
        .s-products-list-content,
        .s-products-list-list,
        [part="wrapper"],
        [part="container"],
        [part="list"] {
          grid-template-columns: 1fr !important;
        }
      }
    `;

    root.appendChild(style);
  });
}

function scheduleTopThreeProductListPatch(retries = 20) {
  patchTopThreeProductLists();

  if (retries <= 0) {
    return;
  }

  setTimeout(() => scheduleTopThreeProductListPatch(retries - 1), 400);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => scheduleTopThreeProductListPatch(), { once: true });
} else {
  scheduleTopThreeProductListPatch();
}

document.addEventListener('theme::ready', () => scheduleTopThreeProductListPatch());

function resolveSliderSwiper(slider) {
  if (!slider) {
    return null;
  }

  if (slider.swiper) {
    return slider.swiper;
  }

  const root = slider.shadowRoot;
  if (!root) {
    return null;
  }

  const swiperElement = root.querySelector('.swiper, swiper-container, [part="swiper"]');
  return swiperElement?.swiper || null;
}

function resolveOriginalSlidesCount(slider) {
  if (!slider) {
    return 0;
  }

  return slider.querySelectorAll('[slot="items"] > .swiper-slide, [slot="items"] .swiper-slide').length;
}

function ensureLoopRepatchObserver(slider, callback) {
  if (!slider || slider.__nukhbaLoopObserver) {
    return;
  }

  const root = slider.shadowRoot || slider;
  if (!root || typeof MutationObserver === 'undefined') {
    return;
  }

  const observer = new MutationObserver(() => {
    callback?.();
  });

  observer.observe(root, { childList: true, subtree: true });
  slider.__nukhbaLoopObserver = observer;
}

function forceClosedLoopForSlider(slider, {
  datasetFlag,
  defaultDelay = 2200,
  repatch,
} = {}) {
  const swiper = resolveSliderSwiper(slider);
  if (!swiper) {
    ensureLoopRepatchObserver(slider, repatch);
    return false;
  }

  const patchedKey = `__${datasetFlag}Swiper`;
  if (slider[patchedKey] === swiper) {
    return Boolean(swiper);
  }

  slider[patchedKey] = swiper;
  ensureLoopRepatchObserver(slider, repatch);

  const originalSlidesCount = resolveOriginalSlidesCount(slider) || swiper.slides?.length || 1;

  swiper.params.loop = true;
  swiper.params.rewind = false;
  swiper.params.watchOverflow = false;
  swiper.params.slidesPerGroup = 1;
  swiper.params.loopedSlides = Math.max(swiper.params.loopedSlides || 0, originalSlidesCount);
  swiper.params.loopAdditionalSlides = Math.max(swiper.params.loopAdditionalSlides || 0, originalSlidesCount + 2);
  swiper.params.autoplay = {
    ...(swiper.params.autoplay || {}),
    delay: swiper.params.autoplay?.delay || defaultDelay,
    disableOnInteraction: false,
    pauseOnMouseEnter: false,
    waitForTransition: false,
  };

  if (typeof swiper.loopDestroy === 'function') {
    swiper.loopDestroy();
  }

  if (typeof swiper.loopCreate === 'function') {
    swiper.loopCreate();
  }

  if (typeof swiper.update === 'function') {
    swiper.update();
  }

  if (typeof swiper.slideToLoop === 'function') {
    swiper.slideToLoop(swiper.realIndex || 0, 0, false);
  } else if (typeof swiper.slideTo === 'function') {
    swiper.slideTo(0, 0, false);
  }

  swiper.on?.('reachEnd', () => {
    if (typeof swiper.slideToLoop === 'function') {
      swiper.slideToLoop(0, 0, false);
    } else if (typeof swiper.slideTo === 'function') {
      swiper.slideTo(0, 0, false);
    }
  });

  swiper.on?.('fromEdge', () => {
    swiper.autoplay?.start?.();
  });

  swiper.on?.('autoplayStop', () => {
    swiper.autoplay?.start?.();
  });

  swiper.on?.('transitionEnd', () => {
    if (swiper.isEnd) {
      if (typeof swiper.slideToLoop === 'function') {
        swiper.slideToLoop(0, 0, false);
      } else if (typeof swiper.slideTo === 'function') {
        swiper.slideTo(0, 0, false);
      }
      swiper.autoplay?.start?.();
    }
  });

  swiper.autoplay?.start?.();
  return true;
}

function forceClosedLoopForMovingProducts(slider) {
  return forceClosedLoopForSlider(slider, {
    datasetFlag: 'nukhbaLoopPatched',
    defaultDelay: 2200,
    repatch: patchMovingProductsSlider,
  });
}

function patchMovingProductsSlider() {
  document.querySelectorAll('salla-products-slider.nukhba-pro-products__slider').forEach((slider) => {
    forceClosedLoopForMovingProducts(slider);
  });
}

function scheduleMovingProductsSliderPatch(retries = 30) {
  patchMovingProductsSlider();

  if (retries <= 0) {
    return;
  }

  setTimeout(() => scheduleMovingProductsSliderPatch(retries - 1), 500);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => scheduleMovingProductsSliderPatch(), { once: true });
} else {
  scheduleMovingProductsSliderPatch();
}

document.addEventListener('theme::ready', () => scheduleMovingProductsSliderPatch());

function forceClosedLoopForMovingPhotos(slider) {
  return forceClosedLoopForSlider(slider, {
    datasetFlag: 'nukhbaPhotosLoopPatched',
    defaultDelay: 2000,
    repatch: patchMovingPhotosSlider,
  });
}

function patchMovingPhotosSlider() {
  document.querySelectorAll('salla-slider.nukhba-moving-photos__slider').forEach((slider) => {
    forceClosedLoopForMovingPhotos(slider);
  });
}

function scheduleMovingPhotosSliderPatch(retries = 30) {
  patchMovingPhotosSlider();

  if (retries <= 0) {
    return;
  }

  setTimeout(() => scheduleMovingPhotosSliderPatch(retries - 1), 500);
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => scheduleMovingPhotosSliderPatch(), { once: true });
} else {
  scheduleMovingPhotosSliderPatch();
}

document.addEventListener('theme::ready', () => scheduleMovingPhotosSliderPatch());
