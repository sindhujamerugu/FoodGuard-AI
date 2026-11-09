import type { UiLanguage } from '@/i18n/LanguageContext'
import { SUPPORTED_UI_LANGUAGES } from '@/i18n/LanguageContext'

/**
 * Canonical dictionary of Indian cities across all 6 supported UI languages.
 */
export const CITY_TRANSLATIONS: Record<string, Record<UiLanguage, string>> = {
  hyderabad: {
    en: 'Hyderabad',
    te: 'హైదరాబాద్',
    hi: 'हैदराबाद',
    ta: 'ஹைதராபாத்',
    kn: 'ಹೈದರಾಬಾದ್',
    mr: 'हैदराबाद',
  },
  bengaluru: {
    en: 'Bengaluru',
    te: 'బెంగళూరు',
    hi: 'बेंगलुरु',
    ta: 'பெங்களூரு',
    kn: 'ಬೆಂಗಳೂರು',
    mr: 'बंगळुरू',
  },
  bangalore: {
    en: 'Bengaluru',
    te: 'బెంగళూరు',
    hi: 'बेंगलुरु',
    ta: 'பெங்களூரு',
    kn: 'ಬೆಂಗಳೂರು',
    mr: 'बंगळुरू',
  },
  mumbai: {
    en: 'Mumbai',
    te: 'ముంబై',
    hi: 'मुंबई',
    ta: 'மும்பை',
    kn: 'ಮುಂಬೈ',
    mr: 'मुंबई',
  },
  chennai: {
    en: 'Chennai',
    te: 'చెన్నై',
    hi: 'चेन्नई',
    ta: 'சென்னை',
    kn: 'ಚೆನ್ನೈ',
    mr: 'चेन्नई',
  },
  'new delhi': {
    en: 'New Delhi',
    te: 'న్యూఢిల్లీ',
    hi: 'नई दिल्ली',
    ta: 'புது தில்லி',
    kn: 'ನವದೆಹಲಿ',
    mr: 'नवी दिल्ली',
  },
  delhi: {
    en: 'Delhi',
    te: 'ఢిల్లీ',
    hi: 'दिल्ली',
    ta: 'தில்லி',
    kn: 'ದೆಹಲಿ',
    mr: 'दिल्ली',
  },
  pune: {
    en: 'Pune',
    te: 'పూణే',
    hi: 'पुणे',
    ta: 'புனே',
    kn: 'ಪುಣೆ',
    mr: 'पुणे',
  },
  kolkata: {
    en: 'Kolkata',
    te: 'కోల్‌కతా',
    hi: 'कोलकाता',
    ta: 'கொல்கத்தா',
    kn: 'ಕೋಲ್ಕತ್ತಾ',
    mr: 'कोलकाता',
  },
  visakhapatnam: {
    en: 'Visakhapatnam',
    te: 'విశాఖపట్నం',
    hi: 'विशाखापट्टनम',
    ta: 'விசாகப்பட்டினம்',
    kn: 'ವಿಶಾಖಪಟ್ಟಣ',
    mr: 'विशाखापट्टणम',
  },
  vijayawada: {
    en: 'Vijayawada',
    te: 'విజయవాడ',
    hi: 'विजयवाड़ा',
    ta: 'விஜயவாடா',
    kn: 'ವಿಜಯವಾಡ',
    mr: 'विजयवाडा',
  },
  secunderabad: {
    en: 'Secunderabad',
    te: 'సికింద్రాబాద్',
    hi: 'सिकंदराबाद',
    ta: 'செகந்திராபாத்',
    kn: 'ಸಿಕಂದರಾಬಾದ್',
    mr: 'सिकंदराबाद',
  },
  ahmedabad: {
    en: 'Ahmedabad',
    te: 'అహ్మదాబాద్',
    hi: 'अहमदाबाद',
    ta: 'அகமதாபாத்',
    kn: 'ಅಹಮದಾಬಾದ್',
    mr: 'अहमदाबाद',
  },
  jaipur: {
    en: 'Jaipur',
    te: 'జైపూర్',
    hi: 'जयपुर',
    ta: 'ஜெய்ப்பூர்',
    kn: 'ಜೈಪುರ',
    mr: 'जयपूर',
  },
  kochi: {
    en: 'Kochi',
    te: 'కొచ్చి',
    hi: 'कोच्चि',
    ta: 'கொச்சி',
    kn: 'ಕೊಚ್ಚಿ',
    mr: 'कोची',
  },
  mysuru: {
    en: 'Mysuru',
    te: 'మైసూర్',
    hi: 'मैसूर',
    ta: 'மைசூர்',
    kn: 'ಮೈಸೂರು',
    mr: 'म्हैसूर',
  },
  mysore: {
    en: 'Mysuru',
    te: 'మైసూర్',
    hi: 'मैसूर',
    ta: 'மைசூர்',
    kn: 'ಮೈಸೂರು',
    mr: 'म्हैसूर',
  },
  mangaluru: {
    en: 'Mangaluru',
    te: 'మంగళూరు',
    hi: 'मंगलौर',
    ta: 'மங்களூரு',
    kn: 'ಮಂಗಳೂರು',
    mr: 'मंगळूर',
  },
  coimbatore: {
    en: 'Coimbatore',
    te: 'కోయంబత్తూర్',
    hi: 'कोयंबटूर',
    ta: 'கோயம்புத்தூர்',
    kn: 'ಕೊಯಮತ್ತೂರು',
    mr: 'कोईम्बतूर',
  },
  madurai: {
    en: 'Madurai',
    te: 'మదురై',
    hi: 'मदुरै',
    ta: 'மதுரை',
    kn: 'ಮಧುರೈ',
    mr: 'மதுराई',
  },
  nagpur: {
    en: 'Nagpur',
    te: 'నాగ్‌పూర్',
    hi: 'नागपुर',
    ta: 'நாக்பூர்',
    kn: 'ನಾಗ್ಪುರ',
    mr: 'नागपूर',
  },
  nashik: {
    en: 'Nashik',
    te: 'నాసిక్',
    hi: 'नासिक',
    ta: 'நாசிக்',
    kn: 'ನಾಸಿಕ್',
    mr: 'नाशिक',
  },
  gurugram: {
    en: 'Gurugram',
    te: 'గురుగ్రామ్',
    hi: 'गुरुग्राम',
    ta: 'குருகிராம்',
    kn: 'ಗುರುಗ್ರಾಮ',
    mr: 'गुरुग्राम',
  },
  noida: {
    en: 'Noida',
    te: 'నోయిడా',
    hi: 'नोएडा',
    ta: 'நொய்டா',
    kn: 'ನೋಯ್ಡಾ',
    mr: 'नोएडा',
  },
  chandigarh: {
    en: 'Chandigarh',
    te: 'చండీగఢ్',
    hi: 'चंडीगढ़',
    ta: 'சண்டிகர்',
    kn: 'ಚಂಡೀಗಢ',
    mr: 'चंदिगढ',
  },
  thiruvananthapuram: {
    en: 'Thiruvananthapuram',
    te: 'తిరువనంతపురం',
    hi: 'तिरुवनंतपुरम',
    ta: 'திருவனந்தபுரம்',
    kn: 'ತಿರುವನಂತಪುರಂ',
    mr: 'तिरुवनंतपुरम',
  },
  warangal: {
    en: 'Warangal',
    te: 'వరంగల్',
    hi: 'वारंगल',
    ta: 'வாரங்கல்',
    kn: 'ವಾರಂಗಲ್',
    mr: 'वारंगळ',
  },
  guntur: {
    en: 'Guntur',
    te: 'గుంటూరు',
    hi: 'गुंटूर',
    ta: 'குண்டூர்',
    kn: 'ಗುಂಟೂರು',
    mr: 'गुंटूर',
  },
  tirupati: {
    en: 'Tirupati',
    te: 'తిరుపతి',
    hi: 'तिरुपति',
    ta: 'திருப்பதி',
    kn: 'ತಿರುಪತಿ',
    mr: 'तिरुपती',
  },
}

/**
 * Canonical dictionary of Indian states across all 6 supported UI languages.
 */
export const STATE_TRANSLATIONS: Record<string, Record<UiLanguage, string>> = {
  telangana: {
    en: 'Telangana',
    te: 'తెలంగాణ',
    hi: 'तेलंगाना',
    ta: 'தெலங்கானா',
    kn: 'ತೆಲಂಗಾಣ',
    mr: 'तेलंगणा',
  },
  karnataka: {
    en: 'Karnataka',
    te: 'కర్ణాటక',
    hi: 'कर्नाटक',
    ta: 'கர்நாடகா',
    kn: 'ಕರ್ನಾಟಕ',
    mr: 'कर्नाटक',
  },
  maharashtra: {
    en: 'Maharashtra',
    te: 'మహారాష్ట్ర',
    hi: 'महाराष्ट्र',
    ta: 'மகாராஷ்டிரா',
    kn: 'ಮಹಾರಾಷ್ಟ್ರ',
    mr: 'महाराष्ट्र',
  },
  'tamil nadu': {
    en: 'Tamil Nadu',
    te: 'తమిళనాడు',
    hi: 'तमिलनाडु',
    ta: 'தமிழ்நாடு',
    kn: 'ತಮಿಳುನಾಡು',
    mr: 'तमिळनाडू',
  },
  delhi: {
    en: 'Delhi',
    te: 'ఢిల్లీ',
    hi: 'दिल्ली',
    ta: 'தில்லி',
    kn: 'ದೆಹಲಿ',
    mr: 'दिल्ली',
  },
  'andhra pradesh': {
    en: 'Andhra Pradesh',
    te: 'ఆంధ్రప్రదేశ్',
    hi: 'आंध्र प्रदेश',
    ta: 'ஆந்திரப் பிரதேசம்',
    kn: 'ಆಂಧ್ರಪ್ರದೇಶ',
    mr: 'आंध्र प्रदेश',
  },
  kerala: {
    en: 'Kerala',
    te: 'కేరళ',
    hi: 'केरल',
    ta: 'கேரளா',
    kn: 'ಕೇರಳ',
    mr: 'केरळ',
  },
  goa: {
    en: 'Goa',
    te: 'గోవా',
    hi: 'गोवा',
    ta: 'கோவா',
    kn: 'ಗೋವಾ',
    mr: 'गोवा',
  },
  gujarat: {
    en: 'Gujarat',
    te: 'గుజరాత్',
    hi: 'गुजरात',
    ta: 'குஜராத்',
    kn: 'ಗುಜರಾತ್',
    mr: 'गुजरात',
  },
  rajasthan: {
    en: 'Rajasthan',
    te: 'రాజస్థాన్',
    hi: 'राजस्थान',
    ta: 'ராஜஸ்தான்',
    kn: 'ರಾಜಸ್ಥಾನ',
    mr: 'राजस्थान',
  },
  'west bengal': {
    en: 'West Bengal',
    te: 'పశ్చిమ బెంగాల్',
    hi: 'पश्चिम बंगाल',
    ta: 'மேற்கு வங்கம்',
    kn: 'ಪಶ್ಚಿಮ ಬಂಗಾಳ',
    mr: 'पश्चिम बंगाल',
  },
  'uttar pradesh': {
    en: 'Uttar Pradesh',
    te: 'ఉత్తర ప్రదేశ్',
    hi: 'उत्तर प्रदेश',
    ta: 'உத்தரப் பிரதேசம்',
    kn: 'உத்தர ಪ್ರದೇಶ',
    mr: 'उत्तर प्रदेश',
  },
  'madhya pradesh': {
    en: 'Madhya Pradesh',
    te: 'మధ్యప్రదేశ్',
    hi: 'मध्य प्रदेश',
    ta: 'மத்தியப் பிரதேசம்',
    kn: 'ಮಧ್ಯಪ್ರದೇಶ',
    mr: 'मध्य प्रदेश',
  },
  punjab: {
    en: 'Punjab',
    te: 'పంజాబ్',
    hi: 'पंजाब',
    ta: 'பஞ்சாப்',
    kn: 'ಪಂಜಾಬ್',
    mr: 'पंजाब',
  },
  haryana: {
    en: 'Haryana',
    te: 'హర్యానా',
    hi: 'हरियाणा',
    ta: 'ஹரியானா',
    kn: 'ಹರಿಯಾಣ',
    mr: 'हरियाणा',
  },
  odisha: {
    en: 'Odisha',
    te: 'ఒడిశా',
    hi: 'ओडिशा',
    ta: 'ஒடிசா',
    kn: 'ಒಡಿಶಾ',
    mr: 'ओडिशा',
  },
  bihar: {
    en: 'Bihar',
    te: 'బీహార్',
    hi: 'बिहार',
    ta: 'பீகார்',
    kn: 'ಬಿಹಾರ',
    mr: 'बिहार',
  },
}

/**
 * Reusable localization mappings for restaurant names across all 6 supported UI languages.
 */
export const RESTAURANT_NAME_TRANSLATIONS: Record<string, Record<UiLanguage, string>> = {
  'spice garden': {
    en: 'Spice Garden',
    te: 'స్పైస్ గార్డెన్',
    hi: 'स्पाइस गार्डन',
    ta: 'ஸ்பைஸ் கார்டன்',
    kn: 'ಸ್ಪೈಸ್ ಗಾರ್ಡನ್',
    mr: 'स्पाइस गार्डन',
  },
  'the green bowl': {
    en: 'The Green Bowl',
    te: 'ది గ్రీన్ బౌల్',
    hi: 'द ग्रीन बाउल',
    ta: 'தி கிரீன் பவுல்',
    kn: 'ದಿ ಗ್ರೀನ್ ಬೌಲ್',
    mr: 'द ग्रीन बाऊल',
  },
  'royal tandoor': {
    en: 'Royal Tandoor',
    te: 'రాయల్ తందూర్',
    hi: 'रॉयल तंदूर',
    ta: 'ராயல் தந்தூர்',
    kn: 'ರಾಯಲ್ ತಂದೂರ್',
    mr: 'रॉयल तंदूर',
  },
  'ocean catch diner': {
    en: 'Ocean Catch Diner',
    te: 'ఓషన్ క్యాచ్ డైనర్',
    hi: 'ओशन कैच डाइनर',
    ta: 'ஓஷன் கேட்ச் டைனர்',
    kn: 'ಓಷನ್ ಕ್ಯಾಚ್ ಡೈನರ್',
    mr: 'ओशन कॅच डायनर',
  },
  'sunrise cafe & bakery': {
    en: 'Sunrise Cafe & Bakery',
    te: 'సన్రైజ్ కేఫ్ & బేకరీ',
    hi: 'सनराइज कैफे & बेकरी',
    ta: 'சன்ரைஸ் கஃபே & பேக்கரி',
    kn: 'ಸನ್‌ರೈಸ್ ಕೆಫೆ & ಬೇಕರಿ',
    mr: 'सनराईज कॅफे & बेकरी',
  },
  'sunrise cafe and bakery': {
    en: 'Sunrise Cafe & Bakery',
    te: 'సన్రైజ్ కేఫ్ & బేకరీ',
    hi: 'सनराइज कैफे & बेकरी',
    ta: 'சன்ரைஸ் கஃபே & பேக்கரி',
    kn: 'ಸನ್‌ರೈಸ್ ಕೆಫೆ & ಬೇಕರಿ',
    mr: 'सनराईज कॅफे & बेकरी',
  },
  'mumbai chat house': {
    en: 'Mumbai Chat House',
    te: 'ముంబై చాట్ హౌస్',
    hi: 'मुंबई चाट हाउस',
    ta: 'மும்பை சாட் ஹவுஸ்',
    kn: 'ಮುಂಬೈ ಚಾಟ್ ಹೌಸ್',
    mr: 'मुंबई चाट हाऊस',
  },
  'new cafe': {
    en: 'New Cafe',
    te: 'న్యూ కేఫ్',
    hi: 'न्यू कैफे',
    ta: 'நியூ கஃபே',
    kn: 'ನ್ಯೂ ಕೆಫೆ',
    mr: 'न्यू कॅफे',
  },
  'biryani house': {
    en: 'Biryani House',
    te: 'బిర్యానీ హౌస్',
    hi: 'बिरयानी हाउस',
    ta: 'பிரியாணி ஹவுస్',
    kn: 'ಬಿರಿಯಾನಿ ಹೌಸ್',
    mr: 'बिर्याणी हाऊस',
  },
  bawarchi: {
    en: 'Bawarchi',
    te: 'బావర్చి',
    hi: 'बावर्ची',
    ta: 'பாவர்ச்சி',
    kn: 'ಬಾವರ್ಚಿ',
    mr: 'बावर्ची',
  },
  'paradise biryani': {
    en: 'Paradise Biryani',
    te: 'ప్యారడైజ్ బిర్యానీ',
    hi: 'पैराडाइज बिरयानी',
    ta: 'பாரடைஸ் பிரியாணி',
    kn: 'ಪ್ಯಾರಡೈಸ್ ಬಿರಿಯಾನಿ',
    mr: 'पॅराडाईज बिर्याणी',
  },
  chutneys: {
    en: 'Chutneys',
    te: 'చట్నీస్',
    hi: 'चटनीस',
    ta: 'சட்னீஸ்',
    kn: 'ಚಟ್ನೀಸ್',
    mr: 'चटणीस',
  },
  'saravanaa bhavan': {
    en: 'Saravanaa Bhavan',
    te: 'శరవణ భవన్',
    hi: 'सरवणा भवन',
    ta: 'சரவணா பவன்',
    kn: 'ಶರವಣ ಭವನ',
    mr: 'सरवणा भवन',
  },
  'saravana bhavan': {
    en: 'Saravana Bhavan',
    te: 'శరవణ భవన్',
    hi: 'सरवणा भवन',
    ta: 'சரவணா பவன்',
    kn: 'ಶರವಣ ಭವನ',
    mr: 'सरवणा भवन',
  },
  'udupi grand': {
    en: 'Udupi Grand',
    te: 'ఉడుపి గ్రాండ్',
    hi: 'उडुपी ग्रैंड',
    ta: 'உடுப்பி கிராண்ட்',
    kn: 'ಉಡುಪಿ ಗ್ರಾಂಡ್',
    mr: 'उडुपी ग्रँड',
  },
  'barbeque nation': {
    en: 'Barbeque Nation',
    te: 'బార్బెక్యూ నేషన్',
    hi: 'बारबेक्यू नेशन',
    ta: 'பார்பிக்யூ நேஷன்',
    kn: 'ಬಾರ್ಬೆಕ್ಯೂ ನೇಷನ್',
    mr: 'बार्बेक्यू नेशन',
  },
}

/**
 * Returns the localized restaurant display name for the given language.
 *
 * For English (`en`), always preserves canonical/original names.
 * For non-English languages, checks exact dictionary matches as well as
 * numbered branch/suffix variations (e.g. "spice garden02" -> "స్పైస్ గార్డెన్ 02").
 */
export function getLocalizedRestaurantName(canonicalName: string, language: UiLanguage): string {
  if (!canonicalName) return ''
  if (language === 'en') return canonicalName

  const trimmed = canonicalName.trim()
  const lower = trimmed.toLowerCase()

  // 1. Exact match in translations table
  if (RESTAURANT_NAME_TRANSLATIONS[lower]?.[language]) {
    return RESTAURANT_NAME_TRANSLATIONS[lower][language]
  }

  // 2. Prefix + branch/suffix match (e.g. "spice garden02" or "Spice Garden 02" or "Spice Garden - 02")
  // Sort known keys descending by length so longer matches match first
  const knownKeys = Object.keys(RESTAURANT_NAME_TRANSLATIONS).sort((a, b) => b.length - a.length)

  for (const baseKey of knownKeys) {
    if (lower.startsWith(baseKey)) {
      const suffix = trimmed.slice(baseKey.length).trim()
      const baseTranslated = RESTAURANT_NAME_TRANSLATIONS[baseKey][language]

      if (!suffix) {
        return baseTranslated
      }

      // Clean up common branch separators like '-', '_', or standalone digits
      const cleanedSuffix = suffix.replace(/^[-_—–\s]+/, '').trim()
      if (cleanedSuffix) {
        return `${baseTranslated} ${cleanedSuffix}`
      }
      return baseTranslated
    }
  }

  // Fallback: preserve original canonical name if no translation exists
  return canonicalName
}

/**
 * Returns the localized Indian city name for the given language.
 * Falls back to canonical city name if unlisted or in English mode.
 */
export function getLocalizedCity(canonicalCity: string, language: UiLanguage): string {
  if (!canonicalCity) return ''
  if (language === 'en') return canonicalCity

  const lower = canonicalCity.trim().toLowerCase()
  return CITY_TRANSLATIONS[lower]?.[language] ?? canonicalCity
}

/**
 * Returns the localized Indian state name for the given language.
 * Falls back to canonical state name if unlisted or in English mode.
 */
export function getLocalizedState(canonicalState: string, language: UiLanguage): string {
  if (!canonicalState) return ''
  if (language === 'en') return canonicalState

  const lower = canonicalState.trim().toLowerCase()
  return STATE_TRANSLATIONS[lower]?.[language] ?? canonicalState
}

/**
 * Checks if a restaurant record matches a user's search query across:
 * 1. Canonical English name, city, state.
 * 2. Active language localized display name, city, state.
 * 3. Any other supported language translation (so searching in Telugu, Hindi, etc., always finds the item).
 */
export function matchesRestaurantSearch(
  restaurant: { name: string; city: string; state: string },
  query: string,
  language: UiLanguage,
): boolean {
  const term = query.trim().toLowerCase()
  if (!term) return true

  // 1. Direct canonical match
  if (
    restaurant.name.toLowerCase().includes(term) ||
    restaurant.city.toLowerCase().includes(term) ||
    restaurant.state.toLowerCase().includes(term)
  ) {
    return true
  }

  // 2. Active language localized match
  const localizedName = getLocalizedRestaurantName(restaurant.name, language).toLowerCase()
  const localizedCity = getLocalizedCity(restaurant.city, language).toLowerCase()
  const localizedState = getLocalizedState(restaurant.state, language).toLowerCase()

  if (
    localizedName.includes(term) ||
    localizedCity.includes(term) ||
    localizedState.includes(term)
  ) {
    return true
  }

  // 3. Multilingual cross-script search (e.g. searching Telugu name while UI is in Hindi)
  for (const lang of SUPPORTED_UI_LANGUAGES) {
    if (lang === language || lang === 'en') continue
    if (getLocalizedRestaurantName(restaurant.name, lang).toLowerCase().includes(term)) return true
    if (getLocalizedCity(restaurant.city, lang).toLowerCase().includes(term)) return true
    if (getLocalizedState(restaurant.state, lang).toLowerCase().includes(term)) return true
  }

  return false
}
