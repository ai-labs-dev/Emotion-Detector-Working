const video = document.getElementById('video');
const canvas = document.getElementById('overlay');
const statusText = document.querySelector('.status');

// 1. Setup Error Logging on Screen
window.onerror = function (message) {
    statusText.style.color = "red";
    statusText.innerText = "Error: " + message;
};

// 2. Load Models First
console.log("Loading models...");
Promise.all([
  faceapi.nets.tinyFaceDetector.loadFromUri('./models'),
  faceapi.nets.faceExpressionNet.loadFromUri('./models')
]).then(startVideo).catch(err => {
    console.error(err);
    statusText.style.color = "red";
    statusText.innerText = "Model Error. Check console.";
});

// 3. Start Camera
function startVideo() {
  statusText.innerText = "Accessing camera...";
  navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false })
  .then(stream => {
    video.srcObject = stream;
    // FORCE the video to play
    video.play(); 
    statusText.innerText = "Camera active. Starting AI...";
    
    // START DETECTION IMMEDIATELY (Don't wait for event listeners)
    startDetectionLoop();
  })
  .catch(err => {
    statusText.style.color = "red";
    statusText.innerText = "Camera Denied: " + err;
  });
}

// 4. The Detection Loop
function startDetectionLoop() {
    // Wait slightly for video size to load
    setTimeout(() => {
        
        // Loop every 500ms
        setInterval(async () => {
            // Safety: If video isn't ready, skip this frame
            if (!video.videoWidth || video.paused) return;

            // FIX: Match canvas to video
            if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
                faceapi.matchDimensions(canvas, { width: video.videoWidth, height: video.videoHeight });
            }

            const displaySize = { width: video.videoWidth, height: video.videoHeight };

            try {
                // Detect Face
                const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
                const detections = await faceapi.detectAllFaces(video, options).withFaceExpressions();

                // Update Status Text
                if (detections.length > 0) {
                    const emotion = Object.keys(detections[0].expressions).reduce((a, b) => 
                        detections[0].expressions[a] > detections[0].expressions[b] ? a : b
                    );
                    statusText.innerText = `Face Detected: ${emotion.toUpperCase()}`;
                    statusText.style.color = "#00ff00"; // Green
                } else {
                    statusText.innerText = "Scanning for faces...";
                    statusText.style.color = "white";
                }

                // Resize & Mirror Logic
                const resizedDetections = faceapi.resizeResults(detections, displaySize);
                
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

            } catch (err) {
                console.error("Detection Error:", err);
            }

        }, 500); // Check every half second
        
    }, 1000); // Wait 1 second after camera start to begin loop
}
