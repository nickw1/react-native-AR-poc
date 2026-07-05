
import { View, Text, PixelRatio } from 'react-native';
import { CanvasRef, RNCanvasContext } from 'react-native-webgpu';
import { useEffect, useRef } from 'react';
import * as THREE from 'three/webgpu';
import { useCameraPermissions } from 'expo-camera';
import styles from './styles';
import ARComponent from './components/ARComponent';

export default function App() {

  const [permission, requestPermission] = useCameraPermissions();

  const canvasRef = useRef<CanvasRef>(null);
  useEffect(() => {
    const context = canvasRef.current?.getContext('webgpu');
    if (context) {
      initScene(context);
    }
    console.log("Requesting permission");
    requestPermission();
  }, [permission?.granted]);

  async function initScene(context: RNCanvasContext) {
    const canvas = context.canvas as HTMLCanvasElement;
    canvas.width = canvas.clientWidth * PixelRatio.get();
    canvas.height = canvas.clientHeight * PixelRatio.get();

    const camera = new THREE.PerspectiveCamera(70, canvas.clientWidth / canvas.clientHeight, 0.001, 1000);
    const renderer = new THREE.WebGPURenderer({
      context,
      canvas,
      antialias: true
    });
    await renderer.init();
    const scene = new THREE.Scene();
    const box = new THREE.BoxGeometry(1, 1, 1);
    const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    const mesh = new THREE.Mesh(box, material);
    mesh.position.z = -5;
    scene.add(mesh);

    renderer.setAnimationLoop(() => {
      renderer.render(scene, camera);
      context.present();
    });
  }

  return (
    <View style={styles.container}>{
      !permission ? <Text style={styles.text}>Permissions still loading...</Text> : (
        !permission.granted ? <Text style={styles.text}>Camera permission not granted</Text> :
          <ARComponent canvasRef={canvasRef} />)
    }</View>
  );
}


