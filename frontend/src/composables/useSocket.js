import { io } from "socket.io-client"

// Singleton Socket.IO client for Frappe's realtime bus on :9000.
// Mirrors the connection shape used by Frappe Desk: same hostname,
// socketio_port, withCredentials so the session cookie travels.
let _socket = null

export function useSocket() {
  if (_socket) return _socket

  try {
    const host = window.location.hostname
    const siteName = window.sitename || host
    const socketioPort = window.socketio_port || 9000
    // dev with bench start exposes the http port; prod hides it behind a proxy.
    const portSuffix = window.location.port ? `:${socketioPort}` : ""
    const protocol = portSuffix ? "http" : "https"
    const url = `${protocol}://${host}${portSuffix}/${siteName}`
    _socket = io(url, { withCredentials: true })
  } catch (e) {
    console.warn("[useSocket] init failed:", e)
    _socket = null
  }
  return _socket
}
