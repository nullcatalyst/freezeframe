import { deepCopy } from "../util/deep_copy";
import { methodCall } from "./actions";
import { FFDevice } from "./device";
import { FFKey, FFObject } from "./object";
import { FFRecorder } from "./recorder";
import { FFRenderPassEncoder } from "./render_pass_encoder";
import { FFCommandBuffer } from "./command_buffer";
import { FFTextureView } from "./texture_view";

export class FFCommandEncoder extends FFObject<GPUCommandEncoder> {
    private _device: FFDevice;
    private _desc?: GPUCommandEncoderDescriptor;

    get typeName(): string {
        return 'commandEncoder';
    }

    constructor(rcd: FFRecorder, cmd: GPUCommandEncoder, device: FFDevice, desc?: GPUCommandEncoderDescriptor) {
        super(rcd, cmd);
        this._device = device;
        this._desc = deepCopy(desc);

        const old_beginRenderPass = cmd.beginRenderPass;
        cmd.beginRenderPass = (desc: GPURenderPassDescriptor) => {
            const renderPass = old_beginRenderPass.call(cmd, desc);
            if (rcd.recording) {
                const ff = new FFRenderPassEncoder(rcd, renderPass, this, desc);
                ff.markUsed();

                for (const colorAttachment of desc.colorAttachments) {
                    if (colorAttachment == null) {
                        continue;
                    }

                    ((colorAttachment.view as any as FFKey<GPUTextureView>).$ff as any as FFTextureView)
                        .setLoadPreviousContents(colorAttachment.loadOp === 'load');
                }

                if (desc.depthStencilAttachment != null) {
                    ((desc.depthStencilAttachment.view as any as FFKey<GPUTextureView>).$ff as any as FFTextureView)
                        .setLoadPreviousContents(desc.depthStencilAttachment.depthLoadOp === 'load' ||
                            desc.depthStencilAttachment.stencilLoadOp === 'load');
                }

                rcd.addFrameAction(methodCall(this, 'beginRenderPass', [desc], ff));
            }
            return renderPass;
        }

        const old_finish = cmd.finish;
        cmd.finish = (desc?: GPUCommandBufferDescriptor) => {
            const cmdBuffer = old_finish.call(cmd, desc);
            if (rcd.recording) {
                const ff = new FFCommandBuffer(rcd, cmdBuffer, this, desc);
                ff.markUsed();
                rcd.addFrameAction(methodCall(this, 'finish', [desc], ff));
            }
            return cmdBuffer;
        }
    }

    markUsed(): void {
        if (this.used) {
            return;
        }

        super.markUsed();
        this._device.markUsed();
    }

    // addInitActions(rcd: FFRecorder) {
    //     rcd.addInitAction(methodCall(this._device, 'createCommandEncoder', [this._desc], this));
    // }
}
