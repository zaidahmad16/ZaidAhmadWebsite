// 3D MacBook resume viewer

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const canvas = document.getElementById('macbook-canvas');
if (canvas) {
  const wrap = document.getElementById('macbook-canvas-wrap');
  const hint = document.getElementById('macbook-click-hint');

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, wrap.clientWidth / wrap.clientHeight, 0.1, 100);
  camera.position.set(0, 2, 5);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
  renderer.setSize(wrap.clientWidth, wrap.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
  scene.add(ambientLight);
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
  keyLight.position.set(5, 5, 5);
  scene.add(keyLight);
  const fillLight = new THREE.DirectionalLight(0x8888ff, 0.4);
  fillLight.position.set(-5, 3, -5);
  scene.add(fillLight);
  const rimLight = new THREE.DirectionalLight(0xffffff, 0.6);
  rimLight.position.set(0, 5, -5);
  scene.add(rimLight);

  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.minPolarAngle = Math.PI / 4;
  controls.maxPolarAngle = Math.PI / 2.2;
  controls.enabled = false;

  let model = null;
  let mixer = null;
  let introComplete = false;
  let spinStartTime = null;
  let hasScrolledIntoView = false;

  // Zoom state
  let zoomState = 'idle'; // 'idle' | 'zooming-in' | 'zoomed' | 'zooming-out'
  let zoomAnimStart = null;
  const ZOOM_DURATION = 0.75;
  const zoomFrom = new THREE.Vector3();
  const zoomTo = new THREE.Vector3();
  const REST_POS = new THREE.Vector3(0, 2, 5);
  const SCREEN_POS = new THREE.Vector3(0, 0.5, 1.2);

  const loader = new GLTFLoader();
  loader.load('static/macbook_pro_14_inch_M5.glb', function(gltf) {
    model = gltf.scene;
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 3 / maxDim;
    model.scale.setScalar(scale);
    model.position.sub(center.multiplyScalar(scale));
    model.position.y -= size.y * scale * 0.3;
    model.rotation.y = Math.PI;
    scene.add(model);

    if (gltf.animations && gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(model);
      gltf.animations.forEach(function(clip) { mixer.clipAction(clip).play(); });
    }

    observeSection();
  }, undefined, function(err) {
    console.error('Failed to load MacBook model:', err);
  });

  function observeSection() {
    var resumeSection = document.getElementById('resume');
    if (!resumeSection) return;
    var sectionObserver = new IntersectionObserver(function(entries) {
      entries.forEach(function(entry) {
        if (entry.isIntersecting && !hasScrolledIntoView) {
          hasScrolledIntoView = true;
          spinStartTime = performance.now();
          sectionObserver.disconnect();
        }
      });
    }, { threshold: 0.3 });
    sectionObserver.observe(resumeSection);
  }

  function openOverlay() {
    var overlay = document.getElementById('resume-overlay');
    if (overlay) overlay.style.display = 'flex';
    if (hint) hint.style.display = 'none';
  }

  function closeOverlay() {
    var overlay = document.getElementById('resume-overlay');
    if (overlay) overlay.style.display = 'none';
    zoomFrom.copy(SCREEN_POS);
    zoomTo.copy(REST_POS);
    zoomState = 'zooming-out';
    zoomAnimStart = performance.now();
  }

  var raycaster = new THREE.Raycaster();
  var mouse = new THREE.Vector2();

  canvas.addEventListener('click', function(e) {
    if (!model || !introComplete || zoomState !== 'idle') return;
    var rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    var intersects = raycaster.intersectObjects(model.children, true);
    if (intersects.length > 0) {
      zoomFrom.copy(camera.position);
      zoomTo.copy(SCREEN_POS);
      zoomState = 'zooming-in';
      zoomAnimStart = performance.now();
      controls.enabled = false;
    }
  });

  canvas.addEventListener('mousemove', function(e) {
    if (!model || !introComplete || zoomState !== 'idle') return;
    var rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    raycaster.setFromCamera(mouse, camera);
    var intersects = raycaster.intersectObjects(model.children, true);
    canvas.style.cursor = intersects.length > 0 ? 'pointer' : 'grab';
  });

  document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && zoomState === 'zoomed') closeOverlay();
  });

  var closeBtn = document.getElementById('resume-overlay-close');
  if (closeBtn) closeBtn.addEventListener('click', closeOverlay);

  var clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);
    var delta = clock.getDelta();
    if (mixer) mixer.update(delta);

    // Intro spin
    if (model && hasScrolledIntoView && !introComplete) {
      var elapsed = (performance.now() - spinStartTime) / 1000;
      var spinDuration = 2.0;
      if (elapsed < spinDuration) {
        var t = elapsed / spinDuration;
        model.rotation.y = Math.PI * Math.pow(1 - t, 3);
      } else {
        model.rotation.y = 0;
        introComplete = true;
        controls.enabled = true;
      }
    }

    // Idle float
    if (model && introComplete && zoomState === 'idle') {
      model.position.y += Math.sin(performance.now() * 0.001) * 0.0003;
    }

    // Zoom animation
    if (zoomState === 'zooming-in' || zoomState === 'zooming-out') {
      var ze = (performance.now() - zoomAnimStart) / 1000;
      var zt = Math.min(ze / ZOOM_DURATION, 1);
      var zeased = zt < 0.5 ? 4*zt*zt*zt : 1 - Math.pow(-2*zt+2, 3) / 2;
      camera.position.lerpVectors(zoomFrom, zoomTo, zeased);
      var lookY = zoomState === 'zooming-in' ? 0.5 * zeased : 0.5 * (1 - zeased);
      camera.lookAt(0, lookY, 0);

      if (zt >= 1) {
        if (zoomState === 'zooming-in') {
          zoomState = 'zoomed';
          openOverlay();
        } else {
          zoomState = 'idle';
          controls.target.set(0, 0, 0);
          controls.enabled = true;
        }
      }
    }

    controls.update();
    renderer.render(scene, camera);
  }

  animate();

  window.addEventListener('resize', function() {
    var w = wrap.clientWidth;
    var h = wrap.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
}
