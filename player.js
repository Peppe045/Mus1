let playlist = [];
let currentIndex = 0;
let isPlaying = false;
const audio = document.getElementById('simpleAudioPlayer');
const progressBar = document.getElementById('progressBar');

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

// Sovrascrivi playTrack originale
async function playTrack(trackId) {
    const info = await fetch(`${API_BASE}/info/?id=${trackId}`).then(r => r.json());
    const trackData = await fetch(`${API_BASE}/track/?id=${trackId}&quality=LOSSLESS`).then(r => r.json());
    const manifestData = trackData.data;

    document.getElementById('trackTitle').innerText = info.data.title;
    document.getElementById('trackArtist').innerText = info.data.artist.name;
    document.getElementById('cover').src = info.data.album.cover_url;

    if (manifestData.manifestMimeType === 'application/vnd.tidal.bts') {
        await playSimpleFlac(manifestData.manifest);
    } else if (manifestData.manifestMimeType === 'application/dash+xml') {
        await playDashStream(manifestData.manifest);
    }
    isPlaying = true;
}

// Aggiorna la playlist quando cerchi
function displayResults(tracks) {
    const container = document.getElementById('results');
    container.innerHTML = '';
    tracks.forEach(track => {
        const div = document.createElement('div');
        div.innerHTML = `<strong>${track.title}</strong> - ${track.artist.name}
                         <button onclick="addToPlaylist(${track.id})">Aggiungi</button>
                         <button onclick="downloadFlac(event, ${track.id})">Scarica FLAC</button>`;
        container.appendChild(div);
    });
}

function addToPlaylist(trackId) {
    playlist.push(trackId);
    alert('Brano aggiunto alla playlist!');
}
