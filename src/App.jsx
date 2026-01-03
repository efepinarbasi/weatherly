import React, { useState, useEffect } from 'react';
import Weather from './Weather';
import { Settings, Moon, Sun, Share2, Maximize, Minimize, RefreshCw } from 'lucide-react';
import { translations } from './translations';
import logo from './logo.png';

function App() {
  const [lang, setLang] = useState(() => {
    const saved = localStorage.getItem('weatherAppLang');
    const browser = navigator.language.split('-')[0];
    const supported = ['tr', 'en', 'es', 'de', 'fr', 'ru'];
    return saved || (supported.includes(browser) ? browser : 'tr');
  });
  const [darkMode, setDarkMode] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [isFullscreen, setIsFullscreen] = useState(false);
  const t = translations[lang] || translations['en'];

  const languages = [
    { code: 'tr', flag: '🇹🇷', label: 'TR' },
    { code: 'en', flag: '🇺🇸', label: 'EN' },
    { code: 'es', flag: '🇪🇸', label: 'ES' },
    { code: 'de', flag: '🇩🇪', label: 'DE' },
    { code: 'fr', flag: '🇫🇷', label: 'FR' },
    { code: 'ru', flag: '🇷🇺', label: 'RU' },
  ];

  useEffect(() => {
    localStorage.setItem('weatherAppLang', lang);
  }, [lang]);

  // Saat sayacı
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  // Karanlık mod sınıfını HTML elementine ekle/çıkar
  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [darkMode]);

  // Paylaşma Fonksiyonu
  const handleShare = () => {
    if (navigator.share) {
      navigator.share({
        title: 'Weatherly',
        text: 'Hava durumuna göz at!',
        url: window.location.href,
      }).catch((error) => console.log('Sharing failed', error));
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert('Link kopyalandı!');
    }
  };

  // Tam Ekran Fonksiyonu
  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen();
      } else if (document.documentElement.webkitRequestFullscreen) { /* Safari */
        document.documentElement.webkitRequestFullscreen();
      }
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      } else if (document.webkitExitFullscreen) { /* Safari */
        document.webkitExitFullscreen();
      }
      setIsFullscreen(false);
    }
  };

  // Zamana göre karşılama mesajı
  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour >= 5 && hour < 12) return t.goodMorning;
    if (hour >= 12 && hour < 18) return t.goodAfternoon;
    return t.goodEvening;
  };

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 transition-colors duration-300 font-sans relative overflow-x-hidden">
      
      {/* Gelişmiş Header */}
      <header className="absolute top-0 left-0 w-full p-4 md:p-6 z-50 pointer-events-none">
        <div className="pointer-events-auto flex justify-between items-center bg-white/30 dark:bg-black/30 backdrop-blur-md border border-white/20 dark:border-white/10 rounded-3xl p-2 shadow-lg">
        {/* Logo */}
        <button onClick={() => window.location.reload()} className="flex items-center justify-center transition hover:scale-110 active:scale-95 ml-2">
          {/* BURAYA DİKKAT: Aşağıdaki src kısmına kendi resim linkinizi yapıştırın veya import ettiğiniz değişkeni yazın */}
          <img src={logo} alt="Logo" className="w-48 h-16 object-contain" />
        </button>

        {/* Orta Kısım - Karşılama ve Durum */}
        <div className="hidden lg:flex flex-col items-center justify-center flex-1 mx-4">
          <div className="flex items-center gap-2 mb-1">
            <span className="relative flex h-2 w-2">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span className="text-[10px] font-bold tracking-[0.2em] text-gray-500 dark:text-gray-400 uppercase">{t.live}</span>
          </div>
          <span className="text-lg font-medium text-gray-700 dark:text-gray-200 tracking-wide">
            {getGreeting()}
          </span>
        </div>

        <div className="flex items-center gap-4">
          {/* Tarih ve Saat (Sağa Taşındı) */}
          <div className="hidden md:flex flex-col items-end justify-center text-gray-800 dark:text-white border-r border-gray-300 dark:border-gray-600 pr-4 mr-2">
            <span className="text-xl font-bold font-mono tracking-widest leading-none drop-shadow-sm">
              {currentTime.toLocaleTimeString(lang === 'en' ? 'en-US' : lang, { hour: '2-digit', minute: '2-digit' })}
            </span>
            <span className="text-[10px] font-bold uppercase tracking-[0.1em] opacity-70 mt-1">
              {currentTime.toLocaleDateString(lang === 'en' ? 'en-US' : lang, { weekday: 'short', day: 'numeric', month: 'short' })}
            </span>
          </div>

          {/* Sağ Kontroller */}
          <div className="flex items-center gap-1 mr-2">
          {/* Yenileme Butonu */}
          <button onClick={() => window.location.reload()} className="p-2 rounded-full text-gray-800 dark:text-white hover:bg-white/20 dark:hover:bg-white/10 transition-all hover:scale-105 active:scale-95" title="Yenile">
            <RefreshCw className="w-5 h-5" />
          </button>

          {/* Paylaş Butonu */}
          <button 
            onClick={handleShare}
            className="p-2 rounded-full text-gray-800 dark:text-white hover:bg-white/20 dark:hover:bg-white/10 transition-all hover:scale-105 active:scale-95"
            title="Paylaş"
          >
            <Share2 className="w-5 h-5" />
          </button>

          {/* Tam Ekran Butonu */}
          <button 
            onClick={toggleFullscreen}
            className="p-2 rounded-full text-gray-800 dark:text-white hover:bg-white/20 dark:hover:bg-white/10 transition-all hover:scale-105 active:scale-95"
            title="Tam Ekran"
          >
            {isFullscreen ? <Minimize className="w-5 h-5" /> : <Maximize className="w-5 h-5" />}
          </button>

          {/* Tema Değiştirme */}
          <button 
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 rounded-full text-gray-800 dark:text-white hover:bg-white/20 dark:hover:bg-white/10 transition-all hover:scale-105 active:scale-95"
            title="Tema Değiştir"
          >
            {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
          </button>

          {/* Ayarlar Menüsü */}
          <div className="relative">
            <button 
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              className="p-2 rounded-full text-gray-800 dark:text-white hover:bg-white/20 dark:hover:bg-white/10 transition-all hover:scale-105 active:scale-95"
            >
              <Settings className={`w-6 h-6 ${isMenuOpen ? 'rotate-90' : ''} transition-transform duration-500`} />
            </button>

            {/* Dropdown Menu */}
            {isMenuOpen && (
              <div className="absolute right-0 top-full mt-2 w-72 bg-white/90 dark:bg-gray-900/95 backdrop-blur-2xl rounded-3xl shadow-2xl border border-white/20 dark:border-gray-700 p-5 animate-fade-in origin-top-right">
                <div className="flex justify-between items-center mb-4 pb-3 border-b border-gray-200 dark:border-gray-700">
                  <span className="font-bold text-lg text-gray-800 dark:text-white flex items-center gap-2">
                    <Settings className="w-5 h-5 text-blue-500" /> {t.settings}
                  </span>
                  <button onClick={() => setIsMenuOpen(false)} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
                    ✕
                  </button>
                </div>

                {/* Dil Seçimi */}
                <div>
                  <label className="text-xs uppercase tracking-wider text-gray-500 dark:text-gray-400 font-bold mb-3 block">{t.language}</label>
                  <div className="grid grid-cols-2 gap-2">
                    {languages.map((l) => (
                      <button 
                        key={l.code}
                        onClick={() => { setLang(l.code); setIsMenuOpen(false); }} 
                        className={`
                          px-3 py-2 rounded-xl text-sm font-semibold flex items-center gap-2 transition-all border
                          ${lang === l.code 
                            ? 'bg-blue-500 border-blue-500 text-white shadow-md scale-[1.02]' 
                            : 'bg-gray-50 dark:bg-gray-800 border-transparent text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'}
                        `}
                      >
                        <span className="text-lg">{l.flag}</span> {l.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
          </div>
        </div>
        </div>
      </header>
      
      <Weather lang={lang} darkMode={darkMode} />
      
    </div>
  );
}

export default App;
