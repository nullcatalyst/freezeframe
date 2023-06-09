import { methodCall } from "./actions";
import { FFCanvasContext } from "./canvas_context";
import { FFObject } from "./object";
import { FFRecorder } from "./recorder";
import { FFTextureView } from "./texture_view";

export class FFCurrentTexture extends FFObject<GPUTexture> {
    private _canvasCtx: FFCanvasContext;

    get typeName(): string {
        return 'currentTexture';
    }

    constructor(rcd: FFRecorder, texture: GPUTexture, canvasCtx: FFCanvasContext) {
        super(rcd, texture);
        this._canvasCtx = canvasCtx;

        const old_createView = texture.createView;
        texture.createView = (desc?: GPUTextureViewDescriptor) => {
            const texView = old_createView.call(texture, desc);
            if (rcd.recording) {
                const ff = new FFTextureView(rcd, texView, this, desc, true);
                rcd.addFrameAction(methodCall(this, 'createView', [desc], ff));
            }
            return texView;
        };
    }

    markUsed(): void {
        if (this.used) {
            return;
        }

        super.markUsed();
        this._canvasCtx.markUsed();
    }

    // addInitActions(rcd: FFRecorder): void {
    //     rcd.addInitAction(methodCall(this._canvasCtx, 'getCurrentTexture', [], this));
    // }
}
