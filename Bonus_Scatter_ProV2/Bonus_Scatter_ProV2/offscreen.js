function ensureSilentAudio() {
  try {
    const audio = new Audio(
      'data:audio/wav;base64,UklGRiQAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA='
    );
    audio.loop = true;
    audio.volume = 0;
    audio.play().catch(() => {
    });
  } catch {
  }
}

function connectKeepAlive() {
  try {
    const port = chrome.runtime.connect({ name: 'keepalive' });
    port.onDisconnect.addListener(() => {
      setTimeout(connectKeepAlive, 1000);
    });
  } catch {
    setTimeout(connectKeepAlive, 1000);
  }
}

function ping() {
  try {
    chrome.runtime.sendMessage({ action: 'keepAlive' }, () => {
    });
  } catch {
  }
}

ping();
ensureSilentAudio();
connectKeepAlive();
setInterval(ping, 20000);
