import { FFObject } from "./object";
import { FFRecorder } from "./recorder";
import { FFTextureView } from "./texture_view";

export class FFTexture extends FFObject<GPUTexture> {
    get typeName(): string {
        return 'tex';
    }

    constructor(rcd: FFRecorder, texture: GPUTexture) {
        super(rcd, texture);

        const old_createView = texture.createView;
        texture.createView = (desc?: GPUTextureViewDescriptor) => {
            const texView = old_createView.call(texture, desc);
            new FFTextureView(rcd, texView, this, desc);
            return texView;
        };
    }
}
