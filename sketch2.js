let song;
let fft;
let playButton;
let isPlaying = false;
let seekSlider;
let timelabel;

let particles = [];

class Particle {
  constructor(x, y, size, speed) {
    this.x = x;
    this.y = y;
    this.baseSize = size;
    this.size = random(1, 3);         // 小さな霧〜中くらいの霧
    this.alpha = random(50, 100);       // 透けた霧と濃い霧の混在
    this.baseSpeed = speed;
    this.noiseOffsetX = random(1000);
    this.noiseOffsetY = random(1000);
    this.noiseSpeedX = random(0.005, 0.015);
    this.noiseSpeedY = random(0.005, 0.015);
  }

  move() {

    this.noiseOffsetX += this.noiseSpeedX;
    this.noiseOffsetY += this.noiseSpeedY;

    this.x += map(noise(this.noiseOffsetX), 0, 1, -this.baseSpeed, this.baseSpeed);
    this.y += map(noise(this.noiseOffsetY), 0, 1, -this.baseSpeed, this.baseSpeed);
    
    this.noiseOffsetX += 0.01;
    this.noiseOffsetY += 0.01;

    if (this.x < 0) this.x = width;
    if (this.x > width) this.x = 0;
    if (this.y < 0) this.y = height;
    if (this.y > height) this.y = 0;
  }

  display(r, g, b, fogDensity = 1) {
    fill(r, g, b, this.alpha);
    let dynamicSize = this.baseSize * fogDensity;
    ellipse(this.x, this.y, dynamicSize);
  }
}

function setup() {
  createCanvas(windowWidth, windowHeight);

  // アップロードフォームを作る
  let upload = createFileInput(handleFile);
  upload.position(10, 10);

  // 再生・停止ボタンを作る
  playButton = createButton("▶ 再生");
  playButton.position(10, 50);
  playButton.mousePressed(togglePlay);

  fft = new p5.FFT();
  seekSlider = createSlider(0, 100, 0); // 初期値0〜100
  seekSlider.position(10, 90);
  seekSlider.style('width', '300px');

  seekSlider.input(() => {
    if (song && song.isLoaded()) {
      let val = seekSlider.value(); // 0〜100 の値
      let dur = song.duration();    // 曲の長さ（秒）
      song.jump((val / 100) * dur); // 指定位置へジャンプ
    }
  }
  );
  timeLabel = createP("00:00 / 00:00");
  timeLabel.position(10, 120);
  timeLabel.style("color", "#ccc");
  timeLabel.style("font-family", "monospace");
  for (let i = 0; i < 1500; i++) {
    let zone = random(1);
    let x, y;
    // if (zone < 0.5) {
    //   // 左側 or 下に多めに出す
    //   x = random(width * 0.1, width * 0.6);
    //   y = random(height * 0.6, height);
    // } else {
    //   x = random(width);
    //   y = random(height);
    // }
      x = random(width);
      y = random(height);
  
    let p = new Particle(x, y, random(3, 10), random(0.2, 0.5));
    particles.push(p);
  }
}

function handleFile(file) {
  if (file.type === 'audio') {
    if (song && song.isPlaying()) {
      song.stop();
    }
    song = loadSound(file.data, () => {
      userStartAudio(); // 再生制限の解除
      song.play();
      isPlaying = true;
      playButton.html("⏸ 停止");
    });
  } else {
    console.log("オーディオファイルではありません");
  }
}

function togglePlay() {
  if (song && song.isLoaded()) {
    if (!isPlaying) {
      userStartAudio();
      song.play();
      playButton.html("⏸ 停止");
      isPlaying = true;
    } else {
      song.pause();
      playButton.html("▶ 再生");
      isPlaying = false;
    }
  }
}

function draw() {
  background(0);

  noStroke();
  for (let y = 0; y < height; y += 9) {
    for (let x = 0; x < width; x += 9) {
      let scale = 0.01; // ← 小さくする（例: 0.005 → 0.002）
      let fog = noise(x * scale, y * scale, frameCount * 0.003);
      let alpha = map(fog, 0, 1, 0, 10);
      let radius = map(fog, 0, 1, 500, 10);
      fill(170, 170, 190, alpha); // 淡いブルー霧
      ellipse(x, y, radius);
    }
  }

  if (song && song.isPlaying()) {
    let spectrum = fft.analyze();
    let current = song.currentTime();
    let dur = song.duration();
    let energy = fft.getEnergy("highMid"); // or "bass", "mid", "highMid"
    let fogDensity = map(energy, 0, 255, 0.8, 10); // 音に応じて 0.8〜2倍に変化
    seekSlider.value((current / dur) * 100);

    if (song.isLoaded()) {
      let formatTime = (t) => {
        let m = floor(t / 60);
        let s = floor(t % 60);
        return nf(m, 2) + ":" + nf(s, 2);
      };
      timeLabel.html(formatTime(current) + " / " + formatTime(dur));
    }

    // 🎨 色と感度設定
    let sensitivity = map(mouseY, 0, height, 1.5, 0.2);
    let t = map(mouseX, 0, width, 0, 1);
    let r = lerp(100, 255, t);
    let g = lerp(105, 100, t);
    let b = lerp(255, 50, t);

    blendMode(SOFT_LIGHT); // もしくは LIGHTEST

    drawingContext.shadowBlur = 30;
    drawingContext.shadowColor = color(r, g, b, 50);

    fill(r, g, b, 40);
    noStroke();
    ellipse(this.x, this.y, this.size);

    drawingContext.shadowBlur = 0; // ←必ず戻す

    // 🫧 粒子たちを動かして表示
    for (let i = 0; i < particles.length; i++) {
      let p = particles[i];

      let index = floor(map(p.x, 0, width, 0, spectrum.length));
      let boost = map(spectrum[index], 0, 255, 0.5, 2.5);

      p.move();
      p.display(
        r + random(-5, 5),
        g + random(-5, 5),
        b + random(-5, 5),
        fogDensity * boost * sensitivity
      );
    }
  }
}