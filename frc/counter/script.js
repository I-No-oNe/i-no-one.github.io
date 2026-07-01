// FRC season year is derived automatically. The season runs Jan–Apr, so from
// May onward the next upcoming season (next calendar year) is targeted.
const CURRENT_FRC_YEAR = (() => {
    const now = new Date();
    return now.getMonth() >= 4 ? now.getFullYear() + 1 : now.getFullYear();
})();
// -----------------------------------------------------------------

// Fallback event data (used if the API is unreachable). ISR = Israel district.
const FALLBACK_EVENTS = [
    { name: `FRC Kickoff ${CURRENT_FRC_YEAR}`, short_name: "Kickoff", city: "Global", country: "Worldwide", start_date: `${CURRENT_FRC_YEAR}-01-10`, end_date: `${CURRENT_FRC_YEAR}-01-10`, key: `${CURRENT_FRC_YEAR}kickoff` },
    { name: "ISR District Event #1", short_name: "Week 1", city: "Natanya", country: "Israel", start_date: `${CURRENT_FRC_YEAR}-03-08`, end_date: `${CURRENT_FRC_YEAR}-03-10`, key: `${CURRENT_FRC_YEAR}isde1` },
    { name: "ISR District Event #2", short_name: "Week 2", city: "Natanya", country: "Israel", start_date: `${CURRENT_FRC_YEAR}-03-10`, end_date: `${CURRENT_FRC_YEAR}-03-12`, key: `${CURRENT_FRC_YEAR}isde2` },
    { name: "ISR District Event #3", short_name: "Week 3", city: "Hadera", country: "Israel", start_date: `${CURRENT_FRC_YEAR}-03-15`, end_date: `${CURRENT_FRC_YEAR}-03-17`, key: `${CURRENT_FRC_YEAR}isde3` },
    { name: "FIRST Israel District Championship", short_name: "DCMP", city: "Jerusalem", country: "Israel", start_date: `${CURRENT_FRC_YEAR}-03-29`, end_date: `${CURRENT_FRC_YEAR}-03-31`, key: `${CURRENT_FRC_YEAR}iscmp` }
];

let events = FALLBACK_EVENTS.slice();
let displayEvents = [];
let currentEventIndex = 0;
let countdownInterval;
let notesData = '';

// --- Fetch live events from the Statbotics API (no key required) ---
async function loadEvents() {
    try {
        const res = await fetch(`https://api.statbotics.io/v3/events?year=${CURRENT_FRC_YEAR}&district=isr&limit=50`);
        if (!res.ok) throw new Error(`API ${res.status}`);
        const data = await res.json();
        if (Array.isArray(data) && data.length) {
            events = data
                .filter(e => e.start_date && e.end_date)
                .map(e => ({
                    name: e.name,
                    short_name: e.type && e.type.includes('cmp') ? 'DCMP' : (e.week != null ? `Week ${e.week + 1}` : e.name),
                    city: e.state || '',
                    country: e.country || 'Israel',
                    start_date: e.start_date,
                    end_date: e.end_date,
                    key: e.key
                }))
                .sort((a, b) => new Date(a.start_date) - new Date(b.start_date));
        }
    } catch (err) {
        console.warn('Falling back to built-in event data:', err.message);
    }
}

function computeDisplayEvents() {
    const now = Date.now();
    const upcoming = events.filter(event => {
        const end = new Date(event.end_date);
        end.setHours(23, 59, 59, 999);
        return end.getTime() > now;
    });
    displayEvents = upcoming.length > 0 ? upcoming : events;
}

// --- Favicon ---
function setFavicon(url) {
    let favicon = document.querySelector("link[rel='icon']") || document.createElement('link');
    favicon.rel = 'icon';
    favicon.href = url;
    document.head.appendChild(favicon);
}

// --- Season branding ---
function setSeasonBranding() {
    const infoTextElement = document.getElementById('info-text');
    const tbaLinkElement = document.getElementById('tba-link');
    // keep the I-No-oNe logo as the tab icon for consistent branding
    setFavicon('https://avatars.githubusercontent.com/u/145749961?s=64&v=4');
    infoTextElement.innerHTML = `📅 Showing <b>${CURRENT_FRC_YEAR}</b> FIRST Israel District Events (ISR)`;
    tbaLinkElement.href = `https://www.thebluealliance.com/events/isr/${CURRENT_FRC_YEAR}`;
}

// --- Event buttons ---
function createEventButtons() {
    const controls = document.getElementById('controls');
    controls.innerHTML = '';
    displayEvents.forEach((event, index) => {
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.textContent = event.short_name;
        btn.onclick = () => displayEvent(index);
        if (index === 0) btn.classList.add('active');
        controls.appendChild(btn);
    });
}

// --- Display selected event + start countdown ---
function displayEvent(index) {
    currentEventIndex = index;
    const event = displayEvents[index];

    document.querySelectorAll('.controls .btn').forEach((btn, i) => {
        btn.classList.toggle('active', i === index);
    });

    document.getElementById('event-title').textContent = event.name;
    document.getElementById('event-location').textContent = `📍 ${event.city ? event.city + ', ' : ''}${event.country}`;

    const dateOptions = { month: 'long', day: 'numeric', year: 'numeric' };
    const startStr = new Date(event.start_date).toLocaleDateString('en-US', dateOptions);
    const endStr = new Date(event.end_date).toLocaleDateString('en-US', dateOptions);
    document.getElementById('event-dates').textContent = `📅 ${startStr} - ${endStr}`;

    if (countdownInterval) clearInterval(countdownInterval);
    updateCountdown(event.start_date);
    countdownInterval = setInterval(() => updateCountdown(event.start_date), 1000);
}

// --- Countdown tick ---
function updateCountdown(targetDate) {
    const now = new Date().getTime();
    const target = new Date(targetDate + 'T00:00:00').getTime();
    let timeLeft = target - now;

    const countdownElement = document.getElementById('countdown');

    if (timeLeft < 0) {
        const currentEvent = displayEvents[currentEventIndex];
        const endTarget = new Date(currentEvent.end_date + 'T23:59:59').getTime();

        clearInterval(countdownInterval);
        if (now <= endTarget) {
            countdownElement.innerHTML = `<div class="event-finished">🚧 Event is currently in progress! 🚧</div>`;
        } else {
            countdownElement.innerHTML = `<div class="event-finished">🎉 Event has finished! 🎉</div>`;
        }
        return;
    }

    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    if (!document.getElementById('days')) {
        countdownElement.innerHTML = `
            <div class="time-box"><span class="time-number" id="days">00</span><span class="time-label">Days</span></div>
            <div class="time-box"><span class="time-number" id="hours">00</span><span class="time-label">Hours</span></div>
            <div class="time-box"><span class="time-number" id="minutes">00</span><span class="time-label">Minutes</span></div>
            <div class="time-box"><span class="time-number" id="seconds">00</span><span class="time-label">Seconds</span></div>
        `;
    }

    document.getElementById('days').textContent = String(days).padStart(2, '0');
    document.getElementById('hours').textContent = String(hours).padStart(2, '0');
    document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
    document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');
}

// --- Notes (per-year local storage) ---
function loadNotes() {
    const textarea = document.getElementById('notes');
    notesData = localStorage.getItem(`frcIsrael${CURRENT_FRC_YEAR}Notes`) || '';
    textarea.value = notesData;
}
function saveNotes() {
    const textarea = document.getElementById('notes');
    notesData = textarea.value;
    localStorage.setItem(`frcIsrael${CURRENT_FRC_YEAR}Notes`, notesData);
}

// --- Init ---
async function init() {
    await loadEvents();
    computeDisplayEvents();
    setSeasonBranding();
    createEventButtons();
    displayEvent(0);
    loadNotes();
    document.getElementById('notes').addEventListener('input', saveNotes);
}

window.onload = init;
