# React Native location-based AR proof-of-concept

Proof of concept to test location-based augmented reality using React Native.

## Eventual aim

To add React Native support to [LocAR.js](https://github.com/AR-js-org/locar.js)

## Completed

3D content overlaid on camera feed, using [react-native-webgpu](https://github.com/wcandillon/react-native-webgpu). This in some ways is the hardest bit: not in terms of coding, but in terms of possibilities for failure - but it is working.

## To do

Implement sensors. React Native/Expo appears to have no built-in API to combine accelerometer and magnetic field sensors, so this will need to be done manually (Madgwick algorithm?)
