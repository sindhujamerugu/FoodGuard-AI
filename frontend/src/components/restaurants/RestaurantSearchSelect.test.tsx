import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi, beforeEach } from 'vitest'
import { RestaurantSearchSelect } from './RestaurantSearchSelect'
import { renderWithProviders } from '@/test/testUtils'
import { useLanguage } from '@/i18n/LanguageContext'
import type { Restaurant } from '@/types/restaurant'

const SAMPLE_RESTAURANTS: Restaurant[] = [
  {
    id: 1,
    name: 'Spice Garden',
    description: 'South Indian cuisine',
    address: '12 MG Road',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500001',
    contact_email: 'spice@example.com',
    contact_phone: '+91-9876543210',
    owner: null,
    is_verified: true,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 2,
    name: 'The Green Bowl',
    description: 'Healthy salads',
    address: '45 Park Street',
    city: 'Bengaluru',
    state: 'Karnataka',
    pincode: '560001',
    contact_email: 'green@example.com',
    contact_phone: '+91-9876543211',
    owner: null,
    is_verified: false,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
  {
    id: 3,
    name: 'spice garden02',
    description: 'Regional cuisine',
    address: 'Madhapur Main Road',
    city: 'Hyderabad',
    state: 'Telangana',
    pincode: '500081',
    contact_email: 'spice02@example.com',
    contact_phone: '+91-9876543215',
    owner: null,
    is_verified: true,
    is_active: true,
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
  },
]

const mockUseRestaurants = vi.fn()
const mockMutateAsync = vi.fn()

vi.mock('@/hooks/useRestaurants', () => ({
  useRestaurants: () => mockUseRestaurants(),
  useCreateRestaurant: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}))

describe('RestaurantSearchSelect', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    mockUseRestaurants.mockReturnValue({
      data: SAMPLE_RESTAURANTS,
      isLoading: false,
      isError: false,
      refetch: vi.fn(),
    })
  })

  it('1. filters restaurants by search query (name or city)', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RestaurantSearchSelect onChange={vi.fn()} />)

    const input = screen.getByRole('combobox', { name: /search restaurant/i })
    await user.click(input)

    // Initially both restaurants are listed in dropdown
    expect(screen.getByText('Spice Garden')).toBeInTheDocument()
    expect(screen.getByText('The Green Bowl')).toBeInTheDocument()

    // Type "Hyderabad"
    await user.type(input, 'Hyderabad')
    expect(screen.getByText('Spice Garden')).toBeInTheDocument()
    expect(screen.queryByText('The Green Bowl')).not.toBeInTheDocument()
  })

  it('2. displays empty search state when no restaurant matches', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RestaurantSearchSelect onChange={vi.fn()} />)

    const input = screen.getByRole('combobox', { name: /search restaurant/i })
    await user.type(input, 'NonExistentPlace')

    expect(screen.getByText('No restaurant found')).toBeInTheDocument()
    expect(screen.getByText(/No results matching "NonExistentPlace"/i)).toBeInTheDocument()
  })

  it('3. displays "Can\'t find your restaurant? Add it" button which opens modal', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RestaurantSearchSelect onChange={vi.fn()} />)

    const input = screen.getByRole('combobox', { name: /search restaurant/i })
    await user.type(input, 'New Cafe')

    const addButtons = screen.getAllByRole('button', { name: /Can't find your restaurant\? Add it/i })
    expect(addButtons.length).toBeGreaterThan(0)

    await user.click(addButtons[0])

    // Modal opens
    expect(screen.getByRole('heading', { name: 'Add Restaurant' })).toBeInTheDocument()
    expect(screen.getByLabelText(/Restaurant Name/i)).toHaveValue('New Cafe')
  })

  it('4. renders add restaurant form with all required and optional fields', async () => {
    const user = userEvent.setup()
    renderWithProviders(<RestaurantSearchSelect onChange={vi.fn()} />)

    const input = screen.getByRole('combobox', { name: /search restaurant/i })
    await user.click(input)

    const addBtn = screen.getByRole('button', { name: /Can't find your restaurant\? Add it/i })
    await user.click(addBtn)

    expect(screen.getByLabelText(/Restaurant Name/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Address/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^City/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/^State/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Pincode/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Contact Phone/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Contact Email/i)).toBeInTheDocument()
    expect(screen.getByLabelText(/Description/i)).toBeInTheDocument()
  })

  it('5. submits new restaurant form and automatically selects the created restaurant', async () => {
    const user = userEvent.setup()
    const handleChange = vi.fn()

    const createdRecord: Restaurant = {
      id: 99,
      name: 'Mumbai Chat House',
      description: 'Street food',
      address: 'Shop 10, Marine Drive',
      city: 'Mumbai',
      state: 'Maharashtra',
      pincode: '400020',
      contact_email: '',
      contact_phone: '',
      owner: null,
      is_verified: false,
      is_active: true,
      created_at: '2026-01-01T00:00:00Z',
      updated_at: '2026-01-01T00:00:00Z',
    }

    mockMutateAsync.mockResolvedValueOnce(createdRecord)

    renderWithProviders(<RestaurantSearchSelect onChange={handleChange} />)

    const input = screen.getByRole('combobox', { name: /search restaurant/i })
    await user.click(input)

    const addBtn = screen.getByRole('button', { name: /Can't find your restaurant\? Add it/i })
    await user.click(addBtn)

    await user.type(screen.getByLabelText(/Restaurant Name/i), 'Mumbai Chat House')
    await user.type(screen.getByLabelText(/Address/i), 'Shop 10, Marine Drive')
    await user.type(screen.getByLabelText(/^City/i), 'Mumbai')
    await user.type(screen.getByLabelText(/^State/i), 'Maharashtra')
    await user.type(screen.getByLabelText(/Pincode/i), '400020')

    await user.click(screen.getByRole('button', { name: /Add & Select/i }))

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          name: 'Mumbai Chat House',
          address: 'Shop 10, Marine Drive',
          city: 'Mumbai',
          state: 'Maharashtra',
          pincode: '400020',
        }),
      )
      expect(handleChange).toHaveBeenCalledWith('99')
    })
  })

  it('6. handles API error state gracefully with retry button', async () => {
    const user = userEvent.setup()
    const mockRefetch = vi.fn()

    mockUseRestaurants.mockReturnValue({
      data: undefined,
      isLoading: false,
      isError: true,
      refetch: mockRefetch,
    })

    renderWithProviders(<RestaurantSearchSelect onChange={vi.fn()} />)

    const input = screen.getByRole('combobox', { name: /search restaurant/i })
    await user.click(input)

    expect(screen.getByText("Couldn't load restaurants.")).toBeInTheDocument()
    const retryBtn = screen.getByRole('button', { name: /Retry/i })
    await user.click(retryBtn)
    expect(mockRefetch).toHaveBeenCalled()
  })

  it('7. displays Telugu restaurant names, cities, states, and verification status', async () => {
    localStorage.setItem('foodguard.language', 'te')
    const user = userEvent.setup()
    renderWithProviders(<RestaurantSearchSelect onChange={vi.fn()} />)

    const input = screen.getByRole('combobox')
    await user.click(input)

    // Check localized restaurant names
    expect(screen.getByText('స్పైస్ గార్డెన్ 02')).toBeInTheDocument()
    expect(screen.getByText('ది గ్రీన్ బౌల్')).toBeInTheDocument()

    // Check localized cities and states
    expect(screen.getAllByText('హైదరాబాద్, తెలంగాణ').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('బెంగళూరు, కర్ణాటక')).toBeInTheDocument()

    // Check localized verification status
    expect(screen.getAllByText('ధృవీకరించబడింది').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('క్లెయిమ్ చేయనిది')).toBeInTheDocument()
  })

  it('8. displays Hindi restaurant names, cities, and status', async () => {
    localStorage.setItem('foodguard.language', 'hi')
    const user = userEvent.setup()
    renderWithProviders(<RestaurantSearchSelect onChange={vi.fn()} />)

    const input = screen.getByRole('combobox')
    await user.click(input)

    expect(screen.getByText('स्पाइस गार्डन 02')).toBeInTheDocument()
    expect(screen.getByText('द ग्रीन बाउल')).toBeInTheDocument()
    expect(screen.getAllByText('हैदराबाद, तेलंगाना').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('बेंगलुरु, कर्नाटक')).toBeInTheDocument()
    expect(screen.getAllByText('सत्यापित').length).toBeGreaterThanOrEqual(1)
  })

  it('9. displays Tamil restaurant names, cities, and status', async () => {
    localStorage.setItem('foodguard.language', 'ta')
    const user = userEvent.setup()
    renderWithProviders(<RestaurantSearchSelect onChange={vi.fn()} />)

    const input = screen.getByRole('combobox')
    await user.click(input)

    expect(screen.getByText('ஸ்பைஸ் கார்டன் 02')).toBeInTheDocument()
    expect(screen.getByText('தி கிரீன் பவுல்')).toBeInTheDocument()
    expect(screen.getAllByText('ஹைதராபாத், தெலங்கானா').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('பெங்களூரு, கர்நாடகா')).toBeInTheDocument()
    expect(screen.getAllByText('சரிபார்க்கப்பட்டது').length).toBeGreaterThanOrEqual(1)
  })

  it('10. displays Kannada restaurant names, cities, and status', async () => {
    localStorage.setItem('foodguard.language', 'kn')
    const user = userEvent.setup()
    renderWithProviders(<RestaurantSearchSelect onChange={vi.fn()} />)

    const input = screen.getByRole('combobox')
    await user.click(input)

    expect(screen.getByText('ಸ್ಪೈಸ್ ಗಾರ್ಡನ್ 02')).toBeInTheDocument()
    expect(screen.getByText('ದಿ ಗ್ರೀನ್ ಬೌಲ್')).toBeInTheDocument()
    expect(screen.getAllByText('ಹೈದರಾಬಾದ್, ತೆಲಂಗಾಣ').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('ಬೆಂಗಳೂರು, ಕರ್ನಾಟಕ')).toBeInTheDocument()
    expect(screen.getAllByText('ಪರಿಶೀಲಿಸಲಾಗಿದೆ').length).toBeGreaterThanOrEqual(1)
  })

  it('11. displays Marathi restaurant names, cities, and status', async () => {
    localStorage.setItem('foodguard.language', 'mr')
    const user = userEvent.setup()
    renderWithProviders(<RestaurantSearchSelect onChange={vi.fn()} />)

    const input = screen.getByRole('combobox')
    await user.click(input)

    expect(screen.getByText('स्पाइस गार्डन 02')).toBeInTheDocument()
    expect(screen.getByText('द ग्रीन बाऊल')).toBeInTheDocument()
    expect(screen.getAllByText('हैदराबाद, तेलंगणा').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('बंगळुरू, कर्नाटक')).toBeInTheDocument()
    expect(screen.getAllByText('सत्यापित').length).toBeGreaterThanOrEqual(1)
  })

  it('12. preserves canonical English names and locations in English mode', async () => {
    localStorage.setItem('foodguard.language', 'en')
    const user = userEvent.setup()
    renderWithProviders(<RestaurantSearchSelect onChange={vi.fn()} />)

    const input = screen.getByRole('combobox')
    await user.click(input)

    expect(screen.getByText('spice garden02')).toBeInTheDocument()
    expect(screen.getByText('The Green Bowl')).toBeInTheDocument()
    expect(screen.getAllByText('Hyderabad, Telangana').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Bengaluru, Karnataka')).toBeInTheDocument()
    expect(screen.getAllByText('Verified').length).toBeGreaterThanOrEqual(1)
  })

  it('13. searches with both canonical English name and localized display name', async () => {
    localStorage.setItem('foodguard.language', 'te')
    const user = userEvent.setup()
    renderWithProviders(<RestaurantSearchSelect onChange={vi.fn()} />)

    const input = screen.getByRole('combobox')

    // 1. Search using canonical English name
    await user.type(input, 'spice garden02')
    expect(screen.getByText('స్పైస్ గార్డెన్ 02')).toBeInTheDocument()
    expect(screen.queryByText('ది గ్రీన్ బౌల్')).not.toBeInTheDocument()

    // Clear search
    await user.clear(input)

    // 2. Search using Telugu script
    await user.type(input, 'స్పైస్')
    expect(screen.getByText('స్పైస్ గార్డెన్ 02')).toBeInTheDocument()
    expect(screen.queryByText('ది గ్రీన్ బౌల్')).not.toBeInTheDocument()

    // Clear search
    await user.clear(input)

    // 3. Search by localized city
    await user.type(input, 'బెంగళూరు')
    expect(screen.getByText('ది గ్రీన్ బౌల్')).toBeInTheDocument()
    expect(screen.queryByText('స్పైస్ గార్డెన్ 02')).not.toBeInTheDocument()
  })

  it('14. renders localized restaurant details in the selected state view', () => {
    localStorage.setItem('foodguard.language', 'te')
    renderWithProviders(<RestaurantSearchSelect value="3" onChange={vi.fn()} />)

    expect(screen.getByText('స్పైస్ గార్డెన్ 02')).toBeInTheDocument()
    expect(screen.getByText(/హైదరాబాద్, తెలంగాణ/)).toBeInTheDocument()
    expect(screen.getByText('ధృవీకరించబడింది')).toBeInTheDocument()
    expect(screen.getByText('మార్చండి')).toBeInTheDocument()
  })

  it('15. immediately updates already-rendered restaurant options when language switches', async () => {
    localStorage.setItem('foodguard.language', 'en')
    const user = userEvent.setup()

    function DynamicSwitcher() {
      const { setLanguage } = useLanguage()
      return (
        <div>
          <button onClick={() => setLanguage('te')}>switch-to-te</button>
          <button onClick={() => setLanguage('hi')}>switch-to-hi</button>
          <RestaurantSearchSelect onChange={vi.fn()} />
        </div>
      )
    }

    renderWithProviders(<DynamicSwitcher />)

    const input = screen.getByRole('combobox')
    await user.click(input)

    // Initially in English
    expect(screen.getByText('The Green Bowl')).toBeInTheDocument()
    expect(screen.getByText('spice garden02')).toBeInTheDocument()

    // Switch to Telugu dynamically
    await user.click(screen.getByRole('button', { name: 'switch-to-te' }))
    await user.click(input)
    expect(screen.getByText('ది గ్రీన్ బౌల్')).toBeInTheDocument()
    expect(screen.getByText('స్పైస్ గార్డెన్ 02')).toBeInTheDocument()
    expect(screen.getByText('బెంగళూరు, కర్ణాటక')).toBeInTheDocument()

    // Switch to Hindi dynamically
    await user.click(screen.getByRole('button', { name: 'switch-to-hi' }))
    await user.click(input)
    expect(screen.getByText('द ग्रीन बाउल')).toBeInTheDocument()
    expect(screen.getByText('स्पाइस गार्डन 02')).toBeInTheDocument()
    expect(screen.getByText('बेंगलुरु, कर्नाटक')).toBeInTheDocument()
  })
})

