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
  // Create canvas from video element
  const displaySize = { width: video.videoWidth, height: video.videoHeight };
  faceapi.matchDimensions(canvas, displaySize);

  // Detection Loop
  setInterval(async () => {
    // Ensure video is ready
    if (video.paused || video.ended || !faceapi.nets.tinyFaceDetector.params) return;

    // Detect faces and expressions
    // TinyFaceDetector is lightweight and fast for mobile
    const detections = await faceapi.detectAllFaces(video, new faceapi.TinyFaceDetectorOptions())
      .withFaceExpressions();

    // Resize detections to match display size
    const resizedDetections = faceapi.resizeResults(detections, displaySize);

    // Clear previous drawing
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Draw detection box and expressions
    faceapi.draw.drawDetections(canvas, resizedDetections);
    faceapi.draw.drawFaceExpressions(canvas, resizedDetections);
    
  }, 100); // Run every 100ms
});

// Handle resize events to keep canvas aligned
window.addEventListener('resize', () => {
    if(videoStream) {
        const displaySize = { width: video.clientWidth, height: video.clientHeight };
        faceapi.matchDimensions(canvas, displaySize);
    }
});
