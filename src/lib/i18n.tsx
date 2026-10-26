import { createContext, useContext, useEffect, useState } from 'react'
import type { ReactNode } from 'react'

export type Language = 'id' | 'en'

const englishBase: Record<string, string> = {
  'Camply beranda': 'Camply home', 'Pilih bahasa': 'Choose language',
  traveler: 'Traveler', organizer: 'Organizer', admin: 'Admin',
  'Cari trip': 'Explore trips', 'Tentang': 'About', 'Kelola trip': 'Manage trips', 'Booking': 'Bookings',
  'Akun': 'Account', 'Keluar': 'Sign out', 'Masuk': 'Sign in', 'Mulai eksplorasi': 'Start exploring',
  'Memuat akun…': 'Loading account…', 'ID': 'Indonesian', 'EN': 'English',
  'MUSIM PANAS, CERITA BARU': 'SUMMER, NEW STORIES', 'Waktunya': 'It is time to', 'cari suasana.': 'find your kind of escape.',
  'Dari udara pegunungan sampai senja di pantai. Pilih perjalanan yang terasa seperti liburanmu.': 'From crisp mountain air to sunset by the sea. Find a trip that feels like your kind of getaway.',
  'Temukan suasananya': 'Find your escape', 'PILIH MOOD LIBURANMU': 'CHOOSE YOUR TRAVEL MOOD', 'Ke mana hati ingin pergi?': 'Where would you like to go?',
  'Lihat semua trip': 'See all trips', 'KURASI PERJALANAN': 'TRIPS, CURATED', 'Trip yang menunggumu': 'Trips waiting for you',
  'trip ditemukan': 'trips found', 'DESTINASI': 'DESTINATION', 'KATEGORI': 'CATEGORY', 'BERANGKAT SETELAH': 'DEPART AFTER',
  'MATA UANG': 'CURRENCY', 'Semua mata uang': 'All currencies', 'Semua suasana': 'All travel moods', 'HARGA MAKSIMAL': 'MAXIMUM PRICE',
  'Hapus filter': 'Clear filters', 'Mencari perjalanan untukmu…': 'Finding trips for you…', 'Coba lagi': 'Try again',
  'Belum ada trip yang cocok.': 'No matching trips yet.', 'Coba ubah filter, atau kembali lagi nanti.': 'Try changing the filters or check back later.',
  'RINGAN DIRANCANG, SERU DIJALANI': 'MADE FOR EASY, MEMORABLE TRIPS', 'Liburan punya banyak versi.': 'There are many ways to get away.',
  'Pilih trip yang pas, tahu detailnya dari awal, lalu pulang membawa cerita sendiri.': 'Find the right trip, know what to expect, and come home with a story of your own.',
  'Mulai dari suasana': 'Start with a feeling', 'Jelajahi alam, pantai, kota, budaya, atau petualangan lewat kategori trip.': 'Explore nature, beaches, cities, culture, and adventures by category.',
  'Rencana lebih jelas': 'Plan with clarity', 'Lihat tanggal, harga, kapasitas, dan sisa kursi sebelum memutuskan ikut.': 'Check dates, price, capacity, and remaining seats before you book.',
  'Cerita berlanjut': 'Keep the story going', 'Untuk trip yang memiliki ruang cerita, peserta dapat berbagi jawaban anonim setelah booking confirmed.': 'For trips with a story room, confirmed travelers can share anonymous responses.',
  'Cari perjalanan musim panas': 'Find your summer trip', 'Jalan-jalan yang punya cerita.': 'Trips that come with stories.',
  'Alam': 'Nature', 'Pantai': 'Beach', 'Kota': 'City', 'Budaya': 'Culture', 'Petualangan': 'Adventure', 'Lainnya': 'Other',
  'Hutan, air terjun, dan udara segar.': 'Forests, waterfalls, and fresh air.', 'Langit luas, pasir hangat, dan ombak.': 'Open skies, warm sand, and waves.',
  'Sudut baru, jalan kaki, dan kuliner lokal.': 'New corners, city walks, and local food.', 'Ruang untuk mengenal tradisi dan cerita lokal.': 'A chance to discover local traditions and stories.',
  'Jalur baru, langkah panjang, cerita seru.': 'New trails, long walks, and great stories.', 'Temukan perjalanan dengan caramu sendiri.': 'Find a trip that feels right for you.',
  'trip': 'trips', 'Foto': 'Photo', 'orang': 'person', 'Lihat trip': 'View trip', 'Kembali ke semua trip': 'Back to all trips',
  'TRIP PILIHAN CAMPly': 'CAMPLY FEATURED TRIP', 'TENTANG PERJALANAN': 'ABOUT THIS TRIP', 'Petualangan dimulai di sini.': 'Your adventure starts here.',
  'Informasi perjalanan akan segera ditambahkan oleh organizer.': 'Trip details will be added by the organizer soon.', 'HARGA PER ORANG': 'PRICE PER PERSON',
  'Memeriksa akses booking…': 'Checking booking access…', 'Memeriksa kursi…': 'Checking seats…', 'kursi tersisa': 'seats remaining',
  'JUMLAH PESERTA': 'NUMBER OF TRAVELERS', 'Durasi': 'Duration', 'hari': 'days', 'Total': 'Total', 'Menahan kursi…': 'Holding seats…',
  'Trip penuh': 'Trip full', 'Tahan kursi 15 menit': 'Hold seats for 15 minutes', 'Kursi ditahan 15 menit. Pembayaran tersedia sebagai simulasi mock.': 'Seats are held for 15 minutes. Payment is simulated for this demo.',
  'Booking dan pembayaran trip hanya tersedia untuk akun traveler.': 'Only traveler accounts can book and pay for trips.',
  'PERJALANAN ANDA': 'YOUR TRIPS', 'Booking saya': 'My bookings', 'Trip detail tidak tersedia': 'Trip details unavailable',
  'PEMBAYARAN SIMULASI · MOCK': 'SIMULATED PAYMENT · MOCK', 'Buka ruang': 'Open story room', 'Lihat cerita': 'View stories',
  'Bayar simulasi': 'Simulate payment', 'Bayar sebelum': 'Pay before', 'Batalkan reservasi': 'Cancel reservation',
  'Belum ada booking.': 'No bookings yet.', 'Temukan perjalanan yang menarik untukmu.': 'Find a trip that excites you.', 'Jelajahi trip': 'Explore trips',
  'Ruang tidak dapat dimuat. Pastikan Anda memiliki booking confirmed atau akses organizer untuk trip ini.': 'Could not load the room. Make sure you have a confirmed booking or organizer access to this trip.',
  'Laporan moderasi tidak dapat dimuat.': 'Could not load moderation reports.', 'Hanya traveler yang dapat mengirim jawaban.': 'Only travelers can submit responses.',
  'Jawaban harus berisi 1–500 karakter.': 'Responses must be 1–500 characters.', 'Kamu sudah mengirim jawaban untuk prompt ini.': 'You already responded to this prompt.',
  'Jawaban belum dapat dikirim. Pastikan booking trip sudah confirmed dan ruang masih terbuka.': 'Could not submit your response. Make sure your booking is confirmed and the room is still open.',
  'Jawaban terkirim secara anonim.': 'Your response was submitted anonymously.', 'Hanya traveler yang dapat melaporkan jawaban.': 'Only travelers can report responses.',
  'Jelaskan laporan dalam 5–400 karakter.': 'Describe the report in 5–400 characters.', 'Kamu sudah melaporkan jawaban ini.': 'You already reported this response.',
  'Laporan tidak dapat dikirim. Kamu hanya dapat melaporkan jawaban peserta lain yang masih terlihat.': 'Could not submit the report. You can only report another participant’s visible response.',
  'Laporan dikirim ke organizer untuk ditinjau.': 'The report was sent to the organizer for review.', 'Status jawaban tidak dapat diperbarui.': 'Could not update response status.',
  'Jawaban disembunyikan dari peserta.': 'The response is hidden from participants.', 'Jawaban ditampilkan kembali.': 'The response is visible again.',
  'Status laporan tidak dapat diperbarui.': 'Could not update report status.', 'Laporan ditandai selesai.': 'Report marked as resolved.',
  'Laporan ditandai tidak perlu tindakan.': 'Report dismissed.', 'Ruang tidak dapat diselesaikan.': 'Could not close the room.',
  'Sesi selesai. Peserta masih dapat membaca jawaban yang terlihat.': 'The session is closed. Participants can still read visible responses.',
  'Kembali': 'Back', 'Memuat ruang…': 'Loading room…', 'RUANG CERITA ANONIM': 'ANONYMOUS STORY ROOM', 'terbuka': 'open', 'selesai': 'completed',
  'PROMPT DARI ORGANIZER': 'PROMPT FROM THE ORGANIZER', 'Jawaban dibagikan tanpa nama. Jangan menulis informasi pribadi atau konten yang menyakiti peserta lain.': 'Responses are anonymous. Do not share personal information or content that could harm other participants.',
  'Jawabanmu sedang disembunyikan moderator.': 'Your response is currently hidden by a moderator.', 'Hanya traveler dengan booking confirmed yang dapat mengirim jawaban.': 'Only travelers with a confirmed booking can submit a response.',
  'JAWABAN ANONIM': 'ANONYMOUS RESPONSE', 'Tulis satu jawaban singkat…': 'Write a short response…', 'Maksimal 500 karakter. Jawaban tidak dapat diubah setelah dikirim.': 'Up to 500 characters. Responses cannot be edited after submission.',
  'Mengirim…': 'Sending…', 'Kirim jawaban': 'Submit response', 'Sesi ini sudah ditutup dan tidak menerima jawaban baru.': 'This session is closed and no longer accepts responses.',
  'PAPAN CERITA': 'STORY BOARD', 'jawaban': 'responses', 'Tutup sesi': 'Close session', 'Jawabanmu · anonim': 'Your response · anonymous',
  'Cerita': 'Story', 'Disembunyikan dari peserta': 'Hidden from participants', 'Laporkan': 'Report', 'Sembunyikan': 'Hide', 'Tampilkan kembali': 'Show again',
  'ALASAN LAPORAN': 'REPORT REASON', 'Jelaskan apa yang perlu ditinjau…': 'Explain what should be reviewed…', 'Kirim laporan': 'Submit report',
  'Belum ada jawaban. Jadilah yang pertama berbagi cerita.': 'No responses yet. Be the first to share a story.', 'MODERASI': 'MODERATION', 'Laporan peserta': 'Participant reports',
  'Belum ada booking untuk trip Anda.': 'No bookings for your trips yet.',
  'Perlu ditinjau': 'Needs review', 'Tidak perlu tindakan': 'No action needed', 'Tandai selesai': 'Mark resolved', 'Tutup laporan': 'Dismiss report', 'Belum ada laporan.': 'No reports yet.',
  'SELAMAT DATANG DI CAMPLY': 'WELCOME TO CAMPLY', 'Senang bertemu lagi.': 'Welcome back.', 'Perjalananmu dimulai di sini.': 'Your next trip starts here.',
  'Masuk untuk melihat akun dan booking-mu.': 'Sign in to view your account and bookings.', 'Pilih cara kamu berpartisipasi di Camply.': 'Choose how you want to use Camply.',
  'Nama tampilan': 'Display name', 'DAFTAR SEBAGAI': 'SIGN UP AS', 'Traveler — cari dan booking trip': 'Traveler — discover and book trips',
  'Organizer — buat dan kelola trip': 'Organizer — create and manage trips', 'Pilihan ini berlaku saat akun dibuat. Role Admin hanya dapat diberikan oleh pemilik proyek.': 'This choice is set when you create your account. Only the project owner can grant the Admin role.',
  'Kata sandi': 'Password', 'Buat akun': 'Create account', 'Belum punya akun?': 'Don’t have an account?', 'Sudah punya akun?': 'Already have an account?', 'Daftar': 'Sign up',
  'DEMO · MOCK PAYMENT': 'DEMO · MOCK PAYMENT', 'Selesaikan booking': 'Complete booking', 'Ini simulasi untuk portfolio. Tidak ada uang yang ditagih atau dikirim ke penyedia pembayaran.': 'This is a portfolio demo. No money is charged or sent to a payment provider.',
  'peserta': 'travelers', 'Memproses simulasi…': 'Processing simulation…', 'Konfirmasi pembayaran simulasi': 'Confirm simulated payment',
  'Tutup': 'Close', 'Kembali ke beranda': 'Back to home', 'Tutup notifikasi': 'Dismiss notification',
  'RUANG ORGANIZER': 'ORGANIZER SPACE', 'Buat draft untuk meninjau detailnya, atau terbitkan agar langsung terlihat di halaman Jelajahi.': 'Save a draft to review the details, or publish it to make it visible to travelers.',
  'Buat trip baru': 'Create a trip', 'Edit trip': 'Edit trip', 'JUDUL TRIP': 'TRIP TITLE', 'SLUG URL': 'URL SLUG', 'Huruf kecil, angka, dan tanda hubung. Harus unik.': 'Lowercase letters, numbers, and hyphens. Must be unique.',
  'KATEGORI TRIP': 'TRIP CATEGORY', 'DESKRIPSI': 'DESCRIPTION', 'MULAI': 'STARTS', 'SELESAI': 'ENDS', 'KAPASITAS': 'CAPACITY',
  'UPLOAD SAMPUL (OPSIONAL)': 'COVER IMAGE (OPTIONAL)', 'JPG, PNG, atau WebP · maks. 8 MB.': 'JPG, PNG, or WebP · max 8 MB.', 'Batal edit': 'Cancel editing', 'Simpan draft': 'Save draft',
  'Menyimpan…': 'Saving…', 'Terbitkan trip': 'Publish trip', 'Trip harus memiliki jadwal mulai di masa depan dan kapasitas lebih dari nol.': 'The trip must start in the future and have a capacity greater than zero.',
  'Trip aktif & draft': 'Active trips & drafts', 'Memuat trip…': 'Loading trips…', 'Belum ada trip aktif.': 'No active trips yet.', 'Trip yang Anda buat akan muncul di sini.': 'Trips you create will appear here.',
  'Arsip trip': 'Trip archive', 'Trip yang tanggal mulainya sudah lewat disimpan di sini dan tidak lagi ditawarkan untuk booking.': 'Trips that have started are archived here and are no longer available for booking.',
  'Ruang cerita anonim': 'Anonymous story rooms', 'Buka satu prompt untuk peserta dengan booking confirmed. Jawaban tampil anonim dan dapat dimoderasi dari ruang tersebut.': 'Create a prompt for travelers with confirmed bookings. Responses are anonymous and can be moderated in the room.',
  'Pilih trip terbit': 'Choose a published trip', 'PROMPT UNTUK PESERTA': 'PROMPT FOR TRAVELERS', 'Apa cerita kecil yang ingin kamu bawa pulang?': 'What small story would you like to take home?',
  'Membuat ruang…': 'Creating room…', 'Buat ruang cerita': 'Create story room', 'Belum ada ruang cerita untuk trip Anda.': 'You have no story rooms yet.', 'Kelola ruang': 'Manage room',
  'Booking peserta di trip saya': 'Bookings for my trips', 'Lihat semua booking →': 'View all bookings →', 'Belum dibayar': 'Not paid', 'arsip': 'archived',
  'OPERASIONAL ORGANIZER': 'ORGANIZER OPERATIONS', 'Booking peserta': 'Traveler bookings', 'Kembali ke kelola trip': 'Back to trip management', 'AKUN ANDA': 'YOUR ACCOUNT',
  'Profil traveler': 'Traveler profile', 'Profil organizer': 'Organizer profile', 'Profil admin': 'Admin profile', 'Memuat profil…': 'Loading profile…', 'Bio': 'Bio',
  'Ceritakan sedikit tentang diri Anda': 'Tell us a little about yourself', 'Simpan perubahan': 'Save changes', 'Profil belum tersedia. Coba keluar lalu masuk kembali.': 'Profile unavailable. Try signing out and back in.',
  'ADMINISTRASI CAMPLY': 'CAMPLY ADMINISTRATION', 'Ringkasan operasional': 'Operations overview', 'PEMBAYARAN TERCATAT': 'PAYMENTS RECORDED', 'Batalkan trip': 'Cancel trip',
  'Booking dan pembayaran': 'Bookings and payments', 'Belum ada trip.': 'No trips yet.', 'Trip belum dapat dimuat. Periksa koneksi dan migrasi Supabase.': 'Trips could not be loaded. Check your connection and Supabase migrations.',
  'Detail trip gagal dimuat. Periksa koneksi dan akses trip publik.': 'Trip details could not be loaded. Check your connection and public trip access.',
  'Sisa kursi belum dapat diperiksa. Booking tetap akan divalidasi saat dikirim.': 'Remaining seats could not be checked. Availability will still be validated when you book.',
  'Profil gagal dimuat.': 'Profile could not be loaded.', 'Role akun gagal diperiksa.': 'Could not verify account role.', 'Sesi gagal diperiksa. Silakan muat ulang halaman.': 'Could not verify session. Please reload the page.',
  'Booking gagal dimuat. Periksa apakah migrasi database sudah diterapkan.': 'Bookings could not be loaded. Check whether database migrations have been applied.',
  'Trip yang Anda kelola gagal dimuat. Periksa migrasi Supabase.': 'Your trips could not be loaded. Check Supabase migrations.', 'Peserta trip gagal dimuat.': 'Trip participants could not be loaded.',
  'Ruang cerita gagal dimuat. Pastikan migration P4 sudah diterapkan.': 'Story rooms could not be loaded. Make sure the P4 migration has been applied.',
  'Data operasional admin gagal dimuat.': 'Admin operations data could not be loaded.', 'Kata sandi minimal 8 karakter.': 'Password must be at least 8 characters.',
  'Akun dibuat. Periksa email untuk menyelesaikan konfirmasi sebelum masuk.': 'Account created. Check your email to confirm before signing in.', 'Akun berhasil dibuat.': 'Account created successfully.', 'Berhasil masuk.': 'Signed in successfully.',
  'Gagal keluar. Coba lagi.': 'Could not sign out. Please try again.', 'Anda telah keluar.': 'You have signed out.', 'Nama wajib diisi (maksimal 80 karakter), bio maksimal 500 karakter.': 'Name is required (up to 80 characters); bio must be at most 500 characters.',
  'Profil gagal disimpan. Periksa migrasi dan koneksi Supabase.': 'Profile could not be saved. Check Supabase migrations and connection.', 'Profil tersimpan.': 'Profile saved.',
  'Hanya organizer yang dapat membuat trip. Hubungi admin untuk meminta akses organizer.': 'Only organizers can create trips. Contact an admin to request organizer access.',
  'Periksa kembali data trip. Tanggal mulai harus di masa depan dan tanggal selesai setelah tanggal mulai.': 'Check the trip details. The start date must be in the future and the end date must be later.',
  'Sampul harus berupa JPG, PNG, atau WebP dengan ukuran maksimal 8 MB.': 'Cover must be JPG, PNG, or WebP and no larger than 8 MB.', 'Upload sampul gagal. Coba lagi.': 'Cover upload failed. Please try again.',
  'Slug sudah digunakan. Pilih slug lain yang unik.': 'That slug is already taken. Choose a unique one.', 'Trip gagal disimpan. Pastikan migrasi terbaru sudah diterapkan dan data valid.': 'Trip could not be saved. Make sure the latest migrations are applied and the details are valid.',
  'Perubahan trip berhasil disimpan.': 'Trip changes saved.', 'Trip berhasil diterbitkan dan tampil di daftar trip.': 'Trip published and listed.', 'Draft trip berhasil disimpan.': 'Trip draft saved.',
  'Trip gagal diterbitkan. Periksa tanggal, kapasitas, dan kebijakan akses.': 'Trip could not be published. Check its dates, capacity, and access policy.',
  'Booking hanya tersedia untuk akun traveler.': 'Booking is only available to traveler accounts.', 'Trip sudah penuh. Kurangi jumlah peserta dan coba lagi.': 'The trip is full. Reduce the number of travelers and try again.',
  'Booking gagal dibuat. Trip mungkin sudah tidak tersedia atau migrasi database belum diterapkan.': 'Booking could not be created. The trip may be unavailable or database migrations may be missing.',
  'Kursi ditahan selama 15 menit. Selesaikan pembayaran simulasi dari halaman Booking.': 'Seats are held for 15 minutes. Complete the simulated payment from Bookings.',
  'Pengelolaan booking hanya tersedia untuk akun traveler.': 'Only traveler accounts can manage bookings.', 'Booking tidak dapat dibatalkan. Mungkin masa penahanan sudah berakhir.': 'Booking could not be cancelled. The hold may have expired.',
  'Booking pending dibatalkan dan kursinya dilepas.': 'Pending booking cancelled and seats released.', 'Pembayaran hanya tersedia untuk akun traveler.': 'Only traveler accounts can make payments.',
  'Booking tidak dapat dibayar. Buat booking baru jika ingin melanjutkan.': 'This booking cannot be paid. Create a new booking to continue.', 'Pembayaran simulasi berhasil. Tidak ada uang yang diproses.': 'Simulated payment complete. No money was processed.',
  'Akun traveler belum memiliki akses organizer.': 'This traveler account does not have organizer access.', 'Hanya organizer trip atau admin yang dapat membuka ruang cerita.': 'Only the trip organizer or an admin can open a story room.',
  'Pilih trip terbit dan tulis prompt sepanjang 10–500 karakter.': 'Choose a published trip and write a prompt between 10 and 500 characters.', 'Slug ruang cerita untuk trip ini sudah ada.': 'A story room already exists for this trip.',
  'Ruang cerita gagal dibuat. Pastikan migrasi database sudah diterapkan.': 'Story room could not be created. Make sure database migrations have been applied.', 'Ruang cerita dibuat. Peserta dengan booking confirmed dapat mengaksesnya.': 'Story room created. Travelers with confirmed bookings can access it.',
  'Halaman ini hanya tersedia untuk admin.': 'This page is only available to admins.', 'Trip gagal dibatalkan.': 'Trip could not be cancelled.', 'Trip dibatalkan.': 'Trip cancelled.',
}

const englishExtras: Record<string, string> = {
  'Trip penuh': 'Trip full', 'Trip': 'Trip', 'TRIP': 'TRIP', 'BOOKING': 'BOOKING', 'Profil': 'Profile', 'Admin': 'Admin',
  'Terbitkan': 'Publish', 'Terbitkan trip': 'Publish trip', 'kapasitas': 'capacity', 'Contoh: Lombok': 'e.g. Lombok', 'Pilih mata uang': 'Choose a currency',
  'Contoh: Jelajah Kawah Ijen': 'e.g. Explore Mount Ijen', 'Jelajah Kawah Ijen': 'Explore Mount Ijen', 'jelajah-kawah-ijen': 'explore-mount-ijen',
  'Banyuwangi, Jawa Timur': 'Banyuwangi, East Java', 'Jadwal, perlengkapan, dan gambaran perjalanan': 'Schedule, gear, and trip overview',
  'Sampul saat ini:': 'Current cover:', 'Simpan draft': 'Save draft', 'Trip aktif & draft': 'Active trips & drafts',
  'Buka satu prompt untuk peserta dengan booking confirmed. Jawaban tampil anonim dan dapat dimoderasi dari ruang tersebut.': 'Create a prompt for confirmed travelers. Responses are anonymous and can be moderated in the room.',
  'Apa cerita kecil yang ingin kamu bawa pulang?': 'What small story would you like to take home?', 'Lihat semua booking →': 'View all bookings →',
  'Booking peserta di trip saya': 'Bookings for my trips', 'Pembayaran': 'Payment', 'Belum dibayar': 'Not paid', 'peserta': 'travelers', 'orang': 'person',
  'Kembali ke semua trip': 'Back to all trips', 'Informasi perjalanan akan segera ditambahkan oleh organizer.': 'Trip details will be added by the organizer soon.',
  'published': 'Published', 'draft': 'Draft', 'cancelled': 'Cancelled', 'pending payment': 'Pending payment', 'confirmed': 'Confirmed', 'expired': 'Expired',
  'open': 'Open', 'completed': 'Completed', 'visible': 'Visible', 'hidden': 'Hidden', 'resolved': 'Resolved', 'dismissed': 'Dismissed', 'paid': 'Paid', 'failed': 'Failed',
  'Selesaikan booking': 'Complete booking', 'Ini simulasi untuk portfolio. Tidak ada uang yang ditagih atau dikirim ke penyedia pembayaran.': 'This is a portfolio demo. No money is charged or sent to a payment provider.',
  'Isi jawaban sudah tidak tersedia.': 'Response is no longer available.', 'Jawaban dibagikan tanpa nama. Jangan menulis informasi pribadi atau konten yang menyakiti peserta lain.': 'Responses are anonymous. Do not share personal information or content that could harm other participants.',
  'Tulis satu jawaban singkat…': 'Write a short response…', 'Maksimal 500 karakter. Jawaban tidak dapat diubah setelah dikirim.': 'Up to 500 characters. Responses cannot be edited after submission.',
  'Jelaskan apa yang perlu ditinjau…': 'Explain what should be reviewed…', 'anonim': 'anonymous', 'jawaban': 'responses',
  'Jalan-jalan yang punya cerita.': 'Trips that come with stories.', 'Foto kategori: Unsplash · Made for the curious · Indonesia': 'Category photos: Unsplash · Made for the curious · Indonesia',
  'Pilih bahasa': 'Choose language', 'Camply beranda': 'Camply home', 'Role akun gagal diperiksa.': 'Could not verify account role.',
  'Jumlah peserta': 'Number of travelers', 'Mata uang': 'Currency', 'Pilih kategori': 'Choose a category', 'Traveler': 'Traveler', 'Organizer': 'Organizer',
  'Daftar': 'Sign up', 'Bio': 'Bio', 'Trip detail tidak tersedia': 'Trip details unavailable',
  'Kursi sebanyak itu sudah tidak tersedia. Pilih jumlah lain atau coba trip lain.': 'That many seats are no longer available. Choose another quantity or try a different trip.',
  'Kamu sudah memiliki booking aktif untuk trip ini.': 'You already have an active booking for this trip.',
  'Masa penahanan kursi berakhir atau booking sudah tidak dapat dibayar.': 'The seat hold expired or this booking can no longer be paid.',
  'Pembayaran simulasi gagal. Periksa booking dan coba lagi.': 'Simulated payment failed. Check the booking and try again.',
  'Trip ini sudah memiliki ruang cerita.': 'This trip already has a story room.',
  'Ruang cerita tidak dapat dibuat. Pastikan trip sudah terbit dan Anda pemilik trip.': 'Could not create the story room. Make sure the trip is published and you own it.',
  'INDONESIA · SUMMER ESCAPES': 'INDONESIA · SUMMER GETAWAYS',
}

const english: Record<string, string> = { ...englishBase, ...englishExtras }

type LanguageContextValue = { language: Language; setLanguage: (language: Language) => void; t: (text: string) => string }
const LanguageContext = createContext<LanguageContextValue | null>(null)

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<Language>(() => {
    try { return localStorage.getItem('camply-language') === 'en' ? 'en' : 'id' } catch { return 'id' }
  })
  const setLanguage = (value: Language) => {
    setLanguageState(value)
    try { localStorage.setItem('camply-language', value) } catch { /* Storage is optional. */ }
  }
  useEffect(() => { document.documentElement.lang = language }, [language])
  const t = (text: string) => language === 'en' ? english[text] ?? text : text
  return <LanguageContext.Provider value={{ language, setLanguage, t }}>{children}</LanguageContext.Provider>
}

// The shared context hook intentionally lives alongside its provider.
// eslint-disable-next-line react-refresh/only-export-components
export function useLanguage() {
  const context = useContext(LanguageContext)
  if (!context) throw new Error('useLanguage must be used inside LanguageProvider')
  return context
}
