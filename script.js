const video = document.getElementById('video');
const canvas = document.getElementById('overlay');
const statusText = document.querySelector('.status');
let videoStream = null;

// --- ERROR HANDLING FOR MOBILE ---
// This will print any invisible errors directly to the screen
window.onerror = function (message, source, lineno, colno, error) {
    statusText.style.color = "red";
    statusText.innerText = "Error: " + message;
};
// ---------------------------------

console.log("Script starting...");

// 1. Load AI Models
Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('./models'),
  faceapi.nets.faceExpressionNet.loadFromUri('./models')
]).then(() => {
    console.log("Models loaded successfully");
    startVideo();
}).catch(err => {
    console.error(err);
    statusText.style.color = "red";
    statusText.innerText = "Model Load Error: " + err;
});

// 2. Start Video Stream
function startVideo() {
  statusText.innerText = "Accessing camera...";
  
  navigator.mediaDevices.getUserMedia({ 
    video: { 
      facingMode: "user" 
    }, 
    audio: false 
  })
  .then(stream => {
    videoStream = stream;
    video.srcObject = stream;
    statusText.innerText = "Detecting emotions...";
  })
  .catch(err => {
    console.error("Camera error:", err);
    statusText.innerText = "Camera access denied. Check permissions.";
  });
}

// 3. Handle Video Play
video.addEventListener('play', () => {
  const displaySize = { width: video.videoWidth, height: video.videoHeight };
  faceapi.matchDimensions(canvas, displaySize);

  // Run loop every 500ms (Optimized for mobile)
  setInterval(async () => {
    // Safety check: ensure video is actually playing
    if (video.paused || video.ended || !faceapi.nets.tinyFaceDetector.params) return;

    try {
        // OPTIMIZED FOR MOBILE: inputSize: 224
        const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
        
        const detections = await faceapi.detectAllFaces(video, options)
          .withFaceExpressions();

        const resizedDetections = faceapi.resizeResults(detections, displaySize);

        // FLIP BOXES (Mirror Mode Fix)
        const mirroredDetections = resizedDetections.map(det => {
          const box = det.detection.box;
          const mirroredX = displaySize.width - box.x - box.width;
          const newBox = new faceapi.Box(mirroredX, box.y, box.width, box.height);
          return new faceapi.FaceExpressionsDetection(det.expressions, new faceapi.FaceDetection(det.detection.score, newBox, det.detection.imageDims));
        });

        const ctx = canvas.getContext('2d');
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        faceapi.draw.drawDetections(canvas, mirroredDetections);
        faceapi.draw.drawFaceExpressions(canvas, mirroredDetections);
    } catch (loopErr) {
        console.error("Loop error:", loopErr);
        // We don't print loop errors to screen to avoid spamming, but checking console helps if connected
    }
    
  }, 500); 
});

// Resize handler
window.addEventListener('resize', () => {
    if(videoStream && video.videoWidth > 0) {
        const displaySize = { width: video.clientWidth, height: video.clientHeight };
        faceapi.matchDimensions(canvas, displaySize);
    }
});
