const dis4 = new Date('January 4, 2025 12:00:00').getTime();
// Changed for dis4 for easy replacement 
const dis1 = new Date(1740290400000).getTime();
// const dis4 = new Date('2025-03-10T00:00:00Z').getTime();

let currentEvent = 'dis4'; // Changed the default event to dis4

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
    if (currentEvent === 'dis4') {
        currentEvent = 'dis1';
        document.getElementById('switch-button').textContent = 'Count to Kickoff';
        document.getElementById('event-title').textContent = 'Countdown to DIS1';
        updateCountdown(dis4);
    } else {
        currentEvent = 'dis4';
        document.getElementById('switch-button').textContent = 'Count to DIS1';
        document.getElementById('event-title').textContent = 'Countdown to FRC 2025 Kickoff';
        updateCountdown(dis1);
    }
}

updateCountdown(dis4);
const countdown = setInterval(() => {
    if (currentEvent === 'dis4') {
        updateCountdown(dis4);
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