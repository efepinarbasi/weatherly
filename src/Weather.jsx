import React, { useState, useEffect, useMemo } from 'react';
import { translations } from './translations';
import { 
  Search, MapPin, Wind, Droplets, Eye, Gauge, Sun, Moon, 
  Sunrise, Sunset, Star, CloudRain, Map as MapIcon, Calendar,
  Tent, Car, Utensils, Activity, Shirt, Umbrella, Glasses, Snowflake, Navigation, Mic,
  Footprints, ThermometerSun
} from 'lucide-react';
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { format } from 'date-fns';
import { tr, enUS, es, de, fr, ru } from 'date-fns/locale';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Leaflet varsayılan ikon hatası için düzeltme
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

// Harita tıklama olaylarını dinleyen bileşen
function LocationMarker({ onLocationSelect }) {
  useMapEvents({
    click(e) {
      onLocationSelect(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

// Harita merkezini güncelleyen bileşen
function ChangeView({ center }) {
  const map = useMap();
  map.setView(center);
  return null;
}

// Hava durumu durumuna göre arka plan görselleri
const weatherImages = {
  Clear: "https://images.unsplash.com/photo-1601297183305-6df142704ea2?q=80&w=1974&auto=format&fit=crop",
  Clouds: "https://images.unsplash.com/photo-1534088568595-a066f410bcda?q=80&w=1951&auto=format&fit=crop",
  Rain: "https://images.unsplash.com/photo-1519692933481-e162a57d6721?q=80&w=2070&auto=format&fit=crop",
  Drizzle: "https://images.unsplash.com/photo-1556485689-33e55ab56127?q=80&w=2070&auto=format&fit=crop",
  Thunderstorm: "https://images.unsplash.com/photo-1605727216801-e27ce1d0cc28?q=80&w=2071&auto=format&fit=crop",
  Snow: "https://images.unsplash.com/photo-1477601263568-180e2c6d046e?q=80&w=2070&auto=format&fit=crop",
  Mist: "https://images.unsplash.com/photo-1487621167305-5d248087c724?q=80&w=1932&auto=format&fit=crop",
  Default: "https://images.unsplash.com/photo-1559825481-12a05cc00344?q=80&w=2065&auto=format&fit=crop"
};

// Dillerin ülkelerine ait büyük şehirler
const countryCities = {
  tr: ["İstanbul, TR", "Ankara, TR", "İzmir, TR", "Bursa, TR", "Antalya, TR"],
  en: ["New York, US", "Los Angeles, US", "Chicago, US", "Houston, US", "Phoenix, US"],
  es: ["Madrid, ES", "Barcelona, ES", "Valencia, ES", "Sevilla, ES", "Zaragoza, ES"],
  de: ["Berlin, DE", "Hamburg, DE", "München, DE", "Köln, DE", "Frankfurt, DE"],
  fr: ["Paris, FR", "Marseille, FR", "Lyon, FR", "Toulouse, FR", "Nice, FR"],
  ru: ["Moscow, RU", "Saint Petersburg, RU", "Novosibirsk, RU", "Yekaterinburg, RU", "Kazan, RU"]
};

const preferredCountries = {
  tr: 'TR',
  en: 'US',
  es: 'ES',
  de: 'DE',
  fr: 'FR',
  ru: 'RU'
};

const Weather = ({ lang = 'tr' }) => {
  const [city, setCity] = useState('');
  const [weatherData, setWeatherData] = useState(null);
  const [forecastData, setForecastData] = useState(null);
  const [airQuality, setAirQuality] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [unit, setUnit] = useState('metric');
  const [favorites, setFavorites] = useState([]);
  const [selectedDay, setSelectedDay] = useState(null); // Seçilen gün için state
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [userLocation, setUserLocation] = useState(null);
  const [dailyData, setDailyData] = useState(null);
  const [isListening, setIsListening] = useState(false);
  const [isAnimatingFavorite, setIsAnimatingFavorite] = useState(false);

  const t = translations[lang] || translations['en'];
  const dateLocale = { tr, en: enUS, es, de, fr, ru }[lang] || enUS;
  const tempUnit = unit === 'metric' ? 'C' : 'F';

  // API Anahtarı
  const apiKey = '994f5bd5152ebd46c5751558c26698b6'; 

  // Favorileri LocalStorage'dan yükle
  useEffect(() => {
    try {
      const savedFavorites = JSON.parse(localStorage.getItem('weatherFavorites')) || [];
      setFavorites(savedFavorites);
    } catch (e) {
      console.error("Favoriler yüklenirken hata oluştu, sıfırlanıyor:", e);
      localStorage.removeItem('weatherFavorites');
      setFavorites([]);
    }
  }, []);

  // Dil değiştiğinde varsayılan birimi ayarla (ABD için Imperial, diğerleri için Metric)
  useEffect(() => {
    if (lang === 'en') {
      setUnit('imperial');
    } else {
      setUnit('metric');
    }
  }, [lang]);

  // Birim değiştiğinde verileri güncelle
  useEffect(() => {
    if (weatherData && weatherData.coord) {
      // Mevcut ismi koruyarak güncelle (Böylece Karaköy, Beypazarı'na dönüşmez)
      fetchAllWeatherData(weatherData.coord.lat, weatherData.coord.lon, weatherData.name);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [unit]);

  // Kullanıcının konumunu al (Önerileri sıralamak için)
  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const { latitude, longitude } = position.coords;
          setUserLocation({
            lat: latitude,
            lon: longitude
          });
          // İlk açılışta konuma göre hava durumunu otomatik getir
          fetchAllWeatherData(latitude, longitude, t.myLocation);
          setCity(t.myLocation);
        },
        () => {
          handleSearch("Istanbul, TR");
        }
      );
    } else {
      handleSearch("Istanbul, TR");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Şehir arama önerileri (Debounce ile)
  useEffect(() => {
    const fetchSuggestions = async () => {
      if (city.length < 1) {
        setSuggestions([]);
        return;
      }
      try {
        const response = await fetch(
          `https://api.openweathermap.org/geo/1.0/direct?q=${city}&limit=5&appid=${apiKey}`
        );
        let data = await response.json();

        // Önerileri de dilin ülkesine göre sırala
        const preferredCountry = preferredCountries[lang];
        data.sort((a, b) => {
          const aIsPreferred = a.country === preferredCountry ? 1 : 0;
          const bIsPreferred = b.country === preferredCountry ? 1 : 0;
          return bIsPreferred - aIsPreferred;
        });

        setSuggestions(data);
      } catch (err) {
        console.error("Suggestion error:", err);
      }
    };

    const timeoutId = setTimeout(fetchSuggestions, 300);
    return () => clearTimeout(timeoutId);
  }, [city, apiKey, userLocation]);

  const fetchAllWeatherData = async (lat, lon, cityName) => {
    setLoading(true);
    setError('');
    setSelectedDay(null); // Yeni arama yapınca seçimi sıfırla
    setShowSuggestions(false);

    try {
      // 1. Mevcut Hava Durumu
      const weatherRes = await fetch(
        `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${unit}&lang=${lang}`
      );
      if (!weatherRes.ok) throw new Error(t.searchError || 'Weather data fetch failed');
      const weather = await weatherRes.json();

      // İsim Düzeltmesi: Kullanıcının aradığı ismi (örn: Karaköy) API'nin döndürdüğü isme (örn: Beypazarı) tercih et.
      if (cityName) {
        weather.name = cityName;
      }

      // 2. Tahminler (5 Gün / 3 Saat)
      const forecastRes = await fetch(
        `https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=${unit}&lang=${lang}`
      );
      const forecast = await forecastRes.json();

      // 3. Hava Kalitesi
      const airRes = await fetch(
        `https://api.openweathermap.org/data/2.5/air_pollution?lat=${lat}&lon=${lon}&appid=${apiKey}`
      );
      const air = await airRes.json();

      setWeatherData(weather);
      setForecastData(forecast);
      setAirQuality(air);

      // 4. Open-Meteo (10 Günlük Tahmin & UV İndeksi)
      // Hata olursa ana akışı bozmaması için ayrı bir blokta ele alıyoruz
      try {
        const omRes = await fetch(
          `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&daily=weather_code,temperature_2m_max,temperature_2m_min,uv_index_max,precipitation_probability_max,moon_phase,moonrise,moonset&timezone=auto&forecast_days=10&temperature_unit=${unit === 'imperial' ? 'fahrenheit' : 'celsius'}`
        );
        if (omRes.ok) {
          const omData = await omRes.json();
          setDailyData(omData);
        } else {
          console.warn('Open-Meteo veri çekme hatası');
        }
      } catch (e) {
        console.warn('Open-Meteo bağlantı hatası', e);
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSearch = async (cityToSearch) => {
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Yeni şehir seçildiğinde ekranı başa al
    const finalCity = cityToSearch || city;
    if (!finalCity) return;

    setCity(finalCity); // Arama yapılan şehri input'a yaz
    setShowSuggestions(false);
    try {
      const geoRes = await fetch(
        `https://api.openweathermap.org/geo/1.0/direct?q=${finalCity}&limit=5&appid=${apiKey}`
      );
      let geoData = await geoRes.json();

      if (geoData.length > 0) {
        // KÖK ÇÖZÜM: Mesafe yerine dil/ülke önceliğine göre sırala
        const preferredCountry = preferredCountries[lang];
        geoData.sort((a, b) => {
          const aIsPreferred = a.country === preferredCountry ? 1 : 0;
          const bIsPreferred = b.country === preferredCountry ? 1 : 0;
          // Tercih edilen ülke en üstte, diğerleri API sırasına göre (popülasyon)
          return bIsPreferred - aIsPreferred;
        });

        // Bulunan şehrin ismini de gönderiyoruz ki ekranda o yazsın
        fetchAllWeatherData(geoData[0].lat, geoData[0].lon, geoData[0].name);
      } else {
        setError(t.searchCityError || 'Şehir bulunamadı'); // Fallback
      }
    } catch (err) {
      setError(t.searchError || 'Arama hatası'); // Fallback
    }
  };

  // Sesli Arama Fonksiyonu
  const handleVoiceSearch = () => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert(t.voiceNotSupported);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    
    recognition.lang = lang === 'en' ? 'en-US' : lang === 'tr' ? 'tr-TR' : lang;
    recognition.start();
    setIsListening(true);

    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      // Noktalama işaretlerini temizle (bazı tarayıcılar nokta koyabilir)
      const cleanTranscript = transcript.replace(/[.,]/g, '');
      setCity(cleanTranscript);
      handleSearch(cleanTranscript);
      setIsListening(false);
    };

    recognition.onerror = () => setIsListening(false);
    recognition.onend = () => setIsListening(false);
  };

  const handleGeolocation = () => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          fetchAllWeatherData(position.coords.latitude, position.coords.longitude);
          setCity(t.myLocation);
        },
        (err) => setError(t.locationPermissionError)
      );
    } else {
      setError(t.locationUnsupportedError);
    }
  };

  // Favori Ekle/Çıkar
  const toggleFavorite = () => {
    if (!weatherData) return;
    
    setIsAnimatingFavorite(true);
    setTimeout(() => setIsAnimatingFavorite(false), 500);

    const uniqueName = `${weatherData.name}, ${weatherData.sys.country}`;
    let newFavorites;
    
    if (favorites.includes(uniqueName)) {
      newFavorites = favorites.filter(f => f !== uniqueName);
    } else {
      newFavorites = [...favorites, uniqueName];
    }
    
    setFavorites(newFavorites);
    localStorage.setItem('weatherFavorites', JSON.stringify(newFavorites));
  };

  // Favori Sil
  const removeFavorite = (cityName) => {
    const newFavorites = favorites.filter(f => f !== cityName);
    setFavorites(newFavorites);
    localStorage.setItem('weatherFavorites', JSON.stringify(newFavorites));
  };

  const currentUniqueName = weatherData ? `${weatherData.name}, ${weatherData.sys.country}` : '';
  const isFavorite = weatherData && favorites.includes(currentUniqueName);

  // Dinamik Arka Plan Resmi
  const getBackgroundImage = (weatherMain) => {
    return weatherImages[weatherMain] || weatherImages.Default;
  };

  // AQI Renk
  const getAQIStatus = (aqi) => {
    const levels = {
      1: { color: 'bg-green-500', text: t.good },
      2: { color: 'bg-yellow-400', text: t.good },
      3: { color: 'bg-orange-500', text: t.moderate },
      4: { color: 'bg-red-500', text: t.unhealthy },
      5: { color: 'bg-purple-700', text: t.dangerous },
    };
    return levels[aqi] || levels[1];
  };

  // Rüzgar Yönü Hesaplama
  const getWindDirection = (deg) => {
    const directions = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
    const index = Math.round(((deg %= 360) < 0 ? deg + 360 : deg) / 45) % 8;
    // Basit çeviri haritası (Geliştirilebilir)
    return directions[index];
  };

  // WMO Kodunu OWM İkonuna Çevirme (Open-Meteo uyumluluğu için)
  const getIconFromWMO = (code) => {
    const map = {
      0: '01d', 1: '02d', 2: '03d', 3: '04d',
      45: '50d', 48: '50d',
      51: '09d', 53: '09d', 55: '09d',
      56: '09d', 57: '09d',
      61: '10d', 63: '10d', 65: '10d',
      66: '10d', 67: '10d',
      71: '13d', 73: '13d', 75: '13d',
      77: '13d',
      80: '09d', 81: '09d', 82: '09d',
      85: '13d', 86: '13d',
      95: '11d', 96: '11d', 99: '11d'
    };
    return map[code] || '01d';
  };

  // Aktivite Durumu Hesaplama
  const getActivityStatus = (type) => {
    if (!weatherData) return false;
    const main = weatherData.weather[0].main;
    const temp = weatherData.main.temp;

    switch (type) {
      case 'running':
        return main !== 'Rain' && main !== 'Snow' && main !== 'Thunderstorm' && temp > 5 && temp < 30;
      case 'camping':
        return (main === 'Clear' || main === 'Clouds') && temp > 15 && temp < 35;
      case 'picnic':
        return (main === 'Clear' || main === 'Clouds') && temp > 18 && temp < 35;
      case 'carWash':
        return main !== 'Rain' && main !== 'Snow' && main !== 'Drizzle' && main !== 'Thunderstorm';
      default:
        return false;
    }
  };

  // Giyim Önerileri Hesaplama
  const getClothingSuggestions = () => {
    if (!weatherData) return [];
    const temp = weatherData.main.temp;
    const main = weatherData.weather[0].main;
    const suggestions = [];

    // Üst Giyim
    if (temp >= 20) suggestions.push({ icon: <Shirt className="w-5 h-5" />, label: t.wearTshirt });
    else if (temp >= 10) suggestions.push({ icon: <Shirt className="w-5 h-5" />, label: t.wearJacket });
    else suggestions.push({ icon: <Snowflake className="w-5 h-5" />, label: t.wearCoat });

    // Alt Giyim / Ekstra
    if (temp >= 25) suggestions.push({ icon: <ThermometerSun className="w-5 h-5" />, label: t.wearShorts });
    if (temp < 5) suggestions.push({ icon: <Snowflake className="w-5 h-5" />, label: t.wearHat });
    
    // Yağmur Durumu
    if (main === 'Rain' || main === 'Drizzle' || main === 'Thunderstorm') {
      suggestions.push({ icon: <Umbrella className="w-5 h-5" />, label: t.takeUmbrella });
      if (temp < 15) {
        suggestions.push({ icon: <Shirt className="w-5 h-5" />, label: t.wearRaincoat });
        suggestions.push({ icon: <Footprints className="w-5 h-5" />, label: t.wearBoots });
      }
    }

    // Kar Durumu
    if (main === 'Snow') {
      suggestions.push({ icon: <Footprints className="w-5 h-5" />, label: t.wearBoots });
      // Bere zaten yukarıda eklendiği için tekrar eklemeye gerek yok
    }
    
    // Güneş Gözlüğü (UV verisi yoksa bile hava açıksa öner)
    const uvIndex = dailyData?.daily?.uv_index_max?.[0];
    if (main === 'Clear' && (uvIndex === undefined || uvIndex > 3)) {
      suggestions.push({ icon: <Glasses className="w-5 h-5" />, label: t.wearSunglasses });
    }

    return suggestions;
  };

  // Ay Fazı İkonu
  const getMoonPhaseIcon = (phase) => {
    if (phase === 0 || phase === 1) return '🌑';
    if (phase < 0.25) return '🌒';
    if (phase === 0.25) return '🌓';
    if (phase < 0.5) return '🌔';
    if (phase === 0.5) return '🌕';
    if (phase < 0.75) return '🌖';
    if (phase === 0.75) return '🌗';
    return '🌘';
  };

  // Ay Fazı İsmi
  const getMoonPhaseName = (phase) => {
    if (phase === 0 || phase === 1) return t.newMoon;
    if (phase < 0.25) return t.waxingCrescent;
    if (phase === 0.25) return t.firstQuarter;
    if (phase < 0.5) return t.waxingGibbous;
    if (phase === 0.5) return t.fullMoon;
    if (phase < 0.75) return t.waningGibbous;
    if (phase === 0.75) return t.lastQuarter;
    return t.waningCrescent;
  };

  // Grafik Verisi (Seçilen güne göre filtrele)
  const getChartData = () => {
    if (!forecastData) return [];
    
    let list = forecastData.list;
    if (selectedDay) {
      // Seçilen günün verilerini filtrele
      list = list.filter(item => {
        const itemDate = format(new Date(item.dt * 1000), 'yyyy-MM-dd');
        return itemDate === selectedDay;
      });
    } else {
      // Varsayılan olarak ilk 24 saati (8 veri) göster
      list = list.slice(0, 9);
    }

    return list.map(item => ({
      time: format(new Date(item.dt * 1000), 'HH:mm'),
      temp: Math.round(item.main.temp),
    }));
  };

  // Gündüz Süresi Hesaplama
  const getDaylightDuration = () => {
    if (!weatherData) return '--:--';
    const diff = weatherData.sys.sunset - weatherData.sys.sunrise;
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    return `${hours}s ${minutes}dk`;
  };

  // Yedek Günlük Tahmin (Open-Meteo çalışmazsa OpenWeatherMap kullan)
  const dailyForecastFallback = useMemo(() => {
    if (!forecastData) return [];
    const daily = [];
    const seenDates = new Set();
    
    forecastData.list.forEach(item => {
      const date = item.dt_txt.split(' ')[0];
      if (!seenDates.has(date)) {
        // O gün için 12:00 verisini bulmaya çalış, yoksa eldeki ilk veriyi al
        const noonItem = forecastData.list.find(i => i.dt_txt.startsWith(date) && i.dt_txt.includes("12:00:00"));
        daily.push(noonItem || item);
        seenDates.add(date);
      }
    });
    return daily.slice(0, 5); // 5 günle sınırla
  }, [forecastData]);

  return (
    <div className="min-h-screen w-full relative flex flex-col items-center p-4 md:p-8">
      {/* Arka Plan Resmi */}
      <div 
        className="fixed inset-0 -z-10 bg-cover bg-center bg-no-repeat transition-all duration-1000 ease-in-out"
        style={{ 
          backgroundImage: `url(${weatherData ? getBackgroundImage(weatherData.weather[0].main) : weatherImages.Default})`,
        }}
      >
        <div className="absolute inset-0 bg-black/30 dark:bg-black/50 backdrop-blur-[2px]"></div>
      </div>
      
      {/* --- HEADER --- */}
      <div className="w-full max-w-6xl flex flex-col gap-4 mb-8 mt-24 md:mt-32">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 bg-white/60 dark:bg-black/40 backdrop-blur-md border border-white/40 dark:border-white/10 p-4 rounded-3xl shadow-2xl z-40">
          <div className="relative w-full md:w-2/3 z-50 flex items-center bg-white/50 dark:bg-black/20 rounded-full px-4 py-3 shadow-inner border border-gray-200 dark:border-white/10">
            <Search className="w-5 h-5 text-gray-500 dark:text-gray-400 mr-2" />
            <input
              type="text"
              value={city}
              onChange={(e) => {
                setCity(e.target.value);
                setShowSuggestions(true);
              }}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder={isListening ? t.listening : t.searchCity}
              className="bg-transparent border-none outline-none w-full text-gray-800 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 font-medium"
            />
            <button onClick={handleVoiceSearch} className={`p-2 rounded-full transition mr-1 ${isListening ? 'bg-red-500 text-white animate-pulse' : 'hover:bg-gray-200 dark:hover:bg-white/10 text-gray-500 dark:text-gray-400'}`}>
              <Mic className="w-5 h-5" />
            </button>
            <button onClick={handleGeolocation} className="p-2 hover:bg-gray-200 dark:hover:bg-white/10 rounded-full transition">
              <MapPin className="w-5 h-5 text-blue-500 dark:text-blue-400" />
            </button>

            {/* Öneriler Listesi */}
            {showSuggestions && suggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white/90 dark:bg-black/90 backdrop-blur-md border border-gray-200 dark:border-white/20 rounded-xl overflow-hidden shadow-xl z-[60]">
                {suggestions.map((s, i) => (
                  <div 
                    key={i} 
                    onClick={() => {
                      setCity(`${s.name}, ${s.country}`);
                      fetchAllWeatherData(s.lat, s.lon, s.name);
                    }}
                    className="px-4 py-3 hover:bg-gray-100 dark:hover:bg-white/10 cursor-pointer text-gray-800 dark:text-white flex justify-between items-center transition border-b border-gray-200 dark:border-white/10 last:border-none"
                  >
                    <span className="font-medium">{s.name}</span>
                    <span className="text-xs text-gray-500 dark:text-gray-400">{s.state ? `${s.state}, ` : ''}{s.country}</span>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="flex gap-3 items-center">
            <button 
              onClick={() => setUnit(unit === 'metric' ? 'imperial' : 'metric')}
              className="px-6 py-2 rounded-full bg-white/50 dark:bg-white/10 hover:bg-white/70 dark:hover:bg-white/20 text-gray-800 dark:text-white font-bold border border-gray-200 dark:border-white/20 transition backdrop-blur-sm"
            >
              °{unit === 'metric' ? 'C' : 'F'}
            </button>
          </div>
        </div>

        {/* Favoriler Listesi */}
        {favorites.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 scrollbar-hide">
            {favorites.map((fav, index) => (
              <div
                key={fav}
                className="flex items-center bg-white/60 dark:bg-white/10 backdrop-blur-md border border-white/40 dark:border-white/20 rounded-full pl-2 pr-4 py-1.5 shadow-sm transition hover:bg-white/80 dark:hover:bg-white/20 animate-fade-in"
              >
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    removeFavorite(fav);
                  }}
                  className="p-1 hover:scale-110 transition-transform mr-1"
                  title={t.delete}
                >
                  <Star className="w-3 h-3 text-yellow-500 fill-yellow-500" />
                </button>
                <button
                  onClick={() => handleSearch(fav)}
                  className="text-sm font-medium text-gray-800 dark:text-white whitespace-nowrap"
                >
                  {fav.split(',')[0]}
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {loading && (
        <div className="flex flex-col items-center justify-center py-20">
          <div className="relative">
            <Sun className="w-20 h-20 text-yellow-400 animate-[spin_8s_linear_infinite]" />
            <CloudRain className="w-12 h-12 text-blue-300 absolute -bottom-2 -right-2 animate-bounce" />
          </div>
          <p className="mt-6 text-xl font-medium text-white animate-pulse">Yükleniyor...</p>
        </div>
      )}
      {error && <div className="text-center py-10 text-red-500 bg-red-100 rounded-xl mb-6">{error}</div>}

      {weatherData && (
        <div key={weatherData.name} className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-3 gap-8 animate-fade-in pb-20">
          
          {/* 1. SOL KOLON: Mevcut Hava Durumu */}
          <div className="lg:col-span-1 flex flex-col gap-6">
            {/* Ana Kart (Şeffaf) */}
            <div className="rounded-[3rem] p-8 text-gray-800 dark:text-white bg-white/60 dark:bg-black/40 backdrop-blur-lg border border-white/40 dark:border-white/20 shadow-2xl flex flex-col items-center text-center relative overflow-hidden">
              <div className="absolute top-0 left-0 w-full h-full bg-gradient-to-b from-white/20 to-transparent pointer-events-none"></div>
            <div>
                <h2 className="text-2xl font-bold flex items-center justify-center gap-2 mb-2">
                  <MapPin className="w-5 h-5 text-blue-600 dark:text-blue-300" /> {weatherData.name}, {weatherData.sys.country}
                  <button onClick={toggleFavorite} className={`p-1 transition-all duration-500 ${isAnimatingFavorite ? 'scale-150 rotate-[360deg]' : 'hover:scale-110'}`}>
                    <Star className={`w-5 h-5 ${isFavorite ? 'text-yellow-500 fill-yellow-500' : 'text-gray-400 dark:text-white/50'}`} />
                  </button>
                </h2>
                <p className="text-lg font-medium text-gray-600 dark:text-blue-100 capitalize">{weatherData.weather[0].description}</p>
              </div>
              
              <div className="flex flex-col items-center my-6">
                <img src={`https://openweathermap.org/img/wn/${weatherData.weather[0].icon}@4x.png`} alt="icon" className="w-48 h-48 drop-shadow-2xl filter brightness-110" />
                <h1 className="text-9xl font-bold tracking-tighter text-transparent bg-clip-text bg-gradient-to-b from-gray-800 to-gray-500 dark:from-white dark:to-white/60">
                  {Math.round(weatherData.main.temp)}°{tempUnit}
                </h1>
              </div>

              <div className="grid grid-cols-2 gap-4 w-full">
                <div className="flex flex-col bg-white/50 dark:bg-black/20 rounded-2xl p-3">
                  <span className="text-xs text-gray-500 dark:text-blue-200">{t.feelsLike}</span>
                  <span className="text-xl font-bold">{Math.round(weatherData.main.feels_like)}°{tempUnit}</span>
                </div>
                <div className="flex flex-col bg-white/50 dark:bg-black/20 rounded-2xl p-3">
                  <span className="text-xs text-gray-500 dark:text-blue-200">Min / Max</span>
                  <span className="text-xl font-bold">{Math.round(weatherData.main.temp_min)}°{tempUnit} / {Math.round(weatherData.main.temp_max)}°{tempUnit}</span>
                </div>
              </div>
            </div>

            {/* Harita (Leaflet) */}
            <div className="rounded-3xl overflow-hidden shadow-2xl border border-white/20 h-64 relative group z-0">
              <div className="absolute top-2 left-2 z-[400] bg-black/50 backdrop-blur text-white text-xs px-2 py-1 rounded-md flex items-center gap-1 pointer-events-none">
                <MapIcon className="w-3 h-3" /> Harita
              </div>
              <div className="h-full w-full filter grayscale-[30%] group-hover:grayscale-0 transition duration-500">
                <MapContainer 
                  center={[weatherData.coord.lat, weatherData.coord.lon]} 
                  zoom={10} 
                  scrollWheelZoom={true}
                  style={{ height: '100%', width: '100%' }}
                  zoomControl={false}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  <Marker position={[weatherData.coord.lat, weatherData.coord.lon]} />
                  <LocationMarker onLocationSelect={(lat, lon) => fetchAllWeatherData(lat, lon)} />
                  <ChangeView center={[weatherData.coord.lat, weatherData.coord.lon]} />
                </MapContainer>
              </div>
            </div>

            {/* Aktivite Önerileri */}
            <div className="bg-white/60 dark:bg-black/40 backdrop-blur-md border border-white/40 dark:border-white/20 p-6 rounded-3xl shadow-lg">
              <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">{t.activities}</h3>
              <div className="grid grid-cols-2 gap-4">
                <ActivityItem icon={<Activity className="w-5 h-5" />} label={t.running} status={getActivityStatus('running')} t={t} />
                <ActivityItem icon={<Tent className="w-5 h-5" />} label={t.camping} status={getActivityStatus('camping')} t={t} />
                <ActivityItem icon={<Utensils className="w-5 h-5" />} label={t.picnic} status={getActivityStatus('picnic')} t={t} />
                <ActivityItem icon={<Car className="w-5 h-5" />} label={t.carWash} status={getActivityStatus('carWash')} t={t} />
              </div>
            </div>

            {/* Giyim Önerileri */}
            <div className="bg-white/60 dark:bg-black/40 backdrop-blur-md border border-white/40 dark:border-white/20 p-6 rounded-3xl shadow-lg">
              <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">{t.clothing}</h3>
              <div className="flex flex-wrap gap-3">
                {getClothingSuggestions().map((item, idx) => (
                  <div key={idx} className="flex items-center gap-2 bg-white/50 dark:bg-black/20 px-4 py-2 rounded-full border border-white/20 shadow-sm">
                    <span className="text-gray-700 dark:text-white">{item.icon}</span>
                    <span className="text-sm font-medium text-gray-800 dark:text-white">{item.label}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Ay Durumu */}
            <div className="bg-white/60 dark:bg-black/40 backdrop-blur-md border border-white/40 dark:border-white/20 p-6 rounded-3xl shadow-lg">
              <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">{t.sunAndMoon}</h3>
              <div className="flex items-center justify-between">
                <div className="flex flex-col items-center">
                  <div className="text-6xl animate-pulse mb-2" title="Ay Fazı">
                    {dailyData?.daily?.moon_phase ? getMoonPhaseIcon(dailyData.daily.moon_phase[0]) : '🌑'}
                  </div>
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{dailyData?.daily?.moon_phase ? getMoonPhaseName(dailyData.daily.moon_phase[0]) : ''}</span>
                </div>
                <div className="flex flex-col gap-2 text-right">
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-sm text-gray-600 dark:text-gray-300">{t.sunrise}</span>
                    <span className="font-bold text-gray-800 dark:text-white">{format(new Date(weatherData.sys.sunrise * 1000), 'HH:mm')}</span>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-sm text-gray-600 dark:text-gray-300">{t.sunset}</span>
                    <span className="font-bold text-gray-800 dark:text-white">{format(new Date(weatherData.sys.sunset * 1000), 'HH:mm')}</span>
                  </div>
                  <div className="flex items-center gap-2 justify-end border-t border-gray-300 dark:border-gray-600 pt-2 mt-1">
                    <span className="text-sm text-gray-600 dark:text-gray-300">{t.moonRise}</span>
                    <span className="font-bold text-gray-800 dark:text-white">{dailyData?.daily?.moonrise?.[0] ? format(new Date(dailyData.daily.moonrise[0]), 'HH:mm') : '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 justify-end">
                    <span className="text-sm text-gray-600 dark:text-gray-300">{t.moonSet}</span>
                    <span className="font-bold text-gray-800 dark:text-white">{dailyData?.daily?.moonset?.[0] ? format(new Date(dailyData.daily.moonset[0]), 'HH:mm') : '-'}</span>
                  </div>
                  <div className="flex items-center gap-2 justify-end mt-2 pt-2 border-t border-gray-300 dark:border-gray-600">
                    <span className="text-sm text-gray-600 dark:text-gray-300">{t.daylight}</span>
                    <span className="font-bold text-gray-800 dark:text-white">{getDaylightDuration()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* 2. SAĞ KOLON: Detaylar ve Grafikler */}
          <div className="lg:col-span-2 flex flex-col gap-6">
            
            {/* Detay Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <DetailCard icon={<Droplets className="text-blue-500" />} title={t.humidity} value={`%${weatherData.main.humidity}`} />
              <DetailCard 
                icon={
                  <div className="relative flex items-center justify-center w-9 h-9">
                    <div className="absolute inset-0 border border-gray-400/50 rounded-full"></div>
                    <span className="absolute -top-1.5 text-[8px] font-bold text-gray-500 dark:text-gray-400">N</span>
                    <Navigation 
                      className="w-5 h-5 text-blue-600 dark:text-blue-400 transition-transform duration-1000 ease-out" 
                      style={{ transform: `rotate(${weatherData.wind.deg - 45}deg)` }} 
                      fill="currentColor"
                    />
                  </div>
                } 
                title={t.wind} value={`${weatherData.wind.speed} m/s`} subValue={`${getWindDirection(weatherData.wind.deg)} (${weatherData.wind.deg}°)`} />
              <DetailCard icon={<Sun className="text-yellow-500" />} title={t.uvIndex} value={dailyData?.daily?.uv_index_max?.[0] ?? '-'} />
              <DetailCard icon={<Gauge className="text-purple-500" />} title={t.pressure} value={`${weatherData.main.pressure} hPa`} />
              <DetailCard icon={<Eye className="text-green-500" />} title={t.visibility} value={`${(weatherData.visibility / 1000).toFixed(1)} km`} />
              <DetailCard icon={<Sunrise className="text-orange-500" />} title={t.sunrise} value={format(new Date(weatherData.sys.sunrise * 1000), 'HH:mm')} />
              <DetailCard icon={<Sunset className="text-indigo-500" />} title={t.sunset} value={format(new Date(weatherData.sys.sunset * 1000), 'HH:mm')} />
            </div>

            {/* Grafik */}
            <div className="bg-white/60 dark:bg-black/40 backdrop-blur-md border border-white/40 dark:border-white/20 p-6 rounded-3xl shadow-lg">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800 dark:text-white flex items-center gap-2">
                  <Calendar className="w-5 h-5" /> 
                  {selectedDay ? `${format(new Date(selectedDay), 'd MMMM', { locale: dateLocale })}` : t.hourly}
                </h3>
                {selectedDay && (
                  <button onClick={() => setSelectedDay(null)} className="text-xs text-blue-600 dark:text-blue-300 hover:underline">
                    {t.reset}
                  </button>
                )}
              </div>
              <div className="h-56 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={getChartData()}>
                    <defs>
                      <linearGradient id="colorTemp" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#60a5fa" stopOpacity={0.8}/><stop offset="95%" stopColor="#60a5fa" stopOpacity={0}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#ffffff" opacity={0.1} />
                    <XAxis dataKey="time" stroke="#9ca3af" tick={{fontSize: 12}} />
                    <YAxis hide domain={['dataMin - 2', 'dataMax + 2']} />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: 'none', borderRadius: '12px', color: '#fff' }} formatter={(value) => [`${value}°${tempUnit}`]} />
                    <Area type="monotone" dataKey="temp" stroke="#60a5fa" strokeWidth={4} fillOpacity={1} fill="url(#colorTemp)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Hava Kalitesi */}
            {airQuality && (
              <div className="bg-white/60 dark:bg-black/40 backdrop-blur-md border border-white/40 dark:border-white/20 p-6 rounded-3xl shadow-lg">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-bold flex items-center gap-2 text-gray-800 dark:text-white"><Wind className="w-5 h-5" /> {t.airQuality}</h3>
                  <span className={`px-3 py-1 rounded-full text-white text-sm font-bold ${getAQIStatus(airQuality.list[0].main.aqi).color}`}>{getAQIStatus(airQuality.list[0].main.aqi).text}</span>
                </div>
                <div className="w-full bg-gray-200 dark:bg-black/20 rounded-full h-2.5">
                  <div className={`h-2.5 rounded-full ${getAQIStatus(airQuality.list[0].main.aqi).color}`} style={{ width: `${(airQuality.list[0].main.aqi / 5) * 100}%` }}></div>
                </div>
              </div>
            )}

            {/* Günlük Tahmin Listesi */}
            <div className="bg-white/60 dark:bg-black/40 backdrop-blur-md border border-white/40 dark:border-white/20 p-6 rounded-3xl shadow-lg">
              <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">{t.daily}</h3>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 overflow-y-auto max-h-[400px] scrollbar-hide">
                {dailyData?.daily?.time ? dailyData.daily.time.map((time, idx) => {
                  const itemDate = time; // Open-Meteo returns YYYY-MM-DD
                  const isSelected = selectedDay === itemDate;

                  return (
                    <div 
                      key={idx} 
                      onClick={() => setSelectedDay(isSelected ? null : itemDate)}
                      className={`flex flex-col items-center p-4 rounded-2xl transition-all cursor-pointer border ${isSelected ? 'bg-blue-500/20 border-blue-400 scale-105 shadow-lg' : 'bg-white/40 dark:bg-black/20 border-transparent hover:bg-white/60 dark:hover:bg-black/30'} min-w-[120px]`}
                    >
                      <span className="text-gray-600 dark:text-gray-300 font-medium text-sm">{format(new Date(time), 'EEEE', { locale: dateLocale })}</span>
                      <img src={`https://openweathermap.org/img/wn/${getIconFromWMO(dailyData.daily.weather_code[idx])}.png`} alt="icon" className="w-12 h-12 my-1" />
                      <span className="text-xl font-bold text-gray-800 dark:text-white">{Math.round(dailyData.daily.temperature_2m_max[idx])}°{tempUnit}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 text-center">{Math.round(dailyData.daily.temperature_2m_min[idx])}°{tempUnit} Min</span>
                      
                      <div className="mt-2 flex items-center gap-1 text-xs text-blue-600 dark:text-blue-300 font-semibold">
                        <CloudRain className="w-3 h-3" />
                        <span>%{dailyData.daily.precipitation_probability_max[idx]}</span>
                      </div>
                    </div>
                  );
                }) : dailyForecastFallback?.map((item, idx) => {
                  // FALLBACK: OpenWeatherMap verisi
                  const itemDate = format(new Date(item.dt * 1000), 'yyyy-MM-dd');
                  const isSelected = selectedDay === itemDate;
                  return (
                    <div 
                      key={idx} 
                      onClick={() => setSelectedDay(isSelected ? null : itemDate)}
                      className={`flex flex-col items-center p-4 rounded-2xl transition-all cursor-pointer border ${isSelected ? 'bg-blue-500/20 border-blue-400 scale-105 shadow-lg' : 'bg-white/40 dark:bg-black/20 border-transparent hover:bg-white/60 dark:hover:bg-black/30'} min-w-[120px]`}
                    >
                      <span className="text-gray-600 dark:text-gray-300 font-medium text-sm">{format(new Date(item.dt * 1000), 'EEEE', { locale: dateLocale })}</span>
                      <img src={`https://openweathermap.org/img/wn/${item.weather[0].icon}.png`} alt="icon" className="w-12 h-12 my-1" />
                      <span className="text-xl font-bold text-gray-800 dark:text-white">{Math.round(item.main.temp)}°{tempUnit}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 capitalize text-center line-clamp-1">{item.weather[0].description}</span>
                    </div>
                  );
                })
                }
              </div>
            </div>

            {/* Seçilen Ülkenin Büyük Şehirleri */}
            <div className="bg-white/60 dark:bg-black/40 backdrop-blur-md border border-white/40 dark:border-white/20 p-6 rounded-3xl shadow-lg">
              <h3 className="text-lg font-bold mb-4 text-gray-800 dark:text-white">{t.majorCities}</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {countryCities[lang]?.map((cityName) => (
                  <CapitalCard key={cityName} name={cityName} apiKey={apiKey} onCityClick={handleSearch} unit={unit} />
                ))}
              </div>
            </div>
          </div>

        </div>
      )}

      {/* Dünya Başkentleri (Footer) */}
      <div className="w-full max-w-6xl mt-auto">
        <h3 className="text-gray-800 dark:text-white/70 font-bold mb-3 ml-2 text-sm uppercase tracking-wider">{t.capitals}</h3>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <CapitalCard name="London, GB" apiKey={apiKey} onCityClick={handleSearch} unit={unit} />
          <CapitalCard name="New York, US" apiKey={apiKey} onCityClick={handleSearch} unit={unit} />
          <CapitalCard name="Tokyo, JP" apiKey={apiKey} onCityClick={handleSearch} unit={unit} />
          <CapitalCard name="Paris, FR" apiKey={apiKey} onCityClick={handleSearch} unit={unit} />
          <CapitalCard name="Berlin, DE" apiKey={apiKey} onCityClick={handleSearch} unit={unit} />
        </div>
      </div>
    </div>
  );
};

const DetailCard = ({ icon, title, value, subValue }) => (
  <div className="bg-white/60 dark:bg-black/40 backdrop-blur-md border border-white/40 dark:border-white/10 p-4 rounded-2xl shadow-md flex flex-col items-center justify-center text-center gap-2 hover:bg-white/80 dark:hover:bg-black/50 transition">
    <div className="p-2 bg-white/50 dark:bg-black/20 rounded-full text-gray-700 dark:text-white">{icon}</div>
    <span className="text-sm text-gray-600 dark:text-gray-300">{title}</span>
    <span className="text-lg font-bold text-gray-900 dark:text-white">{value}</span>
    {subValue && <span className="text-xs text-gray-500 dark:text-gray-400">{subValue}</span>}
  </div>
);

// Aktivite Kartı Bileşeni
const ActivityItem = ({ icon, label, status, t }) => (
  <div className={`flex flex-col items-center p-3 rounded-2xl border transition ${status ? 'bg-green-500/10 border-green-500/30' : 'bg-red-500/10 border-red-500/30'}`}>
    <div className={`p-2 rounded-full mb-2 ${status ? 'bg-green-500 text-white' : 'bg-red-500 text-white'}`}>
      {icon}
    </div>
    <span className="text-sm font-medium text-gray-800 dark:text-white">{label}</span>
    <span className={`text-xs font-bold mt-1 ${status ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
      {status ? t.suitable : t.notSuitable}
    </span>
  </div>
);

// Başkent Kartı Bileşeni
const CapitalCard = ({ name, apiKey, onCityClick, unit }) => {
  const [data, setData] = useState(null);
  const tempUnit = unit === 'metric' ? 'C' : 'F';

  useEffect(() => {
    fetch(`https://api.openweathermap.org/data/2.5/weather?q=${name}&appid=${apiKey}&units=${unit}`)
      .then(res => {
        if (!res.ok) return null;
        return res.json();
      })
      .then(data => {
        if (data && data.weather) setData(data);
      })
      .catch(err => console.error(err));
  }, [name, apiKey, unit]);

  if (!data) return <div className="h-20 bg-white/20 dark:bg-white/5 rounded-xl animate-pulse opacity-50"></div>;

  return (
    <div 
      onClick={() => onCityClick(name)}
      className="bg-white/60 dark:bg-black/30 backdrop-blur-sm border border-white/40 dark:border-white/10 p-3 rounded-xl flex items-center justify-between hover:bg-white/80 dark:hover:bg-black/40 transition shadow-sm cursor-pointer"
    >
      <div className="flex flex-col">
        <span className="text-gray-800 dark:text-white font-bold text-sm">{name.split(',')[0]}</span>
        <span className="text-gray-600 dark:text-gray-400 text-xs capitalize">{data.weather[0].description}</span>
      </div>
      <div className="flex items-center gap-2">
        <img src={`https://openweathermap.org/img/wn/${data.weather[0].icon}.png`} alt="" className="w-8 h-8" />
        <span className="text-gray-800 dark:text-white font-bold">{Math.round(data.main.temp)}°{tempUnit}</span>
      </div>
    </div>
  );
};

export default Weather;