export type ConversationRole = 'assistant' | 'user'

export type ChatMessage = {
  id: string
  role: ConversationRole
  content: string
  timestamp: string
}

export type TravelProfile = {
  departureCity: string
  destinationCity: string
  destinationIntent: string
  dateRange: string
  travelers: string
  budgetLevel: string
  travelStyle: string[]
  accommodationPreference: string
  transportPreference: string
  visaStatus: string
  notes: string
}

export type RequiredField =
  | 'departureCity'
  | 'destinationCity'
  | 'dateRange'
  | 'travelers'
  | 'budgetLevel'

export type DestinationRecommendation = {
  id: string
  city: string
  planningCity?: string
  country: string
  score: number
  bestWindow: string
  highlights: string[]
  reasons: string[]
  matchReason: string
  coverImage: string
  weatherSummary: string
  mapCenter: [number, number]
}

export type DaySpot = {
  time: string
  name: string
  address?: string
  type: '景点' | '餐饮' | '交通' | '酒店'
  note: string
  imageUrl?: string
  lat?: number
  lng?: number
  cost?: number
}

export type DayPlan = {
  day: number
  title: string
  routeSummary: string
  spots: DaySpot[]
}

export type BudgetBreakdown = {
  total: number
  flight: number
  hotel: number
  food: number
  transportation: number
  tickets: number
  insurance: number
  flexible: number
}

export type PriceMonitorItem = {
  id: string
  category: '机票' | '酒店'
  target: string
  currentPrice: number
  expectedPrice: number
  trend: number[]
  status: '观察中' | '接近低价' | '建议立即预订'
  enabled: boolean
}

export type LivePricingQuery = {
  originCity: string
  originCode: string
  destinationCity: string
  destinationCode: string
  departureDate: string
  returnDate: string
  checkInDate: string
  checkOutDate: string
  adults: number
  roomQuantity: number
  tripDays: number
  approximateDates: boolean
  querySummary: string
}

export type FlightSegment = {
  carrierCode: string
  flightNumber: string
  departureIata: string
  arrivalIata: string
  departureAt: string
  arrivalAt: string
  duration: string
}

export type FlightOffer = {
  id: string
  source?: string
  airlineCodes: string[]
  validatingAirlineCodes: string[]
  totalPrice: number
  currency: string
  bookableSeats?: number
  lastTicketingDate?: string
  itineraries: FlightSegment[][]
}

export type TrainOffer = {
  id: string
  source: string
  trainNumber: string
  departureStation: string
  arrivalStation: string
  departureAt: string
  arrivalAt: string
  duration: string
  seatType: string
  availability: string
  totalPrice: number
  currency: string
  notes?: string
}

export type HotelOffer = {
  id: string
  hotelId: string
  hotelName: string
  cityCode: string
  address: string
  latitude?: number
  longitude?: number
  roomType: string
  boardType: string
  refundable: boolean
  cancellationDeadline?: string
  totalPrice: number
  currency: string
  source: string
}

export type LivePricingResult = {
  provider: 'amadeus' | 'booking' | 'mixed'
  configured: boolean
  query: LivePricingQuery
  flights: FlightOffer[]
  hotels: HotelOffer[]
  trains: TrainOffer[]
  warnings: string[]
  fetchedAt: string
}

export type SpotRecommendation = {
  title: string
  area: string
  bestTime: string
  duration: string
  reservation: string
  why: string
  nearbyFood: string
  fallback: string
  imageUrl?: string
  imageCredit?: string
}

export type HotelVisualOption = {
  name: string
  area: string
  priceHint: string
  reason: string
  imageUrl: string
  imageCredit?: string
}

export type BookingComparisonOption = {
  id: string
  label: string
  departDate: string
  returnDate: string
  hotelNights: number
  flightTotal: number
  trainTotal: number
  hotelTotal: number
  totalByFlight: number
  totalByTrain: number
  recommendation: string
  bookingTips: string[]
}

export type BookingComparison = {
  title: string
  baseline: string
  cheapestOptionId: string
  recommendedOptionId: string
  summary: string
  insights: string[]
  options: BookingComparisonOption[]
  hotelOptions?: HotelVisualOption[]
}

export type ContingencyPlan = {
  trigger: string
  strategy: string
  nextPlan: string
  tradeoff: string
}

export type PolicyCard = {
  title: string
  summary: string
  level: '重要' | '建议' | '提醒'
}

export type PackingGroup = {
  title: string
  items: string[]
}

export type OutfitSuggestion = {
  title: string
  mood: string
  pieces: string[]
  imageUrl?: string
  gender?: '女' | '男'
  scenario?: string
  keywords?: string[]
  interpretation?: string
}

export type InsuranceRecommendation = {
  title: string
  focus: string
  suitableFor: string
  tips: string[]
}

export type TravelPlan = {
  source?: 'generated' | 'local-preset'
  localOnly?: boolean
  recommendations: DestinationRecommendation[]
  selectedRecommendation: DestinationRecommendation
  dayPlans: DayPlan[]
  budget: BudgetBreakdown
  policyCards: PolicyCard[]
  monitors: PriceMonitorItem[]
  packingGroups: PackingGroup[]
  outfitSuggestions: OutfitSuggestion[]
  insuranceRecommendations: InsuranceRecommendation[]
  notes: string[]
  livePricing?: LivePricingResult | null
  spotRecommendations?: SpotRecommendation[]
  bookingComparison?: BookingComparison
  contingencyPlans?: ContingencyPlan[]
}

export type ConversationTurnResult = {
  profile: TravelProfile
  assistantMessage: string
  missingFields: RequiredField[]
  shouldGeneratePlan: boolean
  summary: string
}

export const createEmptyProfile = (): TravelProfile => ({
  departureCity: '',
  destinationCity: '',
  destinationIntent: '',
  dateRange: '',
  travelers: '',
  budgetLevel: '',
  travelStyle: [],
  accommodationPreference: '',
  transportPreference: '',
  visaStatus: '',
  notes: '',
})
