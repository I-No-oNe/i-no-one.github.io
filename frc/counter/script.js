const kickoffDate = new Date('January 4, 2025 12:00:00').getTime();
const dis1 = new Date(1740290400000);

let currentEvent = 'kickoff';

function updateCountdown(targetDate) {
    const now = new Date().getTime();
    const timeLeft = targetDate - now;

    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    document.getElementById('days').textContent = days >= 0 ? days : 0;
    document.getElementById('hours').textContent = hours >= 0 ? hours : 0;
    document.getElementById('minutes').textContent = minutes >= 0 ? minutes : 0;
    document.getElementById('seconds').textContent = seconds >= 0 ? seconds : 0;

    if (timeLeft < 0) {
        clearInterval(countdown);
        document.getElementById('countdown').textContent = "The Count Has Been Finished!";
    }
}

function toggleCountdown() {
    if (currentEvent === 'kickoff') {
        currentEvent = 'ios2';
        document.getElementById('switch-button').textContent = 'Count to Kickoff';
        document.getElementById('event-title').textContent = 'Countdown to DIS1';
        updateCountdown(dis1);
    } else {
        currentEvent = 'kickoff';
        document.getElementById('switch-button').textContent = 'Count to DIS1';
        document.getElementById('event-title').textContent = 'Countdown to FRC 2025 Kickoff';
        updateCountdown(kickoffDate);
    }
}

updateCountdown(kickoffDate);
const countdown = setInterval(() => {
    if (currentEvent === 'kickoff') {
        updateCountdown(kickoffDate);
    } else {
        updateCountdown(dis1);
    }
}, 1000);

const faviconLink = document.createElement('link');
faviconLink.rel = 'icon';
faviconLink.href = 'https://info.firstinspires.org/hubfs/2025%20Season/Season%20Assets/FIRST_DIVE-fullLogo.png';
document.head.appendChild(faviconLink);

function autoResizeTextarea() {
    const textbox = document.getElementById('textbox');
    textbox.style.height = 'auto';
    textbox.style.height = textbox.scrollHeight + 'px';
}
document.getElementById('textbox').addEventListener('input', autoResizeTextarea);
autoResizeTextarea();