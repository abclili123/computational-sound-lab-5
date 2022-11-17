let audioCtx;
let oscs;
let globGain;
var globalAnalyser;

// https://p5js.org/examples/simulate-game-of-life.html
// cellular automata code used from link above 

let w;
let columns;
let rows;
let board;
let next;
let fr = 10;

function setup() {
    noStroke()

    // Set simulation framerate to 10 to avoid flickering
    frameRate(fr);
    var canvas = createCanvas(320,320);
    canvas.parent('animation');
    w = 20;
    // Calculate columns and rows
    columns = floor(width / w);
    console.log(columns)
    rows = floor(height / w);
    // Wacky way to make a 2D array is JS
    board = new Array(columns);
    for (let i = 0; i < columns; i++) {
        board[i] = new Array(rows);
    }
    // Going to use multiple 2D arrays and swap them
    next = new Array(columns);
    for (let i = 0; i < columns; i++) {
        next[i] = new Array(rows);
    }
    initAudio();
    init();
}

var maxAlltime = 0
function peak() {
    globalAnalyser.fftSize = 2048;
    var bufferLength = globalAnalyser.frequencyBinCount;
    var dataArray = new Uint8Array(bufferLength);
    globalAnalyser.getByteTimeDomainData(dataArray);

    //values range 0-255, over the range -1,1, so we find the max value from a frame, and then scale
    var maxValue = (dataArray.reduce((max, curr) => (curr > max ? curr : max)) - 128) / 127.0;
    //console.log(maxValue);
    if (maxValue > maxAlltime){
        maxAlltime = maxValue;
        console.log("New record! -> " + maxAlltime);
    }
    requestAnimationFrame(peak);
}

function initAudio(){
    audioCtx = new (window.AudioContext || window.webkitAudioContext);
    globGain = audioCtx.createGain()
    globGain.gain.setValueAtTime(0.1, audioCtx.currentTime)
    globalAnalyser = audioCtx.createAnalyser();
    globGain.connect(globalAnalyser);
    globGain.connect(globalAnalyser);
    globGain.connect(audioCtx.destination)
    peak();

    // array of oscs
    oscs = new Array(columns);
    for (let i = 0; i < columns; i++) {
        oscs[i] = new Array(rows);
    }

    if(rows == 16 && columns == 16){
        notes = new Array(columns);
        notes[0] = [36.71, 41.20, 46.25, 49.00, 55.00, 61.74, 69.30, 73.42]
        notes[1] = [55.00, 61.74, 69.30, 73.42, 82.41, 92.50, 103.83, 110.00]
        notes[2] = [61.74, 69.30, 77.78, 82.41, 92.50, 103.83, 116.54, 123.47]
        notes[3] = [49.00, 55.00, 61.74, 65.41, 73.42, 82.41, 87.31, 98.00]
        notes[4] = [73.42, 82.41, 92.50, 98.00, 110.00, 123.47, 138.59, 146.83]
        notes[5] = [110.00, 123.47, 138.59, 146.83, 164.81, 185.00, 207.65, 220.00]
        notes[6] = [123.47, 138.59, 155.56, 164.81, 185.00, 207.65, 233.08, 246.94]
        notes[7] = [98.00, 110.00, 123.47, 130.81, 146.83, 164.81, 174.61, 196.00]
        notes[8] = [146.83, 164.81, 185.00, 196.00, 220.00, 246.94, 277.18, 293.66]
        notes[9] = [220.00, 246.94, 277.18, 293.66, 329.63, 369.99, 415.30, 440.00]
        notes[10] = [246.94, 277.18, 311.13, 329.63, 369.99, 415.30, 466.16, 493.88]
        notes[11] = [196.00, 220.00, 246.94, 261.63, 293.66, 329.63, 349.23, 392.00]
        notes[12] = [293.66, 329.63, 369.99, 392.00, 440.00, 493.88, 554.37, 587.33]
        notes[13] = [440.00, 493.88, 554.37, 587.33, 659.25, 739.99, 830.61, 880.00]
        notes[14] = [493.88, 554.37, 622.25, 659.25,739.99, 830.61, 932.33, 987.77]
        notes[15] = [392.00, 440.00, 493.88, 523.25, 587.33, 659.25, 698.46, 783.99]
    }

    // populate array with oscs
    for (let x = 0; x < columns; x++) {
        for (let y = 0; y < rows; y++) {
            oscs[x][y] = new Array(2);

            oscs[x][y][1] = audioCtx.createGain();
            oscs[x][y][1].gain.setValueAtTime(0, audioCtx.currentTime);
            oscs[x][y][1].connect(globGain)

            oscs[x][y][0] = audioCtx.createOscillator();
            if(rows == 16 && columns == 16){
                if(y<8){
                    oscs[x][y][0].frequency.setValueAtTime(notes[x][y], audioCtx.currentTime);
                }
                else{
                    oscs[x][y][0].frequency.setValueAtTime(notes[x][y-8], audioCtx.currentTime);
                }
            }
            else{
                oscs[x][y][0].frequency.setValueAtTime(Math.cbrt(x*100) + y*20 + 500, audioCtx.currentTime);
            }
            oscs[x][y][0].start();
            oscs[x][y][0].connect(oscs[x][y][1])
        }
    }
}

function draw() {
    background(255);
    generate();
    for ( let i = 0; i < columns;i++) {
        for ( let j = 0; j < rows;j++) {
            if ((board[i][j] == 1)){
                r = random(255); // r is a random number between 0 - 255
                g = random(0,100); // g is a random number betwen 100 - 200
                b = random(200); // b is a random number between 0 - 100
                fill(r, g, b);
                var bgColor = "rgb(" + r + "," + g + "," + b + ")";
                document.getElementById("click").style.color = bgColor;
                oscs[i][j][1].gain.setTargetAtTime(0.2, audioCtx.currentTime, 1);
            }
            else fill(255);
            rect(i * w, j * w, w-1, w-1);
        }
    }

}

// reset board when mouse is pressed
function mousePressed() {
    init();
}

// Fill board randomly
function init() {
    for (let i = 0; i < columns; i++) {
        for (let j = 0; j < rows; j++) {
            // Lining the edges with 0s
            if (i == 0 || j == 0 || i == columns-1 || j == rows-1) board[i][j] = 0;
            // Filling the rest randomly
            else board[i][j] = floor(random(2));
            next[i][j] = 0;
            oscs[i][j][1].gain.setTargetAtTime(0, audioCtx.currentTime+ 1/fr, 0.01);
        }
    }
}

// The process of creating the new generation
function generate() {
    // Loop through every spot in our 2D array and check spots neighbors
    for (let x = 1; x < columns - 1; x++) {
        for (let y = 1; y < rows - 1; y++) {
            // Add up all the states in a 3x3 surrounding grid
            let neighbors = 0;
            for (let i = -1; i <= 1; i++) {
                for (let j = -1; j <= 1; j++) {
                    neighbors += board[x+i][y+j];
                }
            }

            // A little trick to subtract the current cell's state since
            // we added it in the above loop
            neighbors -= board[x][y];
            // Rules of Life
            if ((board[x][y] === 1) && (neighbors <  2)){ // Loneliness
                next[x][y] = 0;
                oscs[x][y][1].gain.setTargetAtTime(0, audioCtx.currentTime+ 1/fr, 0.01);
            }
            else if ((board[x][y] === 1) && (neighbors >  3)){ // Overpopulation
                next[x][y] = 0;
                oscs[x][y][1].gain.setTargetAtTime(0, audioCtx.currentTime+ 1/fr, 0.01);
            }
            else if ((board[x][y] === 0) && (neighbors == 3)){ // Reproduction
                next[x][y] = 1;
            }
            else next[x][y] = board[x][y];  // Stasis
        }
    }

    // Swap!
    let temp = board;
    board = next;
    next = temp;
}

