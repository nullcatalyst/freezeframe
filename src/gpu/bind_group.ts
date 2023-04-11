import { deepCopy } from "../util/deep_copy";
import { methodCall } from "./actions";
import { FFDevice } from "./device";
import { FFObject } from "./object";
import { FFRecorder } from "./recorder";

export class FFBindGroup extends FFObject<GPUBindGroup> {
    private _device: FFDevice;
    private _desc?: GPUBindGroupDescriptor;

    get typeName(): string {
        return 'bindGroup';
    }

    constructor(rcd: FFRecorder, bindGroup: GPUBindGroup, device: FFDevice, desc?: GPUBindGroupDescriptor) {
        super(rcd, bindGroup);
        this._device = device;
        this._desc = deepCopy(desc);
    }

    markUsed(): void {
        if (this.used) {
            return;
        }

        super.markUsed();
        this._device.markUsed();

        if (this._desc && this._desc.layout) {
            (this._desc.layout as any).$ff.markUsed();
        }

        if (this._desc && this._desc.entries) {
            for (const entry of this._desc.entries) {
                if (entry.resource) {
                    if (entry.resource instanceof GPUSampler || entry.resource instanceof GPUTextureView) {
                        (entry.resource as any).$ff.markUsed();
                    } else if (typeof entry.resource === 'object' && (entry.resource as GPUBufferBinding).buffer) {
                        (entry.resource as any).buffer.$ff.markUsed();
                    } else {
                        throw new Error('unknown bind group resource type');
                    }
                }
            }
        }
    }

    addInitActions(rcd: FFRecorder): void {
        rcd.addInitAction(methodCall(this._device, 'createBindGroup', [this._desc], this));
    }
}
