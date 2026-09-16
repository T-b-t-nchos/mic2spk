const enabled = document.getElementById("enabled");
const delaySlider = document.getElementById("delay");
const delayValue = document.getElementById("delayValue");
const statusValue = document.getElementById("status");

let firstTime = true;
let audioContext = null;
let microphoneStream = null;
let microphoneSource = null;
let delayNode = null;
let gainNode = null;

delaySlider.addEventListener("input", () => {
    delayValue.textContent = delaySlider.value;

    if (delayNode !== null && audioContext !== null) {
        delayNode.delayTime.setValueAtTime(
            Number(delaySlider.value) / 1000,
            audioContext.currentTime
        );
    }
});

enabled.addEventListener("change", async() => {
    if (firstTime && enabled.checked) {
        statusValue.textContent = "Initializing...";

        if (audioContext !== null) {
            return;
        }

        try {
            microphoneStream = await navigator.mediaDevices.getUserMedia({
                audio: {
                    echoCancellation: false,
                    noiseSuppression: false,
                    autoGainControl: false
                }
            });

            audioContext = new AudioContext();

            if (audioContext.state === "suspended") {
                await audioContext.resume();
            }

            microphoneSource = audioContext.createMediaStreamSource(
                microphoneStream
            );

            delayNode = audioContext.createDelay(2.0);

            gainNode = audioContext.createGain();

            delayNode.delayTime.value =
                Number(delaySlider.value) / 1000;

            gainNode.gain.value = enabled.checked ? 1 : 0;

            microphoneSource
                .connect(delayNode)
                .connect(gainNode)
                .connect(audioContext.destination);

            updateStatus();

        } catch (error) {
            console.error(error);

            statusValue.textContent =
                "[Error] Couldn't start a mic: " + error.message;
            statusValue.style.color = "red";
        }


        firstTime = false;
        return;
    }

    if (gainNode === null || audioContext === null) {
        return;
    }

    gainNode.gain.setValueAtTime(
        enabled.checked ? 1 : 0,
        audioContext.currentTime
    );

    updateStatus();
});

function updateStatus() {
    statusValue.textContent = enabled.checked
        ? "Connected."
        : "Disconnected.";

    statusValue.style.color = enabled.checked ? "green" : "red";
}

