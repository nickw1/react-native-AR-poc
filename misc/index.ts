import * as THREE from 'three';

const sqrt05 = Math.sqrt(0.5);

const Misc = {
    correctToUpright: new THREE.Quaternion(-sqrt05, 0, 0, sqrt05),
    zVector: new THREE.Vector3(0, 0, 1),
    sensorAngles: { alpha: 0, beta: 0, gamma: 0, },
    orientation: 0
};

export default Misc;