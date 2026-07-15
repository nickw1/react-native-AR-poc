import { Accelerometer, Gyroscope, Magnetometer } from 'expo-sensors';
import { EventSubscription } from 'expo-modules-core';

export type SensorValues = {
  x: number;
  y: number;
  z: number;
}

export type SensorInfo = {
  subscription: EventSubscription | null;
  values: SensorValues | null;
  sensor: typeof Accelerometer | typeof Gyroscope | typeof Magnetometer;
};

export type Orientation = {
  yaw: number;
  pitch: number;
  roll: number;
}

export type SensorType = "gyro" | "accel" | "mag";
