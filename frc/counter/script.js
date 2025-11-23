// ⭐ CONFIGURATION VARIABLE: Change this for the next FRC season!
const CURRENT_FRC_YEAR = 2026;
const CURRENT_SEASON_LOGO_URL = 'https://community.firstinspires.org/hubfs/blog/frc/frc-rebuilt-logo.png';
// -----------------------------------------------------------------

// Event data for the configured year (ISR is the district code for Israel)
// NOTE: Dates are based on the standard FRC schedule template for Israel districts.
const events = [
    {
        name: "FRC Kickoff 2026",
        short_name: "Kickoff",
        city: "Global",
        country: "Worldwide",
        start_date: `${CURRENT_FRC_YEAR}-01-10`,
        end_date: `${CURRENT_FRC_YEAR}-01-10`,
        year: CURRENT_FRC_YEAR,
        key: `${CURRENT_FRC_YEAR}kickoff`
    },
    {
        name: "ISR District Event #1",
        short_name: "ISR #1",
        city: "Natanya",
        country: "Israel",
        start_date: `${CURRENT_FRC_YEAR}-03-08`,
        end_date: `${CURRENT_FRC_YEAR}-03-10`,
        year: CURRENT_FRC_YEAR,
        key: `${CURRENT_FRC_YEAR}isrde1`
    },
    {
        name: "ISR District Event #2",
        short_name: "ISR #2", 
        city: "Natanya",
        country: "Israel",
        start_date: `${CURRENT_FRC_YEAR}-03-10`,
        end_date: `${CURRENT_FRC_YEAR}-03-12`,
        year: CURRENT_FRC_YEAR,
        key: `${CURRENT_FRC_YEAR}isrde2`
    },
    {
        name: "ISR District Event #3",
        short_name: "ISR #3",
        city: "Hadera",
        country: "Israel",
        start_date: `${CURRENT_FRC_YEAR}-03-15`,
        end_date: `${CURRENT_FRC_YEAR}-03-17`,
        year: CURRENT_FRC_YEAR,
        key: `${CURRENT_FRC_YEAR}isrde3`
    },
    {
        name: "ISR District Event #4",
        short_name: "ISR #4",
        city: "Hadera",
        country: "Israel",
        start_date: `${CURRENT_FRC_YEAR}-03-17`,
        end_date: `${CURRENT_FRC_YEAR}-03-19`,
        year: CURRENT_FRC_YEAR,
        key: `${CURRENT_FRC_YEAR}isrde4`
    },
    {
        name: "FIRST Israel District Championship",
        short_name: "District Champs",
        city: "Jerusalem",
        country: "Israel",
        start_date: `${CURRENT_FRC_YEAR}-03-29`,
        end_date: `${CURRENT_FRC_YEAR}-03-31`,
        year: CURRENT_FRC_YEAR,
        key: `${CURRENT_FRC_YEAR}iscmp`
    }
];

let currentEventIndex = 0;
let countdownInterval;
let notesData = '';

// --- New Favicon Function ---
/**
 * Sets the browser tab icon (favicon) dynamically.
 * @param {string} url - The URL of the image to use as the favicon.
 */
function setFavicon(url) {
    let favicon = document.querySelector("link[rel='icon']") || document.createElement('link');
    favicon.rel = 'icon';
    favicon.href = url;
    document.head.appendChild(favicon);
}
// -----------------------------


// --- Utility Functions ---

/**
 * Dynamically sets the season-specific branding elements (Title, Logo, Favicon).
 */
function setSeasonBranding() {
    // const titleElement = document.getElementById('page-title');
    const logoElement = document.getElementById('season-logo');
    const infoTextElement = document.getElementById('info-text');
    const tbaLinkElement = document.getElementById('tba-link');

    // Set Favicon 
    setFavicon(CURRENT_SEASON_LOGO_URL);

    // Update info banner
    infoTextElement.innerHTML = `📅 Showing <b>${CURRENT_FRC_YEAR}</b> FIRST Israel District Events (ISR)`;
    tbaLinkElement.href = `https://www.thebluealliance.com/events/isr/${CURRENT_FRC_YEAR}`;
}


/**
 * Filters events for upcoming ones and initializes buttons.
 */
function init() {
    setSeasonBranding();
    createEventButtons();
    // Start with the first *upcoming* event 
    displayEvent(0); 
    loadNotes();
    document.getElementById('notes').addEventListener('input', saveNotes);
}

// Filter for upcoming events only
const upcomingEvents = events.filter(event => {
    // Check if the event's *end* date is in the future.
    const eventEndDate = new Date(event.end_date);
    // Set a time just after the event ends (e.g., 23:59:59)
    eventEndDate.setHours(23, 59, 59, 999); 
    const now = new Date();
    return eventEndDate.getTime() > now.getTime();
});

// Use upcoming events. If all events have passed, default to all events.
const displayEvents = upcomingEvents.length > 0 ? upcomingEvents : events;


/**
 * Creates the event selection buttons.
 */
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


/**
 * Displays the selected event details and starts the countdown.
 * @param {number} index - The index of the event in the displayEvents array.
 */
function displayEvent(index) {
    currentEventIndex = index;
    const event = displayEvents[index];
    
    // Update active button
    document.querySelectorAll('.controls .btn').forEach((btn, i) => {
        btn.classList.toggle('active', i === index);
    });
    
    document.getElementById('event-title').textContent = event.name;
    document.getElementById('event-location').textContent = `📍 ${event.city}, ${event.country}`;
    
    // Format dates nicely
    const startDate = new Date(event.start_date);
    const endDate = new Date(event.end_date);
    const dateOptions = { month: 'long', day: 'numeric', year: 'numeric' };
    const startStr = startDate.toLocaleDateString('en-US', dateOptions);
    const endStr = endDate.toLocaleDateString('en-US', dateOptions);
    document.getElementById('event-dates').textContent = `📅 ${startStr} - ${endStr}`;
    
    if (countdownInterval) clearInterval(countdownInterval);
    
    updateCountdown(event.start_date);
    countdownInterval = setInterval(() => updateCountdown(event.start_date), 1000);
}


/**
 * Calculates and updates the countdown display every second.
 * @param {string} targetDate - The YYYY-MM-DD date string of the event start.
 */
function updateCountdown(targetDate) {
    const now = new Date().getTime();
    // Set target time to the start of the target date (00:00:00 local time)
    const target = new Date(targetDate + 'T00:00:00').getTime(); 
    let timeLeft = target - now;

    const countdownElement = document.getElementById('countdown');

    if (timeLeft < 0) {
        // Check if the event is currently running or finished 
        const currentEvent = displayEvents[currentEventIndex];
        // Event ends at the end of the end date (23:59:59)
        const endTarget = new Date(currentEvent.end_date + 'T23:59:59').getTime(); 

        if (now <= endTarget) {
            // Event is in progress
            clearInterval(countdownInterval);
            countdownElement.innerHTML = `
                <div class="event-finished" style="grid-column: 1 / -1; background: linear-gradient(145deg, rgba(255, 193, 7, 0.2), rgba(255, 159, 0, 0.2)); border: 2px solid rgba(255, 193, 7, 0.5);">
                    🚧 Event is **currently in progress!** 🚧
                </div>
            `;
        } else {
            // Event is finished
            clearInterval(countdownInterval);
            countdownElement.innerHTML = `
                <div class="event-finished" style="grid-column: 1 / -1;">
                    🎉 Event has **finished!** 🎉
                </div>
            `;
        }
        return;
    }

    // Standard countdown calculation
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    // If the time-boxes are replaced by a message, restore them for the next click
    if (!document.getElementById('days')) {
         countdownElement.innerHTML = `
            <div class="time-box">
                <span class="time-number" id="days">00</span>
                <span class="time-label">Days</span>
            </div>
            <div class="time-box">
                <span class="time-number" id="hours">00</span>
                <span class="time-label">Hours</span>
            </div>
            <div class="time-box">
                <span class="time-number" id="minutes">00</span>
                <span class="time-label">Minutes</span>
            </div>
            <div class="time-box">
                <span class="time-number" id="seconds">00</span>
                <span class="time-label">Seconds</span>
            </div>
        `;
    }

    document.getElementById('days').textContent = String(days).padStart(2, '0');
    document.getElementById('hours').textContent = String(hours).padStart(2, '0');
    document.getElementById('minutes').textContent = String(minutes).padStart(2, '0');
    document.getElementById('seconds').textContent = String(seconds).padStart(2, '0');
}


/**
 * Loads notes from local storage specific to the current year.
 */
function loadNotes() {
    const textarea = document.getElementById('notes');
    const localStorageKey = `frcIsrael${CURRENT_FRC_YEAR}Notes`;
    const savedNotes = localStorage.getItem(localStorageKey);
    notesData = savedNotes || '';
    textarea.value = notesData;
}


/**
 * Saves notes to local storage specific to the current year.
 */
function saveNotes() {
    const textarea = document.getElementById('notes');
    notesData = textarea.value;
    const localStorageKey = `frcIsrael${CURRENT_FRC_YEAR}Notes`;
    localStorage.setItem(localStorageKey, notesData);
}

// Initialize on page load
window.onload = init;
