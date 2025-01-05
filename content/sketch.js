//This project uses:
// - p5.js (https://p5js.org)
// - ml5.js (https://ml5js.org)
// Global var
let handPose;
let video;
let hands = [];
let branches = [];
let blooms = [];
const NUM_BRANCHES = 12;
let lastDist = 0;
let lastTime = 0;
const shrinkInt = 15000; // 15 seconds
const origPalette = [
  [255, 116, 212],
  [252, 239, 180],
];
const coldPalette = [
  [100, 149, 237],
  [173, 216, 230],
];
let isFast = false;
let moveSpeed = 0;
const speedThresh = 5; // Speed threshold

function preload() {
  handPose = ml5.handPose();
}

function setup() {
  createCanvas(windowWidth, windowHeight);
  video = createCapture(VIDEO);
  video.size(windowWidth, windowHeight);
  video.hide();
  handPose.detectStart(video, gotHands);
  initBranches();
  setInterval(updateBranchRelations, 7000);
}

function gotHands(results) {
  hands = results;
}

function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  video.size(windowWidth, windowHeight);
  initBranches();
}

function draw() {
  background(51);
  drawBranches();
  drawBlooms();

  for (let hand of hands) {
    if (hand.keypoints && hand.keypoints.length > 0) {
      let indexFinger = hand.keypoints[8];
      let thumb = hand.keypoints[4];
      let distance = dist(indexFinger.x, indexFinger.y, thumb.x, thumb.y);
      updateBloomSizes(distance);
    }
  }
}

function drawBranches() {
  for (let branch of branches) {
    branch.show();
  }
}

function drawBlooms() {
  for (let bloom of blooms) {
    bloom.update();
    bloom.show();
  }
}

//The size of blooms updates based on hands movement
function updateBloomSizes(distance) {
  let currTime = millis();
  let timeDiff = currTime - lastTime;
  let distDiff = abs(distance - lastDist);
  moveSpeed = distDiff / timeDiff;

  let minDistance = 20;
  let maxDistance = 200;
  let minSize = 5;
  let maxSize = 30;
  let newSize = map(distance, minDistance, maxDistance, minSize, maxSize);
  newSize = constrain(newSize, minSize, maxSize);

  for (let bloom of blooms) {
    bloom.targetSize = newSize;
    bloom.updateColor(moveSpeed);
  }

  isFast = moveSpeed > speedThresh;

  lastDist = distance;
  lastTime = currTime;
}

//Creates the main branch, then updates the relationships of branches
function initBranches() {
  branches = [];
  let a = createVector(width / 2, height);
  let b = createVector(width / 2, height - height / 4);
  branches.push(new Branch(a, b, 15, "branch1"));

  for (let i = 1; i < NUM_BRANCHES; i++) {
    let parent = branches[Math.floor((i - 1) / 2)];
    let angle = i % 2 === 0 ? PI / 5 : -PI / 5;
    let dir = p5.Vector.sub(parent.end, parent.begin);
    dir.rotate(angle);
    dir.mult(0.75);
    let newEnd = p5.Vector.add(parent.end, dir);
    branches.push(
      new Branch(parent.end, newEnd, parent.thickness * 0.85, `branch${i + 1}`)
    );
  }

  updateBranchRelations();
}

// Relationships(active, middle, negative), blooming based on the reaction between branches
function updateBranchRelations() {
  const relationPairs = [
    [0, 1],
    [0, 2],
    [1, 3],
    [1, 4],
    [2, 5],
    [2, 6],
    [6, 7],
    [6, 8],
    [8, 9],
    [8, 10],
    [10, 11],
  ];
  blooms = [];
  for (let [i, j] of relationPairs) {
    if (branches[i] && branches[j]) {
      let relation = random(["active", "middle", "negative"]);
      branches[i].relations[j] = relation;
      branches[j].relations[i] = relation;
      if (relation !== "negative") {
        let midX = (branches[i].end.x + branches[j].begin.x) / 2;
        let midY = (branches[i].end.y + branches[j].begin.y) / 2;
        let numBlooms = relation === "active" ? random(40, 60) : random(5, 10);
        for (let k = 0; k < numBlooms; k++) {
          let bloomX = midX + random(-70, 70);
          let bloomY = midY + random(-70, 70);
          let bloomColor = random(origPalette);
          let bloomSize = random(8, 15);
          blooms.push(new Bloom(bloomX, bloomY, bloomSize, bloomColor));
        }
      }
    }
  }
}

class Branch {
  constructor(begin, end, thickness, name) {
    this.begin = begin;
    this.end = end;
    this.finished = false;
    this.thickness = thickness;
    this.name = name;
    this.relations = {};
  }

  show() {
    stroke(255);
    strokeWeight(this.thickness);
    line(this.begin.x, this.begin.y, this.end.x, this.end.y);
  }
}

class Bloom {
  constructor(x, y, size, color) {
    this.x = x;
    this.y = y;
    this.size = size;
    this.targetSize = size;
    this.origColor = color;
    this.currColor = color;
    this.coldColor = random(coldPalette);
    this.colorSpeed = 0.05;
  }

  show() {
    noStroke();
    fill(this.currColor);
    ellipse(this.x, this.y, this.size);
  }

  update() {
    this.size = lerp(this.size, this.targetSize, 0.3);
  }

  updateColor(moveSpeed) {
    if (moveSpeed > speedThresh) {
      // Quickly transition to cold color
      this.currColor = this.coldColor;
    } else {
      // Slowly transition back to original color
      this.currColor = [
        lerp(this.currColor[0], this.origColor[0], this.colorSpeed),
        lerp(this.currColor[1], this.origColor[1], this.colorSpeed),
        lerp(this.currColor[2], this.origColor[2], this.colorSpeed),
      ];
    }
  }
}
