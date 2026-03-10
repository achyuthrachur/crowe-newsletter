'use client';

import { cn } from '@/lib/utils';
import React, { useEffect, useRef } from 'react';
import * as THREE from 'three';

type AnimatedBgProps = Omit<React.ComponentProps<'div'>, 'ref'>;

/**
 * Animated dotted surface background — amber dots on a wave grid.
 * Adapted from DottedSurface (sshahaider). Crowe color: #F5A800 (amber) dots.
 * Position: absolute inset-0, pointer-events-none.
 */
export function AnimatedBg({ className, ...props }: AnimatedBgProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const SEPARATION = 150;
    const AMOUNTX = 40;
    const AMOUNTY = 60;

    const w = container.clientWidth || window.innerWidth;
    const h = container.clientHeight || window.innerHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(60, w / h, 1, 10000);
    camera.position.set(0, 355, 1220);

    const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setSize(w, h);
    renderer.setClearColor(0x000000, 0);
    container.appendChild(renderer.domElement);

    const positions: number[] = [];
    const colors: number[] = [];
    const geometry = new THREE.BufferGeometry();

    for (let ix = 0; ix < AMOUNTX; ix++) {
      for (let iy = 0; iy < AMOUNTY; iy++) {
        positions.push(ix * SEPARATION - (AMOUNTX * SEPARATION) / 2, 0, iy * SEPARATION - (AMOUNTY * SEPARATION) / 2);
        // Crowe amber: rgb(245, 168, 0)
        colors.push(245, 168, 0);
      }
    }

    geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));

    const material = new THREE.PointsMaterial({ size: 6, vertexColors: true, transparent: true, opacity: 0.35, sizeAttenuation: true });
    const points = new THREE.Points(geometry, material);
    scene.add(points);

    let count = 0;
    let animationId: number;

    const animate = () => {
      animationId = requestAnimationFrame(animate);
      const pos = geometry.attributes.position;
      const arr = pos.array as Float32Array;
      let i = 0;
      for (let ix = 0; ix < AMOUNTX; ix++) {
        for (let iy = 0; iy < AMOUNTY; iy++) {
          arr[i * 3 + 1] = Math.sin((ix + count) * 0.3) * 50 + Math.sin((iy + count) * 0.5) * 50;
          i++;
        }
      }
      pos.needsUpdate = true;
      renderer.render(scene, camera);
      count += 0.06;
    };

    const handleResize = () => {
      const nw = container.clientWidth || window.innerWidth;
      const nh = container.clientHeight || window.innerHeight;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };

    window.addEventListener('resize', handleResize);
    animate();

    return () => {
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationId);
      scene.traverse((obj) => {
        if (obj instanceof THREE.Points) {
          obj.geometry.dispose();
          (obj.material as THREE.Material).dispose();
        }
      });
      renderer.dispose();
      if (container.contains(renderer.domElement)) container.removeChild(renderer.domElement);
    };
  }, []);

  return (
    <div
      ref={containerRef}
      className={cn('pointer-events-none absolute inset-0 overflow-hidden', className)}
      style={{ opacity: 0.18 }}
      {...props}
    />
  );
}
