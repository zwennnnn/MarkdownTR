# 🤖 MarkdownTR - AI Powered Web İçeriği Markdown Çevirici

Modern ve güçlü Chrome Extension ile web sayfalarını ve seçili metinleri **Gemini AI** kullanarak temiz Markdown formatına çevirin!

![MarkdownTR](icons/icon48.png)

## ✨ Özellikler

### 🤖 **AI Powered Çeviri**
- **Gemini 1.5 Flash** entegrasyonu
- Akıllı içerik analizi ve temizleme
- Orijinal dil koruması (İngilizce → İngilizce, Türkçe → Türkçe)
- Minimal müdahale ile maksimum kalite

### 🎯 **Çeviri Seçenekleri**
- **Seçili Metin Çevirme** - Sadece seçtiğiniz kısmı çevir
- **Tam Sayfa Çevirme** - Tüm sayfa içeriğini akıllıca çevir
- **Otomatik Temizleme** - Reklamlar ve gereksiz elementler kaldırılır

### 🎨 **Modern Arayüz**
- **Glassmorphism** tasarım
- **Dark/Light** tema desteği
- **Gradient animasyonlar** ve hover efektleri
- **Responsive** ve kullanıcı dostu

### ⚙️ **Gelişmiş Ayarlar**
- **Orijinal Dili Koru** - Dil çevirisi yapılmaz
- **Reklamları Kaldır** - Temiz içerik
- **Linkleri Koru** - URL'ler korunur
- **Meta Bilgi Ekle** - Sayfa bilgileri dahil edilir

### 📋 **Ek Özellikler**
- **Otomatik Clipboard** - Sonuç otomatik kopyalanır
- **Geçmiş Yönetimi** - Çeviri geçmişi saklanır
- **Toast Bildirimleri** - Anlık geri bildirim
- **Progress Indicator** - İşlem durumu takibi

## 🚀 Kurulum

### 1. API Key Alın
1. [Google AI Studio](https://makersuite.google.com/app/apikey) adresine gidin
2. Ücretsiz Gemini API Key alın
3. API Key'i güvenli bir yerde saklayın

### 2. Extension'ı Yükleyin
1. Bu repository'yi indirin veya klonlayın
2. Chrome'da `chrome://extensions/` adresine gidin
3. **Developer mode**'u aktif edin
4. **Load unpacked** butonuna tıklayın
5. İndirdiğiniz klasörü seçin

### 3. API Key'i Ayarlayın
1. Extension popup'ını açın
2. **AI Ayarları** bölümünde API Key'inizi girin
3. 💾 butonuna tıklayarak kaydedin

## 📖 Kullanım

### 🖱️ **Seçili Metin Çevirme**
1. Web sayfasında istediğiniz metni seçin
2. Extension popup'ını açın
3. **"Seçili Metni Çevir"** butonuna tıklayın
4. Sonuç otomatik olarak clipboard'a kopyalanır

### 📄 **Tam Sayfa Çevirme**
1. Çevirmek istediğiniz sayfaya gidin
2. Extension popup'ını açın
3. **"Tüm Sayfayı Çevir"** butonuna tıklayın
4. AI akıllıca ana içeriği bulup çevirir



### 🎛️ **Ayarlar**
- **Orijinal Dili Koru**: Metinlerin dilini değiştirmez
- **Reklamları Kaldır**: Gereksiz içerikleri temizler
- **Linkleri Koru**: URL formatını korur
- **Meta Bilgi Ekle**: Sayfa başlığı ve URL ekler

## 🛠️ Teknik Detaylar

### 📁 **Dosya Yapısı**
```
MarkdownTR/
├── manifest.json          # Extension konfigürasyonu
├── background.js           # Service worker
├── content.js             # İçerik script'i
├── popup.html             # Popup arayüzü
├── popup.js               # Popup mantığı
├── popup.css              # Modern stiller
├── icons/                 # Extension ikonları
│   ├── icon16.png
│   ├── icon48.png
│   └── icon128.png
└── README.md              # Bu dosya
```

### 🔧 **Teknolojiler**
- **Manifest V3** - Modern Chrome Extension API
- **Gemini 1.5 Flash** - Google'ın en hızlı AI modeli
- **Vanilla JavaScript** - Hafif ve hızlı
- **CSS3** - Modern animasyonlar ve efektler
- **Chrome APIs** - Storage, Scripting, Clipboard

### 🎨 **UI Framework**
- **Custom CSS** - shadcn/ui inspired
- **Glassmorphism** - Modern şeffaf tasarım
- **CSS Variables** - Tema desteği
- **Flexbox/Grid** - Responsive layout

## 🔒 Güvenlik ve Gizlilik

- ✅ **API Key'ler yerel olarak saklanır** (Chrome storage)
- ✅ **Sadece gerekli izinler** kullanılır
- ✅ **Açık kaynak** - tüm kod görülebilir
- ✅ **Veri toplama yok** - tamamen offline çalışır
- ✅ **HTTPS** - Güvenli API iletişimi

## 🎯 Desteklenen Formatlar

### 📝 **Markdown Çıktısı**
- **Başlıklar** - `# ## ###`
- **Kalın metin** - `**bold**`
- **İtalik metin** - `*italic*`
- **Linkler** - `[text](url)`
- **Listeler** - `- item` veya `1. item`
- **Kod blokları** - `` `code` `` veya ``` ```code``` ```
- **Tablolar** - Markdown table formatı
- **Alıntılar** - `> quote`

### 🌍 **Dil Desteği**
- **Türkçe** - Tam destek (ğüşıöç karakterleri)
- **İngilizce** - Tam destek
- **Diğer diller** - Orijinal dil korunur
- **Karışık içerik** - Her dil kendi formatında kalır

## 🚨 Sorun Giderme

### ❌ **"API Key bulunamadı" Hatası**
- API Key'inizi doğru girdiğinizden emin olun
- API Key `AIza` ile başlamalıdır
- Extension'ı yeniden yükleyin

### ❌ **"Sayfa ile bağlantı kurulamadı" Hatası**
- Sayfayı yenileyin
- Extension'ı yeniden yükleyin
- Chrome'u yeniden başlatın

### ❌ **"AI çevirme hatası" Mesajı**
- İnternet bağlantınızı kontrol edin
- API Key'inizin geçerli olduğundan emin olun
- Gemini API limitlerini kontrol edin

## 📊 Performans

- ⚡ **Hızlı çeviri** - Gemini 1.5 Flash ile saniyeler içinde
- 💾 **Düşük bellek kullanımı** - Optimize edilmiş kod
- 🔋 **Pil dostu** - Minimal arka plan işlemi
- 📱 **Responsive** - Her ekran boyutunda çalışır

## 🔄 Güncellemeler

### v1.0.0 - AI Powered (Güncel)
- ✅ Gemini AI entegrasyonu
- ✅ Orijinal dil koruması
- ✅ Modern glassmorphism UI
- ✅ Gelişmiş error handling
- ✅ Author bilgileri eklendi


## 👨‍💻 Geliştirici

**Made with ❤️ by zwennnnn**

- 🐙 **GitHub**: [github.com/zwennnnnn](https://github.com/zwennnnnn)
- 💼 **LinkedIn**: [linkedin.com/in/yagizeke](https://linkedin.com/in/yagizeke)


## 🤝 Katkıda Bulunma

1. Bu repository'yi fork edin
2. Feature branch oluşturun (`git checkout -b feature/amazing-feature`)
3. Değişikliklerinizi commit edin (`git commit -m 'Add amazing feature'`)
4. Branch'inizi push edin (`git push origin feature/amazing-feature`)
5. Pull Request oluşturun

## ⭐ Destek

Bu projeyi beğendiyseniz lütfen ⭐ verin!

---

**🚀 MarkdownTR ile web içeriklerinizi AI gücüyle temiz Markdown'a çevirin!**
