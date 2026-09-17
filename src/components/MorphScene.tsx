import { GLView, type ExpoWebGLRenderingContext } from 'expo-gl';
import * as THREE from 'three';
import { createElement, useCallback, useEffect, useRef, useState } from 'react';
import { Animated, Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { colors } from '../theme';

type MorphSceneProps = { style?: StyleProp<ViewStyle>; compact?: boolean };

export function MorphScene({ style, compact = false }: MorphSceneProps) {
  const [failed, setFailed] = useState(false);
  const frameRef = useRef<number | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const handleWebError = useCallback(() => setFailed(true), []);

  useEffect(() => () => {
    if (frameRef.current !== null) cancelAnimationFrame(frameRef.current);
    cleanupRef.current?.();
  }, []);

  const onContextCreate = (gl: ExpoWebGLRenderingContext) => {
    try {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(34, gl.drawingBufferWidth / gl.drawingBufferHeight, 0.1, 100);
      camera.position.z = compact ? 3.6 : 3.2;
      const renderer = new THREE.WebGLRenderer({ canvas: gl as unknown as HTMLCanvasElement, antialias: true, alpha: true });
      renderer.setSize(gl.drawingBufferWidth, gl.drawingBufferHeight, false);
      renderer.setPixelRatio(1);
      renderer.setClearColor(0x000000, 0);

      const geometry = new THREE.IcosahedronGeometry(compact ? 0.83 : 0.92, 4);
      const material = new THREE.MeshStandardMaterial({ color: 0x67e8f9, roughness: 0.2, metalness: 0.18 });
      const orb = new THREE.Mesh(geometry, material);
      scene.add(orb);
      scene.add(new THREE.HemisphereLight(0xdff7ff, 0x06233e, 2.4));
      const rim = new THREE.PointLight(0xa7f3d0, 4, 8);
      rim.position.set(-2, 2, 3);
      scene.add(rim);
      const original = Float32Array.from(geometry.attributes.position.array as ArrayLike<number>);
      const clock = new THREE.Clock();

      const animate = () => {
        const elapsed = clock.getElapsedTime();
        const position = geometry.attributes.position;
        for (let index = 0; index < position.count; index += 1) {
          const offset = index * 3;
          const wave = 1 + Math.sin(elapsed * 1.4 + index * 0.17) * 0.065 + Math.cos(elapsed * 0.9 + index * 0.11) * 0.035;
          position.setXYZ(index, original[offset] * wave, original[offset + 1] * wave, original[offset + 2] * wave);
        }
        position.needsUpdate = true;
        orb.rotation.x = elapsed * 0.16;
        orb.rotation.y = elapsed * 0.25;
        orb.scale.setScalar(1 + Math.sin(elapsed * 1.2) * 0.035);
        renderer.render(scene, camera);
        gl.endFrameEXP();
        frameRef.current = requestAnimationFrame(animate);
      };
      animate();
      cleanupRef.current = () => {
        geometry.dispose();
        material.dispose();
        renderer.dispose();
      };
    } catch {
      setFailed(true);
    }
  };

  if (failed) return <MorphFallback style={style} compact={compact} />;
  if (Platform.OS === 'web') return <WebMorphScene style={style} compact={compact} onError={handleWebError} />;
  return <View style={[styles.root, style]}><GLView style={StyleSheet.absoluteFill} onContextCreate={onContextCreate} /></View>;
}

function WebMorphScene({ style, compact, onError }: MorphSceneProps & { onError: () => void }) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    let frame = 0;
    let renderer: THREE.WebGLRenderer;
    try {
      const scene = new THREE.Scene();
      const camera = new THREE.PerspectiveCamera(34, 1, 0.1, 100);
      camera.position.z = compact ? 3.6 : 3.2;
      renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true });
      renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
      renderer.setClearColor(0x000000, 0);
      const geometry = new THREE.IcosahedronGeometry(compact ? 0.83 : 0.92, 4);
      const material = new THREE.MeshStandardMaterial({ color: 0x67e8f9, roughness: 0.2, metalness: 0.18 });
      const orb = new THREE.Mesh(geometry, material);
      scene.add(orb);
      scene.add(new THREE.HemisphereLight(0xdff7ff, 0x06233e, 2.4));
      const rim = new THREE.PointLight(0xa7f3d0, 4, 8);
      rim.position.set(-2, 2, 3);
      scene.add(rim);
      const original = Float32Array.from(geometry.attributes.position.array as ArrayLike<number>);
      const clock = new THREE.Clock();
      const resize = () => {
        const width = Math.max(1, canvas.clientWidth);
        const height = Math.max(1, canvas.clientHeight);
        renderer.setSize(width, height, false);
        camera.aspect = width / height;
        camera.updateProjectionMatrix();
      };
      resize();
      window.addEventListener('resize', resize);
      const animate = () => {
        const elapsed = clock.getElapsedTime();
        const position = geometry.attributes.position;
        for (let index = 0; index < position.count; index += 1) {
          const offset = index * 3;
          const wave = 1 + Math.sin(elapsed * 1.4 + index * 0.17) * 0.065 + Math.cos(elapsed * 0.9 + index * 0.11) * 0.035;
          position.setXYZ(index, original[offset] * wave, original[offset + 1] * wave, original[offset + 2] * wave);
        }
        position.needsUpdate = true;
        orb.rotation.x = elapsed * 0.16;
        orb.rotation.y = elapsed * 0.25;
        orb.scale.setScalar(1 + Math.sin(elapsed * 1.2) * 0.035);
        renderer.render(scene, camera);
        frame = requestAnimationFrame(animate);
      };
      requestAnimationFrame(() => { resize(); animate(); });
      return () => {
        cancelAnimationFrame(frame);
        window.removeEventListener('resize', resize);
        geometry.dispose();
        material.dispose();
        renderer.dispose();
      };
    } catch {
      onError();
      return undefined;
    }
  }, [compact, onError]);

  return <View style={[styles.root, style]}>{createElement('canvas', { ref: canvasRef, style: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, width: '100%', height: '100%', display: 'block' } })}</View>;
}

function MorphFallback({ style, compact }: MorphSceneProps) {
  const pulse = useRef(new Animated.Value(0)).current;
  useEffect(() => {
    Animated.loop(Animated.sequence([Animated.timing(pulse, { toValue: 1, duration: 1800, useNativeDriver: true }), Animated.timing(pulse, { toValue: 0, duration: 1800, useNativeDriver: true })])).start();
  }, [pulse]);
  return <LinearGradient colors={['#0B2A4A', '#0369A1']} style={[styles.root, style]}><Animated.View style={[styles.fallbackOrb, { transform: [{ scale: pulse.interpolate({ inputRange: [0, 1], outputRange: [0.92, 1.07] }) }] }]}><View style={styles.fallbackCore} /></Animated.View><View style={[styles.fallbackRing, compact && styles.fallbackRingCompact]} /></LinearGradient>;
}

const styles = StyleSheet.create({
  root: { overflow: 'hidden', backgroundColor: colors.navy, alignItems: 'center', justifyContent: 'center' },
  fallbackOrb: { width: 110, height: 110, borderRadius: 55, backgroundColor: '#22D3EE', alignItems: 'center', justifyContent: 'center', shadowColor: '#67E8F9', shadowOpacity: 0.8, shadowRadius: 30, elevation: 10 },
  fallbackCore: { width: 52, height: 52, borderRadius: 26, backgroundColor: '#E0F2FE', opacity: 0.75 },
  fallbackRing: { position: 'absolute', width: 150, height: 150, borderRadius: 75, borderWidth: 1, borderColor: 'rgba(167,243,208,0.6)' },
  fallbackRingCompact: { width: 128, height: 128, borderRadius: 64 },
});
