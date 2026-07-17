import { View, Text, PixelRatio } from 'react-native';
import { CanvasRef, RNCanvasContext } from 'react-native-webgpu';
import { useEffect, useRef } from 'react';
import * as THREE from 'three/webgpu';
import { useCameraPermissions } from 'expo-camera';
import { Accelerometer, Gyroscope, Magnetometer } from 'expo-sensors';
import * as ScreenOrientation from 'expo-screen-orientation';
import { EventSubscription } from 'expo-modules-core';
import styles from './styles';
import ARComponent from './components/ARComponent';
import AHRS from 'ahrs';
import type { SensorInfo, SensorType } from './types';
import Misc from './misc';


export default function App() {

  const [permission, requestPermission] = useCameraPermissions();

  const canvasRef = useRef<CanvasRef>(null);
  const madgwickRef = useRef<any>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const orientationRef = useRef<EventSubscription | null>(null);


  const sensorInfo = {
    "accel": useRef<SensorInfo>({ subscription: null, values: null, sensor: Accelerometer }),
    "mag": useRef<SensorInfo>({ subscription: null, values: null, sensor: Magnetometer }),
    "gyro": useRef<SensorInfo>({ subscription: null, values: null, sensor: Gyroscope }),
  };

  useEffect(() => {
    const context = canvasRef.current?.getContext('webgpu');
    if (context) {
      initScene(context);
    }
    requestPermission();
  }, [permission?.granted]);

  useEffect(() => {
    madgwickRef.current = new AHRS({
      sampleInterval: 50,
      algorithm: 'Madgwick',
      doInitialisation: true
    });

    const sensors: SensorType[] = ['gyro', 'accel', 'mag'];
    sensors.forEach(sensor => subscribe(sensor));

    return () => {
      sensors.forEach(sensor => unsubscribe(sensor));
    };
  }, []);

  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.DEFAULT);
    orientationRef.current = ScreenOrientation.addOrientationChangeListener((event) => {
      switch (event.orientationInfo.orientation) {
        case ScreenOrientation.Orientation.PORTRAIT_UP:
          Misc.orientation = 0;
          break;
        case ScreenOrientation.Orientation.PORTRAIT_DOWN:
          Misc.orientation = Math.PI;
          break;
        case ScreenOrientation.Orientation.LANDSCAPE_LEFT:
          Misc.orientation = -0.5 * Math.PI;
          break;
        case ScreenOrientation.Orientation.LANDSCAPE_RIGHT:
          Misc.orientation = 0.5 * Math.PI;

      }
      const canv = canvasRef.current!.getContext('webgpu')!.canvas as HTMLCanvasElement;
      if (cameraRef.current) {
        cameraRef.current.aspect = canv.clientWidth / canv.clientHeight;
        cameraRef.current.updateProjectionMatrix();
      }
    });

    return () => {
      orientationRef.current?.remove();
      orientationRef.current = null;
    }
  }, []);

  function updateSensors() {

    if (sensorInfo.accel?.current?.values !== null && sensorInfo.mag.current.values !== null && sensorInfo.gyro.current.values !== null && madgwickRef.current !== null) {
      madgwickRef.current?.update(
        sensorInfo.gyro.current.values.x,
        sensorInfo.gyro.current.values.y,
        sensorInfo.gyro.current.values.z,
        sensorInfo.accel.current.values.x,
        sensorInfo.accel.current.values.y,
        sensorInfo.accel.current.values.z,
        sensorInfo.mag.current.values.x,
        sensorInfo.mag.current.values.y,
        sensorInfo.mag.current.values.z
      )

      // see diagram on https://github.com/psiphi75/ahrs - x and y axes reversed from default Android axes
      // and sign of Android y (AHRS x) reversed
      const ahrsAngles = madgwickRef.current.getEulerAngles();

      // These are as the web device orientation API would give us; alpha=heading, beta=pitch, gamma=roll, but we have to swap pitch and
      // roll as described above. Tested to verify consistency with web device orientation API.
      Misc.sensorAngles.alpha = ahrsAngles.heading;  // -compass bearing (west +, east -)
      Misc.sensorAngles.beta = ahrsAngles.roll; // pitch
      Misc.sensorAngles.gamma = ahrsAngles.pitch; // roll


     
      // Approach from LocAR DeviceOrientationControls and ultimately from the three.js DeviceOrientationControls example.
      // The problem we have is that three.js uses a different coordinate system to the device orientation API.
      // By my understanding: the rotation order should be heading, pitch, roll, which in the device orientation API corresponds to
      // rotation around Z-X-Y in that order.
      // In the three.js coordinate system however the heading is rotation around y, pitch still x and roll z, so we have to rotate
      // in Y-X-Z order. This is why we specify the Euler angles in that specific order (x=beta, y=alpha, z=-gamma, apply in
      // YXZ order i.e. heading-pitch-roll).

      const q = new THREE.Quaternion();
      q.setFromEuler(new THREE.Euler(Misc.sensorAngles.beta, Misc.sensorAngles.alpha, - Misc.sensorAngles.gamma, 'YXZ'));

      cameraRef.current?.quaternion?.copy(q);
    
      // Device will be held upright, not flat
      cameraRef.current?.quaternion?.multiply(Misc.correctToUpright);

      // Further correct for specific orientation (e.g. portrait, landscape)
      const orientQuat = new THREE.Quaternion().setFromAxisAngle(Misc.zVector, -Misc.orientation);
      cameraRef.current?.quaternion?.multiply(orientQuat);

    }
  }

  function subscribe(sensor: SensorType) {
    sensorInfo[sensor].current.subscription =
      sensorInfo[sensor].current.sensor.addListener(sensorData => {
        sensorInfo[sensor].current.values = sensorData;
        if (sensor == 'gyro') {
          updateSensors();
        }
      });
  }

  function unsubscribe(sensor: SensorType) {
    sensorInfo[sensor].current.subscription?.remove();
    sensorInfo[sensor].current.subscription = null;
  }

  async function initScene(context: RNCanvasContext) {
    const canvas = context.canvas as HTMLCanvasElement;
    canvas.width = canvas.clientWidth * PixelRatio.get();
    canvas.height = canvas.clientHeight * PixelRatio.get();

    cameraRef.current = new THREE.PerspectiveCamera(70, canvas.clientWidth / canvas.clientHeight, 0.001, 1000);
    const renderer = new THREE.WebGPURenderer({
      context,
      canvas,
      antialias: true
    });
    cameraRef?.current?.rotation?.reorder('YXZ');
    await renderer.init();

    const boxData = [
      { pos: [0, 0, -5], color: 0xff0000 },
      { pos: [0, 0, 5], color: 0xffff00 },
      { pos: [-5, 0, 0], color: 0x0000ff },
      { pos: [5, 0, 0], color: 0x00ff00 },
      { pos: [0, 5, 0], color: 0xffc000 },
      { pos: [0, -5, 0], color: 0xff00ff }
    ];
    const scene = new THREE.Scene();
    const box = new THREE.BoxGeometry(1, 1, 1);
    boxData.forEach((curData, i) => {
      const material = new THREE.MeshBasicMaterial({ color: curData.color });
      const mesh = new THREE.Mesh(box, material);
      mesh.position.set(curData.pos[0], curData.pos[1], curData.pos[2]);
      scene.add(mesh);
    });

    renderer.setAnimationLoop(() => {
      renderer.render(scene, cameraRef.current!);
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
