export const CAMERA_ERRORS = {
  UNSUPPORTED: 'UNSUPPORTED',
}

export function stopCameraStream(stream) {
  if (!stream) {
    return
  }
  stream.getTracks().forEach((track) => track.stop())
}

export async function requestCameraStream(currentStream) {
  if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
    const error = new Error(CAMERA_ERRORS.UNSUPPORTED)
    error.code = CAMERA_ERRORS.UNSUPPORTED
    throw error
  }
  if (currentStream) {
    stopCameraStream(currentStream)
  }
  return navigator.mediaDevices.getUserMedia({
    video: true,
    audio: false,
  })
}
