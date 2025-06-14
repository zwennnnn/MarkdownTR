// MarkdownTR Content Script
class MarkdownConverter {
  constructor() {
    this.settings = {
      removeAds: true,
      keepLinks: true,
      addMetadata: true
    };
    
    this.loadSettings();
  }

  // Ayarları chrome storage'dan yükle
  async loadSettings() {
    try {
      const result = await chrome.storage.sync.get(['markdowntr_settings']);
      if (result.markdowntr_settings) {
        this.settings = {...this.settings, ...result.markdowntr_settings};
      }
    } catch (error) {
      console.log('Ayarlar yüklenemedi, varsayılan ayarlar kullanılıyor');
    }
  }

  // HTML'i temizle (reklamlar, navigasyon vs.)
  cleanHtml(element) {
    const elementsToRemove = [
      'nav', 'header', 'footer', 'aside', 
      '.advertisement', '.ads', '.sidebar',
      '.social-share', '.comments', '.related-posts',
      '[class*="ad-"]', '[id*="ad-"]',
      'script', 'style', 'noscript'
    ];

    if (this.settings.removeAds) {
      elementsToRemove.forEach(selector => {
        const elements = element.querySelectorAll(selector);
        elements.forEach(el => el.remove());
      });
    }

    return element;
  }

  // HTML elementini Markdown'a çevir
  htmlToMarkdown(element) {
    let markdown = '';
    
    // Node türüne göre işle
    for (const node of element.childNodes) {
      if (node.nodeType === Node.TEXT_NODE) {
        const text = node.textContent.trim();
        if (text) {
          markdown += text + ' ';
        }
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        markdown += this.convertElement(node);
      }
    }
    
    return markdown.trim();
  }

  // Element türüne göre markdown formatına çevir
  convertElement(element) {
    const tagName = element.tagName.toLowerCase();
    const text = element.textContent.trim();
    
    if (!text && !['img', 'br', 'hr'].includes(tagName)) {
      return '';
    }

    switch (tagName) {
      case 'h1':
        return `\n# ${text}\n\n`;
      case 'h2':
        return `\n## ${text}\n\n`;
      case 'h3':
        return `\n### ${text}\n\n`;
      case 'h4':
        return `\n#### ${text}\n\n`;
      case 'h5':
        return `\n##### ${text}\n\n`;
      case 'h6':
        return `\n###### ${text}\n\n`;
        
      case 'p':
        return `${this.htmlToMarkdown(element)}\n\n`;
        
      case 'strong':
      case 'b':
        return `**${text}**`;
        
      case 'em':
      case 'i':
        return `*${text}*`;
        
      case 'code':
        return `\`${text}\``;
        
      case 'pre':
        const codeContent = element.querySelector('code');
        const code = codeContent ? codeContent.textContent : text;
        return `\n\`\`\`\n${code}\n\`\`\`\n\n`;
        
      case 'blockquote':
        const lines = text.split('\n');
        return '\n' + lines.map(line => `> ${line}`).join('\n') + '\n\n';
        
      case 'ul':
        return this.convertList(element, false);
        
      case 'ol':
        return this.convertList(element, true);
        
      case 'li':
        return `${this.htmlToMarkdown(element)}`;
        
      case 'a':
        const href = element.getAttribute('href');
        if (this.settings.keepLinks && href) {
          return `[${text}](${href})`;
        }
        return text;
        
      case 'img':
        const src = element.getAttribute('src');
        const alt = element.getAttribute('alt') || 'image';
        return `![${alt}](${src})\n\n`;
        
      case 'br':
        return '\n';
        
      case 'hr':
        return '\n---\n\n';
        
      case 'table':
        return this.convertTable(element);
        
      default:
        return this.htmlToMarkdown(element);
    }
  }

  // Liste çevirici
  convertList(listElement, isOrdered = false) {
    let result = '\n';
    const items = listElement.querySelectorAll('li');
    
    items.forEach((item, index) => {
      const marker = isOrdered ? `${index + 1}. ` : '- ';
      const content = this.htmlToMarkdown(item);
      result += `${marker}${content}\n`;
    });
    
    return result + '\n';
  }

  // Tablo çevirici
  convertTable(tableElement) {
    let result = '\n';
    const rows = tableElement.querySelectorAll('tr');
    
    rows.forEach((row, rowIndex) => {
      const cells = row.querySelectorAll('td, th');
      const cellTexts = Array.from(cells).map(cell => cell.textContent.trim());
      
      result += '| ' + cellTexts.join(' | ') + ' |\n';
      
      // Header altına ayırıcı ekle
      if (rowIndex === 0) {
        result += '| ' + cellTexts.map(() => '---').join(' | ') + ' |\n';
      }
    });
    
    return result + '\n';
  }

  // Seçili metni çevir
  async convertSelected(selectedText) {
    try {
      if (!selectedText || selectedText.trim() === '') {
        this.showToast('❌ Seçili metin bulunamadı!', 'error');
        return null;
      }

      // Eğer metin sadece düz metin ise (HTML değil), basit markdown formatına çevir
      if (!selectedText.includes('<')) {
        // Düz metin - basit formatting uygula
        let markdown = selectedText.trim();
        
        // Paragraf ayırıcıları ekle
        markdown = markdown.replace(/\n\s*\n/g, '\n\n');
        
        // Clipboard'a kopyala
        await this.copyToClipboard(markdown);
        this.showToast('✅ Seçili metin başarıyla Markdown formatına çevrildi!', 'success');
        
        return markdown;
      }
      
      // HTML içerik - tam formatı ile işle
      const tempDiv = document.createElement('div');
      tempDiv.innerHTML = selectedText;
      
      const cleanedElement = this.cleanHtml(tempDiv);
      const markdown = this.htmlToMarkdown(cleanedElement);
      
      // Clipboard'a kopyala
      await this.copyToClipboard(markdown);
      this.showToast('✅ Seçili metin başarıyla Markdown formatına çevrildi!', 'success');
      
      return markdown;
    } catch (error) {
      console.error('Seçili metin çevrilirken hata:', error);
      this.showToast('❌ Metin çevrilirken hata oluştu!', 'error');
      return null;
    }
  }

  // Tüm sayfayı çevir
  async convertPage() {
    try {
      // Ana içerik alanını bul
      const contentSelectors = [
        'main', 
        'article', 
        '.content', 
        '.post-content',
        '.entry-content',
        '#content',
        '.container'
      ];
      
      let contentElement = null;
      for (const selector of contentSelectors) {
        contentElement = document.querySelector(selector);
        if (contentElement) break;
      }
      
      // Ana içerik bulunamadıysa body kullan
      if (!contentElement) {
        contentElement = document.body;
      }
      
      // Element'i klonla ve temizle
      const clonedElement = contentElement.cloneNode(true);
      const cleanedElement = this.cleanHtml(clonedElement);
      
      let markdown = '';
      
      // Meta bilgi ekle
      if (this.settings.addMetadata) {
        markdown += `# ${document.title}\n\n`;
        markdown += `**URL:** ${window.location.href}\n`;
        markdown += `**Tarih:** ${new Date().toLocaleString('tr-TR')}\n\n`;
        markdown += '---\n\n';
      }
      
      // İçeriği çevir
      markdown += this.htmlToMarkdown(cleanedElement);
      
      // Clipboard'a kopyala
      await this.copyToClipboard(markdown);
      this.showToast('✅ Sayfa başarıyla Markdown formatına çevrildi!', 'success');
      
      return markdown;
    } catch (error) {
      console.error('Sayfa çevrilirken hata:', error);
      this.showToast('❌ Sayfa çevrilirken hata oluştu!', 'error');
    }
  }

  // Clipboard'a kopyala
  async copyToClipboard(text) {
    try {
      await navigator.clipboard.writeText(text);
    } catch (error) {
      // Fallback: eski yöntem
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
    }
  }

  // Toast notification göster
  showToast(message, type = 'info') {
    // Mevcut toast'ları kaldır
    const existingToasts = document.querySelectorAll('.markdowntr-toast');
    existingToasts.forEach(toast => toast.remove());
    
    const toast = document.createElement('div');
    toast.className = `markdowntr-toast markdowntr-toast-${type}`;
    toast.textContent = message;
    
    // Toast stilleri
    toast.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
      color: white;
      padding: 12px 16px;
      border-radius: 8px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      font-weight: 500;
      box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
      z-index: 10000;
      transition: all 0.3s ease;
      transform: translateX(100%);
    `;
    
    document.body.appendChild(toast);
    
    // Animasyon
    setTimeout(() => {
      toast.style.transform = 'translateX(0)';
    }, 100);
    
    // 3 saniye sonra kaldır
    setTimeout(() => {
      toast.style.transform = 'translateX(100%)';
      setTimeout(() => {
        if (toast.parentNode) {
          toast.remove();
        }
      }, 300);
    }, 3000);
  }
}

// Converter instance oluştur
const markdownConverter = new MarkdownConverter();

// Background'dan gelen mesajları dinle
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case 'ping':
      // Content script'in hazır olduğunu bildiren ping yanıtı
      sendResponse({success: true, ready: true});
      break;
      
    case 'convertSelected':
      markdownConverter.convertSelected(request.text)
        .then(result => sendResponse({success: true, markdown: result}))
        .catch(error => sendResponse({success: false, error: error.message}));
      return true; // Asenkron yanıt için
      
    case 'convertPage':
      markdownConverter.convertPage()
        .then(result => sendResponse({success: true, markdown: result}))
        .catch(error => sendResponse({success: false, error: error.message}));
      return true; // Asenkron yanıt için
      
    case 'updateSettings':
      markdownConverter.settings = {...markdownConverter.settings, ...request.settings};
      chrome.storage.sync.set({markdowntr_settings: markdownConverter.settings});
      sendResponse({success: true});
      break;
  }
}); 