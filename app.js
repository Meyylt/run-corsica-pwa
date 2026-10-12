// app.js

// 1. Initialisation de la base de données IndexedDB
const dbPromise = idb.openDB("run-corse-db", 1, {
  upgrade(db) {
    if (!db.objectStoreNames.contains("runs")) {
      db.createObjectStore("runs", { keyPath: "id", autoIncrement: true });
    }
    if (!db.objectStoreNames.contains("outbox")) {
      db.createObjectStore("outbox", { keyPath: "id", autoIncrement: true });
    }
  },
});

// 2. Hydratation (Rendre le HTML dynamique)
async function initAndRender() {
  const db = await dbPromise;
  const listEl = document.getElementById("runs-list");
  
  const seeds = [...listEl.querySelectorAll("[data-seed]")].map(li => li.textContent.trim());

  if ((await db.count("runs")) === 0) {
    for (const text of seeds) {
      await db.add("runs", { text, photo: null, timestamp: Date.now() });
    }
  }

  async function renderRuns() {
    const runs = await db.getAll("runs");
    listEl.replaceChildren(); 
    
    runs.forEach(run => {
      const li = document.createElement("li");
      
      const span = document.createElement("span");
      span.textContent = run.text; // textContent protège des failles XSS[cite: 325]
      li.appendChild(span);

      // Si une photo est associée à l'entraînement, on l'affiche
      if (run.photo) {
        const img = document.createElement("img");
        img.src = run.photo;
        img.style.width = "60px";
        img.style.height = "60px";
        img.style.objectFit = "cover";
        img.style.borderRadius = "8px";
        img.style.marginLeft = "15px";
        li.appendChild(img);
      }

      listEl.appendChild(li);
    });
  }

  await renderRuns();
  return renderRuns; 
}

let renderRunsFunc;
initAndRender().then(fn => { renderRunsFunc = fn; });

// 3. Gestion du formulaire d'ajout et de l'Outbox
document.getElementById("run-form").addEventListener("submit", async (e) => {
  e.preventDefault();
  const input = document.getElementById("run-input");
  const text = input.value.trim();
  if (!text) return;

  // On vérifie si une photo a été prise et on la récupère
  const imgResult = document.getElementById("photo-result");
  let photoData = null;
  if (imgResult.style.display === "block" && imgResult.src) {
    photoData = imgResult.src;
  }

  const db = await dbPromise;
  
  // Sauvegarde locale avec la photo[cite: 1]
  await db.add("runs", { text, photo: photoData, timestamp: Date.now() });
  
  // Réinitialisation du formulaire et de la photo
  input.value = "";
  imgResult.src = "";
  imgResult.style.display = "none";
  document.getElementById("camera-status").textContent = "";

  if (renderRunsFunc) await renderRunsFunc();

  // Ajout à l'outbox pour la synchronisation[cite: 1]
  await db.add("outbox", { text, photo: photoData, timestamp: Date.now() });

  if ("SyncManager" in window) {
    const reg = await navigator.serviceWorker.ready;
    await reg.sync.register("sync-outbox");
  } else {
    if (navigator.onLine) await flushOutbox();
  }
});

// 4. Fonction de synchronisation manuelle / fallback
async function flushOutbox() {
  const db = await dbPromise;
  const items = await db.getAll("outbox");
  
  for (const item of items) {
    try {
      await fetch("https://httpbin.org/post", { 
        method: "POST", 
        body: JSON.stringify(item) 
      });
      await db.delete("outbox", item.id);
    } catch (err) {
      console.error("Échec de synchronisation", err);
    }
  }
}

// 5. UX Hors ligne
const banner = document.getElementById("offline-banner");
window.addEventListener("offline", () => {
  banner.style.display = "block";
});
window.addEventListener("online", async () => {
  banner.style.display = "none";
  await flushOutbox(); 
});

// 6. Capacité native : Géolocalisation
document.getElementById("btn-geoloc").addEventListener("click", () => {
  const status = document.getElementById("geoloc-status");
  
  if ("geolocation" in navigator) {
    status.textContent = "Recherche de la position...";
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        status.textContent = `Départ mémorisé : Lat ${pos.coords.latitude.toFixed(4)}, Lng ${pos.coords.longitude.toFixed(4)}`;
      },
      (err) => {
        status.textContent = "Position refusée ou introuvable."; 
      },
      { enableHighAccuracy: true }
    );
  } else {
    status.textContent = "Géolocalisation non supportée par ton appareil.";
  }
});

// 7. Enregistrement du Service Worker et gestion de la mise à jour
if ("serviceWorker" in navigator) {
  navigator.serviceWorker.register("/sw.js").then(reg => {
    console.log("✅ Service Worker enregistré ! Scope:", reg.scope);

    reg.addEventListener("updatefound", () => {
      const newWorker = reg.installing;
      newWorker.addEventListener("statechange", () => {
        if (newWorker.state === "installed" && navigator.serviceWorker.controller) {
          document.getElementById("update-banner").style.display = "block";
          document.getElementById("btn-update").addEventListener("click", () => {
            newWorker.postMessage({ type: "SKIP_WAITING" });
          });
        }
      });
    });
  }).catch(err => console.error("❌ Erreur d'enregistrement du SW:", err));

  navigator.serviceWorker.addEventListener("controllerchange", () => {
    window.location.reload();
  });
}

// 8. Capacité native bonus : Caméra
let cameraStream = null;
const btnCamera = document.getElementById("btn-camera");
const btnCapture = document.getElementById("btn-capture");
const video = document.getElementById("camera-stream");
const canvas = document.getElementById("camera-canvas");
const imgResult = document.getElementById("photo-result");
const status = document.getElementById("camera-status");

btnCamera.addEventListener("click", async () => {
  if (!cameraStream) {
    try {
      status.textContent = "Demande d'accès à la caméra...";
      cameraStream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" } });
      video.srcObject = cameraStream;
      video.style.display = "block";
      btnCapture.style.display = "block"; 
      imgResult.style.display = "none"; 
      status.textContent = "";
      btnCamera.textContent = "⏹️ Arrêter la caméra";
    } catch (err) {
      if (err.name === 'NotAllowedError') {
        status.textContent = "Accès à la caméra refusé.";
      } else {
        status.textContent = "Caméra introuvable ou erreur de chargement.";
      }
    }
  } 
  else {
    cameraStream.getTracks().forEach(track => track.stop());
    video.srcObject = null;
    video.style.display = "none";
    btnCapture.style.display = "none";
    cameraStream = null;
    btnCamera.textContent = "📷 Afficher la caméra";
    status.textContent = "";
  }
});

btnCapture.addEventListener("click", () => {
  if (cameraStream) {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    const photoData = canvas.toDataURL("image/png");
    imgResult.src = photoData;
    imgResult.style.display = "block";
    status.textContent = "✅ Superbe photo !";
    cameraStream.getTracks().forEach(track => track.stop());
    video.style.display = "none";
    btnCapture.style.display = "none";
    cameraStream = null;
    btnCamera.textContent = "📷 Reprendre une photo";
  }
});