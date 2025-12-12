const video = document.getElementById('video');
const canvas = document.getElementById('overlay');
const statusText = document.querySelector('.status');
let videoStream = null;

// Error handling to show issues on screen
window.onerror = function (message) {
    statusText.style.color = "red";
    statusText.innerText = "Error: " + message;
};

// 1. Load Models
Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('./models'),
  faceapi.nets.faceExpressionNet.loadFromUri('./models')
]).then(startVideo).catch(err => {
    console.error(err);
    statusText.style.color = "red";
    statusText.innerText = "Model Load Error. Check console.";
});

// 2. Start Video
function startVideo() {
  statusText.innerText = "Accessing camera...";
  navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false })
  .then(stream => {
    video.srcObject = stream;
    statusText.innerText = "Starting video...";
  })
  .catch(err => statusText.innerText = "Camera denied: " + err);
}

// 3. Detection Loop
video.addEventListener('play', () => {
  // We don't set fixed dimensions here anymore to avoid the 0x0 size bug
  
  setInterval(async () => {
    if (video.paused || video.ended || !faceapi.nets.tinyFaceDetector.params) return;

    // FIX 1: Ensure canvas matches video size dynamically
    if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        faceapi.matchDimensions(canvas, { width: video.videoWidth, height: video.videoHeight });
    }

    const displaySize = { width: video.videoWidth, height: video.videoHeight };

    // Detect faces
    const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
    const detections = await faceapi.detectAllFaces(video, options).withFaceExpressions();

    // FIX 2: Show detection status for debugging
    if (detections.length > 0) {
        statusText.innerText = `Face Detected! (${detections[0].expressions.neutral.toFixed(2)})`;
        statusText.style.color = "#00ff00"; // Green text when working
    } else {
        statusText.innerText = "Scanning for faces...";
        statusText.style.color = "white";
    }

    const resizedDetections = faceapi.resizeResults(detections, displaySize);

    // FIX 3: Robust Mirror Logic
    const mirroredDetections = resizedDetections.map(det => {
      const box = det.detection.box;
      const mirroredX = displaySize.width - box.x - box.width;
      const newBox = new faceapi.Box(mirroredX, box.y, box.width, box.height);
      return new faceapi.FaceExpressionsDetection(det.expressions, new faceapi.FaceDetection(det.detection.score, newBox, det.detection.imageDims));
    });

    // Draw
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    faceapi.draw.drawDetections(canvas, mirroredDetections);
    faceapi.draw.drawFaceExpressions(canvas, mirroredDetections);
    
  }, 500);
});
