import { deepCopy } from "../util/deep_copy";
import { asyncMethodCall, methodCall } from "./actions";
import { FFAdapter } from "./adapter";
import { FFBindGroup } from "./bind_group";
import { FFBindGroupLayout } from "./bind_group_layout";
import { FFBuffer } from "./buffer";
import { FFCommandEncoder } from "./command_encoder";
import { FFObject } from "./object";
import { FFPipelineLayout } from "./pipeline_layout";
import { FFQueue } from "./queue";
import { FFRecorder } from "./recorder";
import { FFRenderPipeline } from "./render_pipeline";
import { FFSampler } from "./sampler";
import { FFShaderModule } from "./shader_module";
import { FFTexture } from "./texture";

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
            if (rcd.recording) {
                const ff = new FFCommandEncoder(rcd, cmd, this, desc);
                rcd.addFrameAction(methodCall(this, 'createCommandEncoder', [desc], ff));
            }
            return cmd;
        };

        const old_createBindGroupLayout = device.createBindGroupLayout;
        device.createBindGroupLayout = (desc: GPUBindGroupLayoutDescriptor) => {
            const layout = old_createBindGroupLayout.call(device, desc);
            new FFBindGroupLayout(rcd, layout, this, desc);
            return layout;
        };

        const old_createBindGroup = device.createBindGroup;
        device.createBindGroup = (desc: GPUBindGroupDescriptor) => {
            const group = old_createBindGroup.call(device, desc);
            new FFBindGroup(rcd, group, this, desc);
            return group;
        };

        const old_createPipelineLayout = device.createPipelineLayout;
        device.createPipelineLayout = (desc: GPUPipelineLayoutDescriptor) => {
            const layout = old_createPipelineLayout.call(device, desc);
            new FFPipelineLayout(rcd, layout, this, desc);
            return layout;
        };

        const old_createRenderPipeline = device.createRenderPipeline;
        device.createRenderPipeline = (desc: GPURenderPipelineDescriptor) => {
            const pipeline = old_createRenderPipeline.call(device, desc);
            new FFRenderPipeline(rcd, pipeline, this, desc);
            return pipeline;
        }

        const old_createBuffer = device.createBuffer;
        device.createBuffer = (desc: GPUBufferDescriptor) => {
            // The COPY_SRC flag is required for us to be able to read the buffer contents so that
            // it can be used to recreate the buffer for replay.
            const customDesc = deepCopy(desc);
            customDesc.usage |= GPUBufferUsage.COPY_SRC;

            const buffer = old_createBuffer.call(device, customDesc);
            new FFBuffer(rcd, buffer, this, desc);
            return buffer;
        }

        const old_createTexture = device.createTexture;
        device.createTexture = (desc: GPUTextureDescriptor) => {
            // The COPY_SRC flag is required for us to be able to read the buffer contents so that
            // it can be used to recreate the buffer for replay.
            const customDesc = deepCopy(desc);
            desc.usage |= GPUTextureUsage.COPY_SRC;

            const texture = old_createTexture.call(device, customDesc);
            new FFTexture(rcd, texture, this, desc);
            return texture;
        };

        const old_createSampler = device.createSampler;
        device.createSampler = (desc: GPUSamplerDescriptor) => {
            const sampler = old_createSampler.call(device, desc);
            new FFSampler(rcd, sampler, this, desc);
            return sampler;
        };
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
