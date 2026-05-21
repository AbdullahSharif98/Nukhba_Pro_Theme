class NavigationMenu extends HTMLElement {
  connectedCallback() {
    salla.onReady(() => {
      salla.lang.onLoaded(() => {
        this.menus = [];
        this.displayAllText = salla.lang.get('blocks.home.display_all');
        this.moreText = salla.lang.get('common.titles.more');
        this.visibleMenus = [];
        this.overflowMenus = [];
        this.menuMode = this.dataset.menuMode || 'default';
        this.professionalEntries = this.parseJSON(this.dataset.professionalEntries, []);
        this.professionalExploreTitle = this.dataset.professionalExploreTitle || 'استكشف';
        this.professionalSideTitle = this.dataset.professionalSideTitle || 'الأفضل لك';

        return salla.api.component.getMenus()
          .then(({ data }) => {
            this.menus = data;
            return this.render();
          })
          .then(() => {
            this.initializeResponsiveMenu();
          })
          .catch((error) => salla.logger.error('salla-menu::Error fetching menus', error));
      });
    });
  }

  parseJSON(value, fallback = []) {
    if (!value) return fallback;

    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : fallback;
    } catch (error) {
      return fallback;
    }
  }

  normalizeValue(value) {
    return String(value || '')
      .trim()
      .toLowerCase();
  }

  hasChildren(menu) {
    return menu?.children?.length > 0;
  }

  hasProducts(menu) {
    return menu?.products?.length > 0;
  }

  isProfessionalMode() {
    return this.menuMode === 'professional';
  }

  getProfessionalEntry(menu) {
    const normalizedTitle = this.normalizeValue(menu?.title);
    const url = String(menu?.url || '');

    return this.professionalEntries.find((entry) => {
      const matchTitle = this.normalizeValue(entry['entries.match_title']);
      const matchUrl = this.normalizeValue(entry['entries.match_url_contains']);
      return (matchTitle && matchTitle === normalizedTitle) || (matchUrl && url.toLowerCase().includes(matchUrl));
    }) || null;
  }

  getProfessionalCardData(menu) {
    const entry = this.getProfessionalEntry(menu) || {};

    return {
      image: entry['entries.image'] || menu.image || '',
      title: entry['entries.card_title'] || menu.title || '',
      description: entry['entries.card_description'] || '',
    };
  }

  getProfessionalSideContent(menu) {
    const entry = this.getProfessionalEntry(menu) || {};
    const title = entry['entries.side_title'] || this.professionalSideTitle;
    const lines = String(entry['entries.side_notes'] || '')
      .split('\n')
      .map((line) => line.trim())
      .filter(Boolean);

    return {
      title,
      items: lines.length ? lines : (menu.children || []).slice(0, 4).map((item) => item.title),
    };
  }

  getDesktopClasses(menu, isRootMenu) {
    return `!hidden lg:!block ${isRootMenu ? 'root-level lg:!inline-block' : 'relative'} ${menu.products ? ' mega-menu' : ''}
        ${this.hasChildren(menu) ? ' has-children' : ''}`;
  }

  getMobileMenu(menu, displayAllText) {
    const menuImage = menu.image ? `<img src="${menu.image}" class="rounded-full" width="48" height="48" alt="${menu.title}" />` : '';

    return `
      <li class="lg:hidden text-sm font-bold" ${menu.attrs}>
        ${!this.hasChildren(menu) ? `
          <a href="${menu.url}" aria-label="${menu.title || 'category'}" class="text-gray-500 ${menu.image ? '!py-3' : ''}" ${menu.link_attrs}>
            ${menuImage}
            <span>${menu.title || ''}</span>
          </a>` :
          `
          <span class="${menu.image ? '!py-3' : ''}">
            ${menuImage}
            ${menu.title}
          </span>
          <ul>
            <li class="text-sm font-bold">
              <a href="${menu.url}" class="text-gray-500">${displayAllText}</a>
            </li>
            ${menu.children.map((subMenu) => this.getMobileMenu(subMenu, displayAllText)).join('')}
          </ul>
        `}
      </li>`;
  }

  getProfessionalDesktopMenu(menu, isRootMenu, additionalClasses = '') {
    const sideContent = this.getProfessionalSideContent(menu);
    const childCards = (menu.children || []).slice(0, 6);

    return `
      <li class="${this.getDesktopClasses(menu, isRootMenu)} ${additionalClasses} nukhba-pro-root" ${menu.attrs} data-menu-item>
        <a href="${menu.url}" aria-label="${menu.title || 'category'}" ${menu.link_attrs}>
          <span>${menu.title}</span>
        </a>
        ${this.hasChildren(menu) ? `
          <div class="sub-menu nukhba-prof-menu">
            <div class="nukhba-prof-menu__explore">
              <h4>${this.professionalExploreTitle}</h4>
              <ul>
                <li>
                  <a href="${menu.url}">
                    <span>${this.displayAllText}</span>
                    <i class="sicon-keyboard-arrow-left"></i>
                  </a>
                </li>
                ${(menu.children || []).map((subMenu) => `
                  <li>
                    <a href="${subMenu.url}">
                      <span>${subMenu.title}</span>
                      <i class="sicon-keyboard-arrow-left"></i>
                    </a>
                  </li>
                `).join('')}
              </ul>
            </div>

            <div class="nukhba-prof-menu__center">
              <h4>${menu.title}</h4>
              <div class="nukhba-prof-menu__cards">
                ${childCards.map((subMenu) => {
                  const card = this.getProfessionalCardData(subMenu);
                  return `
                    <a class="nukhba-prof-menu__card" href="${subMenu.url}">
                      <span class="nukhba-prof-menu__card-media">
                        ${card.image ? `<img src="${card.image}" alt="${card.title}" loading="lazy" width="260" height="190" />` : '<span class="nukhba-prof-menu__card-placeholder"></span>'}
                      </span>
                      <strong>${card.title}</strong>
                      ${card.description ? `<small>${card.description}</small>` : ''}
                    </a>
                  `;
                }).join('')}
              </div>
            </div>

            <div class="nukhba-prof-menu__side">
              <h4>${sideContent.title}</h4>
              <ul>
                ${sideContent.items.map((item) => `<li>${item}</li>`).join('')}
              </ul>
            </div>
          </div>` : ''}
      </li>`;
  }

  getDesktopMenu(menu, isRootMenu, additionalClasses = '') {
    if (this.isProfessionalMode() && isRootMenu && this.hasChildren(menu)) {
      return this.getProfessionalDesktopMenu(menu, isRootMenu, additionalClasses);
    }

    return `
      <li class="${this.getDesktopClasses(menu, isRootMenu)} ${additionalClasses}" ${menu.attrs} data-menu-item>
        <a href="${menu.url}" aria-label="${menu.title || 'category'}" ${menu.link_attrs}>
          <span>${menu.title}</span>
        </a>
        ${this.hasChildren(menu) ? `
          <div class="sub-menu ${this.hasProducts(menu) ? 'w-full left-0 flex' : 'w-56'}">
            <ul class="${this.hasProducts(menu) ? 'w-56 shrink-0 m-8 rtl:ml-0 ltr:mr-0' : ''}">
              ${menu.children.map((subMenu) => this.getDesktopMenu(subMenu, false)).join('\n')}
            </ul>
            ${this.hasProducts(menu) ? `
              <salla-products-list
                source="selected"
                shadow-on-hover
                source-value="[${menu.products}]" />` : ''}
          </div>` : ''}
      </li>`;
  }

  getMenus() {
    return this.menus.map((menu) => `
      ${this.getMobileMenu(menu, this.displayAllText)}
      ${this.getDesktopMenu(menu, true)}
    `).join('\n');
  }

  createMoreDropdown() {
    if (this.overflowMenus.length === 0) return '';

    return `
      <li class="!hidden lg:!block root-level lg:!inline-block has-children relative" id="more-menu-dropdown">
        <a href="#" aria-label="${this.moreText}">
          <span>${this.moreText}</span>
        </a>
        <div class="sub-menu w-56">
          <ul>
            ${this.overflowMenus.map((menu) => this.getDesktopMenu(menu, false)).join('\n')}
          </ul>
        </div>
      </li>`;
  }

  initializeResponsiveMenu() {
    if (window.innerWidth < 1024) return;

    const mainMenu = this.querySelector('.main-menu');
    if (!mainMenu) return;

    if (!window.enable_more_menu) {
      return;
    }

    this.checkMenuOverflow();

    const resizeHandler = this.debounce(() => {
      this.checkMenuOverflow();
    }, 250);

    window.addEventListener('resize', resizeHandler);
  }

  checkMenuOverflow() {
    const mainMenu = this.querySelector('.main-menu');
    if (!mainMenu) return;

    const container = mainMenu.closest('.container');
    if (!container) return;

    this.visibleMenus = [...this.menus];
    this.overflowMenus = [];

    const existingMore = mainMenu.querySelector('#more-menu-dropdown');
    if (existingMore) {
      existingMore.remove();
    }

    const menuItems = mainMenu.querySelectorAll('.root-level[data-menu-item]');
    menuItems.forEach((item) => {
      item.style.display = '';
    });

    const containerWidth = container.offsetWidth;
    const otherElements = container.querySelector('.flex')?.children || [];
    let usedWidth = 0;

    Array.from(otherElements).forEach((element) => {
      if (!element.contains(mainMenu)) {
        usedWidth += element.offsetWidth;
      }
    });

    const availableWidth = containerWidth - usedWidth - 300;
    let currentWidth = 0;
    let visibleCount = 0;

    menuItems.forEach((item, index) => {
      const itemWidth = item.offsetWidth;

      if (currentWidth + itemWidth <= availableWidth && index < this.menus.length) {
        currentWidth += itemWidth;
        visibleCount++;
      } else {
        item.style.setProperty('display', 'none', 'important');
        if (index < this.menus.length) {
          this.overflowMenus.push(this.menus[index]);
        }
      }
    });

    this.visibleMenus = this.menus.slice(0, visibleCount);

    if (this.overflowMenus.length > 0) {
      mainMenu.insertAdjacentHTML('beforeend', this.createMoreDropdown());
    }
  }

  debounce(func, wait) {
    let timeout;
    return (...args) => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        clearTimeout(timeout);
        func(...args);
      }, wait);
    };
  }

  render() {
    this.innerHTML = `
      <nav id="mobile-menu" class="mobile-menu">
        <ul class="main-menu">${this.getMenus()}</ul>
        <button class="btn--close close-mobile-menu sicon-cancel lg:hidden"></button>
      </nav>
      <button class="btn--close-sm close-mobile-menu sicon-cancel hidden"></button>`;
  }
}

if (!customElements.get('custom-main-menu')) {
  customElements.define('custom-main-menu', NavigationMenu);
}
