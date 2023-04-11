import { deepCopy } from "../util/deep_copy";
import { methodCall } from "./actions";
import { FFDevice } from "./device";
import { FFObject } from "./object";
import { FFRecorder } from "./recorder";

export class FFSampler extends FFObject<GPUSampler> {
    private _device: FFDevice;
    private _desc?: GPUSamplerDescriptor;

    get typeName(): string {
        return 'sampler';
    }

    constructor(rcd: FFRecorder, sampler: GPUSampler, device: FFDevice, desc?: GPUSamplerDescriptor) {
        super(rcd, sampler);
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
        rcd.addInitAction(methodCall(this._device, 'createSampler', [this._desc], this));
    }
}
