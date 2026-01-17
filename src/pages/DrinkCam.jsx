import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { defaultDrinks } from '../data/drinks'
import { SUPABASE_CONFIG_ERROR } from '../services/supabaseClient'
import {
  createSignalChannel,
  removeSignalChannel,
  sendSignal,
} from '../services/webrtcSignal'

const STUN_SERVERS = [{ urls: 'stun:stun.l.google.com:19302' }]
const ACCESS_KEY = import.meta.env.VITE_DRINK_CAM_KEY || ''
const VIEWER_OVERLAY_MEDIA = '/media/drink-cam-cover.png'

const getStatusLabel = (state) => {
  switch (state) {
    case 'idle':
      return 'Chưa kết nối'
    case 'listening':
      return 'Đang chờ iPhone'
    case 'connecting':
      return 'Đang kết nối'
    case 'streaming':
      return 'Đang phát'
    case 'stopped':
      return 'Đã dừng'
    default:
      return 'Không xác định'
  }
}

export default function DrinkCam({
  mode,
  routeParams,
  drinkItems,
  setDrinkItems,
}) {
  const initialCode = routeParams.get('code') || ''
  const accessParam = routeParams.get('access') || ''
  const [accessInput, setAccessInput] = useState(accessParam)
  const [accessGranted, setAccessGranted] = useState(() => {
    if (!ACCESS_KEY) {
      return true
    }
    if (accessParam && accessParam === ACCESS_KEY) {
      return true
    }
    if (typeof window === 'undefined') {
      return false
    }
    return window.localStorage.getItem('drink-cam-access') === ACCESS_KEY
  })
  const [code, setCode] = useState(initialCode)
  const [codeInput, setCodeInput] = useState(initialCode)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState('')
  const [isRunning, setIsRunning] = useState(false)
  const [connectionNote, setConnectionNote] = useState('')

  const [current, setCurrent] = useState('')
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(drinkItems?.join('\n') || '')
  const [zoom, setZoom] = useState(1)
  const [zoomRange, setZoomRange] = useState(null)
  const [viewerAspect, setViewerAspect] = useState('2 / 1')
  const [viewerFit, setViewerFit] = useState('cover')
  const [copyStatus, setCopyStatus] = useState('')
  const [viewerMaxHeight, setViewerMaxHeight] = useState('')

  const videoRef = useRef(null)
  const channelRef = useRef(null)
  const channelReadyRef = useRef(null)
  const channelReadyStateRef = useRef(false)
  const peerRef = useRef(null)
  const localStreamRef = useRef(null)
  const videoTrackRef = useRef(null)
  const pendingCandidatesRef = useRef([])
  const pageRef = useRef(null)
  const pageHeaderRef = useRef(null)
  const layoutRef = useRef(null)
  const panelRef = useRef(null)

  useEffect(() => {
    setCode(initialCode)
    setCodeInput(initialCode)
  }, [initialCode])

  useEffect(() => {
    if (!ACCESS_KEY) {
      setAccessGranted(true)
      return
    }
    if (accessParam) {
      setAccessInput(accessParam)
      if (accessParam === ACCESS_KEY) {
        if (typeof window !== 'undefined') {
          window.localStorage.setItem('drink-cam-access', ACCESS_KEY)
        }
        setAccessGranted(true)
        return
      }
    }
    if (typeof window !== 'undefined') {
      const stored = window.localStorage.getItem('drink-cam-access')
      setAccessGranted(stored === ACCESS_KEY)
    }
  }, [accessParam])

  useEffect(() => {
    if (drinkItems) {
      setDraft(drinkItems.join('\n'))
    }
  }, [drinkItems])

  useEffect(() => {
    if (mode !== 'camera' || !isRunning) {
      return
    }
    const stream = localStreamRef.current
    if (videoRef.current && stream) {
      if (videoRef.current.srcObject !== stream) {
        videoRef.current.srcObject = stream
      }
      videoRef.current.muted = true
      const playPromise = videoRef.current.play()
      if (playPromise && typeof playPromise.catch === 'function') {
        playPromise.catch(() => {})
      }
    }
  }, [mode, isRunning])

  useEffect(() => {
    if (mode !== 'camera') {
      return
    }
    if (!zoomRange) {
      return
    }
    const track = videoTrackRef.current
    if (!track || !track.applyConstraints) {
      return
    }
    track.applyConstraints({ advanced: [{ zoom }] }).catch(() => {})
  }, [mode, zoom, zoomRange])

  useEffect(() => {
    if (mode !== 'viewer') {
      return
    }
    if (typeof window === 'undefined') {
      return
    }
    const pageEl = pageRef.current
    const pageHeaderEl = pageHeaderRef.current
    const layoutEl = layoutRef.current
    const panelEl = panelRef.current
    const headerEl = document.querySelector('.topbar')
    const mainEl = document.querySelector('.main.viewer-main')

    const readGap = (element) => {
      if (!element) {
        return 0
      }
      const styles = window.getComputedStyle(element)
      const gapValue = styles.rowGap || styles.gap || '0'
      const gap = parseFloat(gapValue)
      return Number.isFinite(gap) ? gap : 0
    }

    const update = () => {
      const headerHeight = headerEl ? headerEl.getBoundingClientRect().height : 0
      const pageHeaderHeight = pageHeaderEl
        ? pageHeaderEl.getBoundingClientRect().height
        : 0
      const panelHeight = panelEl ? panelEl.getBoundingClientRect().height : 0
      const pageGap = readGap(pageEl)
      const layoutGap = readGap(layoutEl)
      const mainStyles = mainEl ? window.getComputedStyle(mainEl) : null
      const mainPaddingTop = mainStyles ? parseFloat(mainStyles.paddingTop) : 0
      const mainPaddingBottom = mainStyles
        ? parseFloat(mainStyles.paddingBottom)
        : 0
      const available =
        window.innerHeight -
        headerHeight -
        mainPaddingTop -
        mainPaddingBottom -
        pageHeaderHeight -
        panelHeight -
        pageGap -
        layoutGap
      const desired = window.innerHeight - 140
      const next = Math.max(160, Math.floor(Math.max(available, desired)))
      setViewerMaxHeight(`${next}px`)
    }

    update()
    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', update)
      return () => {
        window.removeEventListener('resize', update)
      }
    }
    const observer = new ResizeObserver(update)
    const observed = [
      headerEl,
      pageHeaderEl,
      panelEl,
      pageEl,
      layoutEl,
      mainEl,
    ]
    observed.forEach((element) => {
      if (element) {
        observer.observe(element)
      }
    })
    window.addEventListener('resize', update)
    return () => {
      observer.disconnect()
      window.removeEventListener('resize', update)
    }
  }, [mode])

  const roleLabel = mode === 'camera' ? 'Camera' : 'Viewer'

  const canUseDrinkCam = !ACCESS_KEY || accessGranted
  const maskValue = (value) => {
    if (!value) {
      return '----'
    }
    return '•'.repeat(Math.max(4, value.length))
  }

  const viewerAspectRatio = (() => {
    const parts = viewerAspect.split('/').map((value) => Number(value.trim()))
    if (parts.length === 2 && Number.isFinite(parts[0]) && Number.isFinite(parts[1]) && parts[1] !== 0) {
      return parts[0] / parts[1]
    }
    return 9 / 16
  })()

  const maskedCode = maskValue(code)
  const pageClassName = mode === 'viewer' ? 'page viewer-page' : 'page'
  const layoutClassName = mode === 'viewer' ? 'drink-layout viewer-mode' : 'drink-layout'
  const viewerFrameStyle = mode === 'viewer'
    ? {
      '--camera-aspect': viewerAspect,
      '--camera-fit': viewerFit,
      '--viewer-aspect-ratio': viewerAspectRatio,
      ...(VIEWER_OVERLAY_MEDIA
        ? { '--camera-overlay-media': `url('${VIEWER_OVERLAY_MEDIA}')` }
        : {}),
      ...(viewerMaxHeight ? { '--viewer-available-height': viewerMaxHeight } : {}),
    }
    : undefined
  const cameraFrameStyle = mode !== 'viewer'
    ? { '--camera-aspect': '4 / 3', '--camera-fit': 'cover' }
    : undefined


  const viewerLink = useMemo(() => {
    if (!code) {
      return ''
    }
    return `${window.location.origin}/#/drink-cam/viewer?code=${encodeURIComponent(
      code,
    )}`
  }, [code])

  const cameraLink = useMemo(() => {
    if (!code) {
      return ''
    }
    return `${window.location.origin}/#/drink-cam/camera?code=${encodeURIComponent(
      code,
    )}`
  }, [code])

  const closePeer = useCallback(() => {
    if (peerRef.current) {
      peerRef.current.ontrack = null
      peerRef.current.onicecandidate = null
      peerRef.current.onconnectionstatechange = null
      peerRef.current.close()
      peerRef.current = null
    }
  }, [])

  const stopLocalStream = useCallback(() => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((track) => track.stop())
      localStreamRef.current = null
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null
    }
  }, [])

  const flushPendingCandidates = useCallback(async (peer) => {
    const pending = pendingCandidatesRef.current
    if (!pending.length) {
      return
    }
    pendingCandidatesRef.current = []
    for (const candidate of pending) {
      try {
        await peer.addIceCandidate(candidate)
      } catch {
        // Ignore invalid ICE candidate
      }
    }
  }, [])

  const stopConnection = useCallback(
    async (shouldSignal = true) => {
      if (shouldSignal && channelRef.current) {
        await sendSignal(channelRef.current, { type: 'stop', role: mode })
      }
      closePeer()
      stopLocalStream()
      pendingCandidatesRef.current = []
      videoTrackRef.current = null
      setZoomRange(null)
      setZoom(1)
      if (channelRef.current) {
        removeSignalChannel(channelRef.current)
        channelRef.current = null
      }
      channelReadyRef.current = null
      channelReadyStateRef.current = false
      setIsRunning(false)
      setStatus('stopped')
    },
    [closePeer, stopLocalStream, mode],
  )

  useEffect(() => {
    return () => {
      stopConnection(false)
    }
  }, [stopConnection])

  const broadcastSignal = useCallback(
    async (payload) => {
      if (!channelRef.current || !channelReadyStateRef.current) {
        return
      }
      await sendSignal(channelRef.current, { ...payload, role: mode })
    },
    [mode],
  )

  const waitForChannel = useCallback(async () => {
    if (!channelReadyRef.current) {
      return true
    }
    try {
      await channelReadyRef.current
      channelReadyStateRef.current = true
      return true
    } catch {
      setError('Không thể kết nối kênh tín hiệu. Vui lòng thử lại.')
      return false
    }
  }, [])

  const createPeerConnection = useCallback(() => {
    pendingCandidatesRef.current = []
    const peer = new RTCPeerConnection({ iceServers: STUN_SERVERS })
    peer.onicecandidate = (event) => {
      if (event.candidate) {
        broadcastSignal({ type: 'ice', candidate: event.candidate })
      }
    }
    peer.onconnectionstatechange = () => {
      if (peer.connectionState === 'connected') {
        setStatus('streaming')
      } else if (peer.connectionState === 'connecting') {
        setStatus('connecting')
      } else if (
        peer.connectionState === 'failed' ||
        peer.connectionState === 'disconnected'
      ) {
        setConnectionNote('Kết nối bị gián đoạn. Hãy thử Start lại.')
      }
    }
    if (mode === 'viewer') {
      peer.ontrack = (event) => {
        if (videoRef.current) {
          const [stream] = event.streams
          videoRef.current.srcObject = stream
        }
        setStatus('streaming')
      }
    }
    peerRef.current = peer
    return peer
  }, [broadcastSignal, mode])

  const handleSignal = useCallback(
    async (payload) => {
      if (!payload || payload.role === mode) {
        return
      }
      channelReadyStateRef.current = true
      if (payload.type === 'offer' && mode === 'viewer') {
        setConnectionNote('')
        closePeer()
        const peer = createPeerConnection()
        await peer.setRemoteDescription({
          type: 'offer',
          sdp: payload.sdp,
        })
        await flushPendingCandidates(peer)
        const answer = await peer.createAnswer()
        await peer.setLocalDescription(answer)
        await broadcastSignal({ type: 'answer', sdp: answer.sdp })
        setStatus('connecting')
        return
      }
      if (payload.type === 'answer' && mode === 'camera') {
        if (!peerRef.current) {
          return
        }
        await peerRef.current.setRemoteDescription({
          type: 'answer',
          sdp: payload.sdp,
        })
        await flushPendingCandidates(peerRef.current)
        setStatus('streaming')
        return
      }
      if (payload.type === 'ice') {
        if (!peerRef.current) {
          return
        }
        if (!peerRef.current.remoteDescription) {
          if (payload.candidate) {
            pendingCandidatesRef.current.push(payload.candidate)
          }
          return
        }
        if (payload.candidate) {
          try {
            await peerRef.current.addIceCandidate(payload.candidate)
          } catch {
            // Ignore invalid ICE candidate
          }
        }
        return
      }
      if (payload.type === 'stop') {
        await stopConnection(false)
      }
    },
    [
      mode,
      closePeer,
      createPeerConnection,
      broadcastSignal,
      stopConnection,
      flushPendingCandidates,
    ],
  )

  const ensureChannel = useCallback(() => {
    if (channelRef.current) {
      return true
    }
    const { channel, error: channelError, ready } = createSignalChannel(
      code,
      handleSignal,
      (channelStatus) => {
        if (channelStatus === 'SUBSCRIBED') {
          channelReadyStateRef.current = true
          setConnectionNote('')
          if (mode === 'viewer') {
            setStatus('listening')
          }
        }
      },
    )
    if (channelError) {
      setError(
        channelError.code === SUPABASE_CONFIG_ERROR
          ? 'Thiếu cấu hình Supabase. Vui lòng kiểm tra file .env.'
          : 'Không thể kết nối Realtime.',
      )
      return false
    }
    channelRef.current = channel
    channelReadyRef.current = ready
    channelReadyStateRef.current = false
    return true
  }, [code, handleSignal, mode])

  const startViewer = async () => {
    setError('')
    if (ACCESS_KEY && !accessGranted) {
      setError('Nhập khóa truy cập để sử dụng Drink Cam.')
      return
    }
    if (!code) {
      setError('Vui lòng nhập mã phòng.')
      return
    }
    if (!ensureChannel()) {
      return
    }
    const ready = await waitForChannel()
    if (!ready) {
      return
    }
    setIsRunning(true)
    setStatus('listening')
  }

  const startCamera = async () => {
    setError('')
    setConnectionNote('')
    if (ACCESS_KEY && !accessGranted) {
      setError('Nhập khóa truy cập để sử dụng Drink Cam.')
      return
    }
    if (!code) {
      setError('Vui lòng nhập mã phòng.')
      return
    }
    if (!ensureChannel()) {
      return
    }
    const ready = await waitForChannel()
    if (!ready) {
      return
    }
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Trình duyệt chưa hỗ trợ camera.')
      return
    }
    try {
      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920, max: 1920 },
            height: { ideal: 1080, max: 1080 },
            frameRate: { ideal: 30, max: 30 },
          },
          audio: false,
        })
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          video: true,
          audio: false,
        })
      }
      localStreamRef.current = stream
      const [videoTrack] = stream.getVideoTracks()
      videoTrackRef.current = videoTrack || null
      if (videoTrack && videoTrack.getCapabilities) {
        const capabilities = videoTrack.getCapabilities()
        if (capabilities && capabilities.zoom) {
          const settings = videoTrack.getSettings ? videoTrack.getSettings() : {}
          const nextZoom = settings.zoom ?? capabilities.zoom.min ?? 1
          setZoomRange({
            min: capabilities.zoom.min ?? 1,
            max: capabilities.zoom.max ?? nextZoom,
            step: capabilities.zoom.step ?? 0.1,
          })
          setZoom(nextZoom)
        } else {
          setZoomRange(null)
          setZoom(1)
        }
      }
      if (videoRef.current) {
        videoRef.current.srcObject = stream
        videoRef.current.muted = true
      }
      closePeer()
      const peer = createPeerConnection()
      stream.getTracks().forEach((track) => peer.addTrack(track, stream))
      const offer = await peer.createOffer()
      await peer.setLocalDescription(offer)
      await broadcastSignal({ type: 'offer', sdp: offer.sdp })
      setIsRunning(true)
      setStatus('connecting')
    } catch {
      setError('Không thể mở camera. Vui lòng kiểm tra quyền truy cập.')
    }
  }

  const applyAccess = () => {
    if (!ACCESS_KEY) {
      setAccessGranted(true)
      return
    }
    const candidate = accessInput.trim()
    if (!candidate) {
      setError('Nhập khoa truy cập.')
      return
    }
    if (candidate === ACCESS_KEY) {
      if (typeof window !== 'undefined') {
        window.localStorage.setItem('drink-cam-access', ACCESS_KEY)
      }
      setAccessGranted(true)
      setError('')
      return
    }
    setError('Khóa truy cập không đúng.')
  }

  const copyLink = async (value, label) => {
    if (!value) {
      return
    }
    try {
      if (navigator?.clipboard?.writeText) {
        await navigator.clipboard.writeText(value)
      } else {
        const input = document.createElement('input')
        input.value = value
        document.body.appendChild(input)
        input.select()
        document.execCommand('copy')
        input.remove()
      }
      setCopyStatus(`${label} da copy.`)
    } catch {
      setCopyStatus('Khong the copy link.')
    }
    setTimeout(() => setCopyStatus(''), 2000)
  }

  const applyCode = () => {
    const next = codeInput.trim()
    if (!next) {
      setError('Vui lòng nhập mã phòng.')
      return
    }
    const path = mode === 'camera' ? 'drink-cam/camera' : 'drink-cam/viewer'
    window.location.hash = `${path}?code=${encodeURIComponent(next)}`
  }

  const randomDrink = () => {
    const choices = drinkItems?.length ? drinkItems : defaultDrinks
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

  const cameraContent = (
    <>
      {isRunning ? (
        <video
          className="camera-video"
          ref={videoRef}
          autoPlay
          playsInline
        />
      ) : (
        <div className="camera-cover">
          <div className="camera-decoration" />
          <div>
            <h3>Drink Cam</h3>
            <p>
              {mode === 'camera'
                ? 'Mở camera để phát trực tiếp lên màn hình admin.'
                : 'Đang chờ iPhone kết nối.'}
            </p>
            <button
              className="btn"
              onClick={mode === 'camera' ? startCamera : startViewer}
              disabled={!canUseDrinkCam}
            >
              Start
            </button>
          </div>
        </div>
      )}
    </>
  )

  return (
    <section className={pageClassName} ref={pageRef}>
      <div className="page-header" ref={pageHeaderRef}>
        <h2>Drink Cam - {roleLabel}</h2>
        <p>
          {mode === 'camera'
            ? 'Mở camera trên iPhone và bấm Start.'
            : 'Mở viewer trước để chờ kết nối.'}
        </p>
      </div>
      <div className={layoutClassName} ref={layoutRef}>
        {mode === 'viewer' ? (
          <div className="viewer-frame" style={viewerFrameStyle}>
            <div className="camera-frame">
              {cameraContent}
              {VIEWER_OVERLAY_MEDIA ? (
                <div className="camera-overlay" aria-hidden="true" />
              ) : null}
            </div>
          </div>
        ) : (
          <div className="camera-frame" style={cameraFrameStyle}>
            {cameraContent}
          </div>
        )}
        <div className="card drink-panel" ref={panelRef}>
          {mode === 'viewer' && (
            <div className="viewer-controls">
              <label className="field">
                <span>Tỷ lệ khung</span>
                <select
                  className="input"
                  value={viewerAspect}
                  onChange={(event) => setViewerAspect(event.target.value)}
                >
                  <option value="2 / 1">2:1</option>
                  <option value="16 / 9">16:9</option>
                  <option value="4 / 3">4:3</option>
                  <option value="1 / 1">1:1</option>
                  <option value="9 / 16">9:16</option>
                </select>
              </label>
              <label className="field">
                <span>Kiểu hiển thị</span>
                <select
                  className="input"
                  value={viewerFit}
                  onChange={(event) => setViewerFit(event.target.value)}
                >
                  <option value="cover">Cover</option>
                  <option value="contain">Contain</option>
                </select>
              </label>
            </div>
          )}
          {ACCESS_KEY && !accessGranted && (
            <div className="code-form">
              <span className="muted">Nhập khóa truy cập để mở Drink Cam.</span>
              <input
                className="input"
                type="password"
                value={accessInput}
                onChange={(event) => setAccessInput(event.target.value)}
                placeholder="Access key"
              />
              <button className="btn btn-secondary" onClick={applyAccess}>
                Mở khóa
              </button>
            </div>
          )}
          <div className="status-line">
            <span className="status-pill">{getStatusLabel(status)}</span>
            <span className="code-chip">Code: {maskedCode}</span>
          </div>
          {!code && (
            <div className="code-form">
              <input
                className="input"
                type="password"
                value={codeInput}
                onChange={(event) => setCodeInput(event.target.value)}
                placeholder="Nhập mã phòng (ví dụ: WEDDING)"
              />
              <button className="btn btn-secondary" onClick={applyCode}>
                Lưu mã
              </button>
            </div>
          )}
          {mode === 'viewer' && code && canUseDrinkCam && (
            <div className="code-links">
              <span className="muted">Link iPhone:</span>
              <button
                className="btn btn-outline"
                type="button"
                onClick={() => copyLink(cameraLink, 'Link iPhone')}
              >
                Copy link iPhone
              </button>
            </div>
          )}
          {mode === 'camera' && code && canUseDrinkCam && (
            <div className="code-links">
              <span className="muted">Link viewer:</span>
              <button
                className="btn btn-outline"
                type="button"
                onClick={() => copyLink(viewerLink, 'Link viewer')}
              >
                Copy link viewer
              </button>
            </div>
          )}
          {connectionNote && <p className="notice">{connectionNote}</p>}
          {error && <p className="notice">{error}</p>}
          {copyStatus && <p className="notice">{copyStatus}</p>}
          {mode === 'camera' && zoomRange && (
            <div className="zoom-control">
              <label className="field">
                <span>Zoom</span>
                <input
                  className="range"
                  type="range"
                  min={zoomRange.min}
                  max={zoomRange.max}
                  step={zoomRange.step}
                  value={zoom}
                  onChange={(event) => setZoom(Number(event.target.value))}
                />
              </label>
            </div>
          )}
          <div className="form-actions">
            <button
              className="btn"
              onClick={mode === 'camera' ? startCamera : startViewer}
              disabled={!canUseDrinkCam || isRunning}
            >
              {mode === 'camera' ? 'Start stream' : 'Start viewer'}
            </button>
            <button
              className="btn btn-secondary"
              onClick={() => stopConnection(true)}
              disabled={!isRunning}
            >
              Stop
            </button>
          </div>
        </div>
      </div>
    </section>
  )
}
