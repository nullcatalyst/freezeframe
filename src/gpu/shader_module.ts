import { deepCopy } from "../util/deep_copy";
import { methodCall } from "./actions";
import { FFDevice } from "./device";
import { FFObject } from "./object";
import { FFRecorder } from "./recorder";

export class FFShaderModule extends FFObject<GPUShaderModule> {
    private _device: FFDevice;
    private _desc?: GPUShaderModuleDescriptor;

    get typeName(): string {
        return 'shader';
    }

    constructor(rcd: FFRecorder, shaderModule: GPUShaderModule, device: FFDevice, desc?: GPUShaderModuleDescriptor) {
        super(rcd, shaderModule);
        this._device = device;
        this._desc = deepCopy(desc);
    }

    addInitActions(rcd: FFRecorder) {
        rcd.addInitAction(methodCall(this._device, 'createShaderModule', [this._desc], this));
    }
}
