import { useEffect, useRef, useState } from 'react'
import { defaultDrinks } from '../data/drinks'
import {
  CAMERA_ERRORS,
  requestCameraStream,
  stopCameraStream,
} from '../services/camera'

export default function RandomDrink({ drinkItems, setDrinkItems }) {
  const [current, setCurrent] = useState('')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(drinkItems.join('\n'))
  const [error, setError] = useState('')
  const videoRef = useRef(null)
  const [stream, setStream] = useState(null)

  useEffect(() => {
    setDraft(drinkItems.join('\n'))
  }, [drinkItems])

  useEffect(() => {
    return () => {
      stopCameraStream(stream)
    }
  }, [stream])

  const startCamera = async () => {
    setError('')
    try {
      const mediaStream = await requestCameraStream(stream)
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (err) {
      if (err?.code === CAMERA_ERRORS.UNSUPPORTED) {
        setError('Trình duyệt chưa hỗ trợ camera.')
      } else {
        setError('Không thể mở camera. Vui lòng kiểm tra quyền truy cập.')
      }
    }
  }

  const stopCamera = () => {
    stopCameraStream(stream)
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
    setStream(null)
  }

  const randomDrink = () => {
    const choices = drinkItems.length ? drinkItems : defaultDrinks
    const next = choices[Math.floor(Math.random() * choices.length)]
    setCurrent(next)
  }

  const applyDrinks = () => {
    const nextItems = draft
      .split('\n')
      .map((item) => item.trim())
      .filter(Boolean)
    setDrinkItems(nextItems.length ? nextItems : defaultDrinks)
    setEditing(false)
  }

  return (
    <section className="page">
      <div className="page-header">
        <h2>Random drink + camera</h2>
        <p>
          Kết nối camera để tạo khoảnh khắc vui nhộn. Bấm random để chọn món uống
          bất ngờ cho khách.
        </p>
      </div>
      <div className="drink-layout">
        <div className="camera-frame">
          {stream ? (
            <video className="camera-video" ref={videoRef} autoPlay playsInline />
          ) : (
            <div className="camera-cover">
              <div className="camera-decoration" />
              <div>
                <h3>Random Drink</h3>
                <p>Chạm để mở camera và lưu lại khoảnh khắc đáng yêu.</p>
                <button className="btn" onClick={startCamera}>
                  Mở camera
                </button>
              </div>
            </div>
          )}
        </div>
        <div className="card drink-panel">
          <button className="btn" onClick={randomDrink}>
            Random món uống
          </button>
          <div className="drink-result">
            {current ? `Kết quả: ${current}` : 'Chưa có kết quả'}
          </div>
          <div className="form-actions">
            <button className="btn btn-outline" onClick={startCamera}>
              Bật camera
            </button>
            <button className="btn btn-secondary" onClick={stopCamera}>
              Tắt camera
            </button>
          </div>
          {error && <p className="notice">{error}</p>}
          <button
            className="btn btn-secondary"
            onClick={() => setEditing(!editing)}
          >
            {editing ? 'Đóng chỉnh sửa' : 'Chỉnh danh sách drink'}
          </button>
          {editing && (
            <div className="wheel-edit">
              <textarea
                className="textarea"
                value={draft}
                onChange={(event) => setDraft(event.target.value)}
              />
              <div className="form-actions">
                <button className="btn" onClick={applyDrinks}>
                  Lưu danh sách
                </button>
                <button
                  className="btn btn-outline"
                  onClick={() => setDraft(defaultDrinks.join('\n'))}
                >
                  Reset gợi ý
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
