'use client';
import { useEffect, useRef } from 'react';
import * as THREE from 'three';

const N = 42;
const LINK_DIST = 4.2;
const COLS = [0xc8965c, 0xd4a870, 0x9b8ec4, 0xa07850, 0xe0aa70, 0xb8813e];

export default function ThreeBackground() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setClearColor(0x000000, 0);
    el.appendChild(renderer.domElement);

    const scene  = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(52, window.innerWidth / window.innerHeight, 0.1, 100);
    camera.position.z = 26;

    const nodes = Array.from({ length: N }, () => {
      const m = new THREE.Mesh(
        new THREE.SphereGeometry(0.055, 7, 7),
        new THREE.MeshBasicMaterial({
          color: COLS[Math.floor(Math.random() * COLS.length)],
          transparent: true,
          opacity: .25 + Math.random() * .3,
        })
      );
      m.position.set((Math.random() - .5) * 40, (Math.random() - .5) * 26, (Math.random() - .5) * 10);
      scene.add(m);
      return { m, vx: (Math.random() - .5) * .007, vy: (Math.random() - .5) * .004 };
    });

    const maxP = (N * (N - 1)) / 2;
    const buf  = new Float32Array(maxP * 6);
    const geo  = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(buf, 3));
    scene.add(new THREE.LineSegments(geo, new THREE.LineBasicMaterial({ color: 0xc8965c, transparent: true, opacity: .07 })));

    const tmp = new THREE.Vector3();
    let raf: number;

    const tick = () => {
      raf = requestAnimationFrame(tick);
      for (const n of nodes) {
        n.m.position.x += n.vx; n.m.position.y += n.vy;
        if (Math.abs(n.m.position.x) > 20) n.vx *= -1;
        if (Math.abs(n.m.position.y) > 13) n.vy *= -1;
      }
      let p = 0;
      for (let i = 0; i < nodes.length; i++) {
        for (let j = i + 1; j < nodes.length; j++) {
          tmp.subVectors(nodes[i].m.position, nodes[j].m.position);
          if (tmp.length() < LINK_DIST) {
            const a = nodes[i].m.position, b = nodes[j].m.position;
            buf[p++] = a.x; buf[p++] = a.y; buf[p++] = a.z;
            buf[p++] = b.x; buf[p++] = b.y; buf[p++] = b.z;
          }
        }
      }
      geo.attributes.position.needsUpdate = true;
      geo.setDrawRange(0, p / 3);
      renderer.render(scene, camera);
    };
    tick();

    const resize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      renderer.dispose();
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
    };
  }, []);

  return <div ref={ref} style={{ position: 'fixed', inset: 0, zIndex: 0, pointerEvents: 'none', opacity: .35 }} />;
}
