import { FFCanvas } from "./gpu/canvas";
import { FFCanvasContext } from "./gpu/canvas_context";
import { FFNavGpu } from "./gpu/nav_gpu";
import { FFRecorder } from "./gpu/recorder";

window['installFreezeFrame'] = function () {
    if (navigator.gpu == null) {
        console.error('WebGPU is not supported; nothing to record');
        return;
    }

    const rcd = new FFRecorder();
    new FFNavGpu(rcd, navigator.gpu);

    // Wrap all existing canvases.
    Array.from(document.getElementsByTagName('canvas')).forEach((canvas) => { wrapCanvas(rcd, canvas); });

    // Wrap all future canvases.
    const old_documentCreateElement = document.createElement;
    document.createElement = (tagName: string) => {
        const element = old_documentCreateElement.call(document, tagName);
        if (tagName === 'canvas') {
            wrapCanvas(rcd, element as HTMLCanvasElement);
        }
        return element;
    };

    // Add keydown listener.
    // Pressing the button while the canvas is focused will record a single frame of the canvas.
    window.addEventListener('keydown', (e) => {
        if (e.key === 'r') {
            rcd.startRecording();
            console.log('Recording started');
        }
    });
}

function wrapCanvas(rcd: FFRecorder, canvas: HTMLCanvasElement) {
    let old_getContext = canvas.getContext;
    canvas.getContext = (contextId: string, options?: any) => {
        let ctx = old_getContext.call(canvas, contextId, options);
        if (contextId === 'webgpu') {
            if (ctx != null) {
                const ff = new FFCanvas(rcd, canvas);
                new FFCanvasContext(rcd, ctx, ff, options);
            }
        }
        return ctx;
    };
}

window['installFreezeFrame']();
