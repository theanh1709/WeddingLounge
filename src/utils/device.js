export const getDeviceKind = () => {
  if (typeof navigator === 'undefined') {
    return 'desktop'
  }

  const uaData = navigator.userAgentData
  if (uaData) {
    if (uaData.mobile) {
      return 'mobile'
    }
    const platform = (uaData.platform || '').toLowerCase()
    if (platform.includes('android')) {
      return 'tablet'
    }
  }

  const ua = navigator.userAgent || ''
  const platform = navigator.platform || ''
  const isIpad =
    /iPad/i.test(ua) ||
    (platform === 'MacIntel' && navigator.maxTouchPoints > 1)

  if (isIpad) {
    return 'tablet'
  }

  const isAndroid = /Android/i.test(ua)
  const isAndroidMobile = isAndroid && /Mobile/i.test(ua)
  if (isAndroid && !isAndroidMobile) {
    return 'tablet'
  }

  const isTablet = /Tablet|PlayBook|Silk|Kindle/i.test(ua)
  if (isTablet) {
    return 'tablet'
  }

  const isMobile = /Mobi|iPhone|iPod|IEMobile|BlackBerry|Opera Mini/i.test(ua)
  if (isMobile || isAndroidMobile) {
    return 'mobile'
  }

  return 'desktop'
}

export const isHandheldDevice = () => {
  const kind = getDeviceKind()
  return kind === 'mobile' || kind === 'tablet'
}
