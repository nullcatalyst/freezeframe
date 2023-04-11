import { deepCopy } from "../util/deep_copy";
import { methodCall } from "./actions";
import { FFCanvas } from "./canvas";
import { FFCurrentTexture } from "./current_texture";
import { FFKey, FFObject } from "./object";
import { FFRecorder } from "./recorder";
import { FFTexture } from "./texture";

export class FFCanvasContext extends FFObject<GPUCanvasContext> {
    private _canvas: FFCanvas;
    private _options?: any;
    private _configuration: GPUCanvasConfiguration | null = null;

    get typeName(): string {
        return 'ctx';
    }

    constructor(rcd: FFRecorder, ctx: GPUCanvasContext, canvas: FFCanvas, options?: any) {
        super(rcd, ctx);
        this._canvas = canvas;
        this._options = deepCopy(options);

        { // Wrap configure
            const old_configure = ctx.configure;
            ctx.configure = (configuration: GPUCanvasConfiguration) => {
                this._configuration = deepCopy(configuration);
                return old_configure.call(ctx, configuration);
            };
        }

        {
            const old_unconfigure = ctx.unconfigure;
            ctx.unconfigure = () => {
                this._configuration = null;
                return old_unconfigure.call(ctx);
            };
        }

        {
            const old_getCurrentTexture = ctx.getCurrentTexture;
            ctx.getCurrentTexture = () => {
                const texture = old_getCurrentTexture.call(ctx);
                if (rcd.recording) {
                    const ff = new FFCurrentTexture(rcd, texture, this);
                    rcd.addFrameAction(methodCall(this, 'getCurrentTexture', [], ff));
                }
                return texture;
            };
        }
    }

    markUsed(): void {
        if (this.used) {
            return;
        }

        super.markUsed();
        this._canvas.markUsed();

        if (this._configuration != null && this._configuration.device != null) {
            (this._configuration.device as any as FFKey<GPUDevice>).$ff.markUsed();
        }
    }

    addInitActions(rcd: FFRecorder) {
        rcd.addInitAction(methodCall(this._canvas, 'getContext', ['webgpu', this._options], this));

        if (this._configuration != null) {
            rcd.addInitAction(methodCall(this, 'configure', [this._configuration]));
        }
    }
}
