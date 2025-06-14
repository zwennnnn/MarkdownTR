// MarkdownTR Background Service Worker
chrome.runtime.onInstalled.addListener(() => {
  // Context menu öğelerini oluştur
  chrome.contextMenus.create({
    id: "markdowntr-selected",
    title: "📝 Seçili Metni Markdown Yap",
    contexts: ["selection"],
    documentUrlPatterns: ["http://*/*", "https://*/*"]
  });
  
  chrome.contextMenus.create({
    id: "markdowntr-page", 
    title: "📄 Tüm Sayfayı Markdown Yap",
    contexts: ["page"]
  });
  
  console.log("MarkdownTR extension yüklendi!");
});

// Context menu tıklamaları
chrome.contextMenus.onClicked.addListener(async (info, tab) => {
  if (info.menuItemId === "markdowntr-selected") {
    await handleSelectedTextConversion(info.selectionText, tab.id);
  } else if (info.menuItemId === "markdowntr-page") {
    await handlePageConversion(tab.id);
  }
});

// Seçili metin çevirme
async function handleSelectedTextConversion(selectedText, tabId) {
  try {
    // API key'i al
    const result = await chrome.storage.local.get(['gemini_api_key']);
    const apiKey = result.gemini_api_key;
    
    if (!apiKey) {
      // API key yoksa popup'ı aç
      chrome.action.openPopup();
      return;
    }

    // Seçili metni sayfadan al (daha güvenilir)
    const [selectionResult] = await chrome.scripting.executeScript({
      target: { tabId: tabId },
      function: () => {
        const selection = window.getSelection();
        const selectedText = selection.toString().trim();
        
        if (!selectedText) {
          // Eğer selection boşsa, aktif elementi kontrol et
          const activeElement = document.activeElement;
          if (activeElement && (activeElement.tagName === 'INPUT' || activeElement.tagName === 'TEXTAREA')) {
            const start = activeElement.selectionStart;
            const end = activeElement.selectionEnd;
            if (start !== end) {
              return activeElement.value.substring(start, end).trim();
            }
          }
        }
        
        return selectedText;
      }
    });

    const actualSelectedText = selectionResult.result;
    
    console.log('Context menu - Seçili metin:', actualSelectedText);

    if (!actualSelectedText || actualSelectedText.trim() === '') {
      showNotification('❌ Lütfen önce bir metin seçin!');
      return;
    }

    // Ayarları al
    const settings = await chrome.storage.local.get(['preserveLanguage']);
    const preserveLanguage = settings.preserveLanguage !== false; // Default true

    // Gemini ile çevir
    const markdown = await convertWithGemini(actualSelectedText, false, apiKey, preserveLanguage);
    
    // Clipboard'a kopyala
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      function: (text) => {
        navigator.clipboard.writeText(text);
      },
      args: [markdown]
    });

    showNotification('✅ Seçili metin başarıyla çevrildi ve kopyalandı!');
    
  } catch (error) {
    console.error('Seçili metin çevirme hatası:', error);
    showNotification(`❌ Çevirme hatası: ${error.message}`);
  }
}

// Sayfa çevirme
async function handlePageConversion(tabId) {
  try {
    // API key'i al
    const result = await chrome.storage.local.get(['gemini_api_key']);
    const apiKey = result.gemini_api_key;
    
    if (!apiKey) {
      // API key yoksa popup'ı aç
      chrome.action.openPopup();
      return;
    }

    // Sayfa içeriğini al
    const [pageResult] = await chrome.scripting.executeScript({
      target: { tabId: tabId },
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
    
    const pageContent = pageResult.result;
    if (!pageContent || !pageContent.trim()) {
      showNotification('❌ Sayfa içeriği bulunamadı!');
      return;
    }

    // Ayarları al
    const settings = await chrome.storage.local.get(['preserveLanguage']);
    const preserveLanguage = settings.preserveLanguage !== false; // Default true

    // Gemini ile çevir
    const markdown = await convertWithGemini(pageContent, true, apiKey, preserveLanguage);
    
    // Clipboard'a kopyala
    await chrome.scripting.executeScript({
      target: { tabId: tabId },
      function: (text) => {
        navigator.clipboard.writeText(text);
      },
      args: [markdown]
    });

    showNotification('✅ Sayfa başarıyla çevrildi ve kopyalandı!');
    
  } catch (error) {
    console.error('Sayfa çevirme hatası:', error);
    showNotification(`❌ Çevirme hatası: ${error.message}`);
  }
}

// Gemini AI ile markdown çevirme
async function convertWithGemini(content, isFullPage, apiKey, preserveLanguage) {
  const languageInstruction = preserveLanguage 
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

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`, {
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
      systemInstruction: preserveLanguage ? {
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

// Notification göster
function showNotification(message) {
  chrome.notifications.create({
    type: 'basic',
    iconUrl: 'icons/icon48.png',
    title: 'MarkdownTR',
    message: message
  });
}

// Popup'tan gelen mesajları dinle
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.action === "getCurrentTab") {
    chrome.tabs.query({active: true, currentWindow: true}, (tabs) => {
      sendResponse({tab: tabs[0]});
    });
    return true; // Asenkron yanıt için
  }
}); 