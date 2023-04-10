import { methodCall } from "./actions";
import { FFCanvasContext } from "./canvas_context";
import { FFObject } from "./object";
import { FFRecorder } from "./recorder";
import { FFTextureView } from "./texture_view";

export class FFCurrentTexture extends FFObject<GPUTexture> {
    private _canvasCtx: FFCanvasContext;

    get typeName(): string {
        return 'frameTex';
    }

    constructor(rcd: FFRecorder, texture: GPUTexture, canvasCtx: FFCanvasContext) {
        super(rcd, texture);
        this._canvasCtx = canvasCtx;

        const old_createView = texture.createView;
        texture.createView = (desc?: GPUTextureViewDescriptor) => {
            const texView = old_createView.call(texture, desc);
            new FFTextureView(rcd, texView, this, desc);
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

    addInitActions(rcd: FFRecorder): void {
        rcd.addInitAction(methodCall(this._canvasCtx, 'getCurrentTexture', [], this));
    }
}
