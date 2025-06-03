let song;
let fft;
let playButton;
let isPlaying = false;
let seekSlider;
let timelabel;

let particles = [];

let isRepel = true; // true = 逃げる, false = 吸い寄せる
let modeToggleButton;
let isSphereMode = false;
let sphereToggleButton;





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
  
    let vx = map(noise(this.noiseOffsetX), 0, 1, -this.baseSpeed, this.baseSpeed);
    let vy = map(noise(this.noiseOffsetY), 0, 1, -this.baseSpeed, this.baseSpeed);
  
    // マウスカーソルとの距離で回避ベクトルを加える
    let dx = this.x - mouseX;
    let dy = this.y - mouseY;
    let distSq = dx * dx + dy * dy;
    let avoidRadius = 100 * 100; // 100px以内で反応
    if (distSq < avoidRadius) {
      let force = 10000 / (distSq + 1); // 距離が近いほど強く反応
      let direction = isRepel ? 1 : -1;

      vx += direction * dx * force * 0.01;
      vy += direction * dy * force * 0.01;
    }
  
    this.x += vx;
    this.y += vy;
  
    // 画面ループ
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

  // アップロードフォーム

  sphereToggleButton = createButton("mode: free");
  sphereToggleButton.position(10, 140);
  sphereToggleButton.class("player-btn");
  sphereToggleButton.mousePressed(() => {
    isSphereMode = !isSphereMode;
    sphereToggleButton.html("mode: " + (isSphereMode ? "sphere" : "free"));
  });

  let upload = createFileInput(handleFile);
  upload.position(10, 10);
  upload.attribute('id', 'file-upload');
  upload.style('display', 'none');

  let uploadLabel = createElement('label', 'upload');
  uploadLabel.attribute('for', 'file-upload');
  uploadLabel.class('custom-file-upload');
  uploadLabel.position(10, 10);

  // 再生・停止ボタン
  playButton = createButton("▶ Play");
  playButton.position(windowWidth - windowWidth/1.85, windowHeight - windowHeight/4);
  playButton.class('player-btn');
  playButton.mousePressed(togglePlay);
  
  modeToggleButton = createButton("mode:escape");
  modeToggleButton.position(10, 70);
  modeToggleButton.class("player-btn");
  modeToggleButton.mousePressed(() => {
    isRepel = !isRepel;
    modeToggleButton.html("mode:" + (isRepel ? "escape" : "absorb"));
  });

  fft = new p5.FFT();
  seekSlider = createSlider(0, 100, 0); // 初期値0〜100
  seekSlider.position(windowWidth - windowWidth/1.7, windowHeight - windowHeight/5.1);
  seekSlider.style('width', '300px');
  seekSlider.class('seek-bar');

  seekSlider.input(() => {
    if (song && song.isLoaded()) {
      let val = seekSlider.value(); // 0〜100 の値
      let dur = song.duration();    // 曲の長さ（秒）
      song.jump((val / 100) * dur); // 指定位置へジャンプ
    }
  }
  );
  timeLabel = createP("00:00 / 00:00");
  timeLabel.position(windowWidth - windowWidth/1.85, windowHeight - windowHeight/5.2);
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
      playButton.html("⏸ Stop");
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

  if (song && song.isPlaying()) {
    let spectrum = fft.analyze();
    let current = song.currentTime();
    let dur = song.duration();
    let energy = fft.getEnergy("lowMid");
    let fogDensity = map(energy, 0, 255, 0.8, 2.0);
    seekSlider.value((current / dur) * 100);

    if (song.isLoaded()) {
      let formatTime = (t) => {
        let m = floor(t / 60);
        let s = floor(t % 60);
        return nf(m, 2) + ":" + nf(s, 2);
      };
      timeLabel.html(formatTime(current) + " / " + formatTime(dur));
    }

    // 色と感度
    let sensitivity = map(mouseY, 0, height, 1.5, 0.2);
    let t = map(mouseX, 0, width, 0, 1);
    let r = lerp(100, 255, t);
    let g = lerp(105, 100, t);
    let b = lerp(255, 50, t);

    blendMode(BLEND); // もしくは LIGHTEST
    // drawingContext.shadowBlur = 0; // 残像オフ

    let centerX = width / 2;
    let centerY = height / 2;
    let maxDist = dist(0, 0, centerX, centerY);

    for (let i = 0; i < particles.length; i++) {
      let p = particles[i];
    
      if (isSphereMode) {
        let time = millis() * 0.001;
      
      
        let low = fft.getEnergy("bass");    
        let mid = fft.getEnergy("mid");       
        let high = fft.getEnergy("treble"); 
      
       
        let radius = map(low, 0, 255, 150, 150);       
        let rotY = time * map(mid, 0, 255, 0.2, 1.0);   
        let glowBoost = map(high, 0, 255, 1, 10);    
      
        let theta = acos(1 - 2 * i / particles.length);
        let phi = PI * (1 + Math.sqrt(5)) * i;

        let scaleX = 1.0;
        let scaleY = 0.6;
        let scaleZ = 1.0;
      
        let x0 = radius * scaleX * sin(theta) * cos(phi);
        let z0 = radius * scaleZ * sin(theta) * sin(phi);
        let y0 = radius * scaleY * cos(theta);
      
        let x = x0 * cos(rotY) - z0 * sin(rotY);
        let z = x0 * sin(rotY) + z0 * cos(rotY);
        let y = y0;
      
        x += width / 2;
        y += height / 2;
      
        let size = map(z, -radius, radius, 2, 6) * glowBoost;
        let alpha = map(z, -radius, radius, 80, 255) * glowBoost;
      
        p.x = lerp(p.x, x, 0.05);
        p.y = lerp(p.y, y, 0.05);
        p.z = lerp(p.z || 0, z, 0.05);
      
        push();
        noStroke();
        fill(200, 200, 255, constrain(alpha, 0, 255));
        ellipse(p.x, p.y, size, size);
        pop();
      }else {
        let d = dist(p.x, p.y, width / 2, height / 2);
        let index = floor(map(d, 0, maxDist, 0, spectrum.length));
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
}


