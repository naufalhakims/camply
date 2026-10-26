export const travelCategories = [
  {
    id: 'nature',
    name: 'Alam',
    description: 'Hutan, air terjun, dan udara segar.',
    imageUrl: 'https://images.unsplash.com/photo-1725183514517-079893b5ab50?auto=format&fit=crop&w=1000&q=85',
    imageAlt: 'Aliran air di tengah hutan hijau di Jawa Barat',
    photographer: 'Walyudin',
    photoUrl: 'https://unsplash.com/photos/a-stream-running-through-a-lush-green-forest-Pgf1bvKH6Mw',
  },
  {
    id: 'beach',
    name: 'Pantai',
    description: 'Langit luas, pasir hangat, dan ombak.',
    imageUrl: 'https://images.unsplash.com/photo-1737397888875-064c8de62618?auto=format&fit=crop&w=1000&q=85',
    imageAlt: 'Traveler berjalan di pantai Bali saat air surut',
    photographer: 'Kristijan Arsov',
    photoUrl: 'https://unsplash.com/photos/a-person-standing-in-the-water-at-the-beach-S6-KD4OHDWE',
  },
  {
    id: 'city',
    name: 'Kota',
    description: 'Sudut baru, jalan kaki, dan kuliner lokal.',
    imageUrl: 'https://images.unsplash.com/photo-1750611395240-41fcfe673a83?auto=format&fit=crop&w=1000&q=85',
    imageAlt: 'Pemandangan jalan dan gedung di Jakarta',
    photographer: 'Iqro Rinaldi',
    photoUrl: 'https://unsplash.com/photos/view-of-a-city-skyline-with-traffic-visible-ZEjfXBi3G0c',
  },
  {
    id: 'culture',
    name: 'Budaya',
    description: 'Ruang untuk mengenal tradisi dan cerita lokal.',
    imageUrl: 'https://images.unsplash.com/photo-1717148665537-50fce0476b7a?auto=format&fit=crop&w=1000&q=85',
    imageAlt: 'Jalan setapak menuju pura di Bali',
    photographer: 'Jörg Bauer',
    photoUrl: 'https://unsplash.com/photos/a-walkway-leading-to-a-temple-surrounded-by-lush-green-trees-HH59QHK7_Gk',
  },
  {
    id: 'adventure',
    name: 'Petualangan',
    description: 'Jalur baru, langkah panjang, cerita seru.',
    imageUrl: 'https://images.unsplash.com/photo-1691883765490-ee1c4defd952?auto=format&fit=crop&w=1000&q=85',
    imageAlt: 'Pendaki menyusuri padang rumput di Gunung Merbabu',
    photographer: 'Yub 12',
    photoUrl: 'https://unsplash.com/photos/a-group-of-people-hiking-up-a-grassy-hill-Fb3dwD2Qjj0',
  },
  {
    id: 'other',
    name: 'Lainnya',
    description: 'Temukan perjalanan dengan caramu sendiri.',
    imageUrl: 'https://images.unsplash.com/photo-1737397888875-064c8de62618?auto=format&fit=crop&w=1000&q=85',
    imageAlt: 'Suasana pantai tropis di Bali',
    photographer: 'Kristijan Arsov',
    photoUrl: 'https://unsplash.com/photos/a-person-standing-in-the-water-at-the-beach-S6-KD4OHDWE',
  },
] as const

export type TravelCategory = (typeof travelCategories)[number]['id']

export const summerHeroImage = {
  url: 'https://images.unsplash.com/photo-1781204515883-9f6863f32c58?auto=format&fit=crop&w=2200&q=90',
  alt: 'Seorang peselancar berjalan di pantai berpasir saat matahari terbenam',
  photographer: 'Claudio Schwarz',
  photoUrl: 'https://unsplash.com/photos/a-surfer-walks-on-a-sandy-beach-at-sunset-pv-n00Z7x54',
} as const
