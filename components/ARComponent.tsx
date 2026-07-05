import { Ref } from 'react';
import { Canvas, CanvasRef } from 'react-native-webgpu';
import { CameraView } from 'expo-camera';
import styles from '../styles';

interface ARComponentProps {
    canvasRef: Ref<CanvasRef>;
}

export default function ARComponent({canvasRef} : ARComponentProps) {
    return (
        <>
            <CameraView style={styles.fullScreen}></CameraView>
            <Canvas ref={canvasRef} transparent style={styles.fullScreen} />
        </>
    )
}