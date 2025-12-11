const video=document.getElementById('video');
const overlay=document.getElementById('overlay');
const ctx=overlay.getContext('2d');
const loader=document.getElementById('loader');
const toggleBtn=document.getElementById('toggleBtn');
const emotionLabel=document.getElementById('emotionLabel');
const cuteTitle=document.getElementById('cuteTitle');
const cuteMessage=document.getElementById('cuteMessage');

async function initModels(){
  loader.textContent='Loading models…';
  const MODEL_URL='https://cdn.jsdelivr.net/gh/justadudewhohacks/face-api.js/weights';
  await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
  await faceapi.nets.faceExpressionNet.loadFromUri(MODEL_URL);
  loader.textContent='Ready';
}

const opts=new faceapi.TinyFaceDetectorOptions({inputSize:224, scoreThreshold:0.5});

async function startVideo(){
  const stream=await navigator.mediaDevices.getUserMedia({video:true});
  video.srcObject=stream;
  video.onloadeddata=()=>detect();
}

async function detect(){
  overlay.width=video.videoWidth;
  overlay.height=video.videoHeight;
  const det=await faceapi.detectSingleFace(video,opts).withFaceExpressions();
  ctx.clearRect(0,0,overlay.width,overlay.height);
  if(det){
    const box=det.detection.box;
    ctx.strokeStyle='red'; ctx.lineWidth=2;
    ctx.strokeRect(box.x,box.y,box.width,box.height);
    const expr=Object.entries(det.expressions).sort((a,b)=>b[1]-a[1])[0][0];
    emotionLabel.textContent=expr;
    cuteTitle.textContent='You look '+expr;
    cuteMessage.textContent='This is for you ❤';
  }
  requestAnimationFrame(detect);
}

toggleBtn.onclick=async()=>{
  await initModels();
  startVideo();
};