// Set the dates for the events
const kickoffDate = new Date('January 4, 2025 12:00:00').getTime();
const ios2Date = new Date('October 20, 2024 06:00:00 GMT+3').getTime();

let currentEvent = 'kickoff'; 

// Function to update the countdown
function updateCountdown(targetDate) {
    const now = new Date().getTime();
    const timeLeft = targetDate - now;

    // Time calculations for days, hours, minutes, and seconds
    const days = Math.floor(timeLeft / (1000 * 60 * 60 * 24));
    const hours = Math.floor((timeLeft % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
    const minutes = Math.floor((timeLeft % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((timeLeft % (1000 * 60)) / 1000);

    // Display the result
    document.getElementById('days').textContent = days;
    document.getElementById('hours').textContent = hours;
    document.getElementById('minutes').textContent = minutes;
    document.getElementById('seconds').textContent = seconds;

    if (timeLeft < 0) {
        clearInterval(countdown);
        document.getElementById('countdown').textContent = "The Count Has Been Finished!";
    }
}


function toggleCountdown() {
    if (currentEvent === 'kickoff') {
        currentEvent = 'ios2';
        document.getElementById('switch-button').textContent = 'Count to Kickoff';
        document.getElementById('event-title').textContent = 'Countdown to IOS2';
        updateCountdown(ios2Date);
    } else {
        currentEvent = 'kickoff';
        document.getElementById('switch-button').textContent = 'Count to IOS2';
        document.getElementById('event-title').textContent = 'Countdown to FRC 2025 Kickoff';
        updateCountdown(kickoffDate);
    }
}

const countdown = setInterval(() => {
    if (currentEvent === 'kickoff') {
        updateCountdown(kickoffDate);
    } else {
        updateCountdown(ios2Date);
    }
}, 1000);

const faviconLink = document.createElement('link');
faviconLink.rel = 'icon';
faviconLink.href = 'https://info.firstinspires.org/hubfs/2025%20Season/Season%20Assets/FIRST_DIVE-fullLogo.png';
document.head.appendChild(faviconLink);

// Function to auto-resize the textarea
function autoResizeTextarea() {
    const textbox = document.getElementById('textbox');
    textbox.style.height = 'auto'; 
    textbox.style.height = textbox.scrollHeight + 'px'; 
}
document.getElementById('textbox').addEventListener('input', autoResizeTextarea);
autoResizeTextarea();