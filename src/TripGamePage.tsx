import { useCallback, useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { supabase } from './lib/supabase'

type Role = 'traveler' | 'organizer' | 'admin'
type GameRoom = {
  id: string
  trip_id: string
  prompt: string
  status: 'open' | 'completed'
  trip: { title: string; destination: string } | null
}
type GameResponse = {
  id: string
  room_id: string
  body: string
  moderation_status: 'visible' | 'hidden'
  created_at: string
}
type GameReport = {
  id: string
  response_id: string
  reason: string
  status: 'open' | 'resolved' | 'dismissed'
  created_at: string
  reviewed_at: string | null
}
type GameRoomView = {
  room: GameRoom | null
  responses: GameResponse[]
  reports: GameReport[]
  myResponseId: string | null
  error: string
}

function formatTimestamp(value: string) {
  return new Intl.DateTimeFormat('id-ID', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value))
}

async function fetchGameRoomView(roomId: string, canModerate: boolean): Promise<GameRoomView> {
  const [roomResult, responseResult, myResponseResult] = await Promise.all([
    supabase.from('trip_game_rooms')
      .select('id,trip_id,prompt,status,trip:trips(title,destination)')
      .eq('id', roomId)
      .single(),
    supabase.from('trip_game_responses')
      .select('id,room_id,body,moderation_status,created_at')
      .eq('room_id', roomId)
      .order('created_at', { ascending: true }),
    supabase.rpc('trip_game_my_response_id', { p_room_id: roomId }),
  ])

  if (roomResult.error || responseResult.error || myResponseResult.error) {
    return {
      room: null,
      responses: [],
      reports: [],
      myResponseId: null,
      error: 'Ruang tidak dapat dimuat. Pastikan Anda memiliki booking confirmed atau akses organizer untuk trip ini.',
    }
  }

  let reports: GameReport[] = []
  let error = ''
  if (canModerate) {
    const { data, error: reportError } = await supabase.from('trip_game_reports')
      .select('id,response_id,reason,status,created_at,reviewed_at')
      .order('created_at', { ascending: false })
    if (reportError) error = 'Laporan moderasi tidak dapat dimuat.'
    else reports = (data ?? []) as GameReport[]
  }

  return {
    room: roomResult.data as unknown as GameRoom,
    responses: (responseResult.data ?? []) as GameResponse[],
    reports,
    myResponseId: myResponseResult.data ?? null,
    error,
  }
}

export default function TripGamePage({ roomId, role, onBack }: {
  roomId: string
  role: Role
  onBack: () => void
}) {
  const [room, setRoom] = useState<GameRoom | null>(null)
  const [responses, setResponses] = useState<GameResponse[]>([])
  const [reports, setReports] = useState<GameReport[]>([])
  const [myResponseId, setMyResponseId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [reportingResponseId, setReportingResponseId] = useState<string | null>(null)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const canModerate = role === 'organizer' || role === 'admin'

  const applyRoomView = useCallback((view: GameRoomView) => {
    setError(view.error)
    setRoom(view.room)
    setResponses(view.responses)
    setReports(view.reports)
    setMyResponseId(view.myResponseId)
  }, [])

  const loadRoom = useCallback(async () => {
    setLoading(true)
    setError('')
    const view = await fetchGameRoomView(roomId, canModerate)
    applyRoomView(view)
    setLoading(false)
  }, [applyRoomView, canModerate, roomId])

  useEffect(() => {
    let active = true
    const loadInitialRoom = async () => {
      const view = await fetchGameRoomView(roomId, canModerate)
      if (!active) return
      applyRoomView(view)
      setLoading(false)
    }
    void loadInitialRoom()
    return () => { active = false }
  }, [applyRoomView, canModerate, roomId])

  async function submitResponse(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!room || room.status !== 'open') return
    const body = String(new FormData(event.currentTarget).get('body') ?? '').trim()
    if (body.length < 1 || body.length > 500) {
      setError('Jawaban harus berisi 1–500 karakter.')
      return
    }
    setBusy(true)
    setError('')
    const { error: submitError } = await supabase.rpc('submit_trip_game_response', {
      p_room_id: room.id,
      p_body: body,
    })
    setBusy(false)
    if (submitError) {
      setError(submitError.message.includes('duplicate key')
        ? 'Kamu sudah mengirim jawaban untuk prompt ini.'
        : 'Jawaban belum dapat dikirim. Pastikan booking trip sudah confirmed dan ruang masih terbuka.')
      return
    }
    setNotice('Jawaban terkirim secara anonim.')
    await loadRoom()
  }

  async function submitReport(event: FormEvent<HTMLFormElement>, responseId: string) {
    event.preventDefault()
    const reason = String(new FormData(event.currentTarget).get('reason') ?? '').trim()
    if (reason.length < 5 || reason.length > 400) {
      setError('Jelaskan laporan dalam 5–400 karakter.')
      return
    }
    setBusy(true)
    setError('')
    const { error: reportError } = await supabase.rpc('report_trip_game_response', {
      p_response_id: responseId,
      p_reason: reason,
    })
    setBusy(false)
    if (reportError) {
      setError(reportError.message.includes('duplicate key')
        ? 'Kamu sudah melaporkan jawaban ini.'
        : 'Laporan tidak dapat dikirim. Kamu hanya dapat melaporkan jawaban peserta lain yang masih terlihat.')
      return
    }
    setReportingResponseId(null)
    setNotice('Laporan dikirim ke organizer untuk ditinjau.')
    await loadRoom()
  }

  async function setResponseVisibility(response: GameResponse, moderationStatus: GameResponse['moderation_status']) {
    setBusy(true)
    setError('')
    const { error: updateError } = await supabase.from('trip_game_responses')
      .update({ moderation_status: moderationStatus })
      .eq('id', response.id)
    setBusy(false)
    if (updateError) setError('Status jawaban tidak dapat diperbarui.')
    else {
      setNotice(moderationStatus === 'hidden' ? 'Jawaban disembunyikan dari peserta.' : 'Jawaban ditampilkan kembali.')
      await loadRoom()
    }
  }

  async function reviewReport(report: GameReport, status: 'resolved' | 'dismissed') {
    setBusy(true)
    setError('')
    const { error: updateError } = await supabase.from('trip_game_reports')
      .update({ status })
      .eq('id', report.id)
    setBusy(false)
    if (updateError) setError('Status laporan tidak dapat diperbarui.')
    else {
      setNotice(status === 'resolved' ? 'Laporan ditandai selesai.' : 'Laporan ditandai tidak perlu tindakan.')
      await loadRoom()
    }
  }

  async function completeRoom() {
    if (!room) return
    setBusy(true)
    setError('')
    const { error: updateError } = await supabase.from('trip_game_rooms')
      .update({ status: 'completed' })
      .eq('id', room.id)
    setBusy(false)
    if (updateError) setError('Ruang tidak dapat diselesaikan.')
    else {
      setNotice('Sesi selesai. Peserta masih dapat membaca jawaban yang terlihat.')
      await loadRoom()
    }
  }

  const responseById = new Map(responses.map(response => [response.id, response]))

  return <main className="content profile-page trip-game-page">
    <button className="text-button back-link" onClick={onBack}>← Kembali</button>
    {loading ? <div className="empty-state">Memuat ruang…</div> : error && !room ? <div className="empty-state" role="alert">{error}</div> : room ? <>
      <span className="eyebrow">RUANG CERITA ANONIM</span>
      <div className="game-heading"><div><h1>{room.trip?.title ?? 'Trip'}</h1><p>{room.trip?.destination ?? ''}</p></div><span className={`status-pill ${room.status === 'completed' ? 'status-expired' : 'status-published'}`}>{room.status === 'open' ? 'terbuka' : 'selesai'}</span></div>
      <section className="panel game-prompt"><span className="eyebrow">PROMPT DARI ORGANIZER</span><h2>{room.prompt}</h2><p>Jawaban dibagikan tanpa nama. Jangan menulis informasi pribadi atau konten yang menyakiti peserta lain.</p></section>
      {error && <p className="game-feedback game-error" role="alert">{error}</p>}
      {notice && <p className="game-feedback" role="status">{notice}</p>}

      {myResponseId && !responseById.has(myResponseId) && <p className="game-feedback">Jawabanmu sedang disembunyikan moderator.</p>}
      {!myResponseId && room.status === 'open' && <form className="panel game-response-form" onSubmit={submitResponse}>
        <label htmlFor="game-response">JAWABAN ANONIM</label>
        <textarea id="game-response" name="body" minLength={1} maxLength={500} rows={4} required placeholder="Tulis satu jawaban singkat…" />
        <div className="game-form-footer"><small>Maksimal 500 karakter. Jawaban tidak dapat diubah setelah dikirim.</small><button className="primary-button" type="submit" disabled={busy}>{busy ? 'Mengirim…' : 'Kirim jawaban'}</button></div>
      </form>}
      {room.status === 'completed' && <p className="game-feedback">Sesi ini sudah ditutup dan tidak menerima jawaban baru.</p>}

      <section className="game-responses"><div className="game-section-heading"><div><span className="eyebrow">PAPAN CERITA</span><h2>{responses.length} jawaban</h2></div>{canModerate && room.status === 'open' && <button className="outline-button" disabled={busy} onClick={() => void completeRoom()}>Tutup sesi</button>}</div>
        {responses.length ? <div className="game-response-list">{responses.map((response, index) => <article className={`panel game-response ${response.moderation_status === 'hidden' ? 'game-response-hidden' : ''}`} key={response.id}>
          <div className="game-response-meta"><span>{myResponseId === response.id ? 'Jawabanmu · anonim' : `Cerita ${index + 1} · anonim`}</span><time dateTime={response.created_at}>{formatTimestamp(response.created_at)}</time></div>
          <p>{response.body}</p>
          {response.moderation_status === 'hidden' && <span className="game-hidden-label">Disembunyikan dari peserta</span>}
          <div className="game-response-actions">
            {myResponseId !== response.id && response.moderation_status === 'visible' && room.status === 'open' && <button className="text-button" disabled={busy} onClick={() => setReportingResponseId(reportingResponseId === response.id ? null : response.id)}>Laporkan</button>}
            {canModerate && <button className="text-button" disabled={busy} onClick={() => void setResponseVisibility(response, response.moderation_status === 'visible' ? 'hidden' : 'visible')}>{response.moderation_status === 'visible' ? 'Sembunyikan' : 'Tampilkan kembali'}</button>}
          </div>
          {reportingResponseId === response.id && <form className="game-report-form" onSubmit={event => void submitReport(event, response.id)}><label htmlFor={`report-${response.id}`}>ALASAN LAPORAN</label><textarea id={`report-${response.id}`} name="reason" minLength={5} maxLength={400} rows={3} required placeholder="Jelaskan apa yang perlu ditinjau…" /><button className="outline-button" type="submit" disabled={busy}>{busy ? 'Mengirim…' : 'Kirim laporan'}</button></form>}
        </article>)}</div> : <div className="empty-state">Belum ada jawaban. Jadilah yang pertama berbagi cerita.</div>}
      </section>

      {canModerate && <section className="game-reports"><span className="eyebrow">MODERASI</span><h2>Laporan peserta</h2>{reports.length ? <div className="game-response-list">{reports.map(report => <article className="panel game-report" key={report.id}><div className="game-response-meta"><span>{report.status === 'open' ? 'Perlu ditinjau' : report.status === 'resolved' ? 'Selesai' : 'Tidak perlu tindakan'}</span><time dateTime={report.created_at}>{formatTimestamp(report.created_at)}</time></div><p>{report.reason}</p><small>{responseById.get(report.response_id)?.body ?? 'Isi jawaban sudah tidak tersedia.'}</small>{report.status === 'open' && <div className="game-response-actions"><button className="outline-button" disabled={busy} onClick={() => void reviewReport(report, 'resolved')}>Tandai selesai</button><button className="text-button" disabled={busy} onClick={() => void reviewReport(report, 'dismissed')}>Tutup laporan</button></div>}</article>)}</div> : <div className="empty-state">Belum ada laporan.</div>}</section>}
    </> : null}
  </main>
}
