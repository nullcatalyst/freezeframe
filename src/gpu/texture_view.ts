import { deepCopy } from "../util/deep_copy";
import { methodCall } from "./actions";
import { FFObject } from "./object";
import { FFRecorder } from "./recorder";
import { FFTexture } from "./texture";

export class FFTextureView extends FFObject<GPUTextureView> {
    private _texture: FFTexture;
    private _desc?: GPUTextureViewDescriptor;

    get typeName(): string {
        return 'texView';
    }

    constructor(rcd: FFRecorder, textureView: GPUTextureView, texture: FFTexture, desc?: GPUTextureViewDescriptor) {
        super(rcd, textureView);
        this._texture = texture;
        this._desc = deepCopy(desc);
    }

    markUsed(): void {
        if (this.used) {
            return;
        }

        super.markUsed();
        this._texture.markUsed();
    }

    addInitActions(rcd: FFRecorder): void {
        rcd.addInitAction(methodCall(this._texture, 'createView', [this._desc], this));
    }
}
