import { describe, it, expect } from 'vitest'
import {
  getLocalizedRestaurantName,
  getLocalizedCity,
  getLocalizedState,
  matchesRestaurantSearch,
} from './restaurantLocalization'

describe('Restaurant Localization Module', () => {
  const sampleRestaurant = {
    name: 'spice garden02',
    city: 'Hyderabad',
    state: 'Telangana',
  }

  const greenBowl = {
    name: 'The Green Bowl',
    city: 'Bengaluru',
    state: 'Karnataka',
  }

  const royalTandoor = {
    name: 'Royal Tandoor',
    city: 'Mumbai',
    state: 'Maharashtra',
  }

  const oceanCatch = {
    name: 'Ocean Catch Diner',
    city: 'Chennai',
    state: 'Tamil Nadu',
  }

  const sunriseCafe = {
    name: 'Sunrise Cafe & Bakery',
    city: 'New Delhi',
    state: 'Delhi',
  }

  describe('1. Telugu restaurant display names and locations', () => {
    it('localizes restaurant names, cities, and states into Telugu script', () => {
      expect(getLocalizedRestaurantName('spice garden02', 'te')).toBe('స్పైస్ గార్డెన్ 02')
      expect(getLocalizedRestaurantName('The Green Bowl', 'te')).toBe('ది గ్రీన్ బౌల్')
      expect(getLocalizedRestaurantName('Royal Tandoor', 'te')).toBe('రాయల్ తందూర్')
      expect(getLocalizedRestaurantName('Ocean Catch Diner', 'te')).toBe('ఓషన్ క్యాచ్ డైనర్')
      expect(getLocalizedRestaurantName('Sunrise Cafe & Bakery', 'te')).toBe('సన్రైజ్ కేఫ్ & బేకరీ')

      expect(getLocalizedCity('Hyderabad', 'te')).toBe('హైదరాబాద్')
      expect(getLocalizedState('Telangana', 'te')).toBe('తెలంగాణ')

      expect(getLocalizedCity('Bengaluru', 'te')).toBe('బెంగళూరు')
      expect(getLocalizedState('Karnataka', 'te')).toBe('కర్ణాటక')

      expect(getLocalizedCity('Mumbai', 'te')).toBe('ముంబై')
      expect(getLocalizedState('Maharashtra', 'te')).toBe('మహారాష్ట్ర')

      expect(getLocalizedCity('Chennai', 'te')).toBe('చెన్నై')
      expect(getLocalizedState('Tamil Nadu', 'te')).toBe('తమిళనాడు')

      expect(getLocalizedCity('New Delhi', 'te')).toBe('న్యూఢిల్లీ')
      expect(getLocalizedState('Delhi', 'te')).toBe('ఢిల్లీ')
    })
  })

  describe('2. Hindi restaurant display names and locations', () => {
    it('localizes restaurant names, cities, and states into Hindi script', () => {
      expect(getLocalizedRestaurantName('spice garden02', 'hi')).toBe('स्पाइस गार्डन 02')
      expect(getLocalizedRestaurantName('The Green Bowl', 'hi')).toBe('द ग्रीन बाउल')
      expect(getLocalizedRestaurantName('Royal Tandoor', 'hi')).toBe('रॉयल तंदूर')
      expect(getLocalizedRestaurantName('Ocean Catch Diner', 'hi')).toBe('ओशन कैच डाइनर')
      expect(getLocalizedRestaurantName('Sunrise Cafe & Bakery', 'hi')).toBe('सनराइज कैफे & बेकरी')

      expect(getLocalizedCity('Hyderabad', 'hi')).toBe('हैदराबाद')
      expect(getLocalizedState('Telangana', 'hi')).toBe('तेलंगाना')

      expect(getLocalizedCity('Bengaluru', 'hi')).toBe('बेंगलुरु')
      expect(getLocalizedState('Karnataka', 'hi')).toBe('कर्नाटक')

      expect(getLocalizedCity('Mumbai', 'hi')).toBe('मुंबई')
      expect(getLocalizedState('Maharashtra', 'hi')).toBe('महाराष्ट्र')

      expect(getLocalizedCity('Chennai', 'hi')).toBe('चेन्नई')
      expect(getLocalizedState('Tamil Nadu', 'hi')).toBe('तमिलनाडु')

      expect(getLocalizedCity('New Delhi', 'hi')).toBe('नई दिल्ली')
      expect(getLocalizedState('Delhi', 'hi')).toBe('दिल्ली')
    })
  })

  describe('3. Tamil restaurant display names and locations', () => {
    it('localizes restaurant names, cities, and states into Tamil script', () => {
      expect(getLocalizedRestaurantName('spice garden02', 'ta')).toBe('ஸ்பைஸ் கார்டன் 02')
      expect(getLocalizedRestaurantName('The Green Bowl', 'ta')).toBe('தி கிரீன் பவுல்')
      expect(getLocalizedRestaurantName('Royal Tandoor', 'ta')).toBe('ராயல் தந்தூர்')
      expect(getLocalizedRestaurantName('Ocean Catch Diner', 'ta')).toBe('ஓஷன் கேட்ச் டைனர்')
      expect(getLocalizedRestaurantName('Sunrise Cafe & Bakery', 'ta')).toBe('சன்ரைஸ் கஃபே & பேக்கரி')

      expect(getLocalizedCity('Hyderabad', 'ta')).toBe('ஹைதராபாத்')
      expect(getLocalizedState('Telangana', 'ta')).toBe('தெலங்கானா')

      expect(getLocalizedCity('Bengaluru', 'ta')).toBe('பெங்களூரு')
      expect(getLocalizedState('Karnataka', 'ta')).toBe('கர்நாடகா')

      expect(getLocalizedCity('Chennai', 'ta')).toBe('சென்னை')
      expect(getLocalizedState('Tamil Nadu', 'ta')).toBe('தமிழ்நாடு')
    })
  })

  describe('4. Kannada restaurant display names and locations', () => {
    it('localizes restaurant names, cities, and states into Kannada script', () => {
      expect(getLocalizedRestaurantName('spice garden02', 'kn')).toBe('ಸ್ಪೈಸ್ ಗಾರ್ಡನ್ 02')
      expect(getLocalizedRestaurantName('The Green Bowl', 'kn')).toBe('ದಿ ಗ್ರೀನ್ ಬೌಲ್')
      expect(getLocalizedRestaurantName('Royal Tandoor', 'kn')).toBe('ರಾಯಲ್ ತಂದೂರ್')
      expect(getLocalizedRestaurantName('Ocean Catch Diner', 'kn')).toBe('ಓಷನ್ ಕ್ಯಾಚ್ ಡೈನರ್')
      expect(getLocalizedRestaurantName('Sunrise Cafe & Bakery', 'kn')).toBe('ಸನ್‌ರೈಸ್ ಕೆಫೆ & ಬೇಕರಿ')

      expect(getLocalizedCity('Hyderabad', 'kn')).toBe('ಹೈದರಾಬಾದ್')
      expect(getLocalizedState('Telangana', 'kn')).toBe('ತೆಲಂಗಾಣ')

      expect(getLocalizedCity('Bengaluru', 'kn')).toBe('ಬೆಂಗಳೂರು')
      expect(getLocalizedState('Karnataka', 'kn')).toBe('ಕರ್ನಾಟಕ')
    })
  })

  describe('5. Marathi restaurant display names and locations', () => {
    it('localizes restaurant names, cities, and states into Marathi script', () => {
      expect(getLocalizedRestaurantName('spice garden02', 'mr')).toBe('स्पाइस गार्डन 02')
      expect(getLocalizedRestaurantName('The Green Bowl', 'mr')).toBe('द ग्रीन बाऊल')
      expect(getLocalizedRestaurantName('Royal Tandoor', 'mr')).toBe('रॉयल तंदूर')
      expect(getLocalizedRestaurantName('Ocean Catch Diner', 'mr')).toBe('ओशन कॅच डायनर')
      expect(getLocalizedRestaurantName('Sunrise Cafe & Bakery', 'mr')).toBe('सनराईज कॅफे & बेकरी')

      expect(getLocalizedCity('Hyderabad', 'mr')).toBe('हैदराबाद')
      expect(getLocalizedState('Telangana', 'mr')).toBe('तेलंगणा')

      expect(getLocalizedCity('Mumbai', 'mr')).toBe('मुंबई')
      expect(getLocalizedState('Maharashtra', 'mr')).toBe('महाराष्ट्र')
    })
  })

  describe('6. English preserves canonical names and locations', () => {
    it('returns exact original English names, cities, and states', () => {
      expect(getLocalizedRestaurantName('spice garden02', 'en')).toBe('spice garden02')
      expect(getLocalizedRestaurantName('The Green Bowl', 'en')).toBe('The Green Bowl')
      expect(getLocalizedRestaurantName('Royal Tandoor', 'en')).toBe('Royal Tandoor')
      expect(getLocalizedCity('Hyderabad', 'en')).toBe('Hyderabad')
      expect(getLocalizedState('Telangana', 'en')).toBe('Telangana')
    })
  })

  describe('7. Bilingual & Multilingual Search Matching', () => {
    it('matches restaurant by canonical English name', () => {
      expect(matchesRestaurantSearch(sampleRestaurant, 'spice garden02', 'te')).toBe(true)
      expect(matchesRestaurantSearch(sampleRestaurant, 'spice', 'te')).toBe(true)
    })

    it('matches restaurant by localized Telugu name', () => {
      expect(matchesRestaurantSearch(sampleRestaurant, 'స్పైస్ గార్డెన్ 02', 'te')).toBe(true)
      expect(matchesRestaurantSearch(sampleRestaurant, 'స్పైస్', 'te')).toBe(true)
    })

    it('matches restaurant by canonical city and state', () => {
      expect(matchesRestaurantSearch(sampleRestaurant, 'Hyderabad', 'te')).toBe(true)
      expect(matchesRestaurantSearch(sampleRestaurant, 'Telangana', 'te')).toBe(true)
    })

    it('matches restaurant by localized city and state', () => {
      expect(matchesRestaurantSearch(sampleRestaurant, 'హైదరాబాద్', 'te')).toBe(true)
      expect(matchesRestaurantSearch(sampleRestaurant, 'తెలంగాణ', 'te')).toBe(true)
    })

    it('matches across scripts (e.g. searching Hindi name while in Telugu mode)', () => {
      expect(matchesRestaurantSearch(sampleRestaurant, 'स्पाइस गार्डन', 'te')).toBe(true)
      expect(matchesRestaurantSearch(greenBowl, 'ದಿ ಗ್ರೀನ್ ಬೌಲ್', 'hi')).toBe(true)
      expect(matchesRestaurantSearch(royalTandoor, 'रॉयल तंदूर', 'mr')).toBe(true)
      expect(matchesRestaurantSearch(royalTandoor, 'ముంబై', 'te')).toBe(true)
      expect(matchesRestaurantSearch(oceanCatch, 'சென்னை', 'ta')).toBe(true)
      expect(matchesRestaurantSearch(sunriseCafe, 'नई दिल्ली', 'hi')).toBe(true)
    })

    it('returns false when query matches neither canonical nor localized values', () => {
      expect(matchesRestaurantSearch(sampleRestaurant, 'NonExistentPlace', 'te')).toBe(false)
    })
  })
})
