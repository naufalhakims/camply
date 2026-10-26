import type { TravelCategory } from './data/travelCategories'

export type Trip = {
  id: string
  organizer_id: string
  slug: string
  title: string
  description: string | null
  destination: string
  category: TravelCategory
  starts_at: string
  ends_at: string
  price: number
  currency: string
  capacity: number
  status: 'draft' | 'published' | 'cancelled'
  cover_image_url: string | null
  cover_image_public_id: string | null
}

export type Profile = {
  id: string
  display_name: string
  bio: string | null
  role: 'traveler' | 'organizer' | 'admin'
}

export type Booking = {
  id: string
  traveler_id: string
  traveler: Pick<Profile, 'display_name'> | null
  trip_id: string
  quantity: number
  total_amount: number
  currency: string
  status: 'pending_payment' | 'confirmed' | 'cancelled' | 'expired'
  expires_at: string
  created_at: string
  trip: Pick<Trip, 'title' | 'destination' | 'starts_at' | 'ends_at'> | null
  payment: { provider: string; status: string } | null
}

export type TripGameRoom = {
  id: string
  trip_id: string
  prompt: string
  status: 'open' | 'completed'
  trip: Pick<Trip, 'title' | 'destination'> | null
}

export type Filters = { destination: string; category: TravelCategory | ''; from: string; currency: string; maxPrice: string }
