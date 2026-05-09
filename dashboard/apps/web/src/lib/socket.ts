import { io, Socket } from "socket.io-client"

const SOCKET_URL = "http://localhost:3000"

export const socket: Socket = io(SOCKET_URL, {
  autoConnect: false,
})

socket.on("connect", () => {
  console.log("[Socket.io] Connected:", socket.id)
})

socket.on("disconnect", () => {
  console.log("[Socket.io] Disconnected")
})

socket.on("connect_error", (err) => {
  console.error("[Socket.io] Connection error:", err.message)
})
