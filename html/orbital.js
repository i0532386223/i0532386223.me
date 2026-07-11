const canvas = document.getElementById("space-canvas");
const context = canvas?.getContext("2d", { alpha: true });
const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

let width = 0;
let height = 0;
let pixelRatio = 1;
let stars = [];
let comets = [];
let lastTime = performance.now();
let nextCometAt = lastTime + 2200;
let animationFrame = 0;

function randomBetween(minimum, maximum) {
    return minimum + Math.random() * (maximum - minimum);
}

function createStars() {
    const area = width * height;
    const count = Math.max(42, Math.min(145, Math.round(area / 10500)));

    stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: randomBetween(0.35, 1.25),
        alpha: randomBetween(0.2, 0.74),
        phase: randomBetween(0, Math.PI * 2),
        speed: randomBetween(0.0004, 0.0012),
    }));
}

function resizeCanvas() {
    if (!canvas || !context) {
        return;
    }

    width = window.innerWidth;
    height = window.innerHeight;
    pixelRatio = Math.min(window.devicePixelRatio || 1, 2);

    canvas.width = Math.round(width * pixelRatio);
    canvas.height = Math.round(height * pixelRatio);
    canvas.style.width = `${width}px`;
    canvas.style.height = `${height}px`;
    context.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0);

    createStars();
    drawSky(performance.now());
}

function createComet() {
    const fromRight = Math.random() > 0.28;
    const speed = randomBetween(115, 165);

    if (fromRight) {
        comets.push({
            x: width + 120,
            y: randomBetween(-30, height * 0.32),
            vx: -speed,
            vy: speed * randomBetween(0.34, 0.54),
            length: randomBetween(78, 150),
            life: 0,
        });
    } else {
        comets.push({
            x: randomBetween(-120, width * 0.18),
            y: -40,
            vx: speed,
            vy: speed * randomBetween(0.3, 0.46),
            length: randomBetween(70, 130),
            life: 0,
        });
    }
}

function drawStars(time) {
    for (const star of stars) {
        const twinkle = Math.sin(star.phase + time * star.speed) * 0.17;
        const alpha = Math.max(0.08, star.alpha + twinkle);

        context.beginPath();
        context.fillStyle = `rgba(215, 232, 247, ${alpha})`;
        context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
        context.fill();
    }
}

function drawComet(comet, deltaSeconds) {
    comet.life += deltaSeconds;
    const acceleration = 1 + Math.min(comet.life * 0.016, 0.085);
    comet.x += comet.vx * deltaSeconds * acceleration;
    comet.y += comet.vy * deltaSeconds * acceleration;

    const velocityLength = Math.hypot(comet.vx, comet.vy);
    const directionX = comet.vx / velocityLength;
    const directionY = comet.vy / velocityLength;
    const tailX = comet.x - directionX * comet.length;
    const tailY = comet.y - directionY * comet.length;
    const gradient = context.createLinearGradient(comet.x, comet.y, tailX, tailY);

    gradient.addColorStop(0, "rgba(239, 249, 255, 0.95)");
    gradient.addColorStop(0.08, "rgba(131, 210, 255, 0.72)");
    gradient.addColorStop(1, "rgba(75, 162, 220, 0)");

    context.beginPath();
    context.strokeStyle = gradient;
    context.lineWidth = 1.35;
    context.lineCap = "round";
    context.moveTo(comet.x, comet.y);
    context.lineTo(tailX, tailY);
    context.stroke();

    context.beginPath();
    context.fillStyle = "rgba(247, 252, 255, 0.95)";
    context.arc(comet.x, comet.y, 1.6, 0, Math.PI * 2);
    context.fill();
}

function drawSky(time) {
    if (!context) {
        return;
    }

    const deltaSeconds = Math.min((time - lastTime) / 1000, 0.05);
    lastTime = time;
    context.clearRect(0, 0, width, height);
    drawStars(time);

    if (!reducedMotion.matches) {
        if (time >= nextCometAt && comets.length < 2) {
            createComet();
            nextCometAt = time + randomBetween(6500, 11500);
        }

        for (const comet of comets) {
            drawComet(comet, deltaSeconds);
        }

        comets = comets.filter((comet) => (
            comet.x > -240
            && comet.x < width + 240
            && comet.y > -160
            && comet.y < height + 200
        ));
    }

    if (!reducedMotion.matches) {
        animationFrame = window.requestAnimationFrame(drawSky);
    }
}

function stopSky() {
    window.cancelAnimationFrame(animationFrame);
}

function startSky() {
    stopSky();
    lastTime = performance.now();
    animationFrame = window.requestAnimationFrame(drawSky);
}

function loadExternalScript(source) {
    return new Promise((resolve, reject) => {
        const existingScript = document.querySelector(`script[src="${source}"]`);

        if (existingScript?.dataset.loaded === "true") {
            resolve();
            return;
        }

        const script = existingScript || document.createElement("script");
        script.src = source;
        script.async = true;
        script.addEventListener("load", () => {
            script.dataset.loaded = "true";
            resolve();
        }, { once: true });
        script.addEventListener("error", reject, { once: true });

        if (!existingScript) {
            document.head.appendChild(script);
        }
    });
}

async function enableVantaGlobe() {
    const vantaElement = document.getElementById("earth-vanta");
    const earthElement = vantaElement?.closest(".earth");
    const interactionElement = document.getElementById("earth-interaction-zone");

    if (!vantaElement || !earthElement || !interactionElement || reducedMotion.matches) {
        return;
    }

    try {
        await loadExternalScript(
            "https://cdn.jsdelivr.net/npm/three@0.134.0/build/three.min.js"
        );
        await loadExternalScript(
            "https://cdn.jsdelivr.net/npm/vanta@0.5.24/dist/vanta.globe.min.js"
        );

        if (!window.THREE || !window.VANTA?.GLOBE) {
            throw new Error("Vanta Globe failed to initialize");
        }

        const effect = window.VANTA.GLOBE({
            el: vantaElement,
            THREE: window.THREE,
            mouseControls: false,
            touchControls: false,
            gyroControls: false,
            minHeight: 200,
            minWidth: 200,
            scale: 1,
            scaleMobile: 1,
            backgroundColor: 0x020711,
            backgroundAlpha: 0,
            color: 0x62c7f5,
            color2: 0xc9eaff,
            size: 0.62,
            points: 10,
            maxDistance: 20,
            spacing: 15,
            showDots: true,
        });

        let activePointerId = null;
        let zoomScale = 1;

        function handleWheel(event) {
            event.preventDefault();
            event.stopPropagation();
            const normalizedDelta = event.deltaMode === 1
                ? event.deltaY * 16
                : event.deltaMode === 2
                    ? event.deltaY * window.innerHeight
                    : event.deltaY;
            const zoomFactor = Math.exp(-normalizedDelta * 0.0014);
            zoomScale = Math.min(2, Math.max(0.5, zoomScale * zoomFactor));
            earthElement.style.setProperty("--earth-zoom", zoomScale.toFixed(4));
        }

        function handlePointerDown(event) {
            if (event.pointerType === "mouse" && event.button !== 0) {
                return;
            }

            activePointerId = event.pointerId;
            interactionElement.classList.add("is-dragging");
            interactionElement.setPointerCapture(event.pointerId);
        }

        function handlePointerMove(event) {
            if (event.pointerId !== activePointerId) {
                return;
            }

            event.preventDefault();
            const bounds = earthElement.getBoundingClientRect();
            const horizontalPosition = Math.min(
                1,
                Math.max(0, (event.clientX - bounds.left) / bounds.width)
            );
            const verticalPosition = Math.min(
                1,
                Math.max(0, (event.clientY - bounds.top) / bounds.height)
            );
            effect.onMouseMove(horizontalPosition, verticalPosition);
        }

        function handlePointerEnd(event) {
            if (event.pointerId !== activePointerId) {
                return;
            }

            activePointerId = null;
            interactionElement.classList.remove("is-dragging");
        }

        interactionElement.addEventListener("wheel", handleWheel, { passive: false });
        interactionElement.addEventListener("pointerdown", handlePointerDown);
        interactionElement.addEventListener("pointermove", handlePointerMove, { passive: false });
        interactionElement.addEventListener("pointerup", handlePointerEnd);
        interactionElement.addEventListener("pointercancel", handlePointerEnd);
        interactionElement.addEventListener("lostpointercapture", handlePointerEnd);
        earthElement.classList.add("is-rendered");

        window.addEventListener("pagehide", () => {
            interactionElement.removeEventListener("wheel", handleWheel);
            interactionElement.removeEventListener("pointerdown", handlePointerDown);
            interactionElement.removeEventListener("pointermove", handlePointerMove);
            interactionElement.removeEventListener("pointerup", handlePointerEnd);
            interactionElement.removeEventListener("pointercancel", handlePointerEnd);
            interactionElement.removeEventListener("lostpointercapture", handlePointerEnd);
            effect.destroy();
        }, { once: true });
    } catch {
        earthElement.classList.add("earth-renderer-unavailable");
    }
}

function enableTechnologySphere() {
    const stage = document.getElementById("technology-sphere-stage");
    const shell = stage?.querySelector(".technology-sphere-shell");
    const canvasElement = document.getElementById("technology-sphere-canvas");
    const sphereContext = canvasElement?.getContext("2d", { alpha: true });
    const sphere = document.getElementById("technology-sphere");
    const tagElements = sphere ? [...sphere.querySelectorAll("li")] : [];

    if (
        !stage
        || !shell
        || !canvasElement
        || !sphereContext
        || !sphere
        || tagElements.length === 0
    ) {
        return;
    }

    const tagCoordinates = [
        [45, -12],
        [30, 6],
        [5, 0],
        [-18, 8],
        [-34, -2],
        [-50, -18],
        [-55, 4],
        [-48, 42],
        [-48, -46],
        [-18, -58],
        [8, 58],
        [-8, 68],
        [17, -58],
        [-1, -72],
        [-30, 66],
        [58, 22],
        [48, 130],
        [28, 160],
        [8, 185],
        [-12, 215],
        [-34, 245],
        [-54, 150],
        [-48, 205],
        [-40, 260],
        [-22, 120],
        [0, 145],
        [18, 175],
        [38, 210],
        [58, 245],
        [55, 105],
        [30, 235],
        [2, 250],
        [-16, 105],
    ];
    const latitudeValues = [-60, -30, 0, 30, 60];
    const longitudeValues = Array.from({ length: 12 }, (_, index) => index * 30);
    const lightLongitudeValues = Array.from({ length: 12 }, (_, index) => index * 30);
    const fontFamily = getComputedStyle(document.documentElement)
        .getPropertyValue("--font-sans")
        .trim() || "ui-sans-serif, -apple-system, BlinkMacSystemFont, sans-serif";

    function toRadians(degrees) {
        return degrees * Math.PI / 180;
    }

    function createSpherePoint(latitude, longitude) {
        const latitudeRadians = toRadians(latitude);
        const longitudeRadians = toRadians(longitude);
        const latitudeRadius = Math.cos(latitudeRadians);

        return {
            x: latitudeRadius * Math.sin(longitudeRadians),
            y: Math.sin(latitudeRadians),
            z: latitudeRadius * Math.cos(longitudeRadians),
        };
    }

    function createTangent(point) {
        const tangentLength = Math.hypot(point.z, point.x) || 1;

        return {
            x: point.z / tangentLength,
            y: 0,
            z: -point.x / tangentLength,
        };
    }

    function pointAlongArc(point, tangent, angle) {
        const cosine = Math.cos(angle);
        const sine = Math.sin(angle);

        return {
            x: point.x * cosine + tangent.x * sine,
            y: point.y * cosine + tangent.y * sine,
            z: point.z * cosine + tangent.z * sine,
        };
    }

    const labels = tagElements.map((element, index) => {
        const [latitude, longitude] = tagCoordinates[index] || [0, index * 22.5];
        const point = createSpherePoint(latitude, longitude);

        return {
            text: element.textContent.trim(),
            weight: Number(element.dataset.weight || 1),
            point,
            tangent: createTangent(point),
        };
    });
    const gridLines = [
        ...latitudeValues.map((latitude) => Array.from(
            { length: 73 },
            (_, index) => createSpherePoint(latitude, index * 5)
        )),
        ...longitudeValues.map((longitude) => Array.from(
            { length: 37 },
            (_, index) => createSpherePoint(-90 + index * 5, longitude)
        )),
    ];
    const lightPoints = latitudeValues.flatMap((latitude, latitudeIndex) => (
        lightLongitudeValues
            .map((longitude, longitudeIndex) => ({
                point: createSpherePoint(latitude, longitude),
                intensity: 0.3 + (((latitudeIndex * 11 + longitudeIndex * 7) % 8) / 7) * 0.7,
                phase: ((latitudeIndex * 5 + longitudeIndex * 3) % 12) / 12 * Math.PI * 2,
                speed: 0.48 + ((latitudeIndex * 7 + longitudeIndex * 5) % 9) * 0.085,
                visible: (latitudeIndex * 5 + longitudeIndex * 3) % 4 !== 0,
            }))
            .filter((light) => light.visible)
    ));

    let rotationX = -0.08;
    let rotationY = 0.12;
    let velocityX = 0;
    let velocityY = 0;
    let activePointerId = null;
    let previousPointerX = 0;
    let previousPointerY = 0;
    let previousFrameTime = performance.now();
    let sphereAnimationFrame = 0;
    let sphereIsVisible = !("IntersectionObserver" in window);
    let sphereObserver;

    shell.classList.add("is-enhanced");

    function rotatePoint(point) {
        const cosineX = Math.cos(rotationX);
        const sineX = Math.sin(rotationX);
        const cosineY = Math.cos(rotationY);
        const sineY = Math.sin(rotationY);
        const rotatedX = point.x * cosineY + point.z * sineY;
        const intermediateZ = -point.x * sineY + point.z * cosineY;

        return {
            x: rotatedX,
            y: point.y * cosineX - intermediateZ * sineX,
            z: point.y * sineX + intermediateZ * cosineX,
        };
    }

    function projectPoint(point, center, radius) {
        const perspectiveScale = 0.92 + ((point.z + 1) / 2) * 0.08;

        return {
            x: center + point.x * radius * perspectiveScale,
            y: center - point.y * radius * perspectiveScale,
            z: point.z,
        };
    }

    function prepareSphereCanvas() {
        const canvasSize = Math.max(1, canvasElement.clientWidth);
        const canvasPixelRatio = Math.min(window.devicePixelRatio || 1, 2);
        const requiredWidth = Math.round(canvasSize * canvasPixelRatio);
        const requiredHeight = Math.round(canvasElement.clientHeight * canvasPixelRatio);

        if (canvasElement.width !== requiredWidth || canvasElement.height !== requiredHeight) {
            canvasElement.width = requiredWidth;
            canvasElement.height = requiredHeight;
        }

        sphereContext.setTransform(canvasPixelRatio, 0, 0, canvasPixelRatio, 0, 0);
        return canvasSize;
    }

    function drawGridLine(points, center, radius, frontOnly) {
        sphereContext.beginPath();
        let hasActiveSegment = false;

        for (const point of points) {
            const rotatedPoint = rotatePoint(point);
            const projectedPoint = projectPoint(rotatedPoint, center, radius);
            const shouldDraw = !frontOnly || rotatedPoint.z >= -0.01;

            if (!shouldDraw) {
                hasActiveSegment = false;
                continue;
            }

            if (hasActiveSegment) {
                sphereContext.lineTo(projectedPoint.x, projectedPoint.y);
            } else {
                sphereContext.moveTo(projectedPoint.x, projectedPoint.y);
                hasActiveSegment = true;
            }
        }

        sphereContext.stroke();
    }

    function drawSphereGrid(center, radius) {
        sphereContext.save();
        sphereContext.lineWidth = 0.65;
        sphereContext.strokeStyle = "rgba(112, 197, 239, 0.045)";

        for (const line of gridLines) {
            drawGridLine(line, center, radius, false);
        }

        sphereContext.strokeStyle = "rgba(127, 210, 247, 0.145)";

        for (const line of gridLines) {
            drawGridLine(line, center, radius, true);
        }

        sphereContext.beginPath();
        sphereContext.arc(center, center, radius, 0, Math.PI * 2);
        sphereContext.lineWidth = 0.9;
        sphereContext.strokeStyle = "rgba(130, 211, 248, 0.24)";
        sphereContext.stroke();
        sphereContext.restore();
    }

    function drawSphereLights(center, radius, canvasSize, time) {
        const sizeScale = canvasSize / 470;

        for (const light of lightPoints) {
            const rotatedPoint = rotatePoint(light.point);
            const projectedPoint = projectPoint(rotatedPoint, center, radius);
            const depth = (rotatedPoint.z + 1) / 2;
            const pulse = 0.64 + (Math.sin(time * 0.001 * light.speed + light.phase) + 1) * 0.18;
            const animatedIntensity = light.intensity * pulse;
            const depthAlpha = rotatedPoint.z >= 0 ? 0.42 + depth * 0.58 : 0.08 + depth * 0.12;
            const alpha = animatedIntensity * depthAlpha;
            const glowRadius = (3.5 + animatedIntensity * 5.5) * sizeScale;
            const glow = sphereContext.createRadialGradient(
                projectedPoint.x,
                projectedPoint.y,
                0,
                projectedPoint.x,
                projectedPoint.y,
                glowRadius
            );

            glow.addColorStop(0, `rgba(255, 244, 210, ${Math.min(1, alpha * 1.8)})`);
            glow.addColorStop(0.18, `rgba(255, 177, 93, ${alpha})`);
            glow.addColorStop(1, "rgba(255, 151, 65, 0)");
            sphereContext.fillStyle = glow;
            sphereContext.beginPath();
            sphereContext.arc(projectedPoint.x, projectedPoint.y, glowRadius, 0, Math.PI * 2);
            sphereContext.fill();

            sphereContext.fillStyle = `rgba(255, 236, 195, ${Math.min(1, alpha * 1.55)})`;
            sphereContext.beginPath();
            sphereContext.arc(
                projectedPoint.x,
                projectedPoint.y,
                (0.45 + animatedIntensity * 0.75) * sizeScale,
                0,
                Math.PI * 2
            );
            sphereContext.fill();
        }
    }

    function drawCurvedLabel(label, center, radius, canvasSize) {
        const rotatedAnchor = rotatePoint(label.point);

        if (rotatedAnchor.z < -0.3) {
            return;
        }

        const baseFontSizes = { 1: 15, 2: 20, 3: 27, 4: 39 };
        const sizeScale = canvasSize / 470;
        const fontSize = (baseFontSizes[label.weight] || baseFontSizes[1]) * sizeScale;
        const fontWeight = label.weight >= 4 ? 550 : label.weight >= 3 ? 520 : 460;
        const letterSpacing = Math.max(0.45, fontSize * 0.035);
        const characters = [...label.text];

        sphereContext.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
        const characterWidths = characters.map((character) => sphereContext.measureText(character).width);
        const totalWidth = characterWidths.reduce((sum, widthValue) => sum + widthValue, 0)
            + Math.max(0, characters.length - 1) * letterSpacing;
        let cursor = -totalWidth / 2;

        for (let index = 0; index < characters.length; index += 1) {
            const characterWidth = characterWidths[index];
            const characterCenter = cursor + characterWidth / 2;
            const arcAngle = characterCenter / (radius * 1.04);
            const characterPoint = pointAlongArc(label.point, label.tangent, arcAngle);
            const rotatedCharacterPoint = rotatePoint(characterPoint);

            cursor += characterWidth + letterSpacing;

            if (rotatedCharacterPoint.z < -0.14) {
                continue;
            }

            const projectedCharacter = projectPoint(rotatedCharacterPoint, center, radius);
            const epsilon = 0.004;
            const previousPoint = rotatePoint(pointAlongArc(label.point, label.tangent, arcAngle - epsilon));
            const nextPoint = rotatePoint(pointAlongArc(label.point, label.tangent, arcAngle + epsilon));
            const previousProjection = projectPoint(previousPoint, center, radius);
            const nextProjection = projectPoint(nextPoint, center, radius);
            const tangentX = nextProjection.x - previousProjection.x;
            const tangentY = nextProjection.y - previousProjection.y;
            const screenAngle = Math.atan2(tangentY, tangentX);
            const foreshortening = Math.min(
                1,
                Math.max(0.34, Math.hypot(tangentX, tangentY) / (epsilon * 2 * radius))
            );
            const depth = (rotatedCharacterPoint.z + 1) / 2;
            const weightAlpha = label.weight === 1 ? 0.76 : label.weight === 2 ? 0.87 : 1;
            const alpha = (0.14 + depth * 0.86) * weightAlpha;

            sphereContext.save();
            sphereContext.translate(projectedCharacter.x, projectedCharacter.y);
            sphereContext.rotate(screenAngle);
            sphereContext.scale(foreshortening, 1);
            sphereContext.globalAlpha = alpha;
            sphereContext.textAlign = "center";
            sphereContext.textBaseline = "middle";
            sphereContext.fillStyle = label.weight >= 4 ? "#8edcff" : label.weight >= 3 ? "#cceeff" : "#bde8fb";
            sphereContext.shadowColor = `rgba(83, 190, 240, ${0.16 + depth * 0.28})`;
            sphereContext.shadowBlur = (3 + depth * 7) * sizeScale;
            sphereContext.fillText(characters[index], 0, 0);
            sphereContext.restore();
        }
    }

    function drawSphereLabels(center, radius, canvasSize) {
        const sortedLabels = labels
            .map((label) => ({ label, depth: rotatePoint(label.point).z }))
            .sort((left, right) => left.depth - right.depth);

        for (const item of sortedLabels) {
            drawCurvedLabel(item.label, center, radius, canvasSize);
        }
    }

    function renderSphere(time) {
        const deltaSeconds = Math.min((time - previousFrameTime) / 1000, 0.05);
        previousFrameTime = time;

        if (!reducedMotion.matches && activePointerId === null) {
            rotationY += deltaSeconds * 0.095 + velocityY;
            rotationX += velocityX;
            velocityX *= 0.94;
            velocityY *= 0.94;
        }

        const canvasSize = prepareSphereCanvas();
        const center = canvasSize / 2;
        const radius = canvasSize * 0.455;

        sphereContext.clearRect(0, 0, canvasSize, canvasSize);
        const sphereFill = sphereContext.createRadialGradient(
            center * 0.84,
            center * 0.72,
            canvasSize * 0.04,
            center,
            center,
            radius
        );
        sphereFill.addColorStop(0, "rgba(51, 142, 190, 0.075)");
        sphereFill.addColorStop(0.62, "rgba(12, 52, 78, 0.045)");
        sphereFill.addColorStop(1, "rgba(2, 7, 17, 0.12)");
        sphereContext.fillStyle = sphereFill;
        sphereContext.beginPath();
        sphereContext.arc(center, center, radius, 0, Math.PI * 2);
        sphereContext.fill();

        drawSphereGrid(center, radius);
        drawSphereLights(center, radius, canvasSize, time);
        drawSphereLabels(center, radius, canvasSize);

        if (sphereIsVisible && !document.hidden && !reducedMotion.matches) {
            sphereAnimationFrame = window.requestAnimationFrame(renderSphere);
        } else {
            sphereAnimationFrame = 0;
        }
    }

    function stopSphereAnimation() {
        window.cancelAnimationFrame(sphereAnimationFrame);
        sphereAnimationFrame = 0;
    }

    function startSphereAnimation() {
        stopSphereAnimation();
        previousFrameTime = performance.now();
        renderSphere(previousFrameTime);
    }

    function handleSphereVisibilityChange() {
        if (document.hidden) {
            stopSphereAnimation();
        } else if (sphereIsVisible) {
            startSphereAnimation();
        }
    }

    function handleSphereMotionPreferenceChange() {
        startSphereAnimation();
    }

    function handlePointerDown(event) {
        if (event.pointerType === "mouse" && event.button !== 0) {
            return;
        }

        if (event.pointerType === "mouse") {
            event.preventDefault();
        }

        activePointerId = event.pointerId;
        previousPointerX = event.clientX;
        previousPointerY = event.clientY;
        velocityX = 0;
        velocityY = 0;
        stage.classList.add("is-dragging");
        document.documentElement.classList.add("is-dragging-technology-sphere");
        stage.setPointerCapture(event.pointerId);
    }

    function handlePointerMove(event) {
        if (event.pointerId !== activePointerId) {
            return;
        }

        if (event.pointerType === "mouse" && event.buttons === 0) {
            resetPointerInteraction();
            return;
        }

        event.preventDefault();

        const deltaX = event.clientX - previousPointerX;
        const deltaY = event.clientY - previousPointerY;
        previousPointerX = event.clientX;
        previousPointerY = event.clientY;
        velocityY = deltaX * 0.00012;
        velocityX = -deltaY * 0.00012;
        rotationY += deltaX * 0.005;
        rotationX -= deltaY * 0.005;
    }

    function resetPointerInteraction() {
        activePointerId = null;
        stage.classList.remove("is-dragging");
        document.documentElement.classList.remove("is-dragging-technology-sphere");
    }

    function handlePointerEnd(event) {
        if (event.pointerId !== activePointerId) {
            return;
        }

        resetPointerInteraction();
    }

    stage.addEventListener("pointerdown", handlePointerDown);
    stage.addEventListener("pointermove", handlePointerMove);
    stage.addEventListener("pointerup", handlePointerEnd);
    stage.addEventListener("pointercancel", handlePointerEnd);
    stage.addEventListener("lostpointercapture", handlePointerEnd);
    window.addEventListener("pointerup", handlePointerEnd, true);
    window.addEventListener("pointercancel", handlePointerEnd, true);
    window.addEventListener("blur", resetPointerInteraction);
    document.addEventListener("visibilitychange", handleSphereVisibilityChange);
    reducedMotion.addEventListener("change", handleSphereMotionPreferenceChange);

    if ("IntersectionObserver" in window) {
        sphereObserver = new IntersectionObserver((entries) => {
            sphereIsVisible = entries[0]?.isIntersecting === true;

            if (sphereIsVisible) {
                startSphereAnimation();
            } else {
                stopSphereAnimation();
            }
        }, { threshold: 0.05 });
        sphereObserver.observe(stage);
        renderSphere(performance.now());
    } else {
        startSphereAnimation();
    }

    window.addEventListener("pagehide", () => {
        stopSphereAnimation();
        sphereObserver?.disconnect();
        resetPointerInteraction();
        stage.removeEventListener("pointerdown", handlePointerDown);
        stage.removeEventListener("pointermove", handlePointerMove);
        stage.removeEventListener("pointerup", handlePointerEnd);
        stage.removeEventListener("pointercancel", handlePointerEnd);
        stage.removeEventListener("lostpointercapture", handlePointerEnd);
        window.removeEventListener("pointerup", handlePointerEnd, true);
        window.removeEventListener("pointercancel", handlePointerEnd, true);
        window.removeEventListener("blur", resetPointerInteraction);
        document.removeEventListener("visibilitychange", handleSphereVisibilityChange);
        reducedMotion.removeEventListener("change", handleSphereMotionPreferenceChange);
    }, { once: true });
}

function enablePageScrollSnapping() {
    if (!document.documentElement.classList.contains("home-page")) {
        return;
    }

    const scrollContainer = document.body;
    const sections = [...document.querySelectorAll("body > main > section")];

    if (sections.length < 2) {
        return;
    }

    const gestureThreshold = 42;
    const wheelReleaseDelay = 260;
    let gestureSectionIndex = null;
    let accumulatedDelta = 0;
    let settleTimer = 0;
    let wheelReleaseTimer = 0;
    let scrollAnimationFrame = 0;
    let isAnimatingScroll = false;
    let isWheelGestureLocked = false;

    function clampSectionIndex(index) {
        return Math.max(0, Math.min(sections.length - 1, index));
    }

    function nearestSectionIndex() {
        let nearestIndex = 0;
        let nearestDistance = Number.POSITIVE_INFINITY;

        sections.forEach((section, index) => {
            const distance = Math.abs(scrollContainer.scrollTop - section.offsetTop);

            if (distance < nearestDistance) {
                nearestDistance = distance;
                nearestIndex = index;
            }
        });

        return nearestIndex;
    }

    function finishScrollAnimation(targetTop) {
        scrollContainer.scrollTop = targetTop;
        scrollContainer.classList.remove("is-wheel-gesturing");
        isAnimatingScroll = false;
        scrollAnimationFrame = 0;

        if (isWheelGestureLocked) {
            window.clearTimeout(wheelReleaseTimer);
            wheelReleaseTimer = window.setTimeout(() => {
                isWheelGestureLocked = false;
            }, wheelReleaseDelay);
        }
    }

    function animateScrollToSection(sectionIndex) {
        const targetTop = sections[clampSectionIndex(sectionIndex)].offsetTop;
        const startTop = scrollContainer.scrollTop;
        const distance = targetTop - startTop;

        if (reducedMotion.matches || Math.abs(distance) < 0.5) {
            finishScrollAnimation(targetTop);
            return;
        }

        isAnimatingScroll = true;
        const startTime = performance.now();
        const duration = Math.min(620, 360 + Math.abs(distance) * 0.18);

        function step(time) {
            const progress = Math.min(1, (time - startTime) / duration);
            const springProgress = 1 - Math.exp(-8 * progress) * Math.cos(5 * progress);
            scrollContainer.scrollTop = startTop + distance * springProgress;

            if (progress < 1) {
                scrollAnimationFrame = window.requestAnimationFrame(step);
            } else {
                finishScrollAnimation(targetTop);
            }
        }

        scrollAnimationFrame = window.requestAnimationFrame(step);
    }

    function settleWheelGesture() {
        const direction = Math.sign(accumulatedDelta);
        const shouldAdvance = Math.abs(accumulatedDelta) >= gestureThreshold;
        const targetSectionIndex = shouldAdvance
            ? clampSectionIndex(gestureSectionIndex + direction)
            : gestureSectionIndex;

        if (shouldAdvance && targetSectionIndex !== gestureSectionIndex) {
            isWheelGestureLocked = true;
        }

        accumulatedDelta = 0;
        gestureSectionIndex = null;
        animateScrollToSection(targetSectionIndex);
    }

    function handleWheel(event) {
        if (event.ctrlKey || event.metaKey) {
            return;
        }

        event.preventDefault();

        if (isWheelGestureLocked) {
            return;
        }

        if (isAnimatingScroll) {
            return;
        }

        const normalizedDelta = event.deltaMode === 1
            ? event.deltaY * 16
            : event.deltaMode === 2
                ? event.deltaY * window.innerHeight
                : event.deltaY;

        if (Math.abs(normalizedDelta) < 0.01) {
            return;
        }

        if (gestureSectionIndex === null) {
            gestureSectionIndex = nearestSectionIndex();
            accumulatedDelta = 0;
            scrollContainer.classList.add("is-wheel-gesturing");
        }

        accumulatedDelta += normalizedDelta;
        const maximumRubberOffset = Math.min(72, window.innerHeight * 0.085);
        const rubberMagnitude = maximumRubberOffset
            * (1 - Math.exp(-Math.abs(accumulatedDelta) / 105));
        const rubberOffset = Math.sign(accumulatedDelta) * rubberMagnitude;
        const baseTop = sections[gestureSectionIndex].offsetTop;
        scrollContainer.scrollTop = baseTop + rubberOffset;

        window.clearTimeout(settleTimer);

        if (Math.abs(accumulatedDelta) >= gestureThreshold) {
            settleWheelGesture();
        } else {
            settleTimer = window.setTimeout(settleWheelGesture, 110);
        }
    }

    scrollContainer.addEventListener("wheel", handleWheel, { passive: false });

    window.addEventListener("pagehide", () => {
        window.clearTimeout(settleTimer);
        window.clearTimeout(wheelReleaseTimer);
        window.cancelAnimationFrame(scrollAnimationFrame);
        isWheelGestureLocked = false;
        scrollContainer.classList.remove("is-wheel-gesturing");
        scrollContainer.removeEventListener("wheel", handleWheel);
    }, { once: true });
}

async function enableMotionAnimations() {
    if (reducedMotion.matches) {
        return;
    }

    try {
        const { animate, inView, scroll, spring } = await import(
            "https://cdn.jsdelivr.net/npm/motion@12.42.2/+esm"
        );
        const planetStage = document.getElementById("planet-stage");
        const orbitalSystem = document.getElementById("orbital-system");
        const hero = document.querySelector(".orbital-hero");

        if (planetStage) {
            let currentAnimation;

            window.addEventListener("pointermove", (event) => {
                const target = event.target;

                if (
                    event.pointerType === "touch"
                    || (target instanceof Element && target.closest(".earth"))
                ) {
                    return;
                }

                const x = (event.clientX / window.innerWidth - 0.5) * 18;
                const y = (event.clientY / window.innerHeight - 0.5) * 12;
                currentAnimation?.stop();
                currentAnimation = animate(
                    planetStage,
                    { x, y },
                    { type: spring, stiffness: 55, damping: 18, mass: 0.8 }
                );
            }, { passive: true });
        }

        if (orbitalSystem && hero) {
            scroll(
                animate(orbitalSystem, {
                    y: [0, 115],
                    scale: [1, 0.94],
                    opacity: [1, 0.22],
                }),
                { container: document.body, target: hero, offset: ["start start", "end start"] }
            );
        }

        inView(".apps-heading", (element) => {
            animate(element, { opacity: [0, 1], y: [30, 0] }, { duration: 0.75, ease: "easeOut" });
        }, { amount: 0.45, once: true });

        inView(".specialization-copy", (element) => {
            animate(element, { opacity: [0, 1], y: [26, 0] }, { duration: 0.72, ease: "easeOut" });
        }, { amount: 0.5, once: true });

        inView(".technology-sphere-stage", (element) => {
            animate(
                element,
                { opacity: [0, 1], scale: [0.94, 1] },
                { duration: 0.9, ease: "easeOut" }
            );
        }, { amount: 0.35, once: true });

        inView(".app-orbit, .app-index-entry", (element) => {
            const index = Number(element.querySelector(".app-number")?.textContent || 1);
            animate(
                element,
                { opacity: [0, 1], x: [34, 0] },
                { duration: 0.65, delay: Math.max(0, index - 1) * 0.08, ease: "easeOut" }
            );
        }, { amount: 0.35, once: true });
    } catch {
        document.documentElement.classList.add("motion-unavailable");
    }
}

window.addEventListener("resize", resizeCanvas, { passive: true });
document.addEventListener("visibilitychange", () => {
    if (document.hidden) {
        stopSky();
    } else {
        startSky();
    }
});
reducedMotion.addEventListener("change", () => {
    comets = [];
    drawSky(performance.now());

    if (reducedMotion.matches) {
        stopSky();
    } else {
        startSky();
    }
});

resizeCanvas();
startSky();
enableVantaGlobe();
enableTechnologySphere();
enablePageScrollSnapping();
enableMotionAnimations();
