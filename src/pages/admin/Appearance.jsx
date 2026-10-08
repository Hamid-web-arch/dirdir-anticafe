import { useEffect, useRef, useState } from 'react'
import { PiUploadSimpleBold, PiArrowCounterClockwiseBold, PiArrowSquareOutBold } from 'react-icons/pi'
import defaultImage from '../../assets/upper-hal.jpeg'
import { assetUrl } from '../../lib/api.js'
import { setSiteImagesCache } from '../../lib/site.js'
import { useAdminApi, card, Button, ErrorBox, Spinner } from './ui.jsx'

const MAX_UPLOAD = 10 * 1024 * 1024

const PLACES = [
  { key: 'login', title: 'Giriş səhifəsi', page: '/giris' },
  { key: 'register', title: 'Qeydiyyat səhifəsi', page: '/qeydiyyat' },
]

// Admin → Görünüş: saytdakı bəzi şəkilləri dəyişmək
export default function AdminAppearance() {
  const request = useAdminApi()
  const [images, setImages] = useState(null)
  const [error, setError] = useState(null)

  useEffect(() => {
    request('/admin/site-images')
      .then((d) => setImages(d.images))
      .catch(setError)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saved = (next) => {
    setImages(next)
    setSiteImagesCache(next) // sayt yeni şəkli dərhal göstərsin
  }

  if (!images) return error ? <ErrorBox error={error} /> : <Spinner />

  return (
    <div className="flex flex-col gap-4">
      <p className="text-inkdim">Giriş və qeydiyyat səhifələrinin sol tərəfindəki şəkil. Şəkil qoyulmasa, standart foto göstərilir.</p>
      <ErrorBox error={error} />
      <div className="grid md:grid-cols-2 gap-4">
        {PLACES.map((place) => (
          <ImageSlot key={place.key} place={place} url={images[place.key]} onSaved={saved} onError={setError} />
        ))}
      </div>
    </div>
  )
}

function ImageSlot({ place, url, onSaved, onError }) {
  const request = useAdminApi()
  const fileInput = useRef(null)
  const [busy, setBusy] = useState(false)

  const upload = async (file) => {
    if (!file) return
    onError(null)
    if (file.size > MAX_UPLOAD) return onError({ code: 'IMAGE_TOO_LARGE', message: 'Fayl çox böyükdür (ən çox 10 MB).' })
    setBusy(true)
    try {
      onSaved((await request(`/admin/site-images/${place.key}`, { method: 'PUT', body: file })).images)
    } catch (err) {
      onError(err)
    } finally {
      setBusy(false)
      fileInput.current.value = ''
    }
  }

  const reset = async () => {
    setBusy(true)
    try {
      onSaved((await request(`/admin/site-images/${place.key}`, { method: 'DELETE' })).images)
    } catch (err) {
      onError(err)
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className={`${card} flex flex-col gap-3`}>
      <div className="flex items-center justify-between gap-2">
        <h2 className="font-display font-bold text-[1.15rem]">{place.title}</h2>
        <a href={place.page} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-[0.82rem] font-bold text-primary hover:underline">
          Saytda bax <PiArrowSquareOutBold size={13} />
        </a>
      </div>
      <div className="relative aspect-[4/5] max-h-[360px] rounded-2xl overflow-hidden bg-night">
        <img src={url ? assetUrl(url) : defaultImage} alt="" className="absolute inset-0 w-full h-full object-cover" />
        <span className="absolute top-3 left-3 text-[0.72rem] font-bold uppercase px-2.5 py-1 rounded-full bg-card/90 text-ink">
          {url ? 'öz şəklin' : 'standart'}
        </span>
      </div>
      <input ref={fileInput} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files[0])} />
      <div className="flex flex-wrap gap-2">
        <Button variant="primary" loading={busy} onClick={() => fileInput.current.click()}>
          <PiUploadSimpleBold size={16} /> {url ? 'Şəkli əvəz et' : 'Şəkil yüklə'}
        </Button>
        {url && (
          <Button variant="ghost" disabled={busy} onClick={reset}>
            <PiArrowCounterClockwiseBold size={16} /> Standarta qaytar
          </Button>
        )}
      </div>
      <p className="text-[0.78rem] text-inkdim">Şaquli şəkil yaxşı görünür. 10 MB-a qədər, avtomatik kiçildilir.</p>
    </div>
  )
}
