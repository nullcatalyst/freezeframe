import { deepCopy } from "../util/deep_copy";
import { methodCall } from "./actions";
import { FFDevice } from "./device";
import { FFObject } from "./object";
import { FFRecorder } from "./recorder";

export class FFPipelineLayout extends FFObject<GPUPipelineLayout> {
    private _device: FFDevice;
    private _desc?: GPUPipelineLayoutDescriptor;

    get typeName(): string {
        return 'pipelineLayout';
    }

    constructor(rcd: FFRecorder, pipelineLayout: GPUPipelineLayout, device: FFDevice, desc?: GPUPipelineLayoutDescriptor) {
        super(rcd, pipelineLayout);
        this._device = device;
        this._desc = deepCopy(desc);
    }

    markUsed(): void {
        if (this.used) {
            return;
        }

        super.markUsed();
        this._device.markUsed();
    }

    addInitActions(rcd: FFRecorder): void {
        rcd.addInitAction(methodCall(this._device, 'createPipelineLayout', [this._desc], this));
    }
}
