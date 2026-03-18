const CFG = window.SITE_CONFIG || {};

let title = CFG.pageTitle || "bio";
let i = 0;
let direction = 1;

setInterval(() => {
    document.title = title.substring(0, i);
    i += direction;
    if (i > title.length) {
        direction = -1;
    } else if (i < 0) {
        direction = 1;
    }
}, 300);

function fadeInAudio(audioEl, targetVolume = 0.6, durationMs = 900) {
    const start = performance.now();
    audioEl.volume = 0;

    const tick = (now) => {
        const t = Math.min(1, (now - start) / durationMs);
        audioEl.volume = targetVolume * t;
        if (t < 1) requestAnimationFrame(tick);
    };

    requestAnimationFrame(tick);
}

document.addEventListener("DOMContentLoaded", () => {
    const bgGif = document.getElementById("bg-gif");
    const enterTitle = document.getElementById("enter-title");
    const enterSubtitle = document.getElementById("enter-subtitle");
    const nickname = document.getElementById("nickname");
    const avatar = document.getElementById("avatar");

    const STORAGE_KEY = "bio_entered_v1";
    const alreadyEntered = localStorage.getItem(STORAGE_KEY) === "1";

    document.body.classList.add("locked");

    const overlay = document.getElementById("enter-overlay");
    const music = document.getElementById("bg-music");
    const musicSrc = document.getElementById("music-src");
    const player = document.getElementById("music-player");
    const playBtn = document.getElementById("player-play");
    const seek = document.getElementById("player-seek");
    const vol = document.getElementById("player-volume");
    const tCur = document.getElementById("player-time-current");
    const tTot = document.getElementById("player-time-total");
    const titleEl = document.getElementById("player-title");
    const subEl = document.getElementById("player-subtitle");
    const cover = document.getElementById("player-cover");

    let started = false;
    let seeking = false;

    const formatTime = (seconds) => {
        if (!Number.isFinite(seconds) || seconds < 0) return "0:00";
        const m = Math.floor(seconds / 60);
        const s = Math.floor(seconds % 60);
        return `${m}:${String(s).padStart(2, "0")}`;
    };

    const setPlayIcon = (isPlaying) => {
        if (!playBtn) return;
        playBtn.innerHTML = isPlaying
            ? '<i class="fa-solid fa-pause"></i>'
            : '<i class="fa-solid fa-play"></i>';
    };

    const updateMetaFromSource = () => {
        if (!music || !titleEl || !subEl) return;
        const playerCfg = CFG.player || {};
        if (playerCfg.subtitle) subEl.textContent = playerCfg.subtitle;
        if (playerCfg.title && !playerCfg.showTrackNameAsTitle) titleEl.textContent = playerCfg.title;

        if (playerCfg.showTrackNameAsTitle) {
            const src = music.currentSrc || music.querySelector("source")?.src || "";
            const file = decodeURIComponent(src.split("/").pop() || "track");
            titleEl.textContent = file.replace(/\.[^.]+$/, "");
        }
    };

    const syncUI = () => {
        if (!music) return;
        if (tCur) tCur.textContent = formatTime(music.currentTime);
        if (tTot) tTot.textContent = formatTime(music.duration);
        if (seek && !seeking && Number.isFinite(music.duration) && music.duration > 0) {
            seek.value = String(Math.round((music.currentTime / music.duration) * 1000));
        }
    };

    const startSite = async () => {
        if (started) return;
        started = true;

        localStorage.setItem(STORAGE_KEY, "1");
        document.body.classList.remove("locked");
        if (overlay) {
            overlay.classList.add("enter-overlay--hide");
            overlay.setAttribute("aria-hidden", "true");
        }

        if (music) {
            try {
                updateMetaFromSource();
                const musicCfg = CFG.music || {};
                const targetVolume = Number.isFinite(musicCfg.volume) ? musicCfg.volume : 0.6;
                if (vol) vol.value = String(targetVolume);
                if (vol) music.volume = Number(vol.value) || targetVolume;
                if (cover && musicCfg.coverSrc) cover.style.backgroundImage = `url("${musicCfg.coverSrc}")`;
                await music.play();
                fadeInAudio(music, music.volume || 0.6, 900);
                setPlayIcon(true);
                if (player) player.setAttribute("aria-hidden", "false");
            } catch (e) {
                // Autoplay может быть заблокирован, но клик обычно разрешает.
                // Если браузер всё равно блокирует, просто оставляем сайт без музыки.
            }
        }
    };

    if (overlay) overlay.addEventListener("click", startSite, { passive: true });
    document.addEventListener("keydown", (e) => {
        if (e.key === "Enter" || e.key === " ") startSite();
    });

    if (music) {
        music.addEventListener("timeupdate", syncUI);
        music.addEventListener("loadedmetadata", syncUI);
        music.addEventListener("durationchange", syncUI);
        music.addEventListener("canplay", syncUI);
        music.addEventListener("play", () => setPlayIcon(true));
        music.addEventListener("pause", () => setPlayIcon(false));
        music.addEventListener("ended", () => setPlayIcon(false));
    }

    if (playBtn && music) {
        playBtn.addEventListener("click", async () => {
            if (!started) return;
            if (music.paused) {
                try {
                    await music.play();
                } catch (e) {}
            } else {
                music.pause();
            }
        });
    }

    if (seek && music) {
        seek.addEventListener("input", () => {
            if (!started) return;
            seeking = true;
            if (Number.isFinite(music.duration) && music.duration > 0) {
                const p = Number(seek.value) / 1000;
                const t = Math.max(0, Math.min(music.duration, music.duration * p));
                if (tCur) tCur.textContent = formatTime(t);
            }
        });
        seek.addEventListener("change", () => {
            if (!started) return;
            if (Number.isFinite(music.duration) && music.duration > 0) {
                const p = Number(seek.value) / 1000;
                music.currentTime = Math.max(0, Math.min(music.duration, music.duration * p));
            }
            seeking = false;
        });
    }

    if (vol && music) {
        vol.addEventListener("input", () => {
            if (!started) return;
            music.volume = Number(vol.value);
        });
    }

    // Apply config to DOM
    if (bgGif && CFG.backgroundGifSrc) bgGif.src = CFG.backgroundGifSrc;
    if (enterTitle && CFG.enterOverlay?.title) enterTitle.textContent = CFG.enterOverlay.title;
    if (enterSubtitle && CFG.enterOverlay?.subtitle) enterSubtitle.textContent = CFG.enterOverlay.subtitle;
    if (nickname && CFG.nickname) nickname.textContent = CFG.nickname;
    if (avatar && CFG.avatarSrc) avatar.src = CFG.avatarSrc;

    if (music && musicSrc && CFG.music?.src) {
        musicSrc.src = CFG.music.src;
        if (music.load) music.load();
    }
    if (music && CFG.music?.loop === false) music.loop = false;
    if (vol && Number.isFinite(CFG.music?.volume)) vol.value = String(CFG.music.volume);
    if (cover && CFG.music?.coverSrc) cover.style.backgroundImage = `url("${CFG.music.coverSrc}")`;

    updateMetaFromSource();
    syncUI();

    // If user already entered before, show UI immediately (no overlay).
    // Music still requires a user gesture to play in most browsers.
    if (alreadyEntered) {
        started = true;
        document.body.classList.remove("locked");
        if (overlay) {
            overlay.classList.add("enter-overlay--hide");
            overlay.setAttribute("aria-hidden", "true");
        }
        if (player) player.setAttribute("aria-hidden", "false");
        setPlayIcon(false);
        if (music) {
            try {
                if (music.load) music.load();
            } catch (e) {}
        }
        updateMetaFromSource();
        syncUI();
    }
});