// 3D MacBook resume viewer

import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

const canvas = document.getElementById('macbook-canvas');
if (canvas) {
  const wrap = document.getElementById('macbook-canvas-wrap');
  const hint = document.getElementById('macbook-click-hint');

  // Scene setup
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(35, wrap.clientWidth / wrap.clientHeight, 0.1, 100);
  camera.position.set(0, 2, 5);

  const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias: true,
    alpha: true
  });
  renderer.setSize(wrap.clientWidth, wrap.clientHeight);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.2;

  // Lighting
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

  // Controls (user can orbit after intro animation)
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.05;
  controls.enableZoom = false;
  controls.enablePan = false;
  controls.minPolarAngle = Math.PI / 4;
  controls.maxPolarAngle = Math.PI / 2.2;
  controls.enabled = false; // disabled during intro

  // State
  let model = null;
  let mixer = null;
  let introComplete = false;
  let spinStartTime = null;
  let hasScrolledIntoView = false;

  // Load the MacBook model
  const loader = new GLTFLoader();
  loader.load('static/macbook_pro_14_inch_M5.glb', function(gltf) {
    model = gltf.scene;

    // Center and scale the model
    const box = new THREE.Box3().setFromObject(model);
    const center = box.getCenter(new THREE.Vector3());
    const size = box.getSize(new THREE.Vector3());
    const maxDim = Math.max(size.x, size.y, size.z);
    const scale = 3 / maxDim;
    model.scale.setScalar(scale);
    model.position.sub(center.multiplyScalar(scale));
    model.position.y -= size.y * scale * 0.3;

    // Start facing away from user
    model.rotation.y = Math.PI;

    scene.add(model);

    // Check for animations
    if (gltf.animations && gltf.animations.length > 0) {
      mixer = new THREE.AnimationMixer(model);
      gltf.animations.forEach(function(clip) {
        mixer.clipAction(clip).play();
      });
    }

    // Start observing for scroll
    observeSection();

  }, undefined, function(err) {
    console.error('Failed to load MacBook model:', err);
  });

  // Observe when resume section scrolls into view
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

  // Raycaster for click detection
  var raycaster = new THREE.Raycaster();
  var mouse = new THREE.Vector2();

  canvas.addEventListener('click', function(e) {
    if (!model || !introComplete) return;

    var rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    var intersects = raycaster.intersectObjects(model.children, true);

    if (intersects.length > 0) {
      window.open('ZaidAhmadCV.pdf', '_blank');
    }
  });

  // Hover cursor change
  canvas.addEventListener('mousemove', function(e) {
    if (!model || !introComplete) return;

    var rect = canvas.getBoundingClientRect();
    mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    var intersects = raycaster.intersectObjects(model.children, true);
    canvas.style.cursor = intersects.length > 0 ? 'pointer' : 'grab';
  });

  // Animation loop
  var clock = new THREE.Clock();

  function animate() {
    requestAnimationFrame(animate);

    var delta = clock.getDelta();
    if (mixer) mixer.update(delta);

    // Intro spin animation
    if (model && hasScrolledIntoView && !introComplete) {
      var elapsed = (performance.now() - spinStartTime) / 1000;
      var spinDuration = 2.0;

      if (elapsed < spinDuration) {
        // Ease out cubic for smooth deceleration
        var t = elapsed / spinDuration;
        var eased = 1 - Math.pow(1 - t, 3);
        model.rotation.y = Math.PI * (1 - eased);
      } else {
        model.rotation.y = 0;
        introComplete = true;
        controls.enabled = true;
      }
    }

    // Gentle idle float after intro
    if (model && introComplete) {
      model.position.y += Math.sin(performance.now() * 0.001) * 0.0003;
    }

    controls.update();
    renderer.render(scene, camera);
  }

  animate();

  // Resize handler
  window.addEventListener('resize', function() {
    var w = wrap.clientWidth;
    var h = wrap.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  });
}
