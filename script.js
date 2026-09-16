const enabled = document.getElementById("enabled");
const delaySlider = document.getElementById("delay");
const delayValue = document.getElementById("delayValue");
const lowpassEnabled = document.getElementById("lowpass");
const statusValue = document.getElementById("status");

let firstTime = true;

let audioContext = null;
let microphoneStream = null;
let microphoneSource = null;

let delayNode = null;
let gainNode = null;

let lowpassNode1 = null;
let lowpassNode2 = null;
let lowpassDryGain = null;
let lowpassWetGain = null;

const LOWPASS_FREQUENCY = 6000;


delaySlider.addEventListener("input", () => {
    delayValue.textContent = delaySlider.value;

    if (delayNode !== null && audioContext !== null) {
        delayNode.delayTime.setValueAtTime(
            Number(delaySlider.value) / 1000,
            audioContext.currentTime
        );
    }
});


lowpassEnabled.addEventListener("change", () => {
    updateLowpass();
});

function updateLowpass() {
    if (audioContext === null || lowpassDryGain === null || lowpassWetGain === null) {
        return;
    }

    const now = audioContext.currentTime;
    const filterEnabled = lowpassEnabled.checked;

    lowpassDryGain.gain.cancelScheduledValues(now);
    lowpassWetGain.gain.cancelScheduledValues(now);

    lowpassDryGain.gain.setValueAtTime(lowpassDryGain.gain.value, now);

    lowpassWetGain.gain.setValueAtTime(lowpassWetGain.gain.value, now);

    lowpassDryGain.gain.linearRampToValueAtTime(
        filterEnabled ? 0 : 1,
        now + 0.005
    );

    lowpassWetGain.gain.linearRampToValueAtTime(
        filterEnabled ? 1 : 0,
        now + 0.005
    );
}


enabled.addEventListener("change", async () => {
    if (firstTime && enabled.checked) {
        statusValue.textContent = "Initializing...";
        statusValue.style.color = "";

        try {
            microphoneStream =
                await navigator.mediaDevices.getUserMedia({
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


            microphoneSource =
                audioContext.createMediaStreamSource(
                    microphoneStream
                );

            delayNode = audioContext.createDelay(2.0);

            delayNode.delayTime.value = Number(delaySlider.value) / 1000;

            gainNode = audioContext.createGain();

            gainNode.gain.value = enabled.checked ? 1 : 0;

            lowpassNode1 = audioContext.createBiquadFilter();

            lowpassNode1.type = "lowpass";
            lowpassNode1.frequency.value = LOWPASS_FREQUENCY;
            lowpassNode1.Q.value = 0.707;


            lowpassNode2 = audioContext.createBiquadFilter();

            lowpassNode2.type = "lowpass";
            lowpassNode2.frequency.value = LOWPASS_FREQUENCY;
            lowpassNode2.Q.value = 0.707;


            lowpassDryGain = audioContext.createGain();

            lowpassWetGain = audioContext.createGain();


            microphoneSource.connect(lowpassDryGain);

            microphoneSource
                .connect(lowpassNode1)
                .connect(lowpassNode2)
                .connect(lowpassWetGain);

            lowpassDryGain.connect(delayNode);
            lowpassWetGain.connect(delayNode);

            delayNode.connect(gainNode);

            gainNode.connect(
                audioContext.destination
            );


            updateLowpass();
            updateStatus();

        } catch (error) {
            console.error(error);

            statusValue.textContent =
                "[Error] Couldn't start a mic: " +
                error.message;

            statusValue.style.color = "red";

            return;
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

