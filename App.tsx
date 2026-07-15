
import { View, Text, PixelRatio } from 'react-native';
import { CanvasRef, RNCanvasContext } from 'react-native-webgpu';
import { useEffect, useRef, useState, Ref } from 'react';
import * as THREE from 'three/webgpu';
import { useCameraPermissions } from 'expo-camera';
import { Accelerometer, Gyroscope, Magnetometer } from 'expo-sensors';
import styles from './styles';
import ARComponent from './components/ARComponent';
import AHRS from 'ahrs';
import type { Orientation, SensorInfo, SensorType } from './types';


export default function App() {

  const [permission, requestPermission] = useCameraPermissions();

  const canvasRef = useRef<CanvasRef>(null);
  const madgwickRef = useRef<any>(null);

  const [orientation, setOrientation] = useState<Orientation>({ yaw: 0, pitch: 0, roll: 0 });

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
      sampleInterval: 20,
      algorithm: 'Madgwick',
      doInitialisation: true
    });

    const sensors: SensorType[] = ['gyro', 'accel', 'mag'];
    sensors.forEach(sensor => subscribe(sensor));

    return () => {
      sensors.forEach(sensor => unsubscribe(sensor));
    };
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

      const angles = madgwickRef.current.getEulerAngles();
      console.log(`yaw ${angles.heading} pitch ${angles.roll} roll ${-angles.pitch}`);
      setOrientation({ yaw: angles.heading, pitch: angles.roll, roll: -angles.pitch});
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
          <ARComponent canvasRef={canvasRef} orientation={orientation}/>)
    }</View>
  );
}


