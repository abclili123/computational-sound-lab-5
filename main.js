const audioCtx = new (window.AudioContext || window.webkitAudioContext);
let oscs = []
const globGain = audioCtx.createGain();
globGain.connect(audioCtx.destination)

// we start by defining some input (not training) data
TWINKLE_TWINKLE = {
    notes: [
        {pitch: 60, startTime: 0.0, endTime: 0.5},
        {pitch: 60, startTime: 0.5, endTime: 1.0},
        {pitch: 67, startTime: 1.0, endTime: 1.5},
        {pitch: 67, startTime: 1.5, endTime: 2.0},
        {pitch: 69, startTime: 2.0, endTime: 2.5},
        {pitch: 69, startTime: 2.5, endTime: 3.0},
        {pitch: 67, startTime: 3.0, endTime: 4.0},
        {pitch: 65, startTime: 4.0, endTime: 4.5},
        {pitch: 65, startTime: 4.5, endTime: 5.0},
        {pitch: 64, startTime: 5.0, endTime: 5.5},
        {pitch: 64, startTime: 5.5, endTime: 6.0},
        {pitch: 62, startTime: 6.0, endTime: 6.5},
        {pitch: 62, startTime: 6.5, endTime: 7.0},
        {pitch: 60, startTime: 7.0, endTime: 8.0},
    ],
    totalTime: 8
};

function midiToFreq(m) {
    return Math.pow(2, (m - 69) / 12) * 440;
}

//to play notes that are generated from .continueSequence
//we need to unquantize, then loop through the list of notes
function playNotes(noteList) {
    noteList = mm.sequences.unquantizeSequence(noteList)
    console.log(noteList.notes)
    noteList.notes.forEach(note => {
        playNote(note);
    });
}

function playNote(note) {
    let offset = 0.5 //it takes a bit of time to queue all these events
    globGain.gain.setTargetAtTime(0.8/totalOsc, audioCtx.currentTime+ note.startTime+offset, 1);
    let i = 0
    while(i<totalOsc){
        if(i===0){
            oscs[i].frequency.setTargetAtTime(midiToFreq(note.pitch), audioCtx.currentTime+ note.startTime + offset, 0.001)
        }
        else if (i > 0 && i < 3) {
            oscs[i].frequency.setTargetAtTime(midiToFreq(note.pitch) * i + (Math.random() * 15), audioCtx.currentTime+ note.startTime + offset, 0.001)
        } else if (i >= 3) {
            oscs[i].frequency.setTargetAtTime(midiToFreq(note.pitch) * i - (Math.random() * 15), audioCtx.currentTime+ note.startTime + offset, 0.001)
        }
        i+=1
    }
    globGain.gain.setTargetAtTime(0, audioCtx.currentTime+ note.endTime+offset-0.05, 0.01)
}

function genNotes() {
    //load a pre-trained RNN model
    music_rnn = new mm.MusicRNN('https://storage.googleapis.com/magentadata/js/checkpoints/music_rnn/basic_rnn');
    music_rnn.initialize();

    //the RNN model expects quantized sequences
    const qns = mm.sequences.quantizeNoteSequence(TWINKLE_TWINKLE, 4);

    //and has some parameters we can tune
    rnn_steps = 40; //including the input sequence length, how many more quantized steps (this is diff than how many notes) to generate
    rnn_temperature = 1.1; //the higher the temperature, the more random (and less like the input) your sequence will be

    // we continue the sequence, which will take some time (thus is run async)
    // "then" when the async continueSequence is done, we play the notes
    music_rnn
        .continueSequence(qns, rnn_steps, rnn_temperature)
        .then((sample) => playNotes(mm.sequences.concatenate([qns,sample])));

}

let first = true;
const playButton = document.querySelector('button');
playButton.addEventListener('click', function() {
    setSynth();
    first = false;
    console.log("enter")
    genNotes();
}, false);

function setSynth(){
    totalOsc = 0
    globGain.gain.value = 0;

    const gainNode = audioCtx.createGain();
    gainNode.connect(globGain)
    gainNode.gain.value = 0.5;

    totalOsc += 1
    if(first) {
        oscs[0] = audioCtx.createOscillator();
        oscs[0].connect(gainNode);
        oscs[0].start()
    }
    oscs[0].type = document.getElementById('wave').value

    let activateLfo = document.getElementById('lfo').checked
    if(activateLfo){
        const lfo = audioCtx.createOscillator();
        lfo.frequency.value = 15;
        lfoGain = audioCtx.createGain();
        lfoGain.gain.value = 50;
        lfo.connect(lfoGain).connect(oscs[0].frequency);
        lfo.start();
    }

    // initiate AM
    let yesAm = document.getElementById('yesAm').checked
    let am = document.getElementById('am').value
    if(yesAm){
        const modulatorFreq = audioCtx.createOscillator();
        modulatorFreq.frequency.value = am;
        const depth = audioCtx.createGain();
        depth.gain.setValueAtTime(0, audioCtx.currentTime);
        depth.gain.setTargetAtTime(0.5, audioCtx.currentTime, 1);
        gainNode.gain.setTargetAtTime(1.0 - depth.gain.value, audioCtx.currentTime, 1);
        modulatorFreq.connect(depth).connect(gainNode.gain)
        modulatorFreq.start();
    }

    let fm = document.getElementById('fm').value
    let modulationIndex = audioCtx.createGain();
    let fmInd = document.getElementById('fmInd').value
    if(fm>0){
        const fmFreq = audioCtx.createOscillator();
        modulationIndex.gain.value = fmInd;
        fmFreq.frequency.value = fm;
        fmFreq.connect(modulationIndex);
        modulationIndex.connect(oscs[0].frequency)
        fmFreq.start();
    }

    let additive = document.getElementById('additive').value;
    if(additive > 0) {
        for (let i = 1; i <= additive; i++) {
            totalOsc += 1
            oscs[i] = audioCtx.createOscillator();
            oscs[i].type = document.getElementById('wave').value
            if (fm > 0) {
                modulationIndex.connect(oscs[i].frequency)
            }
            oscs[i].connect(gainNode)
            oscs[i].start();
        }
    }
}