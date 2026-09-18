const enabled = document.getElementById("enabled");
const delaySlider = document.getElementById("delay");
const delayValue = document.getElementById("delayValue");
const lowpassEnabled = [
    document.getElementById("lowpass1"),
    document.getElementById("lowpass2"),
    document.getElementById("lowpass3"),
    document.getElementById("lowpass4"),
];
const statusValue = document.getElementById("status");
const pipelineValue = document.getElementById("pipeline");

let firstTime = true;

let audioContext = null;
let microphoneStream = null;
let microphoneSource = null;

let delayNode = null;
let gainNode = null;

const LOWPASS_FREQUENCIES = [
    6000,
    6000,
    6000,
    5000,
];

const lowpassStages = [];


delaySlider.addEventListener("input", () => {
    delayValue.textContent = delaySlider.value;

    if (delayNode !== null && audioContext !== null) {
        delayNode.delayTime.setValueAtTime(
            Number(delaySlider.value) / 1000,
            audioContext.currentTime
        );
    }

    updatePipeline();
});


lowpassEnabled.forEach((checkbox) => {
    checkbox.addEventListener("change", () => {
        updateLowpass();
        updatePipeline();
    });
});


function updateLowpass() {
    if (audioContext === null || lowpassStages.length === 0) {
        return;
    }

    const now = audioContext.currentTime;

    lowpassStages.forEach((stage, index) => {
        const filterEnabled = lowpassEnabled[index].checked;

        stage.dryGain.gain.cancelScheduledValues(now);
        stage.wetGain.gain.cancelScheduledValues(now);

        stage.dryGain.gain.setValueAtTime(
            stage.dryGain.gain.value,
            now
        );

        stage.wetGain.gain.setValueAtTime(
            stage.wetGain.gain.value,
            now
        );

        stage.dryGain.gain.linearRampToValueAtTime(
            filterEnabled ? 0 : 1,
            now + 0.005
        );

        stage.wetGain.gain.linearRampToValueAtTime(
            filterEnabled ? 1 : 0,
            now + 0.005
        );
    });
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

            delayNode =
                audioContext.createDelay(2.0);

            delayNode.delayTime.value =
                Number(delaySlider.value) / 1000;

            gainNode =
                audioContext.createGain();

            gainNode.gain.value =
                enabled.checked ? 1 : 0;


            // Create LowPass stages
            lowpassStages.length = 0;

            LOWPASS_FREQUENCIES.forEach((frequency) => {
                const filter = audioContext.createBiquadFilter();

                const dryGain = audioContext.createGain();

                const wetGain = audioContext.createGain();

                filter.type = "lowpass";
                filter.frequency.value = frequency;
                filter.Q.value = 0.707;

                lowpassStages.push({
                    filter,
                    dryGain,
                    wetGain
                });
            });


            // Connect LowPass stages
            let stageInput = microphoneSource;

            lowpassStages.forEach((stage) => {
                const stageOutput =
                    audioContext.createGain();

                stageInput.connect(stage.dryGain);
                stageInput.connect(stage.filter);

                stage.filter.connect(stage.wetGain);

                stage.dryGain.connect(stageOutput);
                stage.wetGain.connect(stageOutput);

                stageInput = stageOutput;
            });


            // Last stage → Delay
            stageInput.connect(delayNode);


            // Output
            delayNode.connect(gainNode);

            gainNode.connect(
                audioContext.destination
            );


            updateLowpass();
            updateStatus();
            updatePipeline();

        } catch (error) {
            console.error(error);

            statusValue.textContent =
                "[Error] Couldn't initialize a microphone: " +
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
    updatePipeline();
});


function updateStatus() {
    statusValue.textContent = enabled.checked
        ? "Connected."
        : "Disconnected.";

    statusValue.style.color = enabled.checked ? "green" : "red";
}

function updatePipeline() {
    // base :         {Microphone} → (Low-pass 1) → (Low-pass 2) → (Low-pass 3) → [Delay] → {Speaker}

    const LEFT_ARROW = " → ";
    const MIC = "{Microphone}";
    const SPEAKER = "{Speaker}";

    var lowPasses = "";

    LOWPASS_FREQUENCIES.forEach((frequency, index) => {
       if (lowpassEnabled[index].checked) {
            lowPasses += `(${frequency}Hz Low-pass No.${index+1})${LEFT_ARROW}`;
       }
    });

    const delay = `[${delayValue.textContent}ms Delay]`;
    
    const pipelineText = `${enabled.checked ? "":"<s>"}${MIC}${LEFT_ARROW}${lowPasses}${delay}${LEFT_ARROW}${SPEAKER}${enabled.checked ? "":"</s>"}`;
    
    pipelineValue.innerHTML = pipelineText;
}

updatePipeline();
