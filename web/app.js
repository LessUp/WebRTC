const myId = Math.random().toString(36).slice(2,10)
const idEl = document.getElementById('myId')
idEl.textContent = myId

let ws
let pc
let localStream
let roomId
let remoteId

const servers = { iceServers: [{ urls: ['stun:stun.l.google.com:19302'] }] }

async function getMedia() {
  if (!localStream) {
    localStream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true })
    document.getElementById('local').srcObject = localStream
  }
}

function connectWS() {
  if (ws && ws.readyState === WebSocket.OPEN) return
  const proto = location.protocol === 'https:' ? 'wss://' : 'ws://'
  ws = new WebSocket(proto + location.host + '/ws')
  ws.onopen = () => {
    ws.send(JSON.stringify({ type: 'join', room: roomId, from: myId }))
  }
  ws.onmessage = async (ev) => {
    const msg = JSON.parse(ev.data)
    if (msg.type === 'offer') {
      await ensurePC(msg.from)
      await pc.setRemoteDescription(msg.sdp)
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      send({ type: 'answer', room: roomId, from: myId, to: msg.from, sdp: pc.localDescription })
    } else if (msg.type === 'answer') {
      if (pc) {
        await pc.setRemoteDescription(msg.sdp)
      }
    } else if (msg.type === 'candidate') {
      if (pc && msg.candidate) {
        try { await pc.addIceCandidate(msg.candidate) } catch {}
      }
    }
  }
}

async function ensurePC(target) {
  remoteId = target
  if (pc) return
  pc = new RTCPeerConnection(servers)
  pc.onicecandidate = (e) => {
    if (e.candidate) send({ type: 'candidate', room: roomId, from: myId, to: remoteId, candidate: e.candidate })
  }
  pc.ontrack = (e) => {
    document.getElementById('remoteVideo').srcObject = e.streams[0]
  }
  await getMedia()
  localStream.getTracks().forEach(t => pc.addTrack(t, localStream))
}

function send(obj) {
  if (ws && ws.readyState === WebSocket.OPEN) {
    ws.send(JSON.stringify(obj))
  }
}

const joinBtn = document.getElementById('join')
joinBtn.onclick = async () => {
  roomId = document.getElementById('room').value.trim()
  if (!roomId) return
  connectWS()
  await getMedia()
}

const callBtn = document.getElementById('call')
callBtn.onclick = async () => {
  const id = document.getElementById('remote').value.trim()
  if (!id || !roomId) return
  await ensurePC(id)
  const offer = await pc.createOffer()
  await pc.setLocalDescription(offer)
  send({ type: 'offer', room: roomId, from: myId, to: id, sdp: pc.localDescription })
}

const hangupBtn = document.getElementById('hangup')
hangupBtn.onclick = () => {
  if (pc) {
    pc.getSenders().forEach(s => { try { s.track && s.track.stop() } catch {} })
    pc.close()
    pc = null
  }
}
