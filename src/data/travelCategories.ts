export const travelCategories = [
  {
    id: 'nature',
    name: 'Alam',
    description: 'Hutan, air terjun, dan udara segar.',
    imageUrl: 'https://images.unsplash.com/photo-1725183514517-079893b5ab50?auto=format&fit=crop&w=1000&q=85',
    imageAlt: 'Aliran air di tengah hutan hijau di Jawa Barat',
  },
  {
    id: 'beach',
    name: 'Pantai',
    description: 'Langit luas, pasir hangat, dan ombak.',
    imageUrl: 'https://images.unsplash.com/photo-1737397888875-064c8de62618?auto=format&fit=crop&w=1000&q=85',
    imageAlt: 'Traveler berjalan di pantai Bali saat air surut',
  },
  {
    id: 'city',
    name: 'Kota',
    description: 'Sudut baru, jalan kaki, dan kuliner lokal.',
    imageUrl: 'https://images.unsplash.com/photo-1750611395240-41fcfe673a83?auto=format&fit=crop&w=1000&q=85',
    imageAlt: 'Pemandangan jalan dan gedung di Jakarta',
  },
  {
    id: 'culture',
    name: 'Budaya',
    description: 'Ruang untuk mengenal tradisi dan cerita lokal.',
    imageUrl: 'https://images.unsplash.com/photo-1717148665537-50fce0476b7a?auto=format&fit=crop&w=1000&q=85',
    imageAlt: 'Jalan setapak menuju pura di Bali',
  },
  {
    id: 'adventure',
    name: 'Petualangan',
    description: 'Jalur baru, langkah panjang, cerita seru.',
    imageUrl: 'https://images.unsplash.com/photo-1691883765490-ee1c4defd952?auto=format&fit=crop&w=1000&q=85',
    imageAlt: 'Pendaki menyusuri padang rumput di Gunung Merbabu',
  },
  {
    id: 'other',
    name: 'Lainnya',
    description: 'Temukan perjalanan dengan caramu sendiri.',
    imageUrl: 'https://images.unsplash.com/photo-1737397888875-064c8de62618?auto=format&fit=crop&w=1000&q=85',
    imageAlt: 'Suasana pantai tropis di Bali',
  },
] as const

export type TravelCategory = (typeof travelCategories)[number]['id']

export const summerHeroImage = {
  url: 'https://images.unsplash.com/photo-1781204515883-9f6863f32c58?auto=format&fit=crop&w=2200&q=90',
  alt: 'Seorang peselancar berjalan di pantai berpasir saat matahari terbenam',
} as const
