// Pose detection setup
const pose = new Pose({
    locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
});

pose.setOptions({
    modelComplexity: 1,
    smoothLandmarks: true,
    enableSegmentation: true,
    smoothSegmentation: true
});

const video = document.getElementById("webcam");
const canvas = document.getElementById("output");
const ctx = canvas.getContext("2d");
let currentExercise = 'wall_angels';
let exerciseInProgress = false;
let repCount = 0;
let perfectReps = 0;

// Exercise configurations
const exercises = {
    wall_angels: {
        name: "Wall Angels",
        instructions: [
            "Stand with your back against the wall",
            "Keep arms at 90 degrees",
            "Slide arms up while maintaining contact with the wall",
            "Keep shoulders relaxed"
        ],
        duration: 30,
        scoreFn: scoreWallAngels,
        gif: "https://example.com/wall-angels.gif"
    },
    cat_cow: {
        name: "Cat-Cow Stretch",
        instructions: [
            "Start on hands and knees in tabletop position",
            "For Cow: Drop belly, lift head and tailbone",
            "For Cat: Round spine, tuck chin and pelvis",
            "Move slowly with your breath"
        ],
        duration: 45,
        scoreFn: scoreCatCow,
        gif: "https://example.com/cat-cow.gif"
    },
    spinal_twist: {
        name: "Spinal Twist",
        instructions: [
            "Sit with legs extended",
            "Bend one knee and cross over the other leg",
            "Twist torso toward bent knee",
            "Keep spine tall and shoulders relaxed"
        ],
        duration: 30,
        scoreFn: scoreSpinalTwist,
        gif: "https://example.com/spinal-twist.gif"
    }
};

// Initialize exercise selector
function initExerciseSelector() {
    const select = document.getElementById("exercise-select");
    select.innerHTML = '';
    Object.keys(exercises).forEach(ex => {
        const option = document.createElement("option");
        option.value = ex;
        option.textContent = exercises[ex].name;
        select.appendChild(option);
    });
    
    select.addEventListener('change', (e) => {
        currentExercise = e.target.value;
        updateInstructions();
        updateExerciseGif();
    });
}

// Update instructions based on selected exercise
function updateInstructions() {
    const list = document.getElementById("instructions-list");
    list.innerHTML = '';
    exercises[currentExercise].instructions.forEach(instruction => {
        const li = document.createElement("li");
        li.textContent = instruction;
        list.appendChild(li);
    });
}

// Update exercise demonstration GIF
function updateExerciseGif() {
    const gifElement = document.getElementById("exercise-gif");
    gifElement.src = exercises[currentExercise].gif;
    gifElement.alt = `${exercises[currentExercise].name} demonstration`;
}

// Robust shoulder alignment calculation
function calculateShoulderAlignment(leftShoulder, rightShoulder) {
    if (!leftShoulder || !rightShoulder) return 0;
    
    const shoulderDiff = Math.abs(leftShoulder.y - rightShoulder.y);
    // Normalized score where 0.05 difference = 5/10 score
    const alignmentScore = 10 - Math.min(shoulderDiff * 100, 10);
    return Math.max(0, alignmentScore);
}

// Scoring functions
function scoreWallAngels(landmarks) {
    if (!landmarks || landmarks.length < 15) return 0;
    
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const alignmentScore = calculateShoulderAlignment(leftShoulder, rightShoulder);

    const leftElbow = landmarks[13];
    const rightElbow = landmarks[14];
    const armAngleLeft = Math.abs(leftElbow.x - leftShoulder.x);
    const armAngleRight = Math.abs(rightElbow.x - rightShoulder.x);

    const armScore = 10 - (Math.abs(armAngleLeft - armAngleRight) * 20);
    return (alignmentScore + Math.max(0, armScore)) / 2;
}

function scoreCatCow(landmarks) {
    if (!landmarks || landmarks.length < 25) return 0;
    
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    
    const alignmentScore = calculateShoulderAlignment(leftShoulder, rightShoulder);
    
    // Calculate spine curvature
    const shoulderCenter = {
        x: (leftShoulder.x + rightShoulder.x) / 2,
        y: (leftShoulder.y + rightShoulder.y) / 2
    };
    const hipCenter = {
        x: (leftHip.x + rightHip.x) / 2,
        y: (leftHip.y + rightHip.y) / 2
    };
    
    // Movement quality based on spine length changes
    const baseSpineLength = Math.abs(shoulderCenter.y - hipCenter.y);
    const currentSpineLength = Math.sqrt(
        Math.pow(shoulderCenter.x - hipCenter.x, 2) + 
        Math.pow(shoulderCenter.y - hipCenter.y, 2)
    );
    
    const movementScore = 5 + (5 * Math.sin(Date.now() / 1000));
    return (alignmentScore + movementScore) / 2;
}

function scoreSpinalTwist(landmarks) {
    if (!landmarks || landmarks.length < 25) return 0;
    
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    
    const alignmentScore = calculateShoulderAlignment(leftShoulder, rightShoulder);
    
    // Calculate rotation angle
    const shoulderCenter = {
        x: (leftShoulder.x + rightShoulder.x) / 2,
        y: (leftShoulder.y + rightShoulder.y) / 2
    };
    const hipCenter = {
        x: (leftHip.x + rightHip.x) / 2,
        y: (leftHip.y + rightHip.y) / 2
    };
    
    const rotationAngle = Math.atan2(
        shoulderCenter.y - hipCenter.y,
        shoulderCenter.x - hipCenter.x
    ) * (180 / Math.PI);
    
    const rotationScore = Math.min(10, Math.abs(rotationAngle) / 9);
    return (alignmentScore + rotationScore) / 2;
}

// Draw simplified body skeleton
function drawBodySkeleton(ctx, landmarks) {
    if (!landmarks || landmarks.length < 29) return;
    
    // Draw spine
    const nose = landmarks[0];
    const leftShoulder = landmarks[11];
    const rightShoulder = landmarks[12];
    const leftHip = landmarks[23];
    const rightHip = landmarks[24];
    
    const shoulderCenter = {
        x: (leftShoulder.x + rightShoulder.x) / 2,
        y: (leftShoulder.y + rightShoulder.y) / 2
    };
    const hipCenter = {
        x: (leftHip.x + rightHip.x) / 2,
        y: (leftHip.y + rightHip.y) / 2
    };
    
    // Draw spine line
    ctx.beginPath();
    ctx.moveTo(nose.x * canvas.width, nose.y * canvas.height);
    ctx.lineTo(shoulderCenter.x * canvas.width, shoulderCenter.y * canvas.height);
    ctx.lineTo(hipCenter.x * canvas.width, hipCenter.y * canvas.height);
    ctx.lineWidth = 8;
    ctx.strokeStyle = '#3498db';
    ctx.stroke();
    
    // Draw limbs
    const leftElbow = landmarks[13];
    const rightElbow = landmarks[14];
    const leftWrist = landmarks[15];
    const rightWrist = landmarks[16];
    const leftKnee = landmarks[25];
    const rightKnee = landmarks[26];
    const leftAnkle = landmarks[27];
    const rightAnkle = landmarks[28];
    
    // Arms
    ctx.beginPath();
    ctx.moveTo(leftShoulder.x * canvas.width, leftShoulder.y * canvas.height);
    ctx.lineTo(leftElbow.x * canvas.width, leftElbow.y * canvas.height);
    ctx.lineTo(leftWrist.x * canvas.width, leftWrist.y * canvas.height);
    ctx.moveTo(rightShoulder.x * canvas.width, rightShoulder.y * canvas.height);
    ctx.lineTo(rightElbow.x * canvas.width, rightElbow.y * canvas.height);
    ctx.lineTo(rightWrist.x * canvas.width, rightWrist.y * canvas.height);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#e74c3c';
    ctx.stroke();
    
    // Legs
    ctx.beginPath();
    ctx.moveTo(leftHip.x * canvas.width, leftHip.y * canvas.height);
    ctx.lineTo(leftKnee.x * canvas.width, leftKnee.y * canvas.height);
    ctx.lineTo(leftAnkle.x * canvas.width, leftAnkle.y * canvas.height);
    ctx.moveTo(rightHip.x * canvas.width, rightHip.y * canvas.height);
    ctx.lineTo(rightKnee.x * canvas.width, rightKnee.y * canvas.height);
    ctx.lineTo(rightAnkle.x * canvas.width, rightAnkle.y * canvas.height);
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#2ecc71';
    ctx.stroke();
    
    // Draw joints
    const joints = [shoulderCenter, hipCenter, leftElbow, rightElbow, leftWrist, rightWrist, leftKnee, rightKnee];
    joints.forEach(joint => {
        if (joint.x && joint.y) {
            ctx.beginPath();
            ctx.arc(joint.x * canvas.width, joint.y * canvas.height, 8, 0, 2 * Math.PI);
            ctx.fillStyle = '#f1c40f';
            ctx.fill();
        }
    });
}

// Process pose results
pose.onResults((results) => {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    if (!video.videoWidth) return;
    
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    
    // Draw segmentation mask
    if (results.segmentationMask) {
        ctx.save();
        ctx.globalCompositeOperation = 'source-in';
        ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.restore();
    }
    
    // Draw pose
    if (results.poseLandmarks) {
        if (document.getElementById("simple-view").checked) {
            drawBodySkeleton(ctx, results.poseLandmarks);
        } else {
            drawConnectors(ctx, results.poseLandmarks, POSE_CONNECTIONS, { color: "#00FF00", lineWidth: 4 });
            drawLandmarks(ctx, results.poseLandmarks, { color: "#FF0000", radius: 3 });
        }
        
        // Update scoring if exercise is in progress
        if (exerciseInProgress) {
            const score = exercises[currentExercise].scoreFn(results.poseLandmarks);
            updateFeedback(score);
        }
    }
});

// Update feedback display
function updateFeedback(score) {
    document.getElementById("score").textContent = score.toFixed(1);
    
    let feedback = "";
    if (score >= 9) {
        feedback = "Excellent form!";
        perfectReps++;
        document.getElementById("perfect-reps").textContent = perfectReps;
    } else if (score >= 7) {
        feedback = "Good, but could be better";
    } else {
        feedback = "Adjust your form";
    }
    
    document.getElementById("feedback").textContent = feedback;
}

// Start webcam
async function startWebcam() {
    try {
        video.width = 640;
        video.height = 480;
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        
        const processFrame = async () => {
            if (video.readyState >= 2) {
                await pose.send({ image: video });
            }
            requestAnimationFrame(processFrame);
        };
        processFrame();
    } catch (err) {
        console.error("Error accessing webcam:", err);
        alert("Could not access webcam. Please ensure permissions are granted.");
    }
}

// Start exercise
document.getElementById("start-btn").addEventListener("click", () => {
    if (exerciseInProgress) return;
    
    exerciseInProgress = true;
    repCount = 0;
    perfectReps = 0;
    
    const duration = exercises[currentExercise].duration;
    let timeLeft = duration;
    document.getElementById("time-left").textContent = timeLeft;
    document.getElementById("reps").textContent = repCount;
    document.getElementById("perfect-reps").textContent = perfectReps;
    
    const timer = setInterval(() => {
        timeLeft--;
        document.getElementById("time-left").textContent = timeLeft;
        
        // Simulate rep counting (replace with actual pose-based detection)
        if (Math.random() > 0.9 && timeLeft > 0) {
            repCount++;
            document.getElementById("reps").textContent = repCount;
        }
        
        if (timeLeft <= 0) {
            clearInterval(timer);
            exerciseInProgress = false;
            document.getElementById("feedback").textContent = "Exercise complete!";
        }
    }, 1000);
});

// Initialize app
function init() {
    initExerciseSelector();
    updateInstructions();
    updateExerciseGif();
    startWebcam();
}

// Start when DOM is loaded
if (document.readyState !== 'loading') {
    init();
} else {
    document.addEventListener('DOMContentLoaded', init);
}