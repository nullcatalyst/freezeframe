import { assignment } from "./actions";
import { FFAdapter } from "./adapter";
import { FFCanvas } from "./canvas";
import { FFCanvasContext } from "./canvas_context";
import { FFObject } from "./object";
import { FFRecorder } from "./recorder";

let once = true;

export class FFNavigatorGpu extends FFObject<GPU> {
    get typeName(): string {
        return 'navigatorGpu';
    }

    constructor(rcd: FFRecorder, navGpu: GPU) {
        super(rcd, navGpu);

        const old_reqestAdapter = navGpu.requestAdapter;
        navGpu.requestAdapter = async (options?: GPURequestAdapterOptions) => {
            if (once) {
                once = false;

                // Wrap all future canvases.
                const old_documentCreateElement = document.createElement;
                document.createElement = (tagName: string) => {
                    const element = old_documentCreateElement.call(document, tagName);
                    if (tagName === 'canvas') {
                        wrapCanvas(rcd, element as HTMLCanvasElement);
                    }
                    return element;
                };

                // Wrap all existing canvases.
                Array.from(document.getElementsByTagName('canvas')).forEach((canvas) => { wrapCanvas(rcd, canvas); });
            }

            const result = await old_reqestAdapter.call(navGpu, options);
            new FFAdapter(rcd, result!, this, options);
            return result;
        };
    }

    addInitActions(rcd: FFRecorder): void {
        rcd.addInitAction(assignment(this, 'navigator.gpu'));
    }
}

function wrapCanvas(rcd: FFRecorder, canvas: HTMLCanvasElement) {
    // Typescript really doesn't handle replacing overloaded functions at all.
    // I know this is not a typical (or even good) way to do this, but still.
    const old_getContext = canvas.getContext as any;
    canvas.getContext = ((contextId: any, options?: any) => {
        const ctx: any = old_getContext.call(canvas, contextId, options);
        if (contextId === 'webgpu') {
            if (ctx != null) {
                const ff = new FFCanvas(rcd, canvas);
                new FFCanvasContext(rcd, ctx, ff, options);
            }
        }
        return ctx;
    }) as typeof canvas.getContext;
}
