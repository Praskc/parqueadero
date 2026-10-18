const w = new WebSocket("ws://localhost:8000/ws");
w.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.snapshot) {
    console.log("snapshot OK, espacios:", m.snapshot.espacios.length);
  } else {
    console.log("evento WS:", JSON.stringify(m));
    process.exit(0);
  }
};
setTimeout(() => { console.log("TIMEOUT: no llego evento WS"); process.exit(1); }, 8000);
