let song;
let fft;
let playButton;
let isPlaying = false;
let seekSlider;
let timeLabel;

let particles = [];
let isRepel = true;
let isSphereMode = false;
let modeToggleButton;
let sphereToggleButton;
let rotSpeed = 0.0003;

let prevKickEnergy = 0;
let kickThreshold = 200;
let kickDetected = false;

let reactiveShape = {
  baseSize: 100,
  size: 100,
  pulse: 0,
  shapeIndex: 0,
  lastSwitchTime: 0
};
let shapeTypes = ["sphere", "box", "torus"];

let shapeParticles = [];
const shapeParticleCount = 600;

function setup() {
  createCanvas(windowWidth, windowHeight, WEBGL);
  colorMode(HSB);
  noStroke();
  fft = new p5.FFT();

  let upload = createFileInput(handleFile);
  upload.position(10, 10).attribute('id', 'file-upload').style('display', 'none');
  createElement('label', 'upload').attribute('for', 'file-upload').class('custom-file-upload').position(10, 10);

  playButton = createButton("▶ Play").position(windowWidth - windowWidth/1.85, windowHeight - windowHeight/4).class('player-btn').mousePressed(togglePlay);
  modeToggleButton = createButton("mode: escape").position(10, 70).class("player-btn").mousePressed(() => {
    isRepel = !isRepel;
    modeToggleButton.html("mode: " + (isRepel ? "escape" : "absorb"));
  });
  sphereToggleButton = createButton("mode: free").position(10, 140).class("player-btn").mousePressed(() => {
    isSphereMode = !isSphereMode;
    sphereToggleButton.html("mode: " + (isSphereMode ? "sphere" : "free"));
    isSphereMode ? updateParticleTargetsToSphere() : updateParticleTargetsToFree();
  });

  seekSlider = createSlider(0, 100, 0).position(windowWidth - windowWidth/1.7, windowHeight - windowHeight/5.1).style('width', '300px').class('seek-bar').input(() => {
    if (song && song.isLoaded()) song.jump((seekSlider.value() / 100) * song.duration());
  });

  timeLabel = createP("00:00 / 00:00").position(windowWidth - windowWidth/1.85, windowHeight - windowHeight/5.2).style("color", "#ccc").style("font-family", "monospace");

  for (let i = 0; i < 1200; i++) particles.push(new Particle(random(-width / 2, width / 2), random(-height / 2, height / 2)));
  updateParticleTargetsToFree();
  initShapeParticles();
}
function draw() {
  background(0);
  if (song && song.isLoaded()) fft.analyze();

  if (song && song.isPlaying()) {
    let energyBass = fft.getEnergy("bass");
    let energyLow = fft.getEnergy("lowMid");
    let energyMid = fft.getEnergy("mid");
    let energyHigh = fft.getEnergy("highMid");
    let energyTreble = fft.getEnergy("treble");

    kickDetected = (energyBass > kickThreshold && prevKickEnergy <= kickThreshold);
    prevKickEnergy = energyBass;

    let current = song.currentTime();
    let dur = song.duration();
    seekSlider.value((current / dur) * 100);
    timeLabel.html(nf(floor(current / 60), 2) + ":" + nf(floor(current % 60), 2) + " / " + nf(floor(dur / 60), 2) + ":" + nf(floor(dur % 60), 2));

    let fogDensity = map(energyLow, 0, 255, 0.8, 2.0);
    rotSpeed = lerp(rotSpeed, map(energyMid, 0, 255, 0.0001, 0.001), 0.05);
    if (isSphereMode) {
      rotateY(millis() * rotSpeed);
      rotateX(millis() * rotSpeed * 0.6);
    }

    for (let p of particles) {
      p.move();
      if (isSphereMode) {
        let noiseVal = noise(p.tx * 0.01, p.ty * 0.01, p.tz * 0.01 + millis() * 0.0005);
        let brightness = map(noiseVal, 0, 1, 150, 255) * map(energyTreble, 0, 255, 1, 2);
        let particleSize = map(energyBass, 0, 255, 2.5, 100);
        let alphaBoost = map(energyMid, 0, 255, 1, 2);
        let hueShift = map(energyTreble, 0, 255, 180, 300);
        push(); translate(p.x, p.y, p.z);
        fill(hueShift, 80, brightness, p.alpha * alphaBoost);
        ellipse(0, 0, particleSize);
        pop();
      } else {
        let r = map(mouseX, 0, width, 100, 255);
        let g = map(mouseY, 0, height, 105, 100);
        let b = 200;
        p.display(r, g, b, fogDensity);
      }
    }
    drawKickShapeAsPoints(energyBass, energyMid, energyTreble);
  }
}

function initShapeParticles() {
  for (let i = 0; i < shapeParticleCount; i++) {
    shapeParticles.push(createVector(0, 0, 0));
  }
}

function updateShapeParticles(type, size) {
  for (let i = 0; i < shapeParticles.length; i++) {
    let t = millis() * 0.0002;
    let p;
    switch (type) {
      case "sphere":
        let theta = acos(1 - 2 * i / shapeParticleCount);
        let phi = PI * (1 + Math.sqrt(5)) * i;
        p = createVector(
          size * sin(theta) * cos(phi),
          size * sin(theta) * sin(phi),
          size * cos(theta)
        );
        break;
      case "box":
        p = createVector(
          sin(i * 0.1 + t) * size,
          cos(i * 0.2 + t) * size,
          sin(i * 0.3 + t) * size
        );
        break;
      case "torus":
        let a = map(i, 0, shapeParticleCount, 0, TWO_PI);
        let b = map(i * 3, 0, shapeParticleCount, 0, TWO_PI);
        let r = size * 0.3;
        let R = size;
        p = createVector(
          (R + r * cos(b)) * cos(a),
          (R + r * cos(b)) * sin(a),
          r * sin(b)
        );
        break;
    }
    // 揺らぎ追加
    p.x += sin(t + i) * 5;
    p.y += cos(t + i * 0.5) * 5;
    p.z += sin(t + i * 0.3) * 5;
    shapeParticles[i] = p;
  }
}

function drawKickShapeAsPoints(energyBass, energyMid, energyTreble) {
  if (kickDetected) {
    reactiveShape.pulse = 1;
    if (millis() - reactiveShape.lastSwitchTime > 1000) {
      reactiveShape.shapeIndex = (reactiveShape.shapeIndex + 1) % shapeTypes.length;
      reactiveShape.lastSwitchTime = millis();
    }
  }

  reactiveShape.pulse = lerp(reactiveShape.pulse, 0, 0.1);
  let t = millis() * 0.001;
  let dynamicSize = map(energyBass, 0, 255, 100, 280) + reactiveShape.pulse * 60;
  reactiveShape.size = lerp(reactiveShape.size, dynamicSize, 0.2);
  updateShapeParticles(shapeTypes[reactiveShape.shapeIndex], reactiveShape.size);

  push();
  translate(0, 0, -300); // 中心固定
  for (let i = 0; i < shapeParticles.length; i++) {
    let p = shapeParticles[i];
    let hue = (map(energyTreble, 0, 255, 180, 360) + i * 0.3) % 360;
    fill(hue, 80, 255);
    push();
    translate(p.x, p.y, p.z);
    ellipse(0, 0, 2.5);
    pop();
  }
  pop();
}

function handleFile(file) {
  if (file.type === 'audio') {
    if (song && song.isPlaying()) song.stop();
    song = loadSound(file.data, () => {
      userStartAudio();
      song.play();
      isPlaying = true;
      playButton.html("⏸ Stop");
    });
  }
}

function togglePlay() {
  if (song && song.isLoaded()) {
    if (!isPlaying) {
      song.play(); playButton.html("⏸ Stop"); isPlaying = true;
    } else {
      song.pause(); playButton.html("▶ Play"); isPlaying = false;
    }
  }
}

function updateParticleTargetsToSphere() {
  let r = 220;
  for (let i = 0; i < particles.length; i++) {
    let theta = acos(1 - 2 * i / particles.length);
    let phi = PI * (1 + Math.sqrt(5)) * i;
    particles[i].tx = r * sin(theta) * cos(phi);
    particles[i].ty = r * sin(theta) * sin(phi);
    particles[i].tz = r * cos(theta);
  }
}

function updateParticleTargetsToFree() {
  for (let p of particles) {
    p.tx = random(-width / 2, width / 2);
    p.ty = random(-height / 2, height / 2);
    p.tz = 0;
  }
}

class Particle {
  constructor(x, y) {
    this.x = x; this.y = y; this.z = 0;
    this.tx = x; this.ty = y; this.tz = 0;
    this.baseSize = random(1, 3);
    this.alpha = random(50, 100);
    this.baseSpeed = random(0.2, 0.5);
    this.noiseOffsetX = random(1000);
    this.noiseOffsetY = random(1000);
    this.noiseSpeedX = random(0.005, 0.015);
    this.noiseSpeedY = random(0.005, 0.015);
  }
  move() {
    if (!isSphereMode) {
      this.noiseOffsetX += this.noiseSpeedX;
      this.noiseOffsetY += this.noiseSpeedY;
      let vx = map(noise(this.noiseOffsetX), 0, 1, -this.baseSpeed, this.baseSpeed);
      let vy = map(noise(this.noiseOffsetY), 0, 1, -this.baseSpeed, this.baseSpeed);
      let dx = this.x - (mouseX - width / 2);
      let dy = this.y - (mouseY - height / 2);
      let distSq = dx * dx + dy * dy;
      let avoidRadius = 100 * 100;
      if (distSq < avoidRadius) {
        let force = 10000 / (distSq + 1);
        let direction = isRepel ? 1 : -1;
        vx += direction * dx * force * 0.01;
        vy += direction * dy * force * 0.01;
        let energyFactor = map(fft.getEnergy("lowMid"), 0, 255, 0.5, 2.0);
        vx *= energyFactor;
        vy *= energyFactor;
      }
      this.x += vx; this.y += vy;
      this.z = lerp(this.z, 0, 0.05);
      if (this.x < -width / 2) this.x = width / 2;
      if (this.x > width / 2) this.x = -width / 2;
      if (this.y < -height / 2) this.y = height / 2;
      if (this.y > height / 2) this.y = -height / 2;
      this.tx = this.x; this.ty = this.y; this.tz = this.z;
    } else {
      this.x = lerp(this.x, this.tx, 0.05);
      this.y = lerp(this.y, this.ty, 0.05);
      this.z = lerp(this.z, this.tz, 0.05);
    }
  }
  display(r, g, b, fogDensity = 1) {
    push();
    translate(this.x, this.y, this.z);
    fill(r, g, b, this.alpha);
    ellipse(0, 0, this.baseSize * fogDensity);
    pop();
  }
}
