import { deepCopy } from "../util/deep_copy";
import { methodCall } from "./actions";
import { FFDevice } from "./device";
import { FFObject } from "./object";
import { FFRecorder } from "./recorder";

export class FFRenderPipeline extends FFObject<GPURenderPipeline> {
    private _device: FFDevice;
    private _desc?: GPURenderPipelineDescriptor;

    get typeName(): string {
        return 'renderPipeline';
    }

    constructor(rcd: FFRecorder, pipeline: GPURenderPipeline, device: FFDevice, desc?: GPURenderPipelineDescriptor) {
        super(rcd, pipeline);
        this._device = device;
        this._desc = deepCopy(desc);
    }

    markUsed(): void {
        if (this.used) {
            return;
        }

        super.markUsed();
        this._device.markUsed();

        if (this._desc) {
            if (this._desc.vertex.module) {
                (this._desc.vertex.module as any).$ff.markUsed();
            }
            if (this._desc.fragment && this._desc.fragment.module) {
                (this._desc.fragment.module as any).$ff.markUsed();
            }
        }
    }

    addInitActions(rcd: FFRecorder): void {
        rcd.addInitAction(methodCall(this._device, 'createRenderPipeline', [this._desc], this));
    }
}
