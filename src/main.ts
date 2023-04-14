import { FFNavigatorGpu } from "./gpu/navigator_gpu";
import { FFRecorder } from "./gpu/recorder";

// declare global {
//     interface Window {
//         installFreezeFrame: () => void;
//     }
// }
// window['installFreezeFrame'] = installFreezeFrame;

function installFreezeFrame() {
    if (navigator.gpu == null) {
        console.error('WebGPU is not supported; nothing to record');
        return;
    }

    const rcd = new FFRecorder();
    new FFNavigatorGpu(rcd, navigator.gpu);

    // Add keydown listener.
    // Pressing the button while the canvas is focused will record a single frame of the canvas.
    window.addEventListener('keydown', (e) => {
        if (e.key === 'F11') {
            rcd.startRecording();
            console.log('Recording started');
        }
    });
}
installFreezeFrame();
