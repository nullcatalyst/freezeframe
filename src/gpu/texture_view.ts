import { deepCopy } from "../util/deep_copy";
import { methodCall } from "./actions";
import { FFCurrentTexture } from "./current_texture";
import { FFObject } from "./object";
import { FFRecorder } from "./recorder";
import { FFTexture } from "./texture";

export class FFTextureView extends FFObject<GPUTextureView> {
    private _texture: FFTexture | FFCurrentTexture;
    private _desc?: GPUTextureViewDescriptor;
    private _fromCurrentTexture = false;

    get typeName(): string {
        return 'texView';
    }

    constructor(rcd: FFRecorder, textureView: GPUTextureView, texture: FFTexture | FFCurrentTexture, desc?: GPUTextureViewDescriptor, fromCurrentTexture = false) {
        super(rcd, textureView);
        this._texture = texture;
        this._desc = deepCopy(desc);
        this._fromCurrentTexture = fromCurrentTexture;
    }

    markUsed(): void {
        if (this.used) {
            return;
        }

        super.markUsed();
        this._texture.markUsed();
    }

    addInitActions(rcd: FFRecorder): void {
        if (!this._fromCurrentTexture) {
            rcd.addInitAction(methodCall(this._texture, 'createView', [this._desc], this));
        }
    }
}
