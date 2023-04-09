import { deepCopy } from "../util/deep_copy";
import { asyncMethodCall } from "./actions";
import { FFAdapter } from "./adapter";
import { FFCommandEncoder } from "./command_encoder";
import { FFObject } from "./object";
import { FFQueue } from "./queue";
import { FFRecorder } from "./recorder";
import { FFRenderPipeline } from "./render_pipeline";
import { FFShaderModule } from "./shader_module";

export class FFDevice extends FFObject<GPUDevice> {
    private _adapter: FFAdapter;
    private _desc?: GPUDeviceDescriptor;

    get typeName(): string {
        return 'device';
    }

    constructor(rcd: FFRecorder, device: GPUDevice, adapter: FFAdapter, desc?: GPUDeviceDescriptor) {
        super(rcd, device);
        this._adapter = adapter;
        this._desc = deepCopy(desc);

        new FFQueue(rcd, device.queue, this);

        const old_createShaderModule = device.createShaderModule;
        device.createShaderModule = (desc: GPUShaderModuleDescriptor) => {
            const shaderModule = old_createShaderModule.call(device, desc);
            new FFShaderModule(rcd, shaderModule, this, desc);
            return shaderModule;
        }

        const old_createCommandEncoder = device.createCommandEncoder;
        device.createCommandEncoder = (desc?: GPUCommandEncoderDescriptor) => {
            const cmd = old_createCommandEncoder.call(device, desc);
            new FFCommandEncoder(rcd, cmd, this, desc);
            return cmd;
        };

        const old_createRenderPipeline = device.createRenderPipeline;
        device.createRenderPipeline = (desc: GPURenderPipelineDescriptor) => {
            const pipeline = old_createRenderPipeline.call(device, desc);
            new FFRenderPipeline(rcd, pipeline, this, desc);
            return pipeline;
        }
    }

    markUsed(): void {
        if (this._used) {
            return;
        }

        super.markUsed();
        this._adapter.markUsed();
    }

    addInitActions(rcd: FFRecorder) {
        rcd.addInitAction(asyncMethodCall(this._adapter, 'requestDevice', [this._desc], this));
    }
}
