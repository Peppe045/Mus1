let playlist = [];
let currentIndex = 0;
let isPlaying = false;

const audio = document.getElementById('simpleAudioPlayer');
const progressBar = document.getElementById('progressBar');

// Aggiornamento barra progresso
audio.addEventListener('timeupdate', () => {
    if (audio.duration) {
        progressBar.value = (audio.currentTime / audio.duration) * 100;
    }
});

progressBar.addEventListener('input', () => {
    if (audio.duration) {
        audio.currentTime = (progressBar.value / 100) * audio.duration;
    }
});

// Controlli base
function playPause() {
    if (!playlist.length) return;
    if (isPlaying) {
        audio.pause();
    } else {
        playTrack(playlist[currentIndex]);
    }
    isPlaying = !isPlaying;
}

function nextTrack() {
    if (currentIndex < playlist.length - 1) currentIndex++;
    else currentIndex = 0;
    playTrack(playlist[currentIndex]);
}

function prevTrack() {
    if (currentIndex > 0) currentIndex--;
    else currentIndex = playlist.length - 1;
    playTrack(playlist[currentIndex]);
}

// Funzione principale per riprodurre un brano
async function playTrack(trackId) {
    try {
        // 1. Ottieni i metadata completi
        const infoRes = await fetch(`${API_BASE}/info/?id=${trackId}`);
        const infoJson = await infoRes.json();
        const trackInfo = infoJson.data;

        // 2. Aggiorna l'interfaccia con metadata
        updateTrackUI(trackInfo);

        // 3. Ottieni manifesto audio
        const trackDataRes = await fetch(`${API_BASE}/track/?id=${trackId}&quality=LOSSLESS`);
        const trackDataJson = await trackDataRes.json();
        const manifestData = trackDataJson.data;

        // 4. Riproduci in base al tipo di manifesto
        if (manifestData.manifestMimeType === 'application/vnd.tidal.bts') {
            await playSimpleFlac(manifestData.manifest);
        } else if (manifestData.manifestMimeType === 'application/dash+xml') {
            await playDashStream(manifestData.manifest);
        } else {
            console.error('Formato manifesto non supportato:', manifestData.manifestMimeType);
        }

        isPlaying = true;
    } catch (error) {
        console.error('Errore riproduzione brano:', error);
    }
}

// Aggiorna l'interfaccia con tutti i metadata
function updateTrackUI(trackInfo) {
    document.getElementById('trackTitle').innerText = trackInfo.title;
    document.getElementById('trackArtist').innerText = trackInfo.artist.name;
    document.getElementById('cover').src = `https://resources.tidal.com/images/${trackInfo.album.cover}/640x640.jpg`;
    
    // Durata in mm:ss
    const minutes = Math.floor(trackInfo.duration / 60);
    const seconds = trackInfo.duration % 60;
    document.getElementById('trackDuration')?.remove(); // Rimuove eventuale precedente
    const durEl = document.createElement('div');
    durEl.id = 'trackDuration';
    durEl.innerText = `Durata: ${minutes}:${seconds.toString().padStart(2,'0')}`;
    document.querySelector('.track-info').appendChild(durEl);

    // Altri metadata opzionali
    const metaEl = document.getElementById('trackMeta');
    if (metaEl) metaEl.remove();
    const meta = document.createElement('div');
    meta.id = 'trackMeta';
    meta.style.fontSize = '0.85em';
    meta.style.marginTop = '5px';
    meta.innerHTML = `
        Album: ${trackInfo.album.title} <br>
        BPM: ${trackInfo.bpm} <br>
        Chiave: ${trackInfo.key} ${trackInfo.keyScale} <br>
        Copyright: ${trackInfo.copyright} <br>
        Audio: ${trackInfo.audioQuality} / ${trackInfo.audioModes.join(', ')}
    `;
    document.querySelector('.track-info').appendChild(meta);
}

// Aggiunge brano alla playlist
function addToPlaylist(trackId) {
    playlist.push(trackId);
    alert('Brano aggiunto alla playlist!');
}

// Funzioni FLAC / DASH originali
async function playSimpleFlac(base64Manifest) {
    const jsonStr = atob(base64Manifest);
    const manifest = JSON.parse(jsonStr);
    const audioUrl = manifest.urls[0];

    audio.src = audioUrl;
    audio.style.display = 'block';
    document.getElementById('dashVideoContainer').style.display = 'none';
    await audio.play();
}

async function playDashStream(base64Manifest) {
    const mpdStr = atob(base64Manifest);
    const manifestUrl = URL.createObjectURL(new Blob([mpdStr], {type: 'application/dash+xml'}));

    const video = document.getElementById('dashVideoPlayer');
    const container = document.getElementById('dashVideoContainer');
    container.style.display = 'block';
    audio.style.display = 'none';

    const player = new shaka.Player(video);
    player.configure({ streaming: { bufferingGoal: 30 } });

    try {
        await player.load(manifestUrl);
    } catch (error) {
        console.error('Errore caricamento DASH:', error);
    }
    URL.revokeObjectURL(manifestUrl);
}
