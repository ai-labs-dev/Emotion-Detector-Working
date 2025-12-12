const video = document.getElementById('video');
const canvas = document.getElementById('overlay');
const statusText = document.querySelector('.status');
let videoStream = null;

// 1. Load AI Models
Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('./models'),
  faceapi.nets.faceExpressionNet.loadFromUri('./models')
]).then(startVideo).catch(err => {
  console.error(err);
  statusText.innerText = "Error loading models. Check console.";
});

// 2. Start Video Stream
function startVideo() {
  statusText.innerText = "Accessing camera...";
  
  navigator.mediaDevices.getUserMedia({ 
    video: { 
      facingMode: "user" // Prefer front camera on mobile
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
    statusText.innerText = "Camera access denied or not available.";
  });
}


// 3. Handle Video Play
video.addEventListener('play', () => {
  const displaySize = { width: video.videoWidth, height: video.videoHeight };
  faceapi.matchDimensions(canvas, displaySize);

  setInterval(async () => {
    if (video.paused || video.ended || !faceapi.nets.tinyFaceDetector.params) return;

    // Detect
    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceExpressions();

    // Resize
    const resizedDetections = faceapi.resizeResults(detections, displaySize);

    // --- NEW CODE: FLIP BOXES HORIZONTALLY ---
    // Since the video is mirrored by CSS but the canvas isn't, we must
    // manually flip the detection box X-coordinates so they align correctly.
    const mirroredDetections = resizedDetections.map(det => {
      const box = det.detection.box;
      // Calculate the mirrored X position relative to the canvas width
      const mirroredX = displaySize.width - box.x - box.width;
      // Create new box with flipped X
      const newBox = new faceapi.Box(mirroredX, box.y, box.width, box.height);
      // Reconstruct the detection object with the new box
      return new faceapi.FaceExpressionsDetection(det.expressions, new faceapi.FaceDetection(det.detection.score, newBox, det.detection.imageDims));
    });
  

    // Clear canvas
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw the NEW mirrored results
    faceapi.draw.drawDetections(canvas, mirroredDetections);
    faceapi.draw.drawFaceExpressions(canvas, mirroredDetections);
    
  }, 100);
});
