// Pluie rouge style Matrix

const cv = document.getElementById("rain");

const cx = cv.getContext("2d");

const chars = "アイウエオカキクケコサシスセソタチツテトナニヌネノ0123456789ZODYL#$%&@".split("");

let cols, drops;



function size() {

  cv.width = innerWidth;

  cv.height = innerHeight;

  cols = Math.floor(cv.width / 18);

  drops = Array(cols).fill(0).map(() => Math.random() * -50);

}

size();

addEventListener("resize", size);



setInterval(() => {

  cx.fillStyle = "rgba(5,0,3,.12)";

  cx.fillRect(0, 0, cv.width, cv.height);

  cx.font = "16px monospace";

  drops.forEach((y, i) => {

    cx.fillStyle = Math.random() > .97 ? "#ffb3ba" : "#ff1a2e";

    cx.fillText(chars[Math.floor(Math.random() * chars.length)], i * 18, y * 18);

    if (y * 18 > cv.height && Math.random() > .975) drops[i] = 0;

    drops[i]++;

  });

}, 50);



