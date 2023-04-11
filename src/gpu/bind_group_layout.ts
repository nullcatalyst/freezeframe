import { deepCopy } from "../util/deep_copy";
import { methodCall } from "./actions";
import { FFDevice } from "./device";
import { FFObject } from "./object";
import { FFRecorder } from "./recorder";

export class FFBindGroupLayout extends FFObject<GPUBindGroupLayout> {
    private _device: FFDevice;
    private _desc?: GPUBindGroupLayoutDescriptor;

    get typeName(): string {
        return 'bindGroupLayout';
    }

    constructor(rcd: FFRecorder, bindGroupLayout: GPUBindGroupLayout, device: FFDevice, desc?: GPUBindGroupLayoutDescriptor) {
        super(rcd, bindGroupLayout);
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
        rcd.addInitAction(methodCall(this._device, 'createBindGroupLayout', [this._desc], this));
    }
}
