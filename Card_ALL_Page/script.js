// ========================================
// Card ALL Page — Main Application Script
// ========================================

(function () {
  'use strict';

  // ---- State ----
  const state = {
    cards: [],
    sortableInstance: null,
    orientation: 'portrait',
    cols: 4,
    rows: 4,
  };

  // ---- DOM References ----
  const $ = (sel) => document.querySelector(sel);
  const DOM = {
    themeToggle: null,
    btnPortrait: null,
    btnLandscape: null,
    selectCols: null,
    selectRows: null,
    uploadFront: null,
    uploadBack: null,
    frontFileInput: null,
    backFileInput: null,
    frontCounter: null,
    backCounter: null,
    cardGrid: null,
    emptyState: null,
    btnAddCard: null,
    btnAllFront: null,
    btnAllBack: null,
    btnClearAll: null,
    btnExportPng: null,
    btnExportPdf: null,
    toast: null,
    loadingOverlay: null,
  };

  // ---- Initialization ----
  function init() {
    // Cache DOM references
    DOM.themeToggle = $('#theme-toggle');
    DOM.btnPortrait = $('#btn-portrait');
    DOM.btnLandscape = $('#btn-landscape');
    DOM.selectCols = $('#select-cols');
    DOM.selectRows = $('#select-rows');
    DOM.uploadFront = $('#upload-front');
    DOM.uploadBack = $('#upload-back');
    DOM.frontFileInput = $('#front-file-input');
    DOM.backFileInput = $('#back-file-input');
    DOM.frontCounter = $('#front-counter');
    DOM.backCounter = $('#back-counter');
    DOM.cardGrid = $('#card-grid');
    DOM.emptyState = $('#empty-state');
    DOM.btnAddCard = $('#btn-add-card');
    DOM.btnAllFront = $('#btn-all-front');
    DOM.btnAllBack = $('#btn-all-back');
    DOM.btnClearAll = $('#btn-clear-all');
    DOM.btnExportPng = $('#btn-export-png');
    DOM.btnExportPdf = $('#btn-export-pdf');
    DOM.toast = $('#toast');
    DOM.loadingOverlay = $('#loading-overlay');

    loadTheme();
    loadOrientation();
    loadGridDimensions();
    bindEvents();
    initDefaultCards();
  }

  // ---- Theme & Orientation ----
  function loadTheme() {
    const saved = localStorage.getItem('card-all-page-theme') || 'dark';
    document.documentElement.setAttribute('data-theme', saved);
  }

  function toggleTheme() {
    const current = document.documentElement.getAttribute('data-theme');
    const next = current === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    localStorage.setItem('card-all-page-theme', next);
  }

  function loadOrientation() {
    const saved = localStorage.getItem('card-all-page-orientation') || 'portrait';
    setOrientation(saved, false);
  }

  function setOrientation(orientation, notify = true) {
    state.orientation = orientation;
    document.documentElement.setAttribute('data-card-orientation', orientation);
    localStorage.setItem('card-all-page-orientation', orientation);

    if (DOM.btnPortrait && DOM.btnLandscape) {
      DOM.btnPortrait.classList.toggle('active', orientation === 'portrait');
      DOM.btnLandscape.classList.toggle('active', orientation === 'landscape');
    }

    if (notify) {
      showToast(
        orientation === 'portrait'
          ? '縦向き（56.5 × 86.5 mm）に切り替えました'
          : '横向き（86.5 × 56.5 mm）に切り替えました'
      );
    }
  }

  function loadGridDimensions() {
    state.cols = parseInt(localStorage.getItem('card-all-page-cols') || '4', 10);
    state.rows = parseInt(localStorage.getItem('card-all-page-rows') || '4', 10);

    if (DOM.selectCols) DOM.selectCols.value = String(state.cols);
    if (DOM.selectRows) DOM.selectRows.value = String(state.rows);
  }

  function updateGridDimensions(notify = true) {
    if (DOM.selectCols) state.cols = parseInt(DOM.selectCols.value, 10) || 4;
    if (DOM.selectRows) state.rows = parseInt(DOM.selectRows.value, 10) || 4;

    localStorage.setItem('card-all-page-cols', state.cols);
    localStorage.setItem('card-all-page-rows', state.rows);

    const targetTotal = state.cols * state.rows;
    while (state.cards.length < targetTotal) {
      const idx = state.cards.length;
      state.cards.push({
        id: 'card-' + idx + '-' + Date.now(),
        name: 'カード ' + String(idx + 1).padStart(2, '0'),
        frontImage: null,
        backImage: state.defaultBackImage || null,
        isFlipped: false,
      });
    }

    if (notify) {
      showToast(state.cols + '列 × ' + state.rows + '行（計 ' + targetTotal + '枚）に変更しました');
    }

    renderGrid();
  }

  // ---- Events ----
  function bindEvents() {
    DOM.themeToggle.addEventListener('click', toggleTheme);

    if (DOM.btnPortrait) {
      DOM.btnPortrait.addEventListener('click', () => setOrientation('portrait'));
    }
    if (DOM.btnLandscape) {
      DOM.btnLandscape.addEventListener('click', () => setOrientation('landscape'));
    }

    if (DOM.selectCols) {
      DOM.selectCols.addEventListener('change', () => updateGridDimensions(true));
    }
    if (DOM.selectRows) {
      DOM.selectRows.addEventListener('change', () => updateGridDimensions(true));
    }

    // Front upload
    DOM.frontFileInput.addEventListener('change', (e) => {
      handleUpload(e.target.files, 'front');
    });
    setupDropZone(DOM.uploadFront, DOM.frontFileInput, 'front');

    // Back upload
    DOM.backFileInput.addEventListener('change', (e) => {
      handleUpload(e.target.files, 'back');
    });
    setupDropZone(DOM.uploadBack, DOM.backFileInput, 'back');

    // Toolbar buttons
    if (DOM.btnAddCard) {
      DOM.btnAddCard.addEventListener('click', addNewCardSlot);
    }
    DOM.btnAllFront.addEventListener('click', () => setAllFlip(false));
    DOM.btnAllBack.addEventListener('click', () => setAllFlip(true));
    if (DOM.btnClearAll) {
      DOM.btnClearAll.addEventListener('click', clearAllCards);
    }
    DOM.btnExportPng.addEventListener('click', exportPNG);
    DOM.btnExportPdf.addEventListener('click', exportPDF);
  }

  // ---- Clear All Cards ----
  function clearAllCards() {
    if (!confirm('すべてのカード画像と設定をリセットしてもよろしいですか？')) {
      return;
    }

    state.defaultBackImage = null;
    initDefaultCards();

    // Reset upload counters & UI
    DOM.frontCounter.textContent = '0 / ' + state.cards.length + ' 枚';
    DOM.frontCounter.classList.remove('complete');
    DOM.uploadFront.classList.remove('loaded');

    DOM.backCounter.textContent = '0 / ' + state.cards.length + ' 枚';
    DOM.backCounter.classList.remove('complete');
    DOM.uploadBack.classList.remove('loaded');

    // Reset input elements
    if (DOM.frontFileInput) DOM.frontFileInput.value = '';
    if (DOM.backFileInput) DOM.backFileInput.value = '';

    showToast('すべてのカード画像をリセットしました');
  }

  // ---- Add Card Slot ----
  function addNewCardSlot() {
    const idx = state.cards.length;
    state.cards.push({
      id: 'card-' + idx + '-' + Date.now(),
      name: 'カード ' + String(idx + 1).padStart(2, '0'),
      frontImage: null,
      backImage: state.defaultBackImage || null,
      isFlipped: false,
    });
    showToast('新しいカード枠を追加しました（計' + state.cards.length + '枚）');
    renderGrid();
  }

  // ---- Drag & Drop Zone ----
  function setupDropZone(element, fileInput, side) {
    // Prevent file input click from bubbling to drop zone drag events
    element.addEventListener('dragover', (e) => {
      e.preventDefault();
      e.stopPropagation();
      element.classList.add('drag-over');
    });

    element.addEventListener('dragleave', (e) => {
      e.preventDefault();
      e.stopPropagation();
      element.classList.remove('drag-over');
    });

    element.addEventListener('drop', (e) => {
      e.preventDefault();
      e.stopPropagation();
      element.classList.remove('drag-over');
      const files = e.dataTransfer.files;
      handleUpload(files, side);
    });
  }

  // ---- Card Slot Initialization ----
  function initDefaultCards() {
    const totalCount = state.cols * state.rows;
    state.cards = Array.from({ length: totalCount }, (_, i) => ({
      id: 'card-' + i + '-' + Date.now(),
      name: 'カード ' + String(i + 1).padStart(2, '0'),
      frontImage: null,
      backImage: null,
      isFlipped: false,
    }));
    renderGrid();
  }

  // ---- Image Upload ----
  async function handleUpload(fileList, side) {
    const files = Array.from(fileList).filter((f) => f.type.startsWith('image/'));

    if (files.length === 0) {
      showToast('画像ファイルが見つかりません');
      return;
    }

    // Sort files by name for consistent ordering within this upload batch
    files.sort((a, b) => a.name.localeCompare(b.name, 'ja'));

    // Read all files as Data URLs
    const images = await Promise.all(files.map(readFileAsDataURL));

    if (side === 'front') {
      // Find the first slot without a front image
      let startIdx = state.cards.findIndex((c) => !c.frontImage);
      if (startIdx === -1) {
        startIdx = state.cards.length;
      }

      files.forEach((file, index) => {
        const targetIdx = startIdx + index;
        if (targetIdx >= state.cards.length) {
          state.cards.push({
            id: 'card-' + targetIdx + '-' + Date.now(),
            name: removeExtension(file.name),
            frontImage: images[index],
            backImage: state.defaultBackImage || null,
            isFlipped: false,
          });
        } else {
          state.cards[targetIdx].frontImage = images[index];
          state.cards[targetIdx].name = removeExtension(file.name);
        }
      });

      showToast('表面画像を' + files.length + '枚追加しました（合計 ' + frontLoadedCount + '枚）');
    } else {
      if (files.length === 1) {
        // Single back image mode: Apply to ALL cards
        const singleBackImage = images[0];
        state.defaultBackImage = singleBackImage;

        state.cards.forEach((card) => {
          card.backImage = singleBackImage;
        });

        showToast('裏面画像をすべてのカード（' + state.cards.length + '枚）に一括適用しました');
      } else {
        // Multi back image mode: Assign sequentially to empty slots or append
        let startIdx = state.cards.findIndex((c) => !c.backImage);
        if (startIdx === -1) {
          startIdx = state.cards.length;
        }

        files.forEach((file, index) => {
          const targetIdx = startIdx + index;
          if (targetIdx >= state.cards.length) {
            state.cards.push({
              id: 'card-' + targetIdx + '-' + Date.now(),
              name: 'カード ' + String(targetIdx + 1).padStart(2, '0'),
              frontImage: null,
              backImage: images[index],
              isFlipped: false,
            });
          } else {
            state.cards[targetIdx].backImage = images[index];
          }
        });

        const backLoadedCount = state.cards.filter((c) => c.backImage).length;
        showToast('裏面画像を' + files.length + '枚追加しました（合計 ' + backLoadedCount + '枚）');
      }
    }

    renderGrid();
  }

  function readFileAsDataURL(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function removeExtension(filename) {
    return filename.replace(/\.[^.]+$/, '');
  }

  // ---- Update Upload Counter UI ----
  function updateUploadCounters() {
    const totalCards = state.cards.length;
    const frontCount = state.cards.filter((c) => c.frontImage).length;

    // Front counter
    if (DOM.frontCounter) {
      DOM.frontCounter.textContent = frontCount + ' / ' + totalCards + ' 枚';
      const isFrontComplete = totalCards > 0 && frontCount >= totalCards;
      DOM.frontCounter.classList.toggle('complete', isFrontComplete);
      if (DOM.uploadFront) {
        DOM.uploadFront.classList.toggle('loaded', frontCount > 0);
      }
    }

    // Back counter
    if (DOM.backCounter) {
      if (state.defaultBackImage) {
        DOM.backCounter.textContent = '共通裏面 (全' + totalCards + '枚に適用)';
        DOM.backCounter.classList.add('complete');
        if (DOM.uploadBack) DOM.uploadBack.classList.add('loaded');
      } else {
        const backCount = state.cards.filter((c) => c.backImage).length;
        DOM.backCounter.textContent = backCount + ' / ' + totalCards + ' 枚';
        const isBackComplete = totalCards > 0 && backCount >= totalCards;
        DOM.backCounter.classList.toggle('complete', isBackComplete);
        if (DOM.uploadBack) {
          DOM.uploadBack.classList.toggle('loaded', backCount > 0);
        }
      }
    }
  }

  // ---- Render Grid ----
  function renderGrid() {
    DOM.cardGrid.innerHTML = '';
    DOM.cardGrid.style.gridTemplateColumns = 'repeat(' + state.cols + ', 1fr)';

    const isLandscape = state.orientation === 'landscape';
    const cardSlotWidth = isLandscape ? 240 : 200;
    DOM.cardGrid.style.maxWidth = Math.max(900, state.cols * cardSlotWidth) + 'px';

    if (state.cards.length === 0) {
      DOM.cardGrid.innerHTML =
        '<div class="empty-state" id="empty-state">' +
        '  <div class="empty-icon">📁</div>' +
        '  <div class="empty-text">表面画像をアップロードしてください</div>' +
        '</div>';
      updateUploadCounters();
      return;
    }

    state.cards.forEach((card) => {
      const slot = createCardSlot(card);
      DOM.cardGrid.appendChild(slot);
    });

    // Initialize SortableJS
    initSortable();

    // Sync upload counters
    updateUploadCounters();
  }

  // ---- Helper: Trigger Single Image Select ----
  function triggerSingleImageUpload(onSelect) {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = 'image/*';
    input.style.display = 'none';

    input.addEventListener('change', async (e) => {
      const file = e.target.files[0];
      if (!file) return;
      try {
        const dataUrl = await readFileAsDataURL(file);
        onSelect(dataUrl, removeExtension(file.name));
      } catch (err) {
        console.error('Single image load error:', err);
        showToast('画像の読み込みに失敗しました');
      }
    });

    document.body.appendChild(input);
    input.click();
    setTimeout(() => input.remove(), 1000);
  }

  function createCardSlot(card) {
    const slot = document.createElement('div');
    slot.className = 'card-slot';
    slot.dataset.cardId = card.id;

    // ---- Card Header (Name & Action Buttons) ----
    const headerEl = document.createElement('div');
    headerEl.className = 'card-slot-header';

    const nameEl = document.createElement('div');
    nameEl.className = 'card-name';
    nameEl.textContent = card.name;
    nameEl.title = 'クリックして名前を編集';
    nameEl.setAttribute('tabindex', '0');

    nameEl.addEventListener('click', (e) => {
      e.stopPropagation();
      nameEl.contentEditable = 'true';
      nameEl.focus();
      const range = document.createRange();
      range.selectNodeContents(nameEl);
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(range);
    });

    nameEl.addEventListener('blur', () => {
      nameEl.contentEditable = 'false';
      const newName = nameEl.textContent.trim();
      card.name = newName || card.name;
      nameEl.textContent = card.name;
    });

    nameEl.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        nameEl.blur();
      }
    });

    // Individual replacement buttons
    const actionsEl = document.createElement('div');
    actionsEl.className = 'card-actions';

    const btnFrontChange = document.createElement('button');
    btnFrontChange.className = 'btn-change-img';
    btnFrontChange.textContent = '📷 表';
    btnFrontChange.title = 'このカードの表面画像を差し替え';
    btnFrontChange.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerSingleImageUpload((imgData, fileName) => {
        card.frontImage = imgData;
        card.name = fileName || card.name;
        showToast('「' + card.name + '」の表面画像を差し替えました');
        renderGrid();
      });
    });

    const btnBackChange = document.createElement('button');
    btnBackChange.className = 'btn-change-img';
    btnBackChange.textContent = '🃏 裏';
    btnBackChange.title = 'このカードの裏面画像を差し替え';
    btnBackChange.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerSingleImageUpload((imgData) => {
        card.backImage = imgData;
        showToast('「' + card.name + '」の裏面画像を差し替えました');
        renderGrid();
      });
    });

    const btnDelete = document.createElement('button');
    btnDelete.className = 'btn-delete-card';
    btnDelete.textContent = '🗑️';
    btnDelete.title = 'このカードを削除';
    btnDelete.addEventListener('click', (e) => {
      e.stopPropagation();
      const idx = state.cards.findIndex((c) => c.id === card.id);
      if (idx !== -1) {
        const deletedName = card.name;
        state.cards.splice(idx, 1);
        showToast('「' + deletedName + '」を削除しました');
        renderGrid();
      }
    });

    actionsEl.appendChild(btnFrontChange);
    actionsEl.appendChild(btnBackChange);
    actionsEl.appendChild(btnDelete);

    headerEl.appendChild(nameEl);
    headerEl.appendChild(actionsEl);

    // ---- Card Element (3D flip) ----
    const cardEl = document.createElement('div');
    cardEl.className = 'card' + (card.isFlipped ? ' flipped' : '');

    const inner = document.createElement('div');
    inner.className = 'card-inner';

    // Front face
    const frontFace = document.createElement('div');
    frontFace.className = 'card-face front';
    if (card.frontImage) {
      const img = document.createElement('img');
      img.src = card.frontImage;
      img.alt = card.name + ' (表)';
      img.draggable = false;
      frontFace.appendChild(img);
    } else {
      frontFace.innerHTML =
        '<div class="placeholder">' +
        '  <div class="placeholder-icon">🎴</div>' +
        '  <div>表面</div>' +
        '</div>';
    }

    // Front overlay button
    const frontOverlay = document.createElement('div');
    frontOverlay.className = 'face-change-overlay';
    const frontOverlayBtn = document.createElement('button');
    frontOverlayBtn.className = 'face-change-btn';
    frontOverlayBtn.textContent = '📷 表変更';
    frontOverlayBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerSingleImageUpload((imgData, fileName) => {
        card.frontImage = imgData;
        card.name = fileName || card.name;
        showToast('「' + card.name + '」の表面画像を差し替えました');
        renderGrid();
      });
    });
    frontOverlay.appendChild(frontOverlayBtn);
    frontFace.appendChild(frontOverlay);

    // Back face
    const backFace = document.createElement('div');
    backFace.className = 'card-face back';
    if (card.backImage) {
      const img = document.createElement('img');
      img.src = card.backImage;
      img.alt = card.name + ' (裏)';
      img.draggable = false;
      backFace.appendChild(img);
    } else {
      backFace.innerHTML =
        '<div class="placeholder">' +
        '  <div class="placeholder-icon">🃏</div>' +
        '  <div>裏面</div>' +
        '</div>';
    }

    // Back overlay button
    const backOverlay = document.createElement('div');
    backOverlay.className = 'face-change-overlay';
    const backOverlayBtn = document.createElement('button');
    backOverlayBtn.className = 'face-change-btn';
    backOverlayBtn.textContent = '🃏 裏変更';
    backOverlayBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      triggerSingleImageUpload((imgData) => {
        card.backImage = imgData;
        showToast('「' + card.name + '」の裏面画像を差し替えました');
        renderGrid();
      });
    });
    backOverlay.appendChild(backOverlayBtn);
    backFace.appendChild(backOverlay);

    inner.appendChild(frontFace);
    inner.appendChild(backFace);
    cardEl.appendChild(inner);

    // Flip on click (short click only, long press triggers drag)
    let isDragging = false;
    cardEl.addEventListener('click', (e) => {
      if (isDragging) return;
      if (e.target.closest('.face-change-btn')) return;
      e.stopPropagation();
      card.isFlipped = !card.isFlipped;
      cardEl.classList.toggle('flipped');
    });

    slot.appendChild(headerEl);
    slot.appendChild(cardEl);

    return slot;
  }

  // ---- SortableJS (Long-press Drag) ----
  function initSortable() {
    if (state.sortableInstance) {
      state.sortableInstance.destroy();
    }

    state.sortableInstance = new Sortable(DOM.cardGrid, {
      animation: 200,
      easing: 'cubic-bezier(0.4, 0, 0.2, 1)',
      delay: 200, // Long press 200ms to trigger drag
      delayOnTouchOnly: false, // Enable for both mouse & touch
      touchStartThreshold: 5,
      ghostClass: 'sortable-ghost',
      chosenClass: 'sortable-chosen',
      dragClass: 'sortable-drag',
      filter: '.card-name, .btn-change-img, .btn-delete-card, .face-change-btn',
      preventOnFilter: false,
      onEnd: function (evt) {
        // Sync state.cards order with DOM
        const movedCard = state.cards.splice(evt.oldIndex, 1)[0];
        state.cards.splice(evt.newIndex, 0, movedCard);
      },
    });
  }

  // ---- Flip All ----
  function setAllFlip(flipped) {
    if (state.cards.length === 0) {
      showToast('カードがありません');
      return;
    }

    state.cards.forEach((card) => {
      card.isFlipped = flipped;
    });

    DOM.cardGrid.querySelectorAll('.card').forEach((cardEl) => {
      cardEl.classList.toggle('flipped', flipped);
    });

    showToast(flipped ? '全てのカードを裏面にしました' : '全てのカードを表面にしました');
  }

  // ---- Helper: Create Side-by-Side Export Element ----
  function createExportContainer() {
    const container = document.createElement('div');
    container.style.position = 'fixed';
    container.style.left = '-9999px';
    container.style.top = '0';
    container.style.width = '1400px';
    container.style.padding = '32px';
    container.style.background = getComputedStyle(document.body).backgroundColor;
    container.style.color = getComputedStyle(document.body).color;
    container.style.boxSizing = 'border-box';

    const isLandscape = state.orientation === 'landscape';
    const cardAspectRatio = isLandscape ? '86.5 / 56.5' : '56.5 / 86.5';

    const grid = document.createElement('div');
    grid.style.display = 'grid';
    grid.style.gridTemplateColumns = isLandscape ? 'repeat(3, 1fr)' : 'repeat(4, 1fr)';
    grid.style.gap = '24px';

    state.cards.forEach((card) => {
      const pairSlot = document.createElement('div');
      pairSlot.className = 'export-card-pair';

      const nameEl = document.createElement('div');
      nameEl.className = 'card-name';
      nameEl.style.fontWeight = '600';
      nameEl.style.fontSize = '0.85rem';
      nameEl.style.marginBottom = '6px';
      nameEl.textContent = card.name;

      const row = document.createElement('div');
      row.className = 'export-card-row';

      // Front
      const frontSingle = document.createElement('div');
      frontSingle.className = 'export-card-single';
      frontSingle.style.aspectRatio = cardAspectRatio;
      if (card.frontImage) {
        const img = document.createElement('img');
        img.src = card.frontImage;
        frontSingle.appendChild(img);
      } else {
        frontSingle.innerHTML = '<div class="placeholder"><div class="placeholder-icon">🎴</div><div>表面</div></div>';
      }
      const frontBadge = document.createElement('div');
      frontBadge.className = 'side-badge';
      frontBadge.textContent = '表';
      frontSingle.appendChild(frontBadge);

      // Back
      const backSingle = document.createElement('div');
      backSingle.className = 'export-card-single';
      backSingle.style.aspectRatio = cardAspectRatio;
      if (card.backImage) {
        const img = document.createElement('img');
        img.src = card.backImage;
        backSingle.appendChild(img);
      } else {
        backSingle.innerHTML = '<div class="placeholder"><div class="placeholder-icon">🃏</div><div>裏面</div></div>';
      }
      const backBadge = document.createElement('div');
      backBadge.className = 'side-badge';
      backBadge.textContent = '裏';
      backSingle.appendChild(backBadge);

      row.appendChild(frontSingle);
      row.appendChild(backSingle);

      pairSlot.appendChild(nameEl);
      pairSlot.appendChild(row);

      grid.appendChild(pairSlot);
    });

    container.appendChild(grid);
    document.body.appendChild(container);
    return container;
  }

  // ---- Export PNG ----
  async function exportPNG() {
    if (state.cards.length === 0) {
      showToast('エクスポートするカードがありません');
      return;
    }

    showLoading(true);
    let exportContainer = null;

    try {
      exportContainer = createExportContainer();

      const canvas = await html2canvas(exportContainer, {
        backgroundColor: getComputedStyle(document.body).backgroundColor,
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const link = document.createElement('a');
      link.download = 'card-all-page-side-by-side-' + getTimestamp() + '.png';
      link.href = canvas.toDataURL('image/png');
      link.click();

      showToast('表裏となり合わせのPNGを保存しました');
    } catch (err) {
      console.error('PNG export error:', err);
      showToast('PNGの保存に失敗しました');
    } finally {
      if (exportContainer) {
        exportContainer.remove();
      }
      showLoading(false);
    }
  }

  // ---- Export PDF ----
  async function exportPDF() {
    if (state.cards.length === 0) {
      showToast('エクスポートするカードがありません');
      return;
    }

    showLoading(true);
    let exportContainer = null;

    try {
      exportContainer = createExportContainer();

      const canvas = await html2canvas(exportContainer, {
        backgroundColor: getComputedStyle(document.body).backgroundColor,
        scale: 2,
        useCORS: true,
        logging: false,
      });

      const { jsPDF } = window.jspdf;
      const imgData = canvas.toDataURL('image/png');

      const gridWidth = canvas.width;
      const gridHeight = canvas.height;
      const orientation = gridWidth > gridHeight ? 'landscape' : 'portrait';

      const pdf = new jsPDF({
        orientation: orientation,
        unit: 'mm',
        format: 'a4',
      });

      const pageWidth = pdf.internal.pageSize.getWidth();
      const pageHeight = pdf.internal.pageSize.getHeight();
      const margin = 10;
      const availableWidth = pageWidth - margin * 2;
      const availableHeight = pageHeight - margin * 2;

      const scale = Math.min(availableWidth / gridWidth, availableHeight / gridHeight);
      const imgWidth = gridWidth * scale;
      const imgHeight = gridHeight * scale;
      const x = (pageWidth - imgWidth) / 2;
      const y = (pageHeight - imgHeight) / 2;

      pdf.addImage(imgData, 'PNG', x, y, imgWidth, imgHeight);
      pdf.save('card-all-page-side-by-side-' + getTimestamp() + '.pdf');

      showToast('表裏となり合わせのPDFを保存しました');
    } catch (err) {
      console.error('PDF export error:', err);
      showToast('PDFの保存に失敗しました');
    } finally {
      if (exportContainer) {
        exportContainer.remove();
      }
      showLoading(false);
    }
  }

  // ---- Utilities ----
  function showToast(message) {
    DOM.toast.textContent = message;
    DOM.toast.classList.add('show');
    clearTimeout(showToast._timer);
    showToast._timer = setTimeout(() => {
      DOM.toast.classList.remove('show');
    }, 2500);
  }

  function showLoading(active) {
    DOM.loadingOverlay.classList.toggle('active', active);
  }

  function getTimestamp() {
    const now = new Date();
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    const h = String(now.getHours()).padStart(2, '0');
    const min = String(now.getMinutes()).padStart(2, '0');
    return y + m + d + '_' + h + min;
  }

  // ---- Start ----
  document.addEventListener('DOMContentLoaded', init);
})();
