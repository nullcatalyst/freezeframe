import { deepCopy } from "../util/deep_copy";
import { asyncMethodCall } from "./actions";
import { FFDevice } from "./device";
import { FFNavGpu } from "./nav_gpu";
import { FFObject } from "./object";
import { FFRecorder } from "./recorder";

export class FFAdapter extends FFObject<GPUAdapter> {
    private _navGpu: FFNavGpu;
    private _options?: GPURequestAdapterOptions;

    get typeName(): string {
        return 'adapter';
    }

    constructor(rcd: FFRecorder, adapter: GPUAdapter, navGpu: FFNavGpu, options?: GPURequestAdapterOptions) {
        super(rcd, adapter);
        this._navGpu = navGpu;
        this._options = deepCopy(options);

        const old_requestDevice = adapter.requestDevice;
        adapter.requestDevice = async (desc?: GPUDeviceDescriptor) => {
            const device = await old_requestDevice.call(adapter, desc);
            new FFDevice(rcd, device, this, desc);
            return device;
        };
    }

    markUsed(): void {
        if (this.used) {
            return;
        }

        super.markUsed();
        this._navGpu.markUsed();
    }

    addInitActions(rcd: FFRecorder) {
        rcd.addInitAction(asyncMethodCall(this._navGpu, 'requestAdapter', [this._options], this));
    }
}
