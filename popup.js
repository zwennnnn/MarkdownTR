// MarkdownTR Popup Script
class MarkdownTRPopup {
  constructor() {
    this.currentTab = null;
    this.history = [];
    this.settings = {
      removeAds: true,
      keepLinks: true,
      addMetadata: true,
      darkMode: false,
      preserveLanguage: true
    };
    this.geminiApiKey = null;
    
    this.init();
  }

  async init() {
    await this.loadSettings();
    await this.loadApiKey();
    await this.getCurrentTab();
    this.setupEventListeners();
    this.loadHistory();
    this.applyTheme();
    this.updateAISection();
  }

  // Mevcut tab bilgisini al
  async getCurrentTab() {
    try {
      const response = await chrome.runtime.sendMessage({action: "getCurrentTab"});
      this.currentTab = response.tab;
    } catch (error) {
      console.error('Tab bilgisi alınamadı:', error);
    }
  }

  // Ayarları yükle
  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['markdowntr_settings']);
      if (result.markdowntr_settings) {
        this.settings = {...this.settings, ...result.markdowntr_settings};
      }
      this.updateSettingsUI();
    } catch (error) {
      console.log('Ayarlar yüklenemedi, varsayılan ayarlar kullanılıyor');
    }
  }

  // Geçmişi yükle
  async loadHistory() {
    try {
      const result = await chrome.storage.local.get(['markdowntr_history']);
      if (result.markdowntr_history) {
        this.history = result.markdowntr_history;
      }
      this.updateHistoryUI();
    } catch (error) {
      console.log('Geçmiş yüklenemedi');
    }
  }

  // Event listener'ları kur
  setupEventListeners() {
    // Ana butonlar
    document.getElementById('convert-selected').addEventListener('click', () => {
      this.convertSelected();
    });

    document.getElementById('convert-page').addEventListener('click', () => {
      this.convertPage();
    });

    // Language preserve toggle
    document.getElementById('preserve-language').addEventListener('change', (e) => {
      this.settings.preserveLanguage = e.target.checked;
      this.saveSettings();
    });

    // API Key save
    document.getElementById('save-api-key').addEventListener('click', () => {
      this.saveApiKey();
    });

    // API Key input enter
    document.getElementById('gemini-api-key').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        this.saveApiKey();
      }
    });

    // Ayar değişiklikleri
    const settingIds = ['remove-ads', 'keep-links', 'add-metadata'];
    settingIds.forEach(id => {
      const element = document.getElementById(id);
      element.addEventListener('change', (e) => {
        const settingKey = id.replace('-', '').replace('-', '');
        const camelCaseKey = settingKey.replace(/([A-Z])/g, (match, letter) => letter.toLowerCase());
        
        // Doğru mapping
        const settingMap = {
          'removeads': 'removeAds',
          'keeplinks': 'keepLinks', 
          'addmetadata': 'addMetadata'
        };
        
        const realKey = settingMap[camelCaseKey] || camelCaseKey;
        this.settings[realKey] = e.target.checked;
        this.saveSettings();
      });
    });

    // Tema değiştirici
    document.getElementById('theme-toggle').addEventListener('click', () => {
      this.toggleTheme();
    });

    // Geçmiş temizle
    document.getElementById('clear-history').addEventListener('click', () => {
      this.clearHistory();
    });


  }

  // Ayarları kaydet
  async saveSettings() {
    try {
      await chrome.storage.sync.set({markdowntr_settings: this.settings});
      
      // Content script'e güncel ayarları gönder
      if (this.currentTab) {
        chrome.tabs.sendMessage(this.currentTab.id, {
          action: 'updateSettings',
          settings: this.settings
        });
      }
    } catch (error) {
      console.error('Ayarlar kaydedilemedi:', error);
    }
  }

  // Ayar UI'sını güncelle
  updateSettingsUI() {
    document.getElementById('remove-ads').checked = this.settings.removeAds;
    document.getElementById('keep-links').checked = this.settings.keepLinks;
    document.getElementById('add-metadata').checked = this.settings.addMetadata;
    document.getElementById('preserve-language').checked = this.settings.preserveLanguage;
  }

  // Seçili metni çevir
  async convertSelected() {
    if (!this.currentTab) {
      this.showToast('❌ Aktif tab bulunamadı!', 'error');
      return;
    }

    try {
      this.showProgress('Seçili metin çevriliyor...');
      
      // Content script'in yüklendiğinden emin ol
      await this.ensureContentScriptLoaded();
      
      // Önce seçili metni al
      const [result] = await chrome.scripting.executeScript({
        target: { tabId: this.currentTab.id },
        function: () => window.getSelection().toString()
      });
      
      const selectedText = result.result;
      
      if (!selectedText || selectedText.trim() === '') {
        this.hideProgress();
        this.showToast('❌ Lütfen önce bir metin seçin!', 'error');
        return;
      }

      // API key kontrolü
      if (!this.geminiApiKey) {
        this.hideProgress();
        this.showToast('❌ Lütfen önce Gemini API Key girin!', 'error');
        return;
      }

      try {
        const markdown = await this.convertWithGemini(selectedText, false);
        
        // Clipboard'a kopyala
        await navigator.clipboard.writeText(markdown);
        
        this.hideProgress();
        this.addToHistory('Seçili Metin', markdown);
        this.showToast('✅ Seçili metin başarıyla çevrildi!', 'success');
      } catch (error) {
        this.hideProgress();
        console.error('Gemini API hatası:', error);
        this.showToast(`❌ AI çevirme hatası: ${error.message}`, 'error');
      }
    } catch (error) {
      this.hideProgress();
      console.error('Seçili metin çevirme hatası:', error);
      
      if (error.message.includes('Could not establish connection')) {
        this.showToast('❌ Sayfa henüz hazır değil. Lütfen sayfayı yenileyip tekrar deneyin!', 'error');
      } else {
        this.showToast('❌ Metin çevrilirken hata oluştu!', 'error');
      }
    }
  }

  // Tüm sayfayı çevir
  async convertPage() {
    if (!this.currentTab) {
      this.showToast('❌ Aktif tab bulunamadı!', 'error');
      return;
    }

    try {
      this.showProgress('Sayfa çevriliyor...');
      
      // Content script'in yüklendiğinden emin ol
      await this.ensureContentScriptLoaded();
      
      // API key kontrolü
      if (!this.geminiApiKey) {
        this.hideProgress();
        this.showToast('❌ Lütfen önce Gemini API Key girin!', 'error');
        return;
      }

      try {
        // Sayfa içeriğini al
        const [result] = await chrome.scripting.executeScript({
          target: { tabId: this.currentTab.id },
          function: () => {
            // Ana içerik alanını bul
            const contentSelectors = [
              'main', 'article', '.content', '.post-content',
              '.entry-content', '#content', '.container'
            ];
            
            let contentElement = null;
            for (const selector of contentSelectors) {
              contentElement = document.querySelector(selector);
              if (contentElement) break;
            }
            
            if (!contentElement) {
              contentElement = document.body;
            }
            
            return contentElement.innerText || contentElement.textContent;
          }
        });
        
        const pageContent = result.result;
        if (!pageContent || !pageContent.trim()) {
          this.hideProgress();
          this.showToast('❌ Sayfa içeriği bulunamadı!', 'error');
          return;
        }

        const markdown = await this.convertWithGemini(pageContent, true);
        
        // Clipboard'a kopyala
        await navigator.clipboard.writeText(markdown);
        
        this.hideProgress();
        this.addToHistory(this.currentTab.title || 'Sayfa', markdown);
        this.showToast('✅ Sayfa başarıyla çevrildi!', 'success');
      } catch (error) {
        this.hideProgress();
        console.error('Gemini AI hatası:', error);
        this.showToast(`❌ AI çevirme hatası: ${error.message}`, 'error');
      }
    } catch (error) {
      this.hideProgress();
      console.error('Sayfa çevirme hatası:', error);
      
      if (error.message.includes('Could not establish connection')) {
        this.showToast('❌ Sayfa henüz hazır değil. Lütfen sayfayı yenileyip tekrar deneyin!', 'error');
      } else {
        this.showToast('❌ Sayfa çevrilirken hata oluştu!', 'error');
      }
    }
  }

  // Geçmişe ekle
  async addToHistory(title, markdown) {
    const historyItem = {
      id: Date.now(),
      title: title.substring(0, 50) + (title.length > 50 ? '...' : ''),
      url: this.currentTab?.url || '',
      markdown: markdown,
      timestamp: new Date().toLocaleString('tr-TR')
    };

    this.history.unshift(historyItem);
    
    // Maximum 10 item tut
    if (this.history.length > 10) {
      this.history = this.history.slice(0, 10);
    }

    try {
      await chrome.storage.local.set({markdowntr_history: this.history});
      this.updateHistoryUI();
    } catch (error) {
      console.error('Geçmiş kaydedilemedi:', error);
    }
  }

  // Geçmiş UI güncelle
  updateHistoryUI() {
    const historyList = document.getElementById('history-list');
    
    if (this.history.length === 0) {
      historyList.innerHTML = '<p class="text-xs text-muted-foreground text-center py-2">Henüz çevrilmiş içerik yok</p>';
      return;
    }

    historyList.innerHTML = this.history.map(item => `
      <div class="history-item" data-id="${item.id}">
        <div class="font-medium text-foreground truncate">${item.title}</div>
        <div class="text-muted-foreground">${item.timestamp}</div>
      </div>
    `).join('');

    // Geçmiş öğelerine tıklama eventi ekle
    historyList.addEventListener('click', (e) => {
      const historyItem = e.target.closest('[data-id]');
      if (historyItem) {
        const itemId = parseInt(historyItem.getAttribute('data-id'));
        this.copyHistoryItem(itemId);
      }
    });
  }

  // Geçmiş öğesini kopyala
  async copyHistoryItem(itemId) {
    const item = this.history.find(h => h.id === itemId);
    if (item) {
      try {
        await navigator.clipboard.writeText(item.markdown);
        this.showToast('✅ Markdown içerik kopyalandı!', 'success');
      } catch (error) {
        this.showToast('❌ Kopyalama başarısız!', 'error');
      }
    }
  }

  // Geçmişi temizle
  async clearHistory() {
    this.history = [];
    try {
      await chrome.storage.local.set({markdowntr_history: []});
      this.updateHistoryUI();
      this.showToast('✅ Geçmiş temizlendi!', 'success');
    } catch (error) {
      console.error('Geçmiş temizlenemedi:', error);
    }
  }

  // Progress göster
  showProgress(text) {
    const container = document.getElementById('progress-container');
    const progressText = document.getElementById('progress-text');
    
    progressText.textContent = text;
    container.classList.remove('hidden');
    
    // Progress animasyonu
    let progress = 0;
    const progressBar = document.getElementById('progress-bar');
    const interval = setInterval(() => {
      progress += Math.random() * 15;
      if (progress > 90) progress = 90;
      progressBar.style.setProperty('--progress', `${progress}%`);
    }, 200);
    
    this.progressInterval = interval;
  }

  // Progress gizle
  hideProgress() {
    const container = document.getElementById('progress-container');
    const progressBar = document.getElementById('progress-bar');
    
    if (this.progressInterval) {
      clearInterval(this.progressInterval);
    }
    
    // %100'e tamamla sonra gizle
    progressBar.style.setProperty('--progress', '100%');
    setTimeout(() => {
      container.classList.add('hidden');
      progressBar.style.setProperty('--progress', '0%');
    }, 500);
  }

  // Tema değiştir
  toggleTheme() {
    this.settings.darkMode = !this.settings.darkMode;
    this.applyTheme();
    this.saveSettings();
  }

  // Tema uygula
  applyTheme() {
    const html = document.documentElement;
    const themeButton = document.getElementById('theme-toggle');
    
    if (this.settings.darkMode) {
      html.classList.add('dark');
      themeButton.innerHTML = '<div class="w-4 h-4">☀️</div>';
    } else {
      html.classList.remove('dark');
      themeButton.innerHTML = '<div class="w-4 h-4">🌙</div>';
    }
  }

  // Content script'in yüklendiğinden emin ol
  async ensureContentScriptLoaded() {
    try {
      // Ping mesajı gönder
      await chrome.tabs.sendMessage(this.currentTab.id, { action: 'ping' });
    } catch (error) {
      // Content script yüklenmemişse yükle
      try {
        await chrome.scripting.executeScript({
          target: { tabId: this.currentTab.id },
          files: ['content.js']
        });
        
        // Daha uzun bekleme süresi
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Tekrar ping dene
        await chrome.tabs.sendMessage(this.currentTab.id, { action: 'ping' });
      } catch (scriptError) {
        console.error('Content script yüklenemedi:', scriptError);
        throw new Error('Sayfa ile bağlantı kurulamadı. Sayfayı yenileyin ve tekrar deneyin.');
      }
    }
  }

  // API Key yükleme
  async loadApiKey() {
    try {
      const result = await chrome.storage.local.get(['gemini_api_key']);
      this.geminiApiKey = result.gemini_api_key || null;
    } catch (error) {
      console.error('API Key yüklenemedi:', error);
    }
  }

  // API Key kaydetme
  async saveApiKey() {
    const apiKeyInput = document.getElementById('gemini-api-key');
    const apiKey = apiKeyInput.value.trim();
    
    if (!apiKey) {
      this.showToast('❌ Lütfen API Key girin!', 'error');
      return;
    }

    if (!apiKey.startsWith('AIza') && !apiKey.startsWith('AIzaSy')) {
      this.showToast('❌ Geçersiz Gemini API Key formatı! (AIza... ile başlamalı)', 'error');
      return;
    }

    try {
      this.geminiApiKey = apiKey;
      await chrome.storage.local.set({ gemini_api_key: apiKey });
      apiKeyInput.value = '';
      this.showToast('✅ API Key başarıyla kaydedildi!', 'success');
      this.updateAISection();
    } catch (error) {
      console.error('API Key kaydedilemedi:', error);
      this.showToast('❌ API Key kaydedilemedi!', 'error');
    }
  }

  // AI section görünümünü güncelle
  updateAISection() {
    const apiKeyInput = document.getElementById('gemini-api-key');
    
    // API key varsa placeholder göster
    if (this.geminiApiKey) {
      apiKeyInput.placeholder = '🔑 API Key kaydedildi (değiştirmek için yeni key girin)';
    } else {
      apiKeyInput.placeholder = 'Gemini API Key girin...';
    }
  }

  // Gemini AI ile markdown çevirme
  async convertWithGemini(content, isFullPage = false) {
    if (!this.geminiApiKey) {
      throw new Error('API Key bulunamadı');
    }

    const languageInstruction = this.settings.preserveLanguage 
      ? "🚨 ÖNEMLİ: METNİN ORİJİNAL DİLİNİ KESINLIKLE KORU! İngilizce ise İngilizce kalsın, Türkçe ise Türkçe kalsın, hangi dilde ise o dilde bırak. DİL ÇEVİRİSİ YAPMA!"
      : "Dil çevirisi yapabilirsin";

    const prompt = isFullPage 
      ? `${languageInstruction}

Aşağıdaki web sayfası içeriğini Markdown formatına çevir. SADECE gerekli düzenlemeleri yap:

KURALLAR:
- Başlıkları # ## ### formatında koru
- Linkleri [text](url) formatında koru  
- Listeleri - veya 1. formatında koru
- Kod blokları \`\`\` ile koru
- Kalın metni **bold** formatında koru
- İtalik metni *italic* formatında koru
- Gereksiz reklamları ve navigasyon menülerini çıkar
- Ana içeriği koru, fazla değişiklik yapma
- Türkçe karakterleri koru (ğüşıöç)

İÇERİK:
${content}`
      : `${languageInstruction}

Aşağıdaki seçili metni Markdown formatına çevir. MİNİMAL değişiklik yap:

KURALLAR:
- Metnin orijinal anlamını ve yapısını KORU
- Sadece gerekli Markdown formatlaması ekle
- Başlık varsa # ## ### kullan
- Link varsa [text](url) formatı kullan
- Liste varsa - veya 1. formatı kullan
- Kalın metin varsa **bold** kullan
- İtalik metin varsa *italic* kullan
- Türkçe karakterleri koru (ğüşıöç)
- Gereksiz ekleme yapma, sadece formatla

METİN:
${content}`;

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${this.geminiApiKey}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        contents: [{
          parts: [{
            text: prompt
          }]
        }],
        systemInstruction: this.settings.preserveLanguage ? {
          parts: [{
            text: "Sen bir Markdown çevirici asistanısın. EN ÖNEMLİ KURAL: Verilen metnin dilini ASLA değiştirme! İngilizce metin İngilizce kalmalı, Türkçe metin Türkçe kalmalı. Sadece Markdown formatlaması yap, dil çevirisi kesinlikle yapma!"
          }]
        } : undefined,
        generationConfig: {
          temperature: 0.0,
          topK: 1,
          topP: 0.1,
          maxOutputTokens: 8192,
          candidateCount: 1,
          stopSequences: []
        },
        safetySettings: [
          {
            category: "HARM_CATEGORY_HARASSMENT",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_HATE_SPEECH", 
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_SEXUALLY_EXPLICIT",
            threshold: "BLOCK_NONE"
          },
          {
            category: "HARM_CATEGORY_DANGEROUS_CONTENT",
            threshold: "BLOCK_NONE"
          }
        ]
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || 'API çağrısı başarısız');
    }

    const data = await response.json();
    const generatedText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!generatedText) {
      throw new Error('AI yanıt vermedi');
    }

    return generatedText.trim();
  }

  // Toast notification
  showToast(message, type = 'info') {
    const container = document.getElementById('toast-container');
    
    const toast = document.createElement('div');
    toast.className = `toast ${type === 'success' ? 'bg-green-500 text-white' : 
      type === 'error' ? 'bg-red-500 text-white' : 
      'bg-blue-500 text-white'}`;
    toast.textContent = message;
    
    container.appendChild(toast);
    
    // Animasyon
    setTimeout(() => {
      toast.classList.add('show');
    }, 100);
    
    // 3 saniye sonra kaldır
    setTimeout(() => {
      toast.classList.remove('show');
      setTimeout(() => {
        if (toast.parentNode) {
          container.removeChild(toast);
        }
      }, 300);
    }, 3000);
  }
}

// Popup başlat
document.addEventListener('DOMContentLoaded', () => {
  new MarkdownTRPopup();
}); 